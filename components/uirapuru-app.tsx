"use client"

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react"
import { ArrowRight, ChevronDown, LoaderCircle, LogOut, Plus, Square } from "lucide-react"
import { api, ApiError, type ChatMessage, type Conversation, type Mode, type User } from "@/lib/uirapuru-api"
import { AuthDialog } from "@/components/auth-dialog"
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

export function UirapuruApp() {
  const [mode, setMode] = useState<Mode>("UIRAPURU")
  const [authMode, setAuthMode] = useState<AuthMode>(null)
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState("")
  const [prompt, setPrompt] = useState("")
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const abortRef = useRef<AbortController | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const savedToken = sessionStorage.getItem("uirapuru_token")
    if (!savedToken) return
    api.me(savedToken).then(({ user: savedUser }) => {
      setToken(savedToken)
      setUser(savedUser)
    }).catch(() => sessionStorage.removeItem("uirapuru_token"))
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages, pending])
  useEffect(() => () => abortRef.current?.abort(), [])

  function handleAuthenticated(nextUser: User, nextToken: string) {
    sessionStorage.setItem("uirapuru_token", nextToken)
    setUser(nextUser)
    setToken(nextToken)
  }

  function logout() {
    abortRef.current?.abort()
    sessionStorage.removeItem("uirapuru_token")
    setUser(null)
    setToken("")
    setConversation(null)
    setMessages([])
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
    setPrompt("")
    setError("")
    setPending(true)
    const controller = new AbortController()
    abortRef.current = controller
    let activeConversation = conversation
    try {
      if (!activeConversation || activeConversation.mode !== mode) {
        activeConversation = await api.createConversation(token, { title: text.slice(0, 54), mode })
        setConversation(activeConversation)
        setMessages([])
      }
      setMessages((current) => [...current, { role: "USER", content: text }, { role: "ASSISTANT", content: "" }])
      if (mode === "UIRAPURU") {
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
        const output = await pollAgent(agentRunId, controller.signal)
        const parsed = splitThinking(output, true)
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
    }
  }

  function submit(event: FormEvent) { event.preventDefault(); void sendMessage(prompt) }
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); void sendMessage(prompt) }
  }
  function stop() { abortRef.current?.abort() }
  function changeMode(nextMode: Mode) {
    if (pending) return
    setMode(nextMode)
    setConversation(null)
    setMessages([])
    setError("")
  }

  const hasChat = messages.length > 0
  return (
    <main className="relative flex min-h-svh flex-col overflow-hidden bg-background text-foreground">
      <header className="flex w-full items-center justify-between px-5 py-3 md:px-8">
        <div className="hidden flex-1 md:block" />
        <nav aria-label="Escolha do modelo" className="model-switch flex items-center rounded-full bg-secondary p-1">
          <button type="button" onClick={() => changeMode("UIRAPURU")} aria-pressed={mode === "UIRAPURU"} className="model-option rounded-full px-4 py-1.5 text-sm font-medium">Uirapuru Chat</button>
          <button type="button" onClick={() => changeMode("JOAO_DE_BARRO")} aria-pressed={mode === "JOAO_DE_BARRO"} className="model-option rounded-full px-4 py-1.5 text-sm font-medium">João-de-barro</button>
        </nav>
        <div className="flex flex-1 justify-end gap-2">
          {user ? <><span className="hidden self-center text-sm text-muted-foreground lg:block">@{user.username}</span><Button variant="outline" size="sm" onClick={logout} aria-label="Sair"><LogOut data-icon="inline-start" />Sair</Button></> : <><Button variant="outline" onClick={() => setAuthMode("login")} className="rounded-full">Entrar</Button><Button onClick={() => setAuthMode("register")} className="rounded-full bg-account text-account-foreground hover:bg-account/90">Criar Conta</Button></>}
        </div>
      </header>

      {hasChat ? (
        <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden px-4 pt-6" aria-label="Conversa">
          <div className="chat-scroll flex flex-1 flex-col gap-5 overflow-y-auto pb-5" aria-live="polite">
            {messages.map((message, index) => (
              <article key={`${message.role}-${index}`} className={message.role === "USER" ? "flex justify-end" : "flex justify-start"}>
                <div className={message.role === "USER" ? "max-w-[82%] rounded-3xl rounded-br-md bg-secondary px-5 py-3 text-sm leading-relaxed" : "flex max-w-[92%] flex-col gap-3 px-1 py-2 text-sm leading-relaxed text-foreground"}>
                  {message.role === "ASSISTANT" && message.thinking && (
                    <details className="group rounded-xl border border-border bg-secondary/40 px-4 py-3" open={!message.content}>
                      <summary className="cursor-pointer font-medium text-muted-foreground">Pensamento</summary>
                      <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{message.thinking}</p>
                    </details>
                  )}
                  {message.content ? <p className="whitespace-pre-wrap">{message.content}</p> : !message.thinking && <span className="flex items-center gap-2 text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />{mode === "UIRAPURU" ? "Pensando..." : "João-de-barro está trabalhando..."}</span>}
                </div>
              </article>
            ))}
            <div ref={bottomRef} />
          </div>
          <Composer prompt={prompt} setPrompt={setPrompt} pending={pending} mode={mode} submit={submit} onKeyDown={handleKeyDown} stop={stop} compact />
          {error && <p role="alert" className="pb-2 text-center text-sm text-destructive">{error} <button className="underline underline-offset-4" onClick={() => setError("")}>Fechar</button></p>}
          <Legal />
        </section>
      ) : (
        <section className="flex flex-1 flex-col items-center px-4">
          <div className="flex w-full flex-1 flex-col items-center justify-center gap-7 pb-24">
            <img src={LOGO_URL} alt="Uirapuru" className="brand-logo h-auto w-52 object-contain" />
            <Composer prompt={prompt} setPrompt={setPrompt} pending={pending} mode={mode} submit={submit} onKeyDown={handleKeyDown} stop={stop} />
            {error && <p role="alert" className="max-w-xl text-center text-sm text-destructive">{error}</p>}
          </div>
          <Legal />
        </section>
      )}
      <AuthDialog mode={authMode} onOpenChange={(open) => !open && setAuthMode(null)} onAuthenticated={handleAuthenticated} />
    </main>
  )
}

function Composer({ prompt, setPrompt, pending, mode, submit, onKeyDown, stop, compact = false }: { prompt: string; setPrompt: (value: string) => void; pending: boolean; mode: Mode; submit: (event: FormEvent) => void; onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void; stop: () => void; compact?: boolean }) {
  return <form onSubmit={submit} className={compact ? "composer mb-3 flex w-full items-center" : "composer flex w-full max-w-[700px] items-center"}>
    <button type="button" className="flex size-12 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:text-primary" aria-label="Adicionar arquivo" title="Envio de arquivos estará disponível em breve"><Plus className="size-7" /></button>
    <label htmlFor="message" className="sr-only">Sua mensagem</label>
    <input id="message" value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={onKeyDown} disabled={pending} autoComplete="off" placeholder="Manda a boa!" className="h-12 min-w-0 flex-1 bg-transparent px-1 text-base outline-none placeholder:text-muted-foreground disabled:opacity-70" />
    <div className="hidden shrink-0 items-center gap-2 pr-3 text-base sm:flex"><span className="text-foreground">{mode === "UIRAPURU" ? "U1" : "J1"}</span><span className="text-muted-foreground">High</span><ChevronDown className="size-5" /></div>
    <button type={pending ? "button" : "submit"} onClick={pending ? stop : undefined} disabled={!pending && !prompt.trim()} className="mr-2 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-45" aria-label={pending ? "Parar geração" : "Enviar mensagem"}>{pending ? <Square className="size-4 fill-current" /> : <ArrowRight className="size-5" />}</button>
  </form>
}

function Legal() { return <p className="pb-2 text-center text-[9px] leading-relaxed text-muted-foreground sm:text-[10px]">Ao conversar com Uirapuru, você confirma com nossos <a href="#" className="text-foreground hover:underline">TOS</a> e nossa <a href="#" className="text-foreground hover:underline">Política de Privacidade.</a></p> }
