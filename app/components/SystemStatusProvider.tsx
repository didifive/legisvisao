"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export interface SystemStatusCounts {
  projects: number;
  politicians: number;
  parties: number;
}

export interface SystemStatusContextType {
  isReady: boolean;
  isLoading: boolean;
  counts: SystemStatusCounts;
  error: string | null;
  refetch: () => Promise<void>;
}

const defaultStatus: SystemStatusContextType = {
  isReady: true,
  isLoading: true,
  counts: { projects: 0, politicians: 0, parties: 0 },
  error: null,
  refetch: async () => {},
};

const SystemStatusContext = createContext<SystemStatusContextType>(defaultStatus);

// Intervalo de verificação no frontend: 3 minutos (180.000 ms)
const FRONTEND_CHECK_INTERVAL_MS = 3 * 60 * 1000;

export function SystemStatusProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [counts, setCounts] = useState<SystemStatusCounts>({
    projects: 0,
    politicians: 0,
    parties: 0,
  });
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/system-status");
      if (res.ok) {
        const data = await res.json();
        setIsReady(Boolean(data.isReady));
        if (data.counts) {
          setCounts(data.counts);
        }
        setError(data.error || null);
      } else {
        setIsReady(false);
        setError("Erro ao obter status das bases de dados.");
      }
    } catch (err) {
      console.error("Falha ao consultar system-status:", err);
      setIsReady(false);
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();

    // Revalidação a cada 3 minutos
    const interval = setInterval(() => {
      fetchStatus();
    }, FRONTEND_CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fetchStatus]);

  return (
    <SystemStatusContext.Provider
      value={{
        isReady,
        isLoading,
        counts,
        error,
        refetch: fetchStatus,
      }}
    >
      {children}
    </SystemStatusContext.Provider>
  );
}

export function useSystemStatus() {
  return useContext(SystemStatusContext);
}
