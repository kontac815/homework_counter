import { endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { APP_TIMEZONE } from "@/lib/constants";

export function todayYmdInTokyo() {
  return formatInTimeZone(new Date(), APP_TIMEZONE, "yyyy-MM-dd");
}

export function toDateOnly(ymd: string) {
  return parseISO(`${ymd}T00:00:00.000Z`);
}

export function zonedDayRange(ymd: string) {
  const start = fromZonedTime(`${ymd}T00:00:00.000`, APP_TIMEZONE);
  const end = fromZonedTime(`${ymd}T23:59:59.999`, APP_TIMEZONE);
  return { start, end };
}

export function currentMonthRange() {
  const nowInZone = toZonedTime(new Date(), APP_TIMEZONE);
  const startLocal = startOfMonth(nowInZone);
  const endLocal = endOfMonth(nowInZone);
  const start = fromZonedTime(startLocal, APP_TIMEZONE);
  const end = fromZonedTime(endLocal, APP_TIMEZONE);
  return { start, end };
}

export function monthRangeByYmd(ymd: string) {
  const dateLocal = toZonedTime(parseISO(`${ymd}T00:00:00.000Z`), APP_TIMEZONE);
  const start = fromZonedTime(startOfMonth(dateLocal), APP_TIMEZONE);
  const end = fromZonedTime(endOfMonth(dateLocal), APP_TIMEZONE);
  return { start, end };
}

export function toTokyoDisplayTime(date: Date) {
  return formatInTimeZone(date, APP_TIMEZONE, "HH:mm:ss");
}

export function toTokyoDateLabel(date: Date) {
  return formatInTimeZone(date, APP_TIMEZONE, "yyyy-MM-dd");
}

export function formatRangeLabel(start: Date, end: Date) {
  const startText = formatInTimeZone(start, APP_TIMEZONE, "yyyy-MM-dd");
  const endText = formatInTimeZone(end, APP_TIMEZONE, "yyyy-MM-dd");
  return `${startText} ~ ${endText}`;
}

export function toDateInputValue(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function isWeekdayYmd(ymd: string) {
  const day = parseISO(`${ymd}T00:00:00.000Z`).getUTCDay();
  return day >= 1 && day <= 5;
}

export function timestampInTokyoDate(ymd: string, source = new Date()) {
  const timePart = formatInTimeZone(source, APP_TIMEZONE, "HH:mm:ss.SSS");
  return fromZonedTime(`${ymd}T${timePart}`, APP_TIMEZONE);
}
