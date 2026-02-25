import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/ui/Sidebar";

export const metadata: Metadata = {
  title: "Mercado Luna — Transaction Anomaly Detector",
  description: "Real-time fraud detection dashboard for Mexican e-commerce",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Sidebar />
        <main style={{ marginLeft: "var(--sidebar-w)" }} className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
