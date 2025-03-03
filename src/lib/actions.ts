"use server";

import { AuthError } from "next-auth";
import { signIn } from "./auth";

export async function login(email: string, password: string) {
    try {
        await signIn("credentials", {
            redirect: false,
            email: email,
            password: password,
        });

        return {
            message: "Succesfully Logged in"
        };
    } catch (error) {
        if (error instanceof AuthError) {
            throw error.cause?.err
        }

        throw error;
    }
}