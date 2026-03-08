import type { Metadata } from "next";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Weekly Notes",
  description: "Weekly meetings, tasks, and notes tracker",
  icons: {
    icon: "/favicon.svg",
  },
};

// Anti-FOUC: set data-theme before first paint. Static string, no user input.
const themeScript = `(function(){var t=localStorage.getItem('theme');if(!t)t=matchMedia('(prefers-color-scheme:light)').matches?'light':'dark';document.documentElement.dataset.theme=t})()`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className="text-sm antialiased"
        style={{ fontFamily: "'Inter', sans-serif", backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)' }}
      >
        <ThemeProvider>
          {children}
          <Toaster position="bottom-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
