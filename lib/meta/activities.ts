import "server-only";
import { graphAccount, metaEnv, type GraphPaged } from "./graph";
import type { DateRange } from "@/lib/period";

export type ActivityRow = {
  time: string;
  date: string;
  weekday: string;
  title: string;
  detail: string;
  tag: string;
};

type RawActivity = {
  event_time: string;
  event_type: string;
  translated_event_type?: string;
  actor_name?: string;
  extra_data?: string;
};

const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

function tagFor(eventType: string): string {
  const e = eventType.toLowerCase();
  if (e.includes("budget") || e.includes("bid")) return "VERBA";
  if (e.includes("creative") || e.includes("image") || e.includes("video") || e.includes("ad_") || e === "create_ad") return "CRIATIVO";
  if (e.includes("audience") || e.includes("targeting")) return "PÚBLICO";
  return "STATUS";
}

function detailFrom(raw: RawActivity): string {
  if (!raw.extra_data) return raw.actor_name || "";
  try {
    const parsed = JSON.parse(raw.extra_data) as Record<string, unknown>;
    const parts = Object.entries(parsed)
      .filter(([k]) => !k.startsWith("_"))
      .slice(0, 2)
      .map(([k, v]) => `${k}: ${String(v)}`);
    return parts.join(" · ") || raw.actor_name || "";
  } catch {
    return raw.actor_name || "";
  }
}

export async function getActivities(range: DateRange, limit = 40): Promise<ActivityRow[]> {
  const { accountId } = metaEnv();
  const res = await graphAccount<GraphPaged<RawActivity>>(`${accountId}/activities`, {
    since: range.since,
    until: range.until,
    limit,
  });

  return (res.data || []).map((raw) => {
    const dt = new Date(raw.event_time);
    const date = Number.isNaN(dt.getTime())
      ? ""
      : dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    const time = Number.isNaN(dt.getTime())
      ? raw.event_time
      : `${date} ${dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    return {
      time,
      date,
      weekday: Number.isNaN(dt.getTime()) ? "" : WEEKDAYS[dt.getDay()],
      title: raw.translated_event_type || raw.event_type,
      detail: detailFrom(raw),
      tag: tagFor(raw.event_type),
    };
  });
}
