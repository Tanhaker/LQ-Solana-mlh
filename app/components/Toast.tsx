"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { explorerTx } from "@/lib/config";

type Kind = "pending" | "success" | "error";
type Toast = { id: number; kind: Kind; text: string; sig?: string };

type Ctx = {
  push: (kind: Kind, text: string, sig?: string) => number;
  update: (id: number, kind: Kind, text: string, sig?: string) => void;
};

const ToastContext = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [counter, setCounter] = useState(0);

  const dismissLater = useCallback((id: number, kind: Kind) => {
    if (kind === "pending") return;
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "error" ? 9000 : 6000);
  }, []);

  const push = useCallback(
    (kind: Kind, text: string, sig?: string) => {
      const id = Date.now() + counter;
      setCounter((c) => c + 1);
      setToasts((t) => [...t.slice(-3), { id, kind, text, sig }]);
      dismissLater(id, kind);
      return id;
    },
    [counter, dismissLater],
  );

  const update = useCallback(
    (id: number, kind: Kind, text: string, sig?: string) => {
      setToasts((t) => t.map((x) => (x.id === id ? { ...x, kind, text, sig } : x)));
      dismissLater(id, kind);
    },
    [dismissLater],
  );

  return (
    <ToastContext.Provider value={{ push, update }}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            <span className="toast-dot" />
            <span className="toast-text">{t.text}</span>
            {t.sig && (
              <a href={explorerTx(t.sig)} target="_blank" rel="noreferrer">
                View tx ↗
              </a>
            )}
            <button
              aria-label="Dismiss"
              onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
