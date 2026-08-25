import { Suspense } from "react"
import { SharedConversationPage } from "./shared-conversation-page"

export default function ConversationPage() {
  return (
    <Suspense fallback={null}>
      <SharedConversationPage />
    </Suspense>
  )
}
