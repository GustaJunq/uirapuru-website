"use client"

import { FormEvent, useState } from "react"
import { LoaderCircle } from "lucide-react"
import { api, type User } from "@/lib/uirapuru-api"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

type AuthMode = "login" | "register"

export function AuthDialog({ mode, onOpenChange, onSwitchMode, onAuthenticated }: { mode: AuthMode | null; onOpenChange: (open: boolean) => void; onSwitchMode: (mode: AuthMode) => void; onAuthenticated: (user: User, token: string) => void }) {
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
      <DialogContent className="border border-border bg-popover p-7 shadow-2xl sm:max-w-md sm:rounded-2xl">
        <DialogHeader className="gap-2">
          <DialogTitle className="text-2xl font-semibold tracking-tight">{isRegister ? "Criar sua conta" : "Boas-vindas de volta"}</DialogTitle>
          <DialogDescription>{isRegister ? "Crie uma conta para conversar com os modelos brasileiros." : "Entre para continuar suas conversas."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            {isRegister && <Field><FieldLabel htmlFor="username">Nome de usuário</FieldLabel><Input id="username" name="username" autoComplete="username" minLength={3} maxLength={32} pattern="@?[a-zA-Z0-9_]+" required placeholder="seu_usuario" /></Field>}
            <Field><FieldLabel htmlFor="email">E-mail</FieldLabel><Input id="email" name="email" type="email" autoComplete="email" required placeholder="voce@exemplo.com" /></Field>
            <Field><FieldLabel htmlFor="password">Senha</FieldLabel><Input id="password" name="password" type="password" autoComplete={isRegister ? "new-password" : "current-password"} minLength={6} required placeholder="••••••••" /></Field>
            {error && <Field data-invalid><FieldError>{error}</FieldError></Field>}
            <Button type="submit" disabled={pending} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              {pending && <LoaderCircle data-icon="inline-start" className="animate-spin" />}
              {pending ? "Conectando..." : isRegister ? "Criar conta" : "Entrar"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {isRegister ? "Já tem uma conta?" : "Ainda não tem conta?"}{" "}
              <button type="button" onClick={() => onSwitchMode(isRegister ? "login" : "register")} className="font-medium text-foreground underline underline-offset-4">
                {isRegister ? "Entrar" : "Criar conta"}
              </button>
            </p>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
