import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Houston Off-Market Deal Machine',
  description: 'AI-Powered Off-Market Real Estate Acquisition Platform for Houston, TX',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0b0f19] text-slate-100">{children}</body>
    </html>
  )
}
