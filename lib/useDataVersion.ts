"use client";

import { useEffect, useState } from "react";
import { validateDatasetVersion, getLocalDatasetVersion } from "./cache";

const REVALIDATION_INTERVAL_MS = 30 * 60 * 1000; // 30 minutos

export function useDataVersion() {
  const [datasetVersion, setDatasetVersion] = useState<string | null>(getLocalDatasetVersion);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const v = await validateDatasetVersion();
        if (v) setDatasetVersion(v);
      } catch {
        // Silencia falha de conexão na verificação em segundo plano
      }
    };

    // 2. Valida contra o servidor na montagem
    void checkVersion();

    // 3. Validação periódica a cada 30 minutos
    const interval = setInterval(() => {
      void checkVersion();
    }, REVALIDATION_INTERVAL_MS);

    // 4. Revalidação quando o usuário volta à aba do navegador
    const handleFocus = () => {
      void checkVersion();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  return { datasetVersion };
}
