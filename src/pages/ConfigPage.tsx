import { useState, useRef } from 'react'
import { Upload, CheckCircle, AlertCircle, RefreshCw, FileSpreadsheet } from 'lucide-react'
import { parseOrderXlsx, upsertOrders } from '@/lib/orderSync'
import type { UpsertResult } from '@/lib/orderSync'

type UploadState = 'idle' | 'parsing' | 'uploading' | 'done' | 'error'

export default function ConfigPage() {
  const [state, setState] = useState<UploadState>('idle')
  const [result, setResult] = useState<UpsertResult | null>(null)
  const [parseInfo, setParseInfo] = useState<{ totalRows: number; skippedRows: number } | null>(null)
  const [progress, setProgress] = useState(0)
  const [fileName, setFileName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setErrorMsg('Selecione um arquivo .xlsx ou .xls')
      setState('error')
      return
    }

    setFileName(file.name)
    setErrorMsg('')
    setResult(null)
    setState('parsing')
    setProgress(10)

    try {
      const buffer = await file.arrayBuffer()
      setProgress(30)

      const parsed = parseOrderXlsx(buffer)
      setParseInfo({ totalRows: parsed.totalRows, skippedRows: parsed.skippedRows })
      setProgress(50)

      if (parsed.rows.length === 0) {
        setErrorMsg('Nenhuma linha válida encontrada na planilha. Verifique o formato.')
        setState('error')
        return
      }

      setState('uploading')
      setProgress(60)

      const res = await upsertOrders(parsed.rows)
      setProgress(100)
      setResult(res)
      setState(res.success ? 'done' : 'error')
      if (!res.success) setErrorMsg(res.errors.join('\n'))

    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Erro inesperado ao processar o arquivo')
      setState('error')
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function reset() {
    setState('idle')
    setResult(null)
    setParseInfo(null)
    setProgress(0)
    setFileName('')
    setErrorMsg('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const isProcessing = state === 'parsing' || state === 'uploading'

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-500 mt-1">Importação de pedidos e configurações do sistema</p>
      </div>

      {/* Upload manual do order.xlsx */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <FileSpreadsheet size={18} className="text-zf-blue" />
          <h2 className="font-semibold text-gray-900">Importar order.xlsx</h2>
          <span className="badge bg-blue-50 text-blue-700">Manual</span>
        </div>
        <p className="text-sm text-gray-500">
          Faça o download do <code className="bg-gray-100 px-1 rounded text-xs">order.xlsx</code> do SharePoint
          e importe aqui. Os pedidos serão sincronizados com o banco de dados.
        </p>

        {/* Dropzone */}
        {state === 'idle' && (
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-zf-blue hover:bg-zf-blue-light transition-colors"
          >
            <Upload size={32} className="mx-auto text-gray-400 mb-3" />
            <p className="text-sm font-medium text-gray-700">
              Arraste o arquivo aqui ou clique para selecionar
            </p>
            <p className="text-xs text-gray-400 mt-1">Suporte: .xlsx, .xls</p>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleChange}
            />
          </div>
        )}

        {/* Processando */}
        {isProcessing && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <RefreshCw size={15} className="animate-spin text-zf-blue" />
              {state === 'parsing'
                ? `Lendo ${fileName}...`
                : `Sincronizando ${parseInfo?.totalRows.toLocaleString('pt-BR')} linhas com o banco...`}
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-zf-blue h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">{progress}% concluído</p>
          </div>
        )}

        {/* Sucesso */}
        {state === 'done' && result && (
          <div className="space-y-3">
            <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
              <CheckCircle size={18} className="text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800">Importação concluída com sucesso</p>
                <p className="text-xs text-green-700 mt-1">
                  {result.rowsUpserted.toLocaleString('pt-BR')} linhas sincronizadas
                  {parseInfo && parseInfo.skippedRows > 0 && ` · ${parseInfo.skippedRows} ignoradas (sem Order ID ou SKU)`}
                  {' · '}{(result.duration / 1000).toFixed(1)}s
                </p>
              </div>
            </div>
            <button onClick={reset} className="btn-secondary text-sm">
              Importar outro arquivo
            </button>
          </div>
        )}

        {/* Erro */}
        {state === 'error' && (
          <div className="space-y-3">
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
              <AlertCircle size={18} className="text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">Erro na importação</p>
                <p className="text-xs text-red-700 mt-1 whitespace-pre-wrap">{errorMsg}</p>
              </div>
            </div>
            <button onClick={reset} className="btn-secondary text-sm">
              Tentar novamente
            </button>
          </div>
        )}

        {/* Instruções */}
        <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-500 space-y-1">
          <p className="font-medium text-gray-600">Como baixar o order.xlsx do SharePoint:</p>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>Acesse o SharePoint do [pro]Parts</li>
            <li>Navegue até <code className="bg-gray-200 px-1 rounded">[pro]Parts / Shared Documents</code></li>
            <li>Baixe o arquivo <code className="bg-gray-200 px-1 rounded">order.xlsx</code></li>
            <li>Importe aqui — recomendado 1x ao dia, preferencialmente pela manhã</li>
          </ol>
        </div>
      </div>

      {/* Placeholder SLA config */}
      <div className="card p-6 opacity-50">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="font-semibold text-gray-900">Configuração de SLA</h2>
          <span className="badge bg-gray-100 text-gray-500">Em breve</span>
        </div>
        <p className="text-sm text-gray-400">
          Configuração de dias úteis por coluna do Kanban — disponível na Sprint 2.
        </p>
      </div>
    </div>
  )
}
