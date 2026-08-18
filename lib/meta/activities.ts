import "server-only";
import { graphAccountAll, metaEnv } from "./graph";
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
  object_name?: string;
  object_type?: string;
  extra_data?: string;
};

const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/** Tradução dos eventos mais comuns do log da conta. */
const EVENT_LABEL: Record<string, string> = {
  first_delivery_event: "Primeira entrega",
  update_ad_run_status: "Status do anúncio alterado",
  update_ad_set_run_status: "Status do conjunto alterado",
  update_campaign_run_status: "Status da campanha alterado",
  update_ad_set_budget: "Orçamento do conjunto alterado",
  update_campaign_budget: "Orçamento da campanha alterado",
  update_ad_set_bid_strategy: "Estratégia de lance alterada",
  update_ad_set_target_spec: "Segmentação alterada",
  update_ad_set_duration: "Período de veiculação alterado",
  update_ad_creative: "Criativo atualizado",
  create_ad: "Anúncio criado",
  create_ad_set: "Conjunto criado",
  create_campaign: "Campanha criada",
  update_campaign_name: "Campanha renomeada",
  update_ad_set_name: "Conjunto renomeado",
  update_ad_name: "Anúncio renomeado",
  ad_review_approved: "Anúncio aprovado",
  ad_account_update_spend_limit: "Limite de gasto da conta alterado",
};

function tagFor(eventType: string): string {
  const e = eventType.toLowerCase();
  if (e.includes("budget") || e.includes("bid") || e.includes("spend_limit")) return "VERBA";
  if (e.includes("creative") || e.includes("image") || e.includes("video") || e.includes("create_ad")) return "CRIATIVO";
  if (e.includes("target") || e.includes("audience")) return "PÚBLICO";
  return "STATUS";
}

function titleFor(raw: RawActivity): string {
  return EVENT_LABEL[raw.event_type] || raw.translated_event_type || raw.event_type.replace(/_/g, " ");
}

/** Detalhe legível: nome do objeto afetado e, quando houver, o valor alterado. */
function detailFrom(raw: RawActivity): string {
  const parts: string[] = [];
  if (raw.object_name) parts.push(raw.object_name);

  if (raw.extra_data) {
    try {
      const parsed = JSON.parse(raw.extra_data) as Record<string, unknown>;
      const old = parsed.old_value ?? parsed.old_budget ?? parsed.old_status;
      const nu = parsed.new_value ?? parsed.new_budget ?? parsed.new_status;
      if (old !== undefined && nu !== undefined) parts.push(`${String(old)} → ${String(nu)}`);
      else if (nu !== undefined) parts.push(String(nu));
    } catch {
      /* extra_data nem sempre é JSON válido — ignora silenciosamente */
    }
  }
  if (!parts.length && raw.actor_name) parts.push(raw.actor_name);
  return parts.join(" · ");
}

export async function getActivities(range: DateRange, limit = 40): Promise<ActivityRow[]> {
  const { accountId } = metaEnv();
  const rows = await graphAccountAll<RawActivity>(`${accountId}/activities`, {
    fields: "event_type,event_time,translated_event_type,actor_name,object_name,object_type,extra_data",
    since: range.since,
    until: range.until,
    limit: Math.min(limit, 200),
  }, 5);

  return rows.slice(0, limit).map((raw) => {
    const dt = new Date(raw.event_time);
    const valid = !Number.isNaN(dt.getTime());
    const date = valid ? dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "";
    const time = valid ? `${date} ${dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : raw.event_time;
    return {
      time,
      date,
      weekday: valid ? WEEKDAYS[dt.getDay()] : "",
      title: titleFor(raw),
      detail: detailFrom(raw),
      tag: tagFor(raw.event_type),
    };
  });
}
