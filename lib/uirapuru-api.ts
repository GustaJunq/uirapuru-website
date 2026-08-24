const API_URL = "https://uirapuru-api.onrender.com"

export type User = { id: string; email: string; username: string; createdAt: string }
export type ToolCall = { id: string; name: string; args?: Record<string, unknown>; result?: unknown; status: "calling" | "done" }
export type ChatMessage = { id?: string; role: "USER" | "ASSISTANT" | "SYSTEM"; content: string; thinking?: string | null; toolCalls?: ToolCall[]; createdAt?: string }
export type Conversation = { id: string; title: string; messages?: ChatMessage[] }

type AuthResult = { user: User; token: string }

export class ApiError extends Error {
  constructor(message: string, public status = 0) {
    super(message)
  }
}

async function parseError(response: Response) {
  try {
    const body = await response.json()
    if (Array.isArray(body.errors)) return body.errors.map((item: { msg?: string }) => item.msg).filter(Boolean).join(" ")
    return body.error || body.message || "Não foi possível concluir a solicitação."
  } catch {
    return response.status === 429 ? "Muitas tentativas. Aguarde um pouco e tente novamente." : "A API retornou uma resposta inesperada."
  }
}

async function request<T>(path: string, init: RequestInit = {}, token?: string, signal?: AbortSignal): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error
    throw new ApiError("A API está acordando ou indisponível. Tente novamente em alguns instantes.")
  }
  if (!response.ok) throw new ApiError(await parseError(response), response.status)
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const api = {
  register: (data: { email: string; username: string; password: string }) => request<AuthResult>("/api/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) => request<AuthResult>("/api/auth/login", { method: "POST", body: JSON.stringify(data) }),
  me: (token: string) => request<{ user: User }>("/api/auth/me", {}, token),
  createConversation: (token: string, data: { title?: string }) => request<Conversation>("/api/chat/conversations", { method: "POST", body: JSON.stringify(data) }, token),
  listConversations: (token: string) => request<Conversation[]>("/api/chat/conversations", {}, token),
  getConversation: (token: string, id: string) => request<Conversation>(`/api/chat/conversations/${id}`, {}, token),
  renameConversation: (token: string, id: string, title: string) => request<Conversation>(`/api/chat/conversations/${id}`, { method: "PATCH", body: JSON.stringify({ title }) }, token),
  deleteConversation: (token: string, id: string) => request<void>(`/api/chat/conversations/${id}`, { method: "DELETE" }, token),
  async streamMessage(
    token: string,
    id: string,
    message: string,
    handlers: {
      onToken?: (token: string) => void
      onToolCall?: (toolCall: { id: string; name: string; args?: Record<string, unknown> }) => void
      onToolResult?: (toolResult: { id: string; name: string; result?: unknown }) => void
    },
    signal?: AbortSignal,
  ) {
    const response = await fetch(`${API_URL}/api/chat/conversations/${id}/messages`, {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message }),
    }).catch((error) => {
      if (error instanceof DOMException && error.name === "AbortError") throw error
      throw new ApiError("A API está acordando ou indisponível. Tente novamente em alguns instantes.")
    })
    if (!response.ok) throw new ApiError(await parseError(response), response.status)
    const reader = response.body?.getReader()
    if (!reader) throw new ApiError("Seu navegador não conseguiu abrir o streaming.")
    const decoder = new TextDecoder()
    let buffer = ""
    let finalAnswer = ""
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const events = buffer.split("\n\n")
      buffer = events.pop() || ""
      for (const event of events) {
        const line = event.split("\n").find((item) => item.startsWith("data:"))
        if (!line) continue
        const data = JSON.parse(line.slice(5).trim()) as {
          token?: string
          done?: boolean
          answer?: string
          toolCall?: { id: string; name: string; args?: Record<string, unknown> }
          toolResult?: { id: string; name: string; result?: unknown }
        }
        if (data.token) handlers.onToken?.(data.token)
        if (data.toolCall) handlers.onToolCall?.(data.toolCall)
        if (data.toolResult) handlers.onToolResult?.(data.toolResult)
        if (data.done && data.answer) finalAnswer = data.answer
      }
    }
    return finalAnswer
  },
}
