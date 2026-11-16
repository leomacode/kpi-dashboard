// "2026-10" → "Oct 26"
export const monthLabel = (m: string) =>
  new Date(`${m}-01T00:00Z`).toLocaleString("en-US", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
