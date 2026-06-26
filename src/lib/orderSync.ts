import * as XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'

// Cliente sem tipagem genérica — necessário para upsert de dados dinâmicos do xlsx
// O cliente tipado (src/lib/supabase.ts) continua sendo usado no resto da app
const supabaseUrl = 'https://bklyhayqtnydxxvlgthk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrbHloYXlxdG55ZHh4dmxndGhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MzE3NjksImV4cCI6MjA5ODAwNzc2OX0.Y1V3zKu2RpMVrnKeht2S2j5TzHYOh9OVOlWdGLsarhs'
const db = createClient(supabaseUrl, supabaseKey)

const COL: Record<string, number> = {
  id_sales_order:             0,
  customer_first_name:        1,
  customer_last_name:         2,
  customer_email:             3,
  company_name:               4,
  company_cnpj:               5,
  order_address1:             6,
  order_address2:             7,
  order_address3:             8,
  order_city:                 9,
  order_state:                10,
  order_zip_code:             11,
  order_payment_method:       12,
  order_installments:         13,
  order_vehicle:              14,
  item_sku:                   15,
  item_brand:                 16,
  item_part_number:           17,
  item_name:                  18,
  item_net_price:             19,
  item_quantity:              20,
  item_state:                 21,
  item_merchant_state:        22,
  merchant_reference:         23,
  merchant_name:              24,
  item_discount_display_name: 25,
  item_discount_value:        26,
  item_nota_fiscal:           27,
  item_refunded_date:         28,
  order_canceled_total:       29,
  order_discount_total:       30,
  order_expense_total:        31,
  order_grand_total:          32,
  order_shipment_method_name: 33,
  order_settlement_date:      34,
  order_created_at:           35,
  order_paid_date:            36,
  store:                      37,
  item_chave_xml_nf:          38, // PAD-01 — coluna futura
}

export interface ParseResult {
  rows: Record<string, unknown>[]
  totalRows: number
  skippedRows: number
  errors: string[]
}

function str(v: unknown): string | null {
  return v != null ? String(v) : null
}
function num(v: unknown): number | null {
  return v != null && !isNaN(Number(v)) ? Number(v) : null
}

export function parseOrderXlsx(buffer: ArrayBuffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
  }) as unknown[][]

  const rows: Record<string, unknown>[] = []
  const errors: string[] = []
  let skippedRows = 0

  for (let i = 1; i < raw.length; i++) {
    const row = raw[i]
    if (!Array.isArray(row)) { skippedRows++; continue }

    const orderId = row[COL.id_sales_order]
    const itemSku  = row[COL.item_sku]
    if (!orderId || !itemSku) { skippedRows++; continue }

    try {
      rows.push({
        id_sales_order:             str(orderId),
        customer_first_name:        str(row[COL.customer_first_name]),
        customer_last_name:         str(row[COL.customer_last_name]),
        customer_email:             str(row[COL.customer_email]),
        company_name:               str(row[COL.company_name]),
        company_cnpj:               row[COL.company_cnpj]
                                      ? str(row[COL.company_cnpj])!.replace(/\D/g, '')
                                      : null,
        order_address1:             str(row[COL.order_address1]),
        order_address2:             str(row[COL.order_address2]),
        order_address3:             str(row[COL.order_address3]),
        order_city:                 str(row[COL.order_city]),
        order_state:                str(row[COL.order_state]),
        order_zip_code:             str(row[COL.order_zip_code]),
        order_payment_method:       str(row[COL.order_payment_method]),
        order_installments:         str(row[COL.order_installments]),
        order_vehicle:              str(row[COL.order_vehicle]),
        item_sku:                   str(itemSku),
        item_brand:                 str(row[COL.item_brand]),
        item_part_number:           str(row[COL.item_part_number]),
        item_name:                  str(row[COL.item_name]),
        item_net_price:             num(row[COL.item_net_price]),
        item_quantity:              num(row[COL.item_quantity]),
        item_state:                 str(row[COL.item_state]),
        item_merchant_state:        str(row[COL.item_merchant_state]),
        merchant_reference:         str(row[COL.merchant_reference]),
        merchant_name:              str(row[COL.merchant_name]),
        item_discount_display_name: str(row[COL.item_discount_display_name]),
        item_discount_value:        num(row[COL.item_discount_value]),
        item_nota_fiscal:           str(row[COL.item_nota_fiscal]),
        item_refunded_date:         str(row[COL.item_refunded_date]),
        order_canceled_total:       num(row[COL.order_canceled_total]),
        order_discount_total:       num(row[COL.order_discount_total]),
        order_expense_total:        num(row[COL.order_expense_total]),
        order_grand_total:          num(row[COL.order_grand_total]),
        order_shipment_method_name: str(row[COL.order_shipment_method_name]),
        order_settlement_date:      str(row[COL.order_settlement_date]),
        order_created_at:           str(row[COL.order_created_at]),
        order_paid_date:            str(row[COL.order_paid_date]),
        store:                      str(row[COL.store]),
        item_chave_xml_nf:          str(row[COL.item_chave_xml_nf]),
      })
    } catch (e) {
      errors.push(`Linha ${i + 1}: ${e}`)
      skippedRows++
    }
  }

  return { rows, totalRows: raw.length - 1, skippedRows, errors }
}

export interface UpsertResult {
  success: boolean
  rowsUpserted: number
  errors: string[]
  duration: number
}

export async function upsertOrders(rows: Record<string, unknown>[]): Promise<UpsertResult> {
  const BATCH_SIZE = 500
  const start = Date.now()
  const errors: string[] = []
  let rowsUpserted = 0

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const { error } = await db
      .from('orders')
      .upsert(batch, { onConflict: 'id_sales_order,item_sku' })

    if (error) {
      errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
    } else {
      rowsUpserted += batch.length
    }
  }

  await db.from('sync_log').insert({
    status: errors.length === 0 ? 'success' : 'partial',
    rows_upserted: rowsUpserted,
    error_message: errors.length > 0 ? errors.join('; ') : null,
  })

  return {
    success: errors.length === 0,
    rowsUpserted,
    errors,
    duration: Date.now() - start,
  }
}
