import { useState, useEffect, useRef } from 'react'
import { Upload, Paperclip, Trash2, FileText, Image, RefreshCw, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { db } from '@/lib/db'
import { useAuth } from '@/hooks/useAuth'
import { formatarDataHora } from '@/lib/dateUtils'

interface Attachment {
  id: string
  ticket_id: string
  file_name: string
  file_path: string
  file_size: number | null
  file_type: string | null
  uploaded_by: string | null
  created_at: string
}

interface TicketAttachmentsProps {
  ticketId: string
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function FileIcon({ type }: { type: string | null }) {
  if (type?.startsWith('image/')) return <Image size={16} className="text-blue-500" />
  return <FileText size={16} className="text-gray-400" />
}

export function TicketAttachments({ ticketId }: TicketAttachmentsProps) {
  const { user } = useAuth()
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<{ url: string; name: string; type: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    const { data } = await db
      .from('ticket_attachments')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: false })
    setAttachments((data ?? []) as Attachment[])
    setLoading(false)
  }

  useEffect(() => { load() }, [ticketId])

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setError('')

    for (const file of Array.from(files)) {
      // Validar tipo
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
      if (!allowed.includes(file.type)) {
        setError('Formato nao suportado. Use JPG, PNG, WEBP ou PDF.')
        continue
      }
      // Validar tamanho (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('Arquivo muito grande. Maximo 10MB.')
        continue
      }

      setUploading(true)
      setUploadProgress(20)

      try {
        const ext = file.name.split('.').pop()
        const path = `${ticketId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

        setUploadProgress(50)
        const { error: uploadErr } = await supabase.storage
          .from('ticket-attachments')
          .upload(path, file, { contentType: file.type })

        if (uploadErr) throw new Error(uploadErr.message)

        setUploadProgress(80)
        await db.from('ticket_attachments').insert({
          ticket_id: ticketId,
          file_name: file.name,
          file_path: path,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: user?.id ?? null,
        })

        setUploadProgress(100)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao fazer upload')
      }
    }

    setUploading(false)
    setUploadProgress(0)
    if (inputRef.current) inputRef.current.value = ''
    load()
  }

  async function handleDelete(attachment: Attachment) {
    if (!confirm('Remover este anexo?')) return
    await supabase.storage.from('ticket-attachments').remove([attachment.file_path])
    await db.from('ticket_attachments').delete().eq('id', attachment.id)
    load()
  }

  async function handlePreview(attachment: Attachment) {
    const { data } = await supabase.storage
      .from('ticket-attachments')
      .createSignedUrl(attachment.file_path, 60)
    if (data?.signedUrl) {
      setPreview({ url: data.signedUrl, name: attachment.file_name, type: attachment.file_type ?? '' })
    }
  }

  return (
    <div className="card p-5 space-y-4">
      <h2 className="font-semibold text-gray-800 flex items-center gap-2">
        <Paperclip size={16} /> Anexos
        {attachments.length > 0 && (
          <span className="badge bg-gray-100 text-gray-600 text-xs">{attachments.length}</span>
        )}
      </h2>

      {/* Dropzone */}
      <div
        onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
        onDragOver={e => e.preventDefault()}
        onClick={() => !uploading && inputRef.current?.click()}
        className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center cursor-pointer hover:border-zf-blue hover:bg-zf-blue-light transition-colors"
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,.pdf"
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
        {uploading ? (
          <div className="space-y-2">
            <RefreshCw size={20} className="mx-auto animate-spin text-zf-blue" />
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div className="bg-zf-blue h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }} />
            </div>
            <p className="text-xs text-gray-500">Enviando...</p>
          </div>
        ) : (
          <>
            <Upload size={20} className="mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 font-medium">Arraste ou clique para anexar</p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP, PDF · Max 10MB</p>
          </>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Lista de anexos */}
      {loading ? (
        <div className="flex justify-center py-4">
          <RefreshCw size={16} className="animate-spin text-gray-400" />
        </div>
      ) : attachments.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-2">Nenhum anexo ainda</p>
      ) : (
        <div className="space-y-2">
          {attachments.map(att => (
            <div key={att.id}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group">
              <FileIcon type={att.file_type} />
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => handlePreview(att)}
                  className="text-sm font-medium text-gray-800 hover:text-zf-blue truncate block text-left w-full"
                >
                  {att.file_name}
                </button>
                <p className="text-xs text-gray-400">
                  {formatBytes(att.file_size)}
                  {att.created_at && ` · ${formatarDataHora(att.created_at)}`}
                </p>
              </div>
              <button
                onClick={() => handleDelete(att)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 p-1"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal de preview */}
      {preview && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setPreview(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="font-medium text-gray-800 truncate">{preview.name}</p>
              <div className="flex items-center gap-2">
                <a href={preview.url} download={preview.name} target="_blank" rel="noopener noreferrer"
                  className="btn-secondary text-xs px-3 py-1.5">
                  Download
                </a>
                <button onClick={() => setPreview(null)} className="btn-ghost p-1.5">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="overflow-auto max-h-[calc(90vh-60px)]">
              {preview.type.startsWith('image/') ? (
                <img src={preview.url} alt={preview.name} className="w-full object-contain" />
              ) : (
                <iframe src={preview.url} className="w-full h-[70vh]" title={preview.name} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
