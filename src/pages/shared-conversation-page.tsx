import { useParams } from "react-router-dom"
import { SharedConversation } from "@/components/shared-conversation"

export default function SharedConversationPage() {
  const { slug } = useParams<{ slug?: string }>()

  if (!slug) {
    return (
      <main className="flex min-h-svh items-center justify-center px-4 text-center text-sm text-muted-foreground">
        Link de conversa compartilhada inválido.
      </main>
    )
  }

  return <SharedConversation slug={slug} />
}
