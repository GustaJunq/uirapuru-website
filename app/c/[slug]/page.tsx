import { SharedConversation } from "@/components/shared-conversation"

// Rota "unlisted": não tem link nenhum apontando pra cá a não ser o botão de
// compartilhar dentro de uma conversa. Não é indexada em lugar nenhum do site.
export default async function SharedConversationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <SharedConversation slug={slug} />
  }
  
