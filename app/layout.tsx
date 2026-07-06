import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { APP_NAME } from '@/lib/config'
import { fetchHouseholdSettings } from '@/lib/queries/household-settings'
import { createClient } from '@/lib/supabase/server-client'
import './globals.css'

// globals.css maps the font-sans utility to var(--font-sans) (Portal
// convention: the root layout owns the font). Geist is the placeholder; the
// M5 design pass picks the real face.
const sans = Geist({ subsets: ['latin'], variable: '--font-sans' })

// The tab/OG title honors the editable household app title (M6/D-032's
// household_settings singleton); APP_NAME is the seed/fallback — including for
// logged-out visitors, whose RLS-filtered read simply comes back empty. The
// PWA manifest and apple titles stay on the static APP_NAME on purpose: an
// installed app renaming itself under your icon is surprising, not delightful.
export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient()
  const { app_title } = await fetchHouseholdSettings(supabase)

  return {
    title: {
      default: app_title,
      template: `%s · ${app_title}`,
    },
    description: 'The household companion for Jake, Kayla & Maple.',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: APP_NAME,
    },
    icons: {
      apple: '/icons/apple-touch-icon.png',
    },
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Let content flow under the iPhone home indicator; the tab bar pads itself
  // with env(safe-area-inset-bottom).
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbf7f1' },
    { media: '(prefers-color-scheme: dark)', color: '#221a14' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={sans.variable}>
      <body className="min-h-dvh bg-background font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
