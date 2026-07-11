"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp, type ActionState } from "@/lib/auth/actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: ActionState = {};

export default function RegisterPage() {
  const [state, formAction] = useActionState(signUp, initial);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crear cuenta</CardTitle>
        <CardDescription>Registrate para empezar a reciclar con EcoSort.</CardDescription>
      </CardHeader>
      <CardContent>
        {state.success ? (
          <Alert variant="success">
            <AlertDescription>{state.success}</AlertDescription>
          </Alert>
        ) : (
          <form action={formAction} className="space-y-4">
            {state.error && (
              <Alert variant="destructive">
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="full_name">Nombre completo</Label>
              <Input id="full_name" name="full_name" type="text" autoComplete="name" required />
              {state.fieldErrors?.full_name && (
                <p className="text-sm text-destructive">{state.fieldErrors.full_name[0]}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo electronico</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
              {state.fieldErrors?.email && (
                <p className="text-sm text-destructive">{state.fieldErrors.email[0]}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contrasena</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
              />
              {state.fieldErrors?.password && (
                <p className="text-sm text-destructive">{state.fieldErrors.password[0]}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contrasena</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
              />
              {state.fieldErrors?.confirmPassword && (
                <p className="text-sm text-destructive">{state.fieldErrors.confirmPassword[0]}</p>
              )}
            </div>
            <SubmitButton>Crear cuenta</SubmitButton>
          </form>
        )}
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Ya tienes cuenta?{" "}
          <Link href="/login" className="text-foreground underline underline-offset-4">
            Inicia sesion
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
