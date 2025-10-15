"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const isSignupPage = pathname === "/signup";
  const isPublicPage = isLoginPage || isSignupPage;

  if (isPublicPage) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="min-h-screen flex w-full">
      <Sidebar />
      <main className="flex-1 ml-[256px] transition-all duration-300">
        <div className="container mx-auto py-8 px-6">
          {children}
        </div>
      </main>
    </div>
  );
} 