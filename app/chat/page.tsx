import { Suspense } from "react"
import { ChatPageContent } from "./chat-page-content"

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatPageContent />
    </Suspense>
  )
}
