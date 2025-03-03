import NextAuth, { User as NextAuthUser } from "next-auth"
import prisma from "@/lib/prisma"
import { PrismaAdapter } from "@auth/prisma-adapter"
import authConfig from "@/lib/auth.config";

declare module "next-auth" {
  interface Session {
    user: NextAuthUser & { id: string }
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  ...authConfig,
});