import { z } from "zod";

/**
 * Esquemas de validacion de formularios de autenticacion. Mensajes en espanol.
 * IMPORTANTE: ningun esquema acepta el campo `role` (no se puede establecer
 * el rol desde el cliente).
 */

const email = z.string().min(1, "El correo es obligatorio").email("Correo electronico invalido");
const password = z.string().min(8, "La contrasena debe tener al menos 8 caracteres");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "La contrasena es obligatoria"),
});

export const registerSchema = z
  .object({
    full_name: z.string().min(2, "Ingresa tu nombre completo").max(120),
    email,
    password,
    confirmPassword: z.string().min(1, "Confirma tu contrasena"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contrasenas no coinciden",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    password,
    confirmPassword: z.string().min(1, "Confirma tu contrasena"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contrasenas no coinciden",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
