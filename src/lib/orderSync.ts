import * as XLSX from 'xlsx'
import { supabase } from './supabase'

// Mapeamento de colunas (índice 0-based) — conforme PRD v6
const COL = {
  id_sales_order:             0,  // A
  customer_first_name:        1,  // B
  customer_last_name:         2,  // C
  customer_email:             3,  // D
  company_name:               4,  // E
  company_cnpj:               5,  // F
  order_address1:             6,  // G
  order_address2:             7,  // H
  order_address3:             8,  // I
  order_city:                 9,  // J
  order_state:                10, // K
  order_zip_code:             11, // L
  order_payment_method:       12, // M
  order_installments:         13, // N
  order_vehicle:              14, // O
  item_sku:                   15, // P
  item_brand:                 16, // Q
  item_part_number:           17, // R
  item_name:                  18, // S
  item_net_price:             19, // T
  item_quantity:              20, // U
  item_state:                 21, // V
  item_merchant_state:        22, // W
  merchant_reference:         23, // X
  merchant_name:              24, // Y
  item_discount_display_name: 25, // Z
  item_discount_value:        26, // AA
  item_nota_fiscal:           27, // AB
  item_refunded_date:         28, // AC
  order_canceled_total:       29, // AD
  order_discount_total:       30, // AE
  order_expense_total:        31, // AF
  order_grand_total:          32, // AG
  order_shipment_method_name: 33, // AH
  order_settlement_date:      34, // AI
  order_created_at:           35, // AJ
  order_paid_date:            36, // AK
  store:                      37, // AL
  // PAD-01: item_chave_xml_nf — coluna futura (índice 38 / AM)
}

export interface ParseResult {
  rows: Record<string, unknown>[]
  totalRows: number
  skippedRows: number
  errors: string[]
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

  // Pula a linha de cabeçalho (índice 0)
  for (let i = 1; i < raw.length; i++) {
    const row = raw[i]
    if (!Array.isArray(row)) { skippedRows++; continue }

    const orderId = row[COL.id_sales_order]
    const itemSku = row[COL.item_sku]

    // Linhas sem order_id ou item_sku são inválidas
    if (!orderId || !itemSku) {
      skippedRows++
      continue
    }

    try {
      rows.push({
        id_sales_order:             String(orderId),
        customer_first_name:        row[COL.customer_first_name] ?? null,
        customer_last_name:         row[COL.customer_last_name] ?? null,
        customer_email:             row[COL.customer_email] ?? null,
        company_name:               row[COL.company_name] ?? null,
        company_cnpj:               row[COL.company_cnpj]
                                      ? String(row[COL.company_cnpj]).replace(/\D/g, '')
                                      : null,
        order_address1:             row[COL.order_address1] ?? null,
        order_address2:             row[COL.order_address2] ?? null,
        order_address3:             row[COL.order_address3] ?? null,
        order_city:                 row[COL.order_city] ?? null,
        order_state:                row[COL.order_state] ?? null,
        order_zip_code:             row[COL.order_zip_code] ?? null,
        order_payment_method:       row[COL.order_payment_method] ?? null,
        order_installments:         row[COL.order_installments] ?? null,
        order_vehicle:              row[COL.order_vehicle] ?? null,
        item_sku:                   String(itemSku),
        item_brand:                 row[COL.item_brand] ?? null,
        item_part_number:           row[COL.item_part_number] ?? null,
        item_name:                  row[COL.item_name] ?? null,
        item_net_price:             row[COL.item_net_price]
                                      ? Number(row[COL.item_net_price])
                                      : null,
        item_quantity:              row[COL.item_quantity]
                                      ? Number(row[COL.item_quantity])
                                      : null,
        item_state:                 row[COL.item_state] ?? null,
        item_merchant_state:        row[COL.item_merchant_state] ?? null,
        merchant_reference:         row[COL.merchant_reference]
                                      ? String(row[COL.merchant_reference])
                                      : null,
        merchant_name:              row[COL.merchant_name] ?? null,
        item_discount_display_name: row[COL.item_discount_display_name] ?? null,
        item_discount_value:        row[COL.item_discount_value]
                                      ? Number(row[COL.item_discount_value])
                                      : null,
        item_nota_fiscal:           row[COL.item_nota_fiscal]
                                      ? String(row[COL.item_nota_fiscal])
                                      : null,
        item_refunded_date:         row[COL.item_refunded_date] ?? null,
        order_canceled_total:       row[COL.order_canceled_total]
                                      ? Number(row[COL.order_canceled_total])
                                      : null,
        order_discount_total:       row[COL.order_discount_total]
                                      ? Number(row[COL.order_discount_total])
                                      : null,
        order_expense_total:        row[COL.order_expense_total]
                                      ? Number(row[COL.order_expense_total])
                                      : null,
        order_grand_total:          row[COL.order_grand_total]
                                      ? Number(row[COL.order_grand_total])
                                      : null,
        order_shipment_method_name: row[COL.order_shipment_method_name] ?? null,
        order_settlement_date:      row[COL.order_settlement_date] ?? null,
        order_created_at:           row[COL.order_created_at]
                                      ? String(row[COL.order_created_at])
                                      : null,
        order_paid_date:            row[COL.order_paid_date]
                                      ? String(row[COL.order_paid_date])
                                      : null,
        store:                      row[COL.store] ?? null,
        item_chave_xml_nf:          row[38] ? String(row[38]) : null, // PAD-01
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
    const { error } = await supabase
      .from('orders')
      .upsert(batch as Parameters<typeof supabase.from>[0] extends never ? never : never, {
        onConflict: 'id_sales_order,item_sku',
        ignoreDuplicates: false,
      })

    if (error) {
      errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
    } else {
      rowsUpserted += batch.length
    }
  }

  // Registra no sync_log
  await supabase.from('sync_log').insert({
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
