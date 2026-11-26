import { formatTenge } from "@/lib/finance/format";

export function Money({ value, className = "", signed = false }: { value: number; className?: string; signed?: boolean }) {
  const color = signed ? (value < 0 ? "text-negative" : "text-positive") : "";
  return <span className={`${color} ${className} whitespace-nowrap`}>{formatTenge(value)}</span>;
}
