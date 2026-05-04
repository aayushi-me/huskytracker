import { createContext, ReactNode, useContext, useState, useRef, useCallback } from "react";
import { ToastItem, ToastType } from "./ToastTypes";

type ToastContextType = {
  toasts: ToastItem[];
  showToast: (message: string, type?: ToastType) => void;
  removeToast: (id: number) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextIdRef = useRef(1);
  const timeoutsRef = useRef<Map<number, NodeJS.Timeout>>(new Map());

  const removeToast = useCallback((id: number) => {
    // Clear the timeout if it exists
    const timeout = timeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }
    
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = nextIdRef.current;
    nextIdRef.current += 1;

    // Add the toast
    setToasts((prev) => [...prev, { id, message, type }]);

    // Set up auto-dismiss timeout
    const timeout = setTimeout(() => {
      removeToast(id);
    }, 3000);
    
    timeoutsRef.current.set(id, timeout);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToastContext = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToastContext must be used inside ToastProvider");
  return ctx;
};
