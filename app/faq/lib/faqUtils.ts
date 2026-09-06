export function formatLocalDate(isoString: string | null): string {
  if (!isoString) return "Aguardando primeira execução";
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat(undefined, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  } catch {
    return String(isoString);
  }
}
