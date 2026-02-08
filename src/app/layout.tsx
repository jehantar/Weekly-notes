import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Weekly Notes",
  description: "Weekly meetings, action items, and notes tracker",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 font-mono text-sm antialiased">
        {children}
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
