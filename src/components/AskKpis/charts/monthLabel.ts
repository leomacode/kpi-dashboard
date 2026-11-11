const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2026-10" → "Oct 26"
export const monthLabel = (m: string) =>
  `${MONTHS[Number(m.slice(5, 7)) - 1]} ${m.slice(2, 4)}`;
