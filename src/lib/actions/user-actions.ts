'use server';

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { updateUserSchema } from "@/lib/validations/user";
import { CreateUserPayload, UpdateUserPayload, User } from "@/types";
import { revalidatePath } from "next/cache";

/**
 * Get all users
 */
export async function getUsers(): Promise<User[]> {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                emailVerified: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return users;
    } catch (error) {
        console.error("Error retrieving users:", error);
        throw new Error("Failed to retrieve users");
    }
}

/**
 * Get user by ID
 */
export async function getUser(id: string): Promise<User> {
    try {
        if (!id) {
            throw new Error("User ID is required");
        }

        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                emailVerified: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!user) {
            throw new Error("User not found");
        }

        return user;
    } catch (error) {
        console.error("Error retrieving user:", error);
        throw new Error(`Failed to retrieve user: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}

/**
 * Create a new user
 */
export async function createUser(userData: CreateUserPayload): Promise<{ user: User; message: string }> {
    try {
        // Add validation logic here if needed

        // Check if user with email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: userData.email },
        });

        if (existingUser) {
            throw new Error("User with this email already exists");
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password, 10);

        // Create user
        const newUser = await prisma.user.create({
            data: {
                name: userData.name,
                email: userData.email,
                password: hashedPassword,
            },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                emailVerified: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        revalidatePath('/dashboard/users');
        return { user: newUser, message: "User created successfully" };
    } catch (error) {
        console.error("Error creating user:", error);
        throw new Error(`Failed to create user: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}

/**
 * Update an existing user
 */
export async function updateUser(id: string, userData: UpdateUserPayload): Promise<{ user: User; message: string }> {
    try {
        if (!id) {
            throw new Error("User ID is required");
        }

        // Validate request data
        const result = updateUserSchema.safeParse(userData);
        if (!result.success) {
            throw new Error("Invalid request data");
        }

        const { name, email, password } = result.data;

        // Check if user exists
        const userExists = await prisma.user.findUnique({
            where: { id },
        });

        if (!userExists) {
            throw new Error("User not found");
        }

        // Check if email is taken (if changing email)
        if (email && email !== userExists.email) {
            const emailTaken = await prisma.user.findUnique({
                where: { email },
            });

            if (emailTaken) {
                throw new Error("Email is already taken");
            }
        }

        // Prepare update data
        interface UpdateData {
            name?: string;
            email?: string;
            password?: string;
        }

        const updateData: UpdateData = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (password && password.trim() !== "") {
            updateData.password = await bcrypt.hash(password, 10);
        }

        // Update user
        const updatedUser = await prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                emailVerified: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        revalidatePath('/dashboard/users');
        revalidatePath(`/dashboard/users/edit/${id}`);
        return { user: updatedUser, message: "User updated successfully" };
    } catch (error) {
        console.error("Error updating user:", error);
        throw new Error(`Failed to update user: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}

/**
 * Delete a user
 */
export async function deleteUser(id: string): Promise<{ message: string }> {
    try {
        if (!id) {
            throw new Error("User ID is required");
        }

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { id },
        });

        if (!user) {
            throw new Error("User not found");
        }

        // Delete user
        await prisma.user.delete({
            where: { id },
        });

        revalidatePath('/dashboard/users');
        return { message: "User deleted successfully" };
    } catch (error) {
        console.error("Error deleting user:", error);
        throw new Error(`Failed to delete user: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}
