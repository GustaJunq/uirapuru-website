import { Link } from "react-router-dom"
import { MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react"
import type { Conversation } from "@/lib/uirapuru-api"

export function ChatHistory({ open, activeId, conversations, loading, onClose, onRename, onDelete, onSelectConversation }: {
  open: boolean
  activeId?: string
  conversations: Conversation[]
  loading: boolean
  onClose: () => void
  onRename: (conversation: Conversation) => void
  onDelete: (conversation: Conversation) => void
  onSelectConversation: (id: string) => void
}) {
  return (
    <>
      {open && <button type="button" className="history-scrim" aria-label="Fechar histórico" onClick={onClose} />}
      <aside className="history-panel" data-open={open} aria-hidden={!open}>
        <div className="flex items-center justify-between px-4 py-4">
          <p className="text-sm font-semibold tracking-tight">Histórico</p>
          <button type="button" onClick={onClose} className="history-icon-button" aria-label="Fechar histórico"><X /></button>
        </div>
        <div className="px-3">
          <Link to="/chat" onClick={onClose} className="flex h-11 items-center gap-3 rounded-xl border border-border px-3 text-sm font-medium transition-colors hover:bg-secondary">
            <Plus className="size-4" /> Nova conversa
          </Link>
        </div>
        <div className="chat-scroll flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
          {loading ? <p className="px-3 py-4 text-sm text-muted-foreground">Carregando conversas...</p> : conversations.length === 0 ? <p className="px-3 py-4 text-sm leading-relaxed text-muted-foreground">Suas conversas aparecerão aqui.</p> : conversations.map((conversation) => (
            <div key={conversation.id} className="history-item" data-active={conversation.id === activeId}>
              <button type="button" onClick={() => { onSelectConversation(conversation.id); onClose(); }} className="min-w-0 flex-1 px-3 py-2.5 text-left">
                <span className="block truncate text-sm font-medium">{conversation.title}</span>
              </button>
              <details className="relative mr-1">
                <summary className="history-icon-button list-none" aria-label={`Ações de ${conversation.title}`}><MoreHorizontal /></summary>
                <div className="history-menu">
                  <button type="button" onClick={() => onRename(conversation)}><Pencil /> Renomear</button>
                  <button type="button" onClick={() => onDelete(conversation)}><Trash2 /> Excluir</button>
                </div>
              </details>
            </div>
          ))}
        </div>
      </aside>
    </>
  )
}
