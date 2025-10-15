"use client";

import React from "react";
import { useToast } from "@/hooks/use-toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <div className="fixed top-0 right-0 z-50 p-4 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`bg-card text-card-foreground shadow-lg rounded-lg p-4 transform transition-all duration-300 ${
            toast.open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
          role="alert"
        >
          {toast.title && <h3 className="font-medium">{toast.title}</h3>}
          {toast.description && <p className="text-sm">{toast.description}</p>}
        </div>
      ))}
    </div>
  );
}