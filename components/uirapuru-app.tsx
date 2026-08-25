"use client"

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Check, ChevronDown, Copy, LoaderCircle, LogOut, PanelLeft, Plus, Search, Share2, Square } from "lucide-react"
import { api, ApiError, type ChatMessage, type Conversation, type ToolCall, type User } from "@/lib/uirapuru-api"
import { AuthDialog } from "@/components/auth-dialog"
import { ChatHistory } from "@/components/chat-history"
import { Button } from "@/components/ui/button"

const LOGO_URL = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/112%20Sem%20T_U00edtulo_20260718173634-C9PesHY7xP0RnzJ15CRlw6qjSsSyVG.png"
type AuthMode = "login" | "register" | null

function splitThinking(raw: string, complete = false) {
  const closingTag = "</think>"
  const closingIndex = raw.indexOf(closingTag)

  if (closingIndex === -1) {
    return complete
      ? { thinking: null, content: raw.trim() }
      : { thinking: raw.replace(/^\s*<think>\s*/i, ""), content: "" }
  }

  return {
    thinking: raw.slice(0, closingIndex).replace(/^\s*<think>\s*/i, "").trim(),
    content: raw.slice(closingIndex + closingTag.length).trimStart(),
  }
}

export function UirapuruApp({ initialConversationId }: { initialConversationId?: string } = {}) {
  const router = useRouter()
  const [authMode, setAuthMode] = useState<AuthMode>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [prompt, setPrompt] = useState("")
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState("")
  const [sharing, setSharing] = useState(false)
  const [copied, setCopied] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // A sessão vive num cookie httpOnly (o JS não consegue ler nem escrever
    // nele) - "credentials: include" dentro de api.me() já manda o cookie
    // automaticamente se ele existir. Isso só confirma se tem sessão válida.
    api.me().then(({ user: savedUser }) => {
      setUser(savedUser)
    }).catch(() => {}).finally(() => setAuthChecked(true))
  }, [])

  useEffect(() => {
    if (!user) { setConversations([]); return }
    setHistoryLoading(true)
    api.listConversations()
      .then(setConversations)
      .catch(() => {})
      .finally(() => setHistoryLoading(false))
  }, [user])

  // Abre a conversa da URL (/chat/[id]) assim que soubermos se o usuário está logado
  useEffect(() => {
    if (!initialConversationId || !authChecked) return
    if (conversation?.id === initialConversationId) return
    if (!user) { setAuthMode("login"); return }
    openConversation(initialConversationId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialConversationId, authChecked, user])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages, pending])
  useEffect(() => () => abortRef.current?.abort(), [])
  useEffect(() => { if (!shareUrl) return; setCopied(false) }, [shareUrl])

  function refreshHistory() {
    api.listConversations().then(setConversations).catch(() => {})
  }

  function handleAuthenticated(nextUser: User) {
    setUser(nextUser)
  }

  function logout() {
    abortRef.current?.abort()
    api.logout().catch(() => {}) // limpa o cookie no servidor; segue o fluxo mesmo se falhar
    setUser(null)
    setConversation(null)
    setMessages([])
    setConversations([])
    setHistoryOpen(false)
    setShareUrl("")
    router.push("/")
  }

  function startNewConversation() {
    abortRef.current?.abort()
    setConversation(null)
    setMessages([])
    setError("")
    setHistoryOpen(false)
    setShareUrl("")
    router.push("/")
  }

  async function openConversation(id: string) {
    if (!user) return
    if (conversation?.id === id) { setHistoryOpen(false); return }
    abortRef.current?.abort()
    setError("")
    setShareUrl("")
    try {
      const full = await api.getConversation(id)
      setConversation(full)
      setMessages(full.messages || [])
      router.push(`/chat/${id}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível abrir essa conversa.")
      if (cause instanceof ApiError && cause.status === 401) logout()
    } finally {
      setHistoryOpen(false)
    }
  }

  async function renameConversationById(target: Conversation) {
    if (!user) return
    const nextTitle = window.prompt("Novo título da conversa:", target.title)?.trim()
    if (!nextTitle || nextTitle === target.title) return
    try {
      const updated = await api.renameConversation(target.id, nextTitle)
      setConversations((current) => current.map((item) => item.id === updated.id ? updated : item))
      setConversation((current) => current?.id === updated.id ? { ...current, title: updated.title } : current)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível renomear a conversa.")
    }
  }

  async function deleteConversationById(target: Conversation) {
    if (!user) return
    if (!window.confirm(`Excluir "${target.title}"? Essa ação não pode ser desfeita.`)) return
    try {
      await api.deleteConversation(target.id)
      setConversations((current) => current.filter((item) => item.id !== target.id))
      if (conversation?.id === target.id) {
        setConversation(null)
        setMessages([])
        setShareUrl("")
        router.push("/")
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível excluir a conversa.")
    }
  }

  async function shareCurrentConversation() {
    if (!user || !conversation) return
    setSharing(true)
    setError("")
    try {
      const { shareSlug } = await api.shareConversation(conversation.id)
      const url = `${window.location.origin}/c/${shareSlug}`
      setShareUrl(url)
      try {
        await navigator.clipboard.writeText(url)
        setCopied(true)
      } catch {
        // clipboard pode não estar disponível (ex: http, permissão negada) - o link ainda fica visível pra copiar manualmente
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível gerar o link de compartilhamento.")
    } finally {
      setSharing(false)
    }
  }

  async function sendMessage(messageText: string) {
    if (!user) { setAuthMode("login"); return }
    if (pending || !messageText.trim()) return
    const text = messageText.trim()
    setPrompt("")
    setError("")
    setPending(true)
    const controller = new AbortController()
    abortRef.current = controller
    let activeConversation = conversation
    try {
      if (!activeConversation) {
        activeConversation = await api.createConversation({ title: text.slice(0, 54) })
        setConversation(activeConversation)
        setMessages([])
        refreshHistory()
        router.push(`/chat/${activeConversation.id}`)
      }
      setMessages((current) => [...current, { role: "USER", content: text }, { role: "ASSISTANT", content: "", toolCalls: [] }])
      let streamed = ""
      const final = await api.streamMessage(activeConversation.id, text, {
        onToken: (piece) => {
          streamed += piece
          const parsed = splitThinking(streamed)
          setMessages((current) => current.map((item, index) => index === current.length - 1 ? { ...item, ...parsed } : item))
        },
        onToolCall: (toolCall) => {
          setMessages((current) => current.map((item, index) => {
            if (index !== current.length - 1) return item
            const toolCalls = [...(item.toolCalls || []), { id: toolCall.id, name: toolCall.name, args: toolCall.args, status: "calling" as const }]
            return { ...item, toolCalls }
          }))
        },
        onToolResult: (toolResult) => {
          setMessages((current) => current.map((item, index) => {
            if (index !== current.length - 1) return item
            const toolCalls = (item.toolCalls || []).map((call) => call.id === toolResult.id ? { ...call, result: toolResult.result, status: "done" as const } : call)
            return { ...item, toolCalls }
          }))
        },
      }, controller.signal)
      const completeResponse = streamed || final
      if (completeResponse) {
        const parsed = splitThinking(completeResponse, true)
        setMessages((current) => current.map((item, index) => index === current.length - 1 ? { ...item, ...parsed } : item))
      }
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") {
        setMessages((current) => current.filter((item, index) => !(index === current.length - 1 && !item.content)))
        return
      }
      const message = cause instanceof Error ? cause.message : "Não foi possível gerar a resposta."
      setError(message)
      setMessages((current) => current.filter((item, index) => !(index === current.length - 1 && !item.content)))
      if (cause instanceof ApiError && cause.status === 401) logout()
    } finally {
      setPending(false)
      abortRef.current = null
      refreshHistory()
    }
  }

  function submit(event: FormEvent) { event.preventDefault(); void sendMessage(prompt) }
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); void sendMessage(prompt) }
  }
  function stop() { abortRef.current?.abort() }

  const hasChat = messages.length > 0
  return (
    <main className="relative flex min-h-svh flex-col overflow-hidden bg-background text-foreground">
      <header className="flex w-full items-center justify-between gap-2 px-4 py-4 md:px-8 md:py-5">
        <div className="flex flex-1 items-center gap-2">
          {user && <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)} aria-label="Abrir histórico" className="shrink-0"><PanelLeft className="size-4" /><span className="hidden sm:inline">Histórico</span></Button>}
          {user && conversation && (
            <Button variant="outline" size="sm" onClick={shareCurrentConversation} disabled={sharing} aria-label="Compartilhar conversa" className="shrink-0">
              {sharing ? <LoaderCircle className="size-4 animate-spin" /> : <Share2 className="size-4" />}
              <span className="hidden sm:inline">Compartilhar</span>
            </Button>
          )}
        </div>
        <div className="flex flex-1 shrink-0 justify-end gap-2">
          {user ? <><span className="hidden self-center text-sm text-muted-foreground lg:block">@{user.username}</span><Button variant="outline" size="sm" onClick={logout} aria-label="Sair" className="shrink-0"><LogOut className="size-4" /></Button></> : <><Button variant="outline" size="sm" onClick={() => setAuthMode("register")} className="shrink-0">Criar conta</Button><Button onClick={() => setAuthMode("login")} size="sm" className="shrink-0">Entrar</Button></>}
        </div>
      </header>
      {shareUrl && (
        <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-4 pb-2 text-xs text-muted-foreground">
          <span className="truncate">{copied ? "Link copiado! " : ""}Qualquer pessoa com esse link pode ver esta conversa (não listada publicamente):</span>
          <a href={shareUrl} target="_blank" rel="noreferrer" className="shrink-0 truncate underline underline-offset-2 hover:text-foreground">{shareUrl}</a>
          <button type="button" onClick={async () => { await navigator.clipboard.writeText(shareUrl).catch(() => {}); setCopied(true) }} className="history-icon-button shrink-0" aria-label="Copiar link">
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          </button>
          <button type="button" onClick={() => setShareUrl("")} className="history-icon-button shrink-0" aria-label="Fechar"><ChevronDown className="size-3.5 rotate-180" /></button>
        </div>
      )}

      {hasChat ? (
        <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden px-4 pt-8" aria-label="Conversa">
          <div className="chat-scroll flex flex-1 flex-col gap-6 overflow-y-auto pb-6" aria-live="polite">
            {messages.map((message, index) => (
              <article key={`${message.role}-${index}`} className={message.role === "USER" ? "flex justify-end" : "flex justify-start"}>
                <div className={message.role === "USER" ? "max-w-[82%] rounded-3xl rounded-br-md bg-secondary px-5 py-3 text-sm leading-relaxed" : "flex max-w-[92%] flex-col gap-3 px-1 py-2 text-sm leading-relaxed"}>
                  {message.role === "ASSISTANT" && message.toolCalls && message.toolCalls.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {message.toolCalls.map((call) => <ToolCallCard key={call.id} call={call} />)}
                    </div>
                  )}
                  {message.role === "ASSISTANT" && message.thinking && (
                    <details className="group rounded-xl border border-border bg-secondary/40 px-4 py-3" open={!message.content}>
                      <summary className="cursor-pointer font-medium text-muted-foreground">Pensamento</summary>
                      <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{message.thinking}</p>
                    </details>
                  )}
                  {message.content ? <p className="whitespace-pre-wrap">{message.content}</p> : !message.thinking && !(message.toolCalls && message.toolCalls.length > 0) && <span className="flex items-center gap-2 text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />Gerando...</span>}
                </div>
              </article>
            ))}
            <div ref={bottomRef} />
          </div>
          <Composer prompt={prompt} setPrompt={setPrompt} pending={pending} submit={submit} onKeyDown={handleKeyDown} stop={stop} compact />
          {error && <p role="alert" className="pb-2 text-center text-sm text-destructive">{error} <button className="underline underline-offset-4" onClick={() => setError("")}>Fechar</button></p>}
          <Legal />
        </section>
      ) : (
        <section className="flex flex-1 flex-col items-center px-4">
          <div className="hero-enter flex w-full flex-1 flex-col items-center justify-center gap-9 pb-24">
            <img
              src={LOGO_URL}
              alt="Uirapuru"
              className="brand-logo h-auto w-52 object-contain"
            />
            <Composer prompt={prompt} setPrompt={setPrompt} pending={pending} submit={submit} onKeyDown={handleKeyDown} stop={stop} />
            {error && <p role="alert" className="max-w-xl text-center text-sm text-destructive">{error}</p>}
          </div>
          <Legal />
        </section>
      )}
      <AuthDialog mode={authMode} onOpenChange={(open) => !open && setAuthMode(null)} onSwitchMode={setAuthMode} onAuthenticated={handleAuthenticated} />
      {user && (
        <ChatHistory
          open={historyOpen}
          activeId={conversation?.id}
          conversations={conversations}
          loading={historyLoading}
          onClose={() => setHistoryOpen(false)}
          onRename={renameConversationById}
          onDelete={deleteConversationById}
          onSelectConversation={openConversation}
          onNewConversation={startNewConversation}
        />
      )}
    </main>
  )
}

function ToolCallCard({ call }: { call: ToolCall }) {
  const query = typeof call.args?.query === "string" ? call.args.query : null
  const result = call.result as { error?: string; results?: { title?: string | null; link?: string | null }[] } | undefined
  const items = result?.results?.slice(0, 4) || []

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-secondary/40 px-4 py-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        {call.status === "calling" ? <LoaderCircle className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
        <span className="font-medium">{call.status === "calling" ? "Pesquisando" : "Pesquisou"}{query ? `: "${query}"` : ""}</span>
      </div>
      {call.status === "done" && result?.error && <p className="text-xs text-destructive">{result.error}</p>}
      {call.status === "done" && items.length > 0 && (
        <ul className="flex flex-col gap-1">
          {items.map((item, index) => (
            <li key={index} className="truncate text-xs text-muted-foreground">
              {item.link ? <a href={item.link} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">{item.title || item.link}</a> : (item.title || "")}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Composer({ prompt, setPrompt, pending, submit, onKeyDown, stop, compact = false }: { prompt: string; setPrompt: (value: string) => void; pending: boolean; submit: (event: FormEvent) => void; onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void; stop: () => void; compact?: boolean }) {
  return <form onSubmit={submit} className={compact ? "composer mb-3 flex w-full items-center" : "composer flex w-full items-center"}>
    <button type="button" className="flex size-12 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:text-primary" aria-label="Adicionar arquivo" title="Enviar arquivo"><Plus className="size-5" /></button>
    <label htmlFor="message" className="sr-only">Sua mensagem</label>
    <input id="message" value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={onKeyDown} disabled={pending} autoComplete="off" placeholder="Manda aí, passarinho!" className="flex flex-1 bg-transparent px-1 py-2 text-sm outline-none placeholder:text-muted-foreground" />
    <div className="hidden shrink-0 items-center gap-2 pr-3 text-base sm:flex"><span className="text-foreground">U1</span><span className="text-muted-foreground">High</span></div>
    <button type={pending ? "button" : "submit"} onClick={pending ? stop : undefined} disabled={!pending && !prompt.trim()} className="mr-2 flex size-9 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:text-primary disabled:opacity-50 disabled:hover:text-foreground">{pending ? <Square className="size-4 fill-current" /> : <ArrowRight className="size-4" />}</button>
  </form>
}

function Legal() { return <p className="pb-2 text-center text-[9px] leading-relaxed text-muted-foreground sm:text-[10px]">Ao trabalhar com Uirapuru, você concorda em revisar as respostas antes de usar para tarefas críticas.</p> }
