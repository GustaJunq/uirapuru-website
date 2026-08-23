const API_URL = "https://uirapuru-api.onrender.com"

export type User = { id: string; email: string; username: string; createdAt: string }
export type ChatMessage = { id?: string; role: "USER" | "ASSISTANT" | "SYSTEM"; content: string; thinking?: string | null; createdAt?: string }
export type Conversation = {
  id: string
  title: string
  messages?: ChatMessage[]
  createdAt?: string
  updatedAt?: string
  _count?: { messages: number }
}
export type AgentRun = { id: string; status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED"; finalOutput?: string | null; error?: string | null }

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
  startAgent: (token: string, id: string, message: string, signal?: AbortSignal) => request<{ agentRunId: string }>(`/api/chat/conversations/${id}/agent`, { method: "POST", body: JSON.stringify({ message }) }, token, signal),
  getAgentRun: (token: string, id: string, signal?: AbortSignal) => request<AgentRun>(`/api/chat/agent-runs/${id}`, {}, token, signal),
  async streamMessage(token: string, id: string, message: string, onToken: (token: string) => void, signal?: AbortSignal) {
    const response = await fetch(`${API_URL}/api/chat/conversations/${id}/messages`, {
      method: "POST",
      signal,
      headers: {
        Accept: "text/event-stream",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
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
    let result: { answer: string; thinking: string | null } = { answer: "", thinking: null }

    const consumeEvent = (event: string) => {
      const payload = event
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n")
      if (!payload) return
      const data = JSON.parse(payload) as { token?: string; done?: boolean; answer?: string; thinking?: string }
      if (data.token) onToken(data.token)
      if (data.done) result = { answer: data.answer || "", thinking: data.thinking || null }
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const events = buffer.split(/\r?\n\r?\n/)
      buffer = events.pop() || ""
      for (const event of events) consumeEvent(event)
    }
    buffer += decoder.decode()
    if (buffer.trim()) consumeEvent(buffer)
    return result
  },
}
