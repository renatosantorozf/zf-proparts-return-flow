// Tipos gerados do schema Supabase
// Atualizar conforme o schema evolui

export interface Database {
  public: {
    Tables: {
      orders: {
        Row: {
          id: string
          id_sales_order: string
          customer_first_name: string | null
          customer_last_name: string | null
          customer_email: string | null
          company_name: string | null
          company_cnpj: string | null
          order_address1: string | null
          order_address2: string | null
          order_address3: string | null
          order_city: string | null
          order_state: string | null
          order_zip_code: string | null
          order_vehicle: string | null
          item_sku: string
          item_brand: string | null
          item_part_number: string | null
          item_name: string | null
          item_net_price: number | null
          item_quantity: number | null
          item_state: string | null
          item_merchant_state: string | null
          merchant_reference: string | null
          merchant_name: string | null
          item_nota_fiscal: string | null
          item_chave_xml_nf: string | null
          order_grand_total: number | null
          order_created_at: string | null
          order_paid_date: string | null
          store: string | null
          synced_at: string
        }
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'synced_at'>
        Update: Partial<Database['public']['Tables']['orders']['Insert']>
      }
      tickets: {
        Row: {
          id: string
          ticket_number: number
          order_id: string
          tipo: string
          subtipo: string | null
          status: string
          canal_entrada: string | null
          motivo: string
          company_name: string | null
          company_cnpj: string | null
          customer_email: string | null
          order_city: string | null
          order_state: string | null
          order_vehicle: string | null
          merchant_reference: string | null
          merchant_name: string | null
          numero_nf: string | null
          chave_xml_nf: string | null
          mei_status: string | null
          devolucao_tipo: string
          valor_total_devolucao: number | null
          created_by: string | null
          data_solicitacao: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['tickets']['Row'], 'id' | 'ticket_number' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['tickets']['Insert']>
      }
      sellers: {
        Row: {
          id: string
          merchant_reference: string
          merchant_name: string
          canal_preferencial: string | null
          contato_nome: string | null
          contato_email: string | null
          contato_whatsapp: string | null
          url_formulario: string | null
          instrucoes: string | null
          template_mensagem: string | null
          regras_excecao: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['sellers']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['sellers']['Insert']>
      }
      ticket_logs: {
        Row: {
          id: string
          ticket_id: string
          tipo: string
          mensagem: string
          created_by: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['ticket_logs']['Row'], 'id' | 'created_at'>
        Update: never
      }
      ticket_items: {
        Row: {
          id: string
          ticket_id: string
          item_sku: string
          item_brand: string | null
          item_part_number: string | null
          item_name: string | null
          item_net_price: number | null
          qtd_original: number
          qtd_devolvida: number
          valor_devolvido: number | null
          merchant_reference: string | null
          merchant_name: string | null
        }
        Insert: Omit<Database['public']['Tables']['ticket_items']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['ticket_items']['Insert']>
      }
      sla_config: {
        Row: {
          id: string
          status: string
          dias_uteis_max: number
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['sla_config']['Row'], 'id' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['sla_config']['Insert']>
      }
      sync_log: {
        Row: {
          id: string
          status: string
          rows_upserted: number | null
          error_message: string | null
          synced_at: string
        }
        Insert: Omit<Database['public']['Tables']['sync_log']['Row'], 'id' | 'synced_at'>
        Update: never
      }
    }
  }
}
