"use client"

import { useSearchParams } from "next/navigation"
import { UirapuruApp } from "@/components/uirapuru-app"

export function ChatPageContent() {
  const searchParams = useSearchParams()
  const conversationId = searchParams.get("id") || undefined

  return <UirapuruApp initialConversationId={conversationId} />
}
