import { Inter } from 'next/font/google'
import { headers } from 'next/headers'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const locale = headersList.get('x-next-intl-locale') ?? 'de'

  return (
    <html lang={locale} className="h-full">
      <body className={`${inter.className} min-h-full flex flex-col bg-slate-900`}>
        {children}
      </body>
    </html>
  )
}