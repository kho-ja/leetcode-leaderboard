import type { NextAuthConfig } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import prisma from "@/lib/prisma"

export default {
    callbacks: {
        async redirect({ baseUrl }) {
            return `${baseUrl}/dashboard`
        },
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
                    throw new Error("Email and password are required")
                }

                const user = await prisma.user.findFirst({
                    where: {
                        email: credentials.email,
                    }
                })


                if (!user || !user.password) {
                    console.log("User is not valid", user)
                    throw new Error("Invalid credentials")
                }


                const isPasswordValid = await compare(credentials.password as string, user.password as string);

                if (!isPasswordValid) {
                    console.log("Password is not valid", user)
                    throw new Error("Invalid credentials")
                }

                console.log("User is valid", user)

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                }
            },
        }),
    ],
} satisfies NextAuthConfig