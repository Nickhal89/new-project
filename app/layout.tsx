import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';

const siteName = 'Crossroads HR';
const siteDescription =
  'Crossroads HR: Explainable hiring signals για εποχικούς ρόλους HORECA με γρήγορο shortlist και διαφανές ranking.';

export const metadata: Metadata = {
  title: {
    default: siteName,
    template: `%s | ${siteName}`
  },
  description: siteDescription,
  applicationName: siteName,
  metadataBase: new URL('https://crossroads-hr-demo.vercel.app'),
  openGraph: {
    title: siteName,
    description: siteDescription,
    type: 'website',
    url: '/',
    siteName,
    images: ['/og-placeholder.svg']
  },
  twitter: {
    card: 'summary_large_image',
    title: siteName,
    description: siteDescription,
    images: ['/og-placeholder.svg']
  },
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="el">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <div className="min-h-screen">
          <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4">
              <Link href="/" className="text-sm font-semibold tracking-wide text-slate-900">
                {siteName}
              </Link>
              <nav className="flex items-center gap-1 text-sm">
                <TopLink href="/demo" label="Demo" />
                <TopLink href="/hr/demo" label="HR Demo" />
                <TopLink href="/t2/demo" label="Candidate Demo" />
                <TopLink href="/roadmap" label="Roadmap" />
              </nav>
            </div>
          </header>

          <div className="mx-auto w-full max-w-7xl px-4 py-6">{children}</div>

          <footer className="mt-16 border-t border-slate-200 bg-white">
            <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-sm text-slate-600">
              <p>© Crossroads HR</p>
              <div className="flex items-center gap-4">
                <Link href="/privacy" className="hover:text-slate-900">Privacy</Link>
                <Link href="/terms" className="hover:text-slate-900">Terms</Link>
                <span>Contact: hello@crossroads.example</span>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}

function TopLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="rounded-lg px-3 py-1.5 text-slate-700 hover:bg-slate-100 hover:text-slate-900">
      {label}
    </Link>
  );
}
