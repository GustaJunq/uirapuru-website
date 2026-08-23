"use client"

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, ChevronDown, LoaderCircle, LogOut, PanelLeft, Plus, Square } from "lucide-react"
import { api, ApiError, type ChatMessage, type Conversation, type Mode, type User } from "@/lib/uirapuru-api"
import { AuthDialog } from "@/components/auth-dialog"
import { ChatHistory } from "@/components/chat-history"
import { Button } from "@/components/ui/button"

const LOGO_URL = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/112%20Sem%20T_U00edtulo_20260718173634-C9PesHY7xP0RnzJ15CRlw6qjSsSyVG.png"
type AuthMode = "login" | "register" | null

function splitThinking(raw: string, complete = false) {
  const closingTag = "</think>"
  const closingIndex = raw.indexOf(closingTag)
  if (closingIndex === -1) return complete ? { thinking: null, content: raw.trim() } : { thinking: raw.replace(/^\s*<think>\s*/i, ""), content: "" }
  return { thinking: raw.slice(0, closingIndex).replace(/^\s*<think>\s*/i, "").trim(), content: raw.slice(closingIndex + closingTag.length).trimStart() }
}

export function UirapuruApp({ conversationId }: { conversationId?: string }) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>("UIRAPURU")
  const [authMode, setAuthMode] = useState<AuthMode>(null)
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState("")
  const [sessionReady, setSessionReady] = useState(false)
  const [prompt, setPrompt] = useState("")
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [pending, setPending] = useState(false)
  const [loadingConversation, setLoadingConversation] = useState(Boolean(conversationId))
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [error, setError] = useState("")
  const abortRef = useRef<AbortController | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const savedToken = sessionStorage.getItem("uirapuru_token")
    if (!savedToken) { setSessionReady(true); return }
    api.me(savedToken).then(({ user: savedUser }) => { setToken(savedToken); setUser(savedUser) }).catch(() => sessionStorage.removeItem("uirapuru_token")).finally(() => setSessionReady(true))
  }, [])

  useEffect(() => {
    if (!sessionReady || !conversationId) return
    if (!token) { setLoadingConversation(false); setAuthMode("login"); return }
    setLoadingConversation(true)
    api.getConversation(token, conversationId).then((loaded) => {
      setConversation(loaded)
      setMode(loaded.mode)
      setMessages((loaded.messages || []).map((message) => {
        if (message.role !== "ASSISTANT" || message.thinking) return message
        return { ...message, ...splitThinking(message.content, true) }
      }))
      setError("")
    }).catch((cause) => {
      if (cause instanceof ApiError && cause.status === 401) logout()
      setError(cause instanceof Error ? cause.message : "Não foi possível abrir esta conversa.")
    }).finally(() => setLoadingConversation(false))
  }, [conversationId, sessionReady, token])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages, pending])
  useEffect(() => () => abortRef.current?.abort(), [])

  async function loadHistory(activeToken = token) {
    if (!activeToken) return
    setHistoryLoading(true)
    try { setConversations(await api.listConversations(activeToken)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível carregar o histórico.") }
    finally { setHistoryLoading(false) }
  }

  function openHistory() { setHistoryOpen(true); void loadHistory() }
  function handleAuthenticated(nextUser: User, nextToken: string) {
    sessionStorage.setItem("uirapuru_token", nextToken)
    setUser(nextUser)
    setToken(nextToken)
    setAuthMode(null)
  }
  function logout() {
    abortRef.current?.abort()
    sessionStorage.removeItem("uirapuru_token")
    setUser(null); setToken(""); setConversation(null); setMessages([]); setConversations([])
    router.push("/")
  }
  async function renameConversation(item: Conversation) {
    const title = window.prompt("Novo nome da conversa", item.title)?.trim()
    if (!title || title === item.title) return
    try { await api.renameConversation(token, item.id, title); await loadHistory() }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível renomear.") }
  }
  async function deleteConversation(item: Conversation) {
    if (!window.confirm(`Excluir “${item.title}”?`)) return
    try {
      await api.deleteConversation(token, item.id)
      await loadHistory()
      if (item.id === conversationId) { setHistoryOpen(false); router.push("/") }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível excluir.") }
  }
  async function pollAgent(runId: string, signal: AbortSignal) {
    while (!signal.aborted) {
      const run = await api.getAgentRun(token, runId, signal)
      if (run.status === "COMPLETED") return run.finalOutput || "Tarefa concluída."
      if (run.status === "FAILED") throw new ApiError(run.error || "O João-de-barro não conseguiu concluir a tarefa.")
      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(resolve, 1800)
        signal.addEventListener("abort", () => { window.clearTimeout(timeout); reject(new DOMException("Aborted", "AbortError")) }, { once: true })
      })
    }
    throw new DOMException("Aborted", "AbortError")
  }
  async function sendMessage(messageText: string) {
    if (!token) { setAuthMode("login"); return }
    if (pending || !messageText.trim()) return
    const text = messageText.trim()
    setPrompt(""); setError(""); setPending(true)
    const controller = new AbortController(); abortRef.current = controller
    let activeConversation = conversation
    try {
      if (!activeConversation) {
        activeConversation = await api.createConversation(token, { title: text.slice(0, 54), mode })
        setConversation(activeConversation)
        router.replace(`/chat/${activeConversation.id}`)
      }
      setMessages((current) => [...current, { role: "USER", content: text }, { role: "ASSISTANT", content: "" }])
      if (activeConversation.mode === "UIRAPURU") {
        let streamed = ""
        const final = await api.streamMessage(token, activeConversation.id, text, (piece) => {
          streamed += piece
          const parsed = splitThinking(streamed)
          setMessages((current) => current.map((item, index) => index === current.length - 1 ? { ...item, ...parsed } : item))
        }, controller.signal)
        const completeResponse = streamed || final
        if (completeResponse) {
          const parsed = splitThinking(completeResponse, true)
          setMessages((current) => current.map((item, index) => index === current.length - 1 ? { ...item, ...parsed } : item))
        }
      } else {
        const { agentRunId } = await api.startAgent(token, activeConversation.id, text, controller.signal)
        const parsed = splitThinking(await pollAgent(agentRunId, controller.signal), true)
        setMessages((current) => current.map((item, index) => index === current.length - 1 ? { ...item, ...parsed } : item))
      }
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") {
        setMessages((current) => current.filter((item, index) => !(index === current.length - 1 && !item.content)))
        return
      }
      setError(cause instanceof Error ? cause.message : "Não foi possível gerar a resposta.")
      setMessages((current) => current.filter((item, index) => !(index === current.length - 1 && !item.content)))
      if (cause instanceof ApiError && cause.status === 401) logout()
    } finally { setPending(false); abortRef.current = null }
  }
  function submit(event: FormEvent) { event.preventDefault(); void sendMessage(prompt) }
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); void sendMessage(prompt) }
  }
  function changeMode(nextMode: Mode) { if (!pending && !conversationId) { setMode(nextMode); setConversation(null); setMessages([]); setError("") } }

  const routeChat = Boolean(conversationId || conversation)
  const logo = mode === "UIRAPURU" ? LOGO_URL : "/images/joao-de-barro.svg"
  return (
    <main className={`relative flex min-h-svh flex-col overflow-hidden bg-background text-foreground ${mode === "JOAO_DE_BARRO" ? "joao-theme" : ""}`}>
      {routeChat ? (
        <header className="chat-header relative flex h-16 shrink-0 items-center justify-center px-4">
          <button type="button" onClick={openHistory} className="history-trigger absolute left-4" aria-label="Abrir histórico"><PanelLeft /></button>
          <img src={logo} alt={mode === "UIRAPURU" ? "Uirapuru" : "João-de-barro"} className={mode === "UIRAPURU" ? "h-auto w-32 object-contain" : "h-auto w-44 object-contain"} />
        </header>
      ) : (
        <header className="relative flex w-full items-center justify-between px-4 py-4 md:px-8 md:py-5">
          <div className="flex flex-1 justify-start">
            {user && <button type="button" onClick={openHistory} className="history-trigger" aria-label="Abrir histórico"><PanelLeft /></button>}
          </div>
          <nav aria-label="Escolha do modelo" className="model-switch flex items-center rounded-full bg-secondary p-1.5">
            <button type="button" onClick={() => changeMode("UIRAPURU")} aria-pressed={mode === "UIRAPURU"} className="model-option rounded-full px-4 py-1.5 text-sm font-medium">Uirapuru Chat</button>
            <button type="button" onClick={() => changeMode("JOAO_DE_BARRO")} aria-pressed={mode === "JOAO_DE_BARRO"} className="model-option rounded-full px-4 py-1.5 text-sm font-medium">João-de-barro</button>
          </nav>
          <div className="flex flex-1 justify-end gap-2">
            {user ? <Button variant="outline" size="sm" onClick={logout} aria-label="Sair"><LogOut data-icon="inline-start" />Sair</Button> : <><Button variant="outline" onClick={() => setAuthMode("login")} className="rounded-full">Entrar</Button><Button onClick={() => setAuthMode("register")} className="rounded-full bg-account text-account-foreground hover:bg-account/90">Criar Conta</Button></>}
          </div>
        </header>
      )}

      {routeChat ? (
        <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden px-5" aria-label="Conversa">
          <div className="chat-scroll flex flex-1 flex-col gap-6 overflow-y-auto pb-8 pt-8 md:px-1" aria-live="polite">
            {loadingConversation ? <div className="flex flex-1 items-center justify-center text-muted-foreground"><LoaderCircle className="size-5 animate-spin" /><span className="sr-only">Carregando conversa</span></div> : messages.map((message, index) => <MessageRow key={message.id || `${message.role}-${index}`} message={message} mode={mode} />)}
            {!loadingConversation && error && messages.length === 0 && <div className="m-auto text-center"><p className="text-sm text-muted-foreground">{error}</p><Button variant="outline" className="mt-4 rounded-full" onClick={() => router.push("/")}>Nova conversa</Button></div>}
            <div ref={bottomRef} />
          </div>
          <Composer prompt={prompt} setPrompt={setPrompt} pending={pending} mode={mode} submit={submit} onKeyDown={handleKeyDown} stop={() => abortRef.current?.abort()} compact />
          {error && messages.length > 0 && <p role="alert" className="pb-2 text-center text-sm text-muted-foreground">{error} <button className="underline underline-offset-4" onClick={() => setError("")}>Fechar</button></p>}
          <Legal mode={mode} />
        </section>
      ) : (
        <section className="flex flex-1 flex-col items-center px-4">
          <div className="hero-enter flex w-full flex-1 flex-col items-center justify-center gap-9 pb-24">
            <img src={logo} alt={mode === "UIRAPURU" ? "Uirapuru" : "João-de-barro"} className={mode === "UIRAPURU" ? "brand-logo h-auto w-52 object-contain" : "brand-logo joao-logo h-auto w-72 object-contain"} />
            <Composer prompt={prompt} setPrompt={setPrompt} pending={pending} mode={mode} submit={submit} onKeyDown={handleKeyDown} stop={() => abortRef.current?.abort()} />
            {error && <p role="alert" className="max-w-xl text-center text-sm text-muted-foreground">{error}</p>}
          </div>
          <Legal mode={mode} />
        </section>
      )}
      <ChatHistory open={historyOpen} activeId={conversationId} conversations={conversations} loading={historyLoading} onClose={() => setHistoryOpen(false)} onRename={renameConversation} onDelete={deleteConversation} />
      <AuthDialog mode={authMode} onOpenChange={(open) => !open && setAuthMode(null)} onAuthenticated={handleAuthenticated} />
    </main>
  )
}

function MessageRow({ message, mode }: { message: ChatMessage; mode: Mode }) {
  return <article className={message.role === "USER" ? "flex justify-end" : "flex justify-start"}>
    <div className={message.role === "USER" ? "max-w-[78%] rounded-3xl rounded-br-lg bg-account px-5 py-3 text-sm leading-relaxed text-account-foreground" : "flex max-w-[74%] flex-col gap-3 py-2 text-sm leading-relaxed text-foreground"}>
      {message.role === "ASSISTANT" && message.thinking && <details className="group rounded-xl border border-border bg-secondary/40 px-4 py-3" open><summary className="cursor-pointer font-medium text-muted-foreground">Pensamento</summary><p className="mt-2 whitespace-pre-wrap text-muted-foreground">{message.thinking}</p></details>}
      {message.content ? <p className="whitespace-pre-wrap">{message.content}</p> : !message.thinking && <span className="flex items-center gap-2 text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />{mode === "UIRAPURU" ? "Pensando..." : "João-de-barro está trabalhando..."}</span>}
    </div>
  </article>
}

function Composer({ prompt, setPrompt, pending, mode, submit, onKeyDown, stop, compact = false }: { prompt: string; setPrompt: (value: string) => void; pending: boolean; mode: Mode; submit: (event: FormEvent) => void; onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void; stop: () => void; compact?: boolean }) {
  return <form onSubmit={submit} className={`${compact ? "composer mb-3 flex w-full items-center" : "composer flex w-full max-w-[700px] items-center"}`}>
    <button type="button" className="flex size-12 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:text-primary" aria-label="Adicionar arquivo" title="Envio de arquivos estará disponível em breve"><Plus className="size-7" /></button>
    <label htmlFor="message" className="sr-only">Sua mensagem</label>
    <input id="message" value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={onKeyDown} disabled={pending} autoComplete="off" placeholder={mode === "UIRAPURU" ? "Manda a boa!" : "Aqui nóis se ajuda, né! Trabalhe com seu copiloto."} className="h-12 min-w-0 flex-1 bg-transparent px-2 text-[15px] tracking-[-0.01em] outline-none placeholder:text-muted-foreground disabled:opacity-70" />
    {mode === "UIRAPURU" && <div className="hidden shrink-0 items-center gap-2 pr-3 text-base sm:flex"><span className="text-foreground">U1</span><span className="text-muted-foreground">High</span><ChevronDown className="size-5" /></div>}
    <button type={pending ? "button" : "submit"} onClick={pending ? stop : undefined} disabled={!pending && !prompt.trim()} className="mr-2 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-45" aria-label={pending ? "Parar geração" : "Enviar mensagem"}>{pending ? <Square className="size-4 fill-current" /> : <ArrowRight className="size-5" />}</button>
  </form>
}

function Legal({ mode }: { mode: Mode }) { return <p className="pb-2 text-center text-[9px] leading-relaxed text-muted-foreground sm:text-[10px]">Ao trabalhar com {mode === "UIRAPURU" ? "Uirapuru" : "Uirapuru/João-de-barro"}, você confirma com nossos <a href="#" className="text-foreground hover:underline">TOS</a> e nossa <a href="#" className="text-foreground hover:underline">Política de Privacidade.</a></p> }
