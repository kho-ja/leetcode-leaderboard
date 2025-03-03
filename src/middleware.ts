import authConfig from "./lib/auth.config"
import NextAuth from "next-auth"

const protectedRoutes = [
    "/dashboard",
]

export const { auth } = NextAuth(authConfig)
export default auth((req) => {
    const { nextUrl, auth } = req;

    const isLoggedIn = !!auth?.user;
    const isProtectedRoute = protectedRoutes.includes(nextUrl.pathname);
    const isAuthRoute = nextUrl.pathname.startsWith("/api/auth") || nextUrl.pathname === "/login";

    if (isProtectedRoute && !isLoggedIn) {
        return Response.redirect(nextUrl.origin + "/login")
    }

    if (isAuthRoute && isLoggedIn) {
        return Response.redirect(nextUrl.origin + "/dashboard")
    }
})

export const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico).*)",
    ],
}