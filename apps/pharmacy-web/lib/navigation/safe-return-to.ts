export function safeReturnTo(value: string | null | undefined, fallback = "/home") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  try {
    const base = "https://pharmacy.local";
    const target = new URL(value, base);
    if (target.origin !== base) return fallback;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return fallback;
  }
}
