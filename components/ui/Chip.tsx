import Link from "next/link";
import { chipStyle } from "@/lib/style";

export function ChipLink({ href, active, accent, children }: { href: string; active: boolean; accent?: string; children: React.ReactNode }) {
  return (
    <Link href={href} style={chipStyle(active, accent)} scroll={false}>
      {children}
    </Link>
  );
}

export function ChipStatic({ active, accent, children }: { active: boolean; accent?: string; children: React.ReactNode }) {
  return <div style={chipStyle(active, accent)}>{children}</div>;
}

export function ChipRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 4, background: "var(--soft)", padding: 3, borderRadius: 10 }}>{children}</div>;
}
