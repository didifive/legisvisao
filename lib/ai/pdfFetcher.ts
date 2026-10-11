// ====================================================================
// LegisVisão - Download Seguro de PDFs Legislativos da Câmara
// ====================================================================

const MAX_PDF_BYTES = 20 * 1024 * 1024; // 20 MB

/**
 * Baixa o PDF do inteiro teor oficial da Câmara dos Deputados em memória.
 */
export async function fetchPropositionPdfBuffer(url: string): Promise<Buffer | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "LegisVisao/1.0 (https://legisvisao.com.br; contato@legisvisao.com.br)",
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) return null;

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > MAX_PDF_BYTES) {
      return null;
    }

    return buffer;
  } catch {
    return null;
  }
}
