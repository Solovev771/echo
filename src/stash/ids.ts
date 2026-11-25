export function id(prefix = "") {
  const raw = crypto.randomUUID().replace(/-/g, "");
  return prefix ? `${prefix}_${raw.slice(0, 16)}` : raw;
}
