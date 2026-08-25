"use client"

import { useSearchParams } from "next/navigation"
import { SharedConversation } from "@/components/shared-conversation"

export function SharedConversationPage() {
  const searchParams = useSearchParams()
  const slug = searchParams.get("slug")

  if (!slug) {
    return (
      <main className="flex min-h-svh items-center justify-center px-4 text-center text-sm text-muted-foreground">
        Link de conversa compartilhada inválido.
      </main>
    )
  }

  return <SharedConversation slug={slug} />
}
