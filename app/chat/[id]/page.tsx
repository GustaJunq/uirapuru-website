import { UirapuruApp } from "@/components/uirapuru-app"

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <UirapuruApp conversationId={id} />
}
