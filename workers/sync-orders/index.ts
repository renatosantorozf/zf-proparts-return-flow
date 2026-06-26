/**
 * ReturnFlow — Cloudflare Worker: Sync order.xlsx do SharePoint
 *
 * Cron: a cada 1 hora
 * Fluxo:
 *   1. Autentica no Azure AD (client credentials)
 *   2. Baixa o order.xlsx via Microsoft Graph API
 *   3. Parse com SheetJS
 *   4. Upsert no Supabase por id_sales_order + item_sku
 *   5. Registra no sync_log
 *
 * PAD-03: Requer App Registration no Azure AD ZF com Files.Read.All
 */

export interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  SHAREPOINT_TENANT_ID: string
  SHAREPOINT_CLIENT_ID: string
  SHAREPOINT_CLIENT_SECRET: string
  SHAREPOINT_FILE_URL: string
}

// Colunas esperadas na planilha (índice 0-based)
const COL = {
  id_sales_order:            0,  // A
  customer_first_name:       1,  // B
  customer_last_name:        2,  // C
  customer_email:            3,  // D
  company_name:              4,  // E
  company_cnpj:              5,  // F
  order_address1:            6,  // G
  order_address2:            7,  // H
  order_address3:            8,  // I
  order_city:                9,  // J
  order_state:               10, // K
  order_zip_code:            11, // L
  order_payment_method:      12, // M
  order_installments:        13, // N
  order_vehicle:             14, // O
  item_sku:                  15, // P
  item_brand:                16, // Q
  item_part_number:          17, // R
  item_name:                 18, // S
  item_net_price:            19, // T
  item_quantity:             20, // U
  item_state:                21, // V
  item_merchant_state:       22, // W
  merchant_reference:        23, // X
  merchant_name:             24, // Y
  item_discount_display_name:25, // Z
  item_discount_value:       26, // AA
  item_nota_fiscal:          27, // AB
  item_refunded_date:        28, // AC
  order_canceled_total:      29, // AD
  order_discount_total:      30, // AE
  order_expense_total:       31, // AF
  order_grand_total:         32, // AG
  order_shipment_method_name:33, // AH
  order_settlement_date:     34, // AI
  order_created_at:          35, // AJ
  order_paid_date:           36, // AK
  store:                     37, // AL
  // PAD-01: item_chave_xml_nf — coluna futura (índice 38 / AM)
  // item_chave_xml_nf:      38, // AM
}

async function getAccessToken(env: Env): Promise<string> {
  const url = \`https://login.microsoftonline.com/\${env.SHAREPOINT_TENANT_ID}/oauth2/v2.0/token\`
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: env.SHAREPOINT_CLIENT_ID,
    client_secret: env.SHAREPOINT_CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
  })
  const res = await fetch(url, { method: 'POST', body })
  const data = await res.json() as { access_token: string }
  return data.access_token
}

async function downloadXlsx(token: string, fileUrl: string): Promise<ArrayBuffer> {
  // Converte URL do SharePoint para Graph API endpoint
  const encoded = encodeURIComponent(fileUrl)
  const graphUrl = \`https://graph.microsoft.com/v1.0/shares/u!\${btoa(fileUrl).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')}/driveItem/content\`
  const res = await fetch(graphUrl, {
    headers: { Authorization: \`Bearer \${token}\` }
  })
  if (!res.ok) throw new Error(\`Graph API error: \${res.status} \${await res.text()}\`)
  return res.arrayBuffer()
}

async function upsertToSupabase(rows: Record<string, unknown>[], env: Env): Promise<number> {
  const BATCH = 500
  let total = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const res = await fetch(\`\${env.SUPABASE_URL}/rest/v1/orders?on_conflict=id_sales_order,item_sku\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': \`Bearer \${env.SUPABASE_SERVICE_ROLE_KEY}\`,
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify(batch),
    })
    if (!res.ok) throw new Error(\`Supabase upsert error: \${res.status} \${await res.text()}\`)
    total += batch.length
  }
  return total
}

async function logSync(status: string, rows: number, error: string | null, env: Env) {
  await fetch(\`\${env.SUPABASE_URL}/rest/v1/sync_log\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': \`Bearer \${env.SUPABASE_SERVICE_ROLE_KEY}\`,
    },
    body: JSON.stringify({ status, rows_upserted: rows, error_message: error }),
  })
}

export default {
  // Cron trigger (configurar no wrangler.toml)
  async scheduled(_event: unknown, env: Env, _ctx: unknown): Promise<void> {
    console.log('[ReturnFlow Sync] Iniciando sync do order.xlsx...')
    try {
      // PAD-03: Descomentar quando App Registration estiver disponível
      // const token = await getAccessToken(env)
      // const buffer = await downloadXlsx(token, env.SHAREPOINT_FILE_URL)
      // TODO: parse com SheetJS e upsert
      // const rows = parseXlsx(buffer)
      // const total = await upsertToSupabase(rows, env)
      // await logSync('success', total, null, env)
      console.log('[ReturnFlow Sync] PAD-03 pendente — sync desabilitado até App Registration ZF')
      await logSync('error', 0, 'PAD-03 pendente: App Registration Azure AD ZF não configurado', env)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[ReturnFlow Sync] Erro:', msg)
      await logSync('error', 0, msg, env)
    }
  },

  // HTTP handler para trigger manual (desenvolvimento)
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('ReturnFlow Sync Worker — use POST para trigger manual', { status: 200 })
    }
    return new Response(JSON.stringify({ message: 'PAD-03 pendente' }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
