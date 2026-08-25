import { useParams } from "react-router-dom"
import { UirapuruApp } from "@/components/uirapuru-app"

export default function ChatPage() {
  const { id } = useParams<{ id?: string }>()
  return <UirapuruApp initialConversationId={id} />
}
