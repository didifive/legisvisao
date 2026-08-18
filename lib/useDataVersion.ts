"use client";

import { useEffect, useState } from "react";
import { validateDatasetVersion, getLocalDatasetVersion } from "./cache";

const REVALIDATION_INTERVAL_MS = 30 * 60 * 1000; // 30 minutos

export function useDataVersion() {
  const [datasetVersion, setDatasetVersion] = useState<string | null>(null);

  useEffect(() => {
    // 1. Inicializa versão local
    setDatasetVersion(getLocalDatasetVersion());

    // 2. Valida contra o servidor na montagem
    validateDatasetVersion().then((v) => {
      if (v) setDatasetVersion(v);
    });

    // 3. Validação periódica a cada 30 minutos
    const interval = setInterval(() => {
      validateDatasetVersion().then((v) => {
        if (v) setDatasetVersion(v);
      });
    }, REVALIDATION_INTERVAL_MS);

    // 4. Revalidação quando o usuário volta à aba do navegador
    const handleFocus = () => {
      validateDatasetVersion().then((v) => {
        if (v) setDatasetVersion(v);
      });
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  return { datasetVersion };
}
