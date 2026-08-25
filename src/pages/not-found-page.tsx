import { Link } from "react-router-dom"

export default function NotFoundPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-sm text-muted-foreground">Essa página não existe.</p>
      <Link to="/" className="text-sm underline underline-offset-4 hover:text-foreground">Voltar pro início</Link>
    </main>
  )
}
