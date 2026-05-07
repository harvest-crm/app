import type { ContactFilters, TaskFilters, DealFilters, AnyFilters, EntityType } from "./filter-types";

// ── Encode ────────────────────────────────────────────────────────────────────

export function encodeFilters(filters: AnyFilters): URLSearchParams {
  const p = new URLSearchParams();
  const f = filters as Record<string, unknown>;

  if (f.q && typeof f.q === "string") p.set("q", f.q);

  if (Array.isArray(f.workspaceIds) && f.workspaceIds.length > 0)
    p.set("ws", (f.workspaceIds as string[]).join(","));

  if (Array.isArray(f.tagIds) && f.tagIds.length > 0)
    p.set("tags", (f.tagIds as string[]).join(","));

  if (f.tagsLogic === "and") p.set("tagsLogic", "and");

  if (Array.isArray(f.temperature) && f.temperature.length > 0)
    p.set("temp", (f.temperature as string[]).join(","));

  if (f.hasOpenTasks === true)  p.set("hasOpenTasks", "true");
  if (f.hasOpenDeals === true)  p.set("hasOpenDeals", "true");
  if (f.hasContact   === true)  p.set("hasContact", "true");
  if (f.hasReminder  === true)  p.set("hasReminder", "true");

  if (typeof f.createdAfter  === "string") p.set("createdAfter",  f.createdAfter);
  if (typeof f.createdBefore === "string") p.set("createdBefore", f.createdBefore);

  if (Array.isArray(f.taskTypes) && f.taskTypes.length > 0)
    p.set("types", (f.taskTypes as string[]).join(","));

  if (Array.isArray(f.priorities) && f.priorities.length > 0)
    p.set("pri", (f.priorities as string[]).join(","));

  if (f.status && f.status !== "all") p.set("status", f.status as string);

  if (f.dueWithin && f.dueWithin !== "all") p.set("due", f.dueWithin as string);

  if (Array.isArray(f.stageIds) && f.stageIds.length > 0)
    p.set("stages", (f.stageIds as string[]).join(","));

  if (typeof f.valueMin === "number") p.set("valMin", String(f.valueMin));
  if (typeof f.valueMax === "number") p.set("valMax", String(f.valueMax));
  if (typeof f.daysInStageMin === "number") p.set("daysMin", String(f.daysInStageMin));

  if (Array.isArray(f.contactTagIds) && f.contactTagIds.length > 0)
    p.set("contactTags", (f.contactTagIds as string[]).join(","));

  return p;
}

// ── Decode ────────────────────────────────────────────────────────────────────

function splitComma(v: string | undefined): string[] | undefined {
  if (!v) return undefined;
  const arr = v.split(",").map((s) => s.trim()).filter(Boolean);
  return arr.length > 0 ? arr : undefined;
}

export function decodeContactFilters(p: URLSearchParams): ContactFilters {
  const f: ContactFilters = {};
  const q = p.get("q"); if (q) f.q = q;
  const ws = splitComma(p.get("ws") ?? undefined); if (ws) f.workspaceIds = ws;
  const tags = splitComma(p.get("tags") ?? undefined); if (tags) f.tagIds = tags;
  if (p.get("tagsLogic") === "and") f.tagsLogic = "and";
  const temp = splitComma(p.get("temp") ?? undefined);
  if (temp) f.temperature = temp as ContactFilters["temperature"];
  if (p.get("hasOpenTasks") === "true") f.hasOpenTasks = true;
  if (p.get("hasOpenDeals") === "true") f.hasOpenDeals = true;
  const ca = p.get("createdAfter");  if (ca) f.createdAfter  = ca;
  const cb = p.get("createdBefore"); if (cb) f.createdBefore = cb;
  return f;
}

export function decodeTaskFilters(p: URLSearchParams): TaskFilters {
  const f: TaskFilters = {};
  const q = p.get("q"); if (q) f.q = q;
  const ws = splitComma(p.get("ws") ?? undefined); if (ws) f.workspaceIds = ws;
  const types = splitComma(p.get("types") ?? undefined); if (types) f.taskTypes = types;
  const pri = splitComma(p.get("pri") ?? undefined);
  if (pri) f.priorities = pri as TaskFilters["priorities"];
  const status = p.get("status");
  if (status === "open" || status === "completed" || status === "all") f.status = status;
  const due = p.get("due");
  if (due === "overdue" || due === "today" || due === "this_week" || due === "this_month" || due === "all")
    f.dueWithin = due;
  if (p.get("hasReminder") === "true") f.hasReminder = true;
  return f;
}

export function decodeDealFilters(p: URLSearchParams): DealFilters {
  const f: DealFilters = {};
  const q = p.get("q"); if (q) f.q = q;
  const stages = splitComma(p.get("stages") ?? undefined); if (stages) f.stageIds = stages;
  const valMin = p.get("valMin"); if (valMin) f.valueMin = Number(valMin);
  const valMax = p.get("valMax"); if (valMax) f.valueMax = Number(valMax);
  const daysMin = p.get("daysMin"); if (daysMin) f.daysInStageMin = Number(daysMin);
  if (p.get("hasContact") === "true") f.hasContact = true;
  const ct = splitComma(p.get("contactTags") ?? undefined); if (ct) f.contactTagIds = ct;
  const ca = p.get("createdAfter");  if (ca) f.createdAfter  = ca;
  const cb = p.get("createdBefore"); if (cb) f.createdBefore = cb;
  return f;
}

export function decodeFilters(p: URLSearchParams, entityType: EntityType): AnyFilters {
  if (entityType === "contact") return decodeContactFilters(p);
  if (entityType === "task")    return decodeTaskFilters(p);
  return decodeDealFilters(p);
}

// ── Count active filters ──────────────────────────────────────────────────────

export function countActiveFilters(filters: AnyFilters): number {
  const f = filters as Record<string, unknown>;
  let n = 0;
  if (f.q) n++;
  if (Array.isArray(f.workspaceIds) && f.workspaceIds.length > 0) n++;
  if (Array.isArray(f.tagIds) && f.tagIds.length > 0) n++;
  if (Array.isArray(f.temperature) && f.temperature.length > 0) n++;
  if (f.hasOpenTasks === true) n++;
  if (f.hasOpenDeals === true) n++;
  if (f.hasContact   === true) n++;
  if (f.hasReminder  === true) n++;
  if (f.createdAfter  || f.createdBefore) n++;
  if (Array.isArray(f.taskTypes) && f.taskTypes.length > 0) n++;
  if (Array.isArray(f.priorities) && f.priorities.length > 0) n++;
  if (f.status && f.status !== "all") n++;
  if (f.dueWithin && f.dueWithin !== "all") n++;
  if (Array.isArray(f.stageIds) && f.stageIds.length > 0) n++;
  if (typeof f.valueMin === "number" || typeof f.valueMax === "number") n++;
  if (typeof f.daysInStageMin === "number") n++;
  if (Array.isArray(f.contactTagIds) && f.contactTagIds.length > 0) n++;
  return n;
}
