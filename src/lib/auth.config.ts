import type { NextAuthConfig } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import prisma from "@/lib/prisma"

export default {
    pages: {
        signIn: "/login",
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string
            }
            return session
        },
    },
    providers: [
        CredentialsProvider({
            id: "credentials",
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    console.error("Missing credentials");
                    throw new Error("Email and password are required");
                }

                const user = await prisma.user.findFirst({
                    where: { email: credentials.email },
                });

                if (!user) {
                    console.error("User not found for email:", credentials.email);
                    throw new Error("Invalid credentials");
                }

                if (!user.password) {
                    console.error("User has no password set:", credentials.email);
                    throw new Error("Invalid credentials");
                }

                const isPasswordValid = await compare(credentials?.password as string, user.password);

                if (!isPasswordValid) {
                    console.error("Password mismatch for:", credentials.email);
                    throw new Error("Invalid credentials");
                }

                console.log("User authenticated successfully:", user.email);
                return { id: user.id, email: user.email, name: user.name, image: user.image };
            }
        }),
    ],
} satisfies NextAuthConfig