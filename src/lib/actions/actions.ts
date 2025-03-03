"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

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
            switch (error.type) {
                case "CredentialsSignin":
                case "CallbackRouteError":
                    throw new Error("Invalid credentials!");
                default:
                    throw new Error("Something went wrong!");
            }
        }
        throw new Error("Something went wrong!");
    }
}