import { z } from "zod";

/**
 * Schema for login form
 */
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional().default(false),
});

/**
 * Type for login form input
 */
export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Schema for forgot password form
 */
export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

/**
 * Type for forgot password form input
 */
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
