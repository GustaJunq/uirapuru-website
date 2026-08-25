import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"

const LOGO_URL = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/112%20Sem%20T_U00edtulo_20260718173634-C9PesHY7xP0RnzJ15CRlw6qjSsSyVG.png"

const BENEFITS = [
  {
    title: "Conversa de verdade",
    body: "Sem aquele tom robótico. Uirapuru responde como alguém que entende você, não como um manual de instruções.",
  },
  {
    title: "Rápido pra resolver",
    body: "Menos enrolação, mais resposta útil. Direto ao ponto quando você precisa, com calma quando você quer conversar.",
  },
  {
    title: "Sempre à mão",
    body: "No navegador, sem instalar nada, sem complicação. Funciona em qualquer aparelho.",
  },
]

export default function LandingPage() {
  return (
    <main className="relative flex min-h-svh flex-col overflow-hidden bg-background text-foreground">
      <header className="flex w-full items-center justify-between gap-2 px-4 py-5 md:px-10">
        <img src={LOGO_URL} alt="Uirapuru" className="h-6 w-auto object-contain md:h-7" />
        <Link
          to="/chat"
          className="flex h-9 items-center gap-1.5 rounded-full border border-border px-4 text-sm font-medium text-foreground transition-colors hover:border-primary/60 hover:text-primary"
        >
          Entrar
        </Link>
      </header>

      {/* Hero */}
      <section className="hero-enter flex flex-1 flex-col items-center justify-center gap-7 px-4 py-20 text-center md:py-28">
        <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight md:text-6xl">
          Chega de IA que fala como gringo traduzido.
        </h1>
        <p className="max-w-xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
          Uirapuru é rápido, direto e entende você sem rodeio. Uma IA brasileira, feita pra gente brasileira.
        </p>
        <Link
          to="/chat"
          className="mt-2 flex h-12 items-center gap-2 rounded-full bg-primary px-7 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Fala com o Uirapuru agora
          <ArrowRight className="size-4" />
        </Link>
        <p className="text-xs text-muted-foreground">É grátis. Sem cartão, sem complicação.</p>
      </section>

      {/* Identidade */}
      <section className="border-y border-border px-4 py-16 md:py-20">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          <p className="text-xl font-medium tracking-tight text-balance md:text-2xl">
            Feito no Brasil, pra quem vive no Brasil.
          </p>
          <p className="text-pretty text-sm leading-relaxed text-muted-foreground md:text-base">
            Sem depender de servidor lá fora. Sem resposta que parece traduzida no Google.
            Você fala normal. Ele entende normal.
          </p>
        </div>
      </section>

      {/* Benefícios */}
      <section className="px-4 py-16 md:py-24">
        <div className="mx-auto flex max-w-3xl flex-col gap-10 md:gap-14">
          {BENEFITS.map((benefit, index) => (
            <div
              key={benefit.title}
              className="flex flex-col gap-2 border-b border-border pb-10 last:border-b-0 last:pb-0 md:flex-row md:items-baseline md:gap-8"
            >
              <span className="text-sm font-medium text-primary md:w-10 md:shrink-0">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="flex flex-col gap-1.5">
                <h3 className="text-lg font-medium md:text-xl">{benefit.title}</h3>
                <p className="max-w-lg text-pretty text-sm leading-relaxed text-muted-foreground md:text-base">
                  {benefit.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Fechamento + CTA final */}
      <section className="flex flex-col items-center gap-6 px-4 py-20 text-center md:py-28">
        <p className="max-w-xl text-balance text-xl font-medium leading-snug md:text-2xl">
          Você não precisa de outra IA genérica. Precisa de uma que entenda de onde você vem.
        </p>
        <Link
          to="/chat"
          className="flex h-12 items-center gap-2 rounded-full bg-primary px-7 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Testa e vê a diferença
          <ArrowRight className="size-4" />
        </Link>
      </section>

      <footer className="flex flex-col items-center gap-2 border-t border-border px-4 py-8 text-center">
        <img src={LOGO_URL} alt="Uirapuru" className="h-5 w-auto object-contain opacity-80" />
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          Uirapuru é um produto SynastrIA Networks. Ao usar, você concorda em revisar as respostas antes de usar para tarefas críticas.
        </p>
      </footer>
    </main>
  )
}
