"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";

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
  refetch: async () => { },
};

const SystemStatusContext = createContext<SystemStatusContextType>(defaultStatus);

// Intervalo de verificação no frontend: 3 minutos (180.000 ms)
const FRONTEND_CHECK_INTERVAL_MS = 3 * 60 * 1000;

interface SystemStatusResult {
  isReady: boolean;
  counts: SystemStatusCounts | null;
  error: string | null;
}

async function loadSystemStatus(): Promise<SystemStatusResult> {
  try {
    const res = await fetch("/api/system-status");
    if (!res.ok) {
      return { isReady: false, counts: null, error: "Erro ao obter status das bases de dados." };
    }
    const data = await res.json();
    return {
      isReady: Boolean(data.isReady),
      counts: data.counts ?? null,
      error: data.error || null,
    };
  } catch (err) {
    console.error("Falha ao consultar system-status:", err);
    return { isReady: false, counts: null, error: "Não foi possível conectar ao servidor." };
  }
}

export function SystemStatusProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [counts, setCounts] = useState<SystemStatusCounts>({
    projects: 0,
    politicians: 0,
    parties: 0,
  });
  const [error, setError] = useState<string | null>(null);

  const applyStatus = useCallback((result: SystemStatusResult) => {
    setIsReady(result.isReady);
    if (result.counts) {
      setCounts(result.counts);
    }
    setError(result.error);
    setIsLoading(false);
  }, []);

  const fetchStatus = useCallback(async () => {
    applyStatus(await loadSystemStatus());
  }, [applyStatus]);

  useEffect(() => {
    void loadSystemStatus().then(applyStatus);

    // Revalidação a cada 3 minutos
    const interval = setInterval(() => {
      void loadSystemStatus().then(applyStatus);
    }, FRONTEND_CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [applyStatus]);

  const contextValue = useMemo(
    () => ({
      isReady,
      isLoading,
      counts,
      error,
      refetch: fetchStatus,
    }),
    [isReady, isLoading, counts, error, fetchStatus]
  );

  return (
    <SystemStatusContext.Provider value={contextValue}>
      {children}
    </SystemStatusContext.Provider>
  );
}

export function useSystemStatus() {
  return useContext(SystemStatusContext);
}
