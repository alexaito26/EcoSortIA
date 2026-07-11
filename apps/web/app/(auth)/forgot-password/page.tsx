"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, type ActionState } from "@/lib/auth/actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: ActionState = {};

export default function ForgotPasswordPage() {
  const [state, formAction] = useActionState(requestPasswordReset, initial);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recuperar contrasena</CardTitle>
        <CardDescription>Te enviaremos un enlace para restablecerla.</CardDescription>
      </CardHeader>
      <CardContent>
        {state.success ? (
          <Alert variant="success">
            <AlertDescription>{state.success}</AlertDescription>
          </Alert>
        ) : (
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electronico</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
              {state.fieldErrors?.email && (
                <p className="text-sm text-destructive">{state.fieldErrors.email[0]}</p>
              )}
            </div>
            <SubmitButton>Enviar enlace</SubmitButton>
          </form>
        )}
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-foreground underline underline-offset-4">
            Volver a iniciar sesion
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
