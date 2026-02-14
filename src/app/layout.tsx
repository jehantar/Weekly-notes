import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Weekly Notes",
  description: "Weekly meetings, action items, and notes tracker",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className="text-sm antialiased"
        style={{ fontFamily: "'JetBrains Mono', monospace", backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)' }}
      >
        {children}
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
