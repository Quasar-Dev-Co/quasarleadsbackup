"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { auth } from "@/lib/auth";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const isAuthenticated = auth.isAuthenticated();
    const isLoginPage = pathname === "/login";
    const isSignupPage = pathname === "/signup";
    const isPublicPage = isLoginPage || isSignupPage;

    if (!isAuthenticated && !isPublicPage) {
      // Not authenticated and not on public pages - redirect to login
      router.push("/login");
    } else if (isAuthenticated && isPublicPage) {
      // Authenticated and on public pages - redirect to dashboard
      router.push("/");
    } else {
      // Valid state - show content
      setIsLoading(false);
    }
  }, [pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return <>{children}</>;
} 