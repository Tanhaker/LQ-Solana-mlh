import BN from "bn.js";
import { USDC_DECIMALS } from "./config";

const UNIT = 10 ** USDC_DECIMALS;

/** Base units (BN or number) -> "12.50" */
export function usdc(amount: BN | number | bigint, digits = 2): string {
  const n = typeof amount === "number" ? amount : Number(amount.toString());
  return (n / UNIT).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** "12.5" -> base units as BN. Returns null for invalid input. */
export function parseUsdc(input: string): BN | null {
  const s = input.trim();
  if (!/^\d+(\.\d{0,6})?$/.test(s)) return null;
  const [whole, frac = ""] = s.split(".");
  const units = BigInt(whole) * BigInt(UNIT) + BigInt((frac + "000000").slice(0, USDC_DECIMALS));
  return new BN(units.toString());
}

export function short(addr: string, n = 4): string {
  return addr.length <= n * 2 + 1 ? addr : `${addr.slice(0, n)}…${addr.slice(-n)}`;
}

/** Seconds -> "3d 4h", "12m 05s" */
export function duration(seconds: number): string {
  if (seconds <= 0) return "expired";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

/** Seconds -> "30 days" / "2 hours" / "10 minutes" for plan lengths. */
export function planLength(seconds: number): string {
  const units: [number, string][] = [
    [86400, "day"],
    [3600, "hour"],
    [60, "minute"],
  ];
  for (const [size, name] of units) {
    if (seconds >= size && seconds % size === 0) {
      const v = seconds / size;
      return `${v} ${name}${v === 1 ? "" : "s"}`;
    }
  }
  return duration(seconds);
}
