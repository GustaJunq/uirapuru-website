import { useEffect, useState } from "react"
import { LoaderCircle } from "lucide-react"
import { api, type PublicConversation } from "@/lib/uirapuru-api"

const LOGO_URL = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/112%20Sem%20T_U00edtulo_20260718173634-C9PesHY7xP0RnzJ15CRlw6qjSsSyVG.png"

export function SharedConversation({ slug }: { slug: string }) {
  const [conversation, setConversation] = useState<PublicConversation | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.getPublicConversation(slug)
      .then((result) => { if (!cancelled) setConversation(result) })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Não foi possível carregar essa conversa.") })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [slug])

  return (
    <main className="relative flex min-h-svh flex-col overflow-hidden bg-background text-foreground">
      <header className="flex w-full items-center justify-between gap-2 px-4 py-4 md:px-8 md:py-5">
        <a href="/" className="flex items-center gap-2">
          <img src={LOGO_URL} alt="Uirapuru" className="h-7 w-auto object-contain" />
        </a>
        <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">Conversa compartilhada · somente leitura</span>
      </header>

      {loading && (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" /> Carregando conversa...
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <a href="/" className="text-sm underline underline-offset-4 text-muted-foreground hover:text-foreground">Voltar para o Uirapuru</a>
        </div>
      )}

      {!loading && !error && conversation && (
        <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden px-4 pt-4" aria-label="Conversa compartilhada">
          <h1 className="mb-4 truncate text-lg font-medium">{conversation.title}</h1>
          <div className="chat-scroll flex flex-1 flex-col gap-6 overflow-y-auto pb-10">
            {conversation.messages.map((message, index) => (
              <article key={message.id || index} className={message.role === "USER" ? "flex justify-end" : "flex justify-start"}>
                <div className={message.role === "USER" ? "max-w-[82%] rounded-3xl rounded-br-md bg-secondary px-5 py-3 text-sm leading-relaxed" : "flex max-w-[92%] flex-col gap-3 px-1 py-2 text-sm leading-relaxed"}>
                  {message.role === "ASSISTANT" && message.thinking && (
                    <details className="group rounded-xl border border-border bg-secondary/40 px-4 py-3">
                      <summary className="cursor-pointer font-medium text-muted-foreground">Pensamento</summary>
                      <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{message.thinking}</p>
                    </details>
                  )}
                  {message.content && <p className="whitespace-pre-wrap">{message.content}</p>}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <p className="pb-6 text-center text-[10px] leading-relaxed text-muted-foreground">
        Gerado com Uirapuru. <a href="/" className="underline underline-offset-2 hover:text-foreground">Crie sua conta</a> para conversar você também.
      </p>
    </main>
  )
}
