import { z } from "zod";

const USER_PASSWORD_MIN_LENGTH = 8;

/**
 * Schema for creating a new user
 */
export const createUserSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    email: z.string().email("Please enter a valid email address."),
    password: z.string().min(USER_PASSWORD_MIN_LENGTH, `Password must be at least ${USER_PASSWORD_MIN_LENGTH} characters.`),
});

/**
 * Schema for updating an existing user
 */
export const updateUserSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters.").optional(),
    email: z.string().email("Please enter a valid email address.").optional(),
    password: z
        .string()
        .min(USER_PASSWORD_MIN_LENGTH, `Password must be at least ${USER_PASSWORD_MIN_LENGTH} characters.`)
        .optional()
        .or(z.literal('')), // Allow empty string to represent "no change"
});

/**
 * Type for creating a new user
 */
export type CreateUserInput = z.infer<typeof createUserSchema>;

/**
 * Type for updating an existing user
 */
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
