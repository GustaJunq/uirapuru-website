"use client"

import { FormEvent, useState } from "react"
import { LoaderCircle } from "lucide-react"
import { api, type User } from "@/lib/uirapuru-api"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

type AuthMode = "login" | "register"

export function AuthDialog({ mode, onOpenChange, onAuthenticated }: { mode: AuthMode | null; onOpenChange: (open: boolean) => void; onAuthenticated: (user: User, token: string) => void }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError("")
    const data = new FormData(event.currentTarget)
    try {
      const result = mode === "register"
        ? await api.register({ email: String(data.get("email")), username: String(data.get("username")), password: String(data.get("password")) })
        : await api.login({ email: String(data.get("email")), password: String(data.get("password")) })
      onAuthenticated(result.user, result.token)
      onOpenChange(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível autenticar.")
    } finally {
      setPending(false)
    }
  }

  const isRegister = mode === "register"
  return (
    <Dialog open={mode !== null} onOpenChange={onOpenChange}>
      <DialogContent className="border border-border bg-popover p-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">{isRegister ? "Criar sua conta" : "Boas-vindas de volta"}</DialogTitle>
          <DialogDescription>{isRegister ? "Crie uma conta para conversar com os modelos brasileiros." : "Entre para continuar suas conversas."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            {isRegister && <Field><FieldLabel htmlFor="username">Nome de usuário</FieldLabel><Input id="username" name="username" autoComplete="username" minLength={3} maxLength={32} pattern="@?[a-zA-Z0-9_.]{3,32}" required placeholder="seu.usuario" /></Field>}
            <Field><FieldLabel htmlFor="email">E-mail</FieldLabel><Input id="email" name="email" type="email" autoComplete="email" required placeholder="voce@exemplo.com" /></Field>
            <Field><FieldLabel htmlFor="password">Senha</FieldLabel><Input id="password" name="password" type="password" autoComplete={isRegister ? "new-password" : "current-password"} minLength={isRegister ? 8 : undefined} required placeholder="Mínimo de 8 caracteres" /></Field>
            {error && <Field data-invalid><FieldError>{error}</FieldError></Field>}
            <Button type="submit" disabled={pending} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              {pending && <LoaderCircle data-icon="inline-start" className="animate-spin" />}
              {pending ? "Conectando..." : isRegister ? "Criar conta" : "Entrar"}
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
