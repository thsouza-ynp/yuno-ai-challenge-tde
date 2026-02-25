import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mercado Luna — Transaction Anomaly Detector",
  description: "Real-time fraud detection dashboard for Mexican e-commerce",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
