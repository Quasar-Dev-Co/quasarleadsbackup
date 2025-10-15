"use client";

import React from "react";

type ToastProps = {
  id: string;
  title?: string;
  description?: string;
  open: boolean;
  onOpenChange?: (open: boolean) => void;
};

type ToastOptions = {
  title?: string;
  description?: string;
};

type ToastContextType = {
  toasts: ToastProps[];
  toast: (options: ToastOptions) => void;
  dismiss: (id?: string) => void;
};

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

function genId() {
  return Math.random().toString(36).substring(2, 9);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastProps[]>([]);

  const toast = React.useCallback((options: ToastOptions) => {
    const id = genId();
    const newToast = {
      id,
      title: options.title,
      description: options.description,
      open: true,
    };
    
    setToasts((prev) => [...prev, newToast]);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
      dismiss(id);
    }, 5000);
    
    return id;
  }, []);

  const dismiss = React.useCallback((id?: string) => {
    setToasts((prev) => 
      prev.map((toast) => 
        id === undefined || toast.id === id 
          ? { ...toast, open: false } 
          : toast
      )
    );
    
    // Remove from array after animation completes
    setTimeout(() => {
      setToasts((prev) => 
        prev.filter((toast) => 
          id === undefined || toast.id !== id
        )
      );
    }, 300);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  
  return context;
}