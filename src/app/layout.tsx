import type React from "react"
import "@/../styles/globals.css"
import { Inter } from "next/font/google"
import { cn } from "@/lib/utils"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"

const inter = Inter({ subsets: ["latin"] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <Analytics />
      <SpeedInsights />
      <body className={cn("min-h-screen bg-background font-sans antialiased", inter.className)}>{children}</body>
    </html>
  )
}

