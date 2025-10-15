import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import LayoutWrapper from "@/components/LayoutWrapper";
import AuthGuard from "@/components/AuthGuard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QuasarLeads Dashboard",
  description: "AI-aangedreven leadgeneratie en e-mailautomatisering platform",
  icons: {
    icon: "/quasaralogo.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" suppressHydrationWarning>
      <body
        className={`${geistSans.className} antialiased`}
      >
        <Providers>
          <AuthGuard>
            <SidebarProvider>
              <LayoutWrapper>
                {children}
              </LayoutWrapper>
              <Sonner />
            </SidebarProvider>
          </AuthGuard>
        </Providers>
      </body>
    </html>
  );
}