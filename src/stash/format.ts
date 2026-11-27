const TZ = "Europe/Moscow";

const dateTimeFmt = new Intl.DateTimeFormat("ru-RU", {
  timeZone: TZ,
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

const dateFmt = new Intl.DateTimeFormat("ru-RU", { timeZone: TZ, day: "numeric", month: "long" });
const timeFmt = new Intl.DateTimeFormat("ru-RU", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });

export function moscowDateTime(date: Date) {
  return dateTimeFmt.format(date);
}

export function moscowDate(date: Date) {
  return dateFmt.format(date);
}

export function moscowTime(date: Date) {
  return timeFmt.format(date);
}

export function positions(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} позиция`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} позиции`;
  return `${n} позиций`;
}
