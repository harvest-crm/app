"use client";

import { useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { moveDealToStage } from "@/app/actions/deals";
import { DealDialog } from "./deal-dialog";
import type { ContactOption, SerializedDeal, SerializedStage } from "./types";
import { cn } from "@/lib/utils";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtValue(v: number | null | undefined): string {
  if (!v) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
}

function daysInStage(movedAt: string): number {
  return Math.floor((Date.now() - new Date(movedAt).getTime()) / 86_400_000);
}

// ── DealCard ─────────────────────────────────────────────────────────────────

function DealCard({
  deal,
  isPending,
  isOverlay,
  onClick,
}: {
  deal: SerializedDeal;
  isPending?: boolean;
  isOverlay?: boolean;
  onClick?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
    disabled: isPending || isOverlay,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const days = daysInStage(deal.movedToStageAt);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "touch-none cursor-grab select-none rounded-lg border border-[#E8DFC8] bg-white p-3 shadow-sm transition-shadow",
        "hover:border-[#E8DFC8] hover:shadow-md active:cursor-grabbing",
        isDragging && "opacity-30",
        isPending && "pointer-events-none cursor-wait opacity-50",
        isOverlay && "rotate-1 cursor-grabbing shadow-xl ring-2 ring-[#1F8A8A]",
      )}
    >
      <p className="text-sm font-medium leading-snug text-[#0F2540]">{deal.title}</p>

      {deal.contact && (
        <a
          href={`/contacts/${deal.contact.id}`}
          className="mt-1 block text-xs text-[#1F8A8A] hover:underline"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {deal.contact.firstName} {deal.contact.lastName ?? ""}
        </a>
      )}

      <div className="mt-2 flex items-center justify-between gap-2">
        {deal.value ? (
          <span className="text-xs font-semibold text-[#3D5775]">{fmtValue(deal.value)}</span>
        ) : (
          <span />
        )}
        {days >= 1 && (
          <span
            className={cn(
              "shrink-0 rounded-full px-1.5 py-0.5 text-xs font-medium",
              days >= 30
                ? "bg-red-100 text-red-600"
                : days >= 14
                  ? "bg-amber-100 text-amber-600"
                  : "bg-[#E2F0EE] text-[#3D5775]",
            )}
          >
            {days}d
          </span>
        )}
      </div>
    </div>
  );
}

// ── KanbanColumn ─────────────────────────────────────────────────────────────

function KanbanColumn({
  stage,
  deals,
  pendingMoves,
  isFirst,
  onDealClick,
}: {
  stage: SerializedStage;
  deals: SerializedDeal[];
  pendingMoves: Set<string>;
  isFirst: boolean;
  onDealClick: (deal: SerializedDeal) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: stage.id });

  const stageTotal = deals.reduce((s, d) => s + (d.value ?? 0), 0);
  const isWon = stage.isTerminal && stage.terminalOutcome === "won";
  const isLost = stage.isTerminal && stage.terminalOutcome === "lost";

  return (
    <div className="flex h-full w-72 shrink-0 flex-col overflow-hidden rounded-lg border border-[#E8DFC8] bg-white">
      {/* Column header */}
      <div
        className={cn(
          "flex items-start justify-between border-b px-3 py-2.5",
          isWon
            ? "border-emerald-200 bg-emerald-50"
            : isLost
              ? "border-red-200 bg-red-50"
              : "border-[#E8DFC8] bg-[#F5EFE0]",
        )}
      >
        <div className="min-w-0">
          <p
            className={cn(
              "truncate text-sm font-semibold",
              isWon ? "text-emerald-800" : isLost ? "text-red-800" : "text-[#3D5775]",
            )}
          >
            {stage.name}
          </p>
          <p className="mt-0.5 text-xs text-[#3D5775]">
            {deals.length} deal{deals.length !== 1 ? "s" : ""}
            {stageTotal > 0 && ` · ${fmtValue(stageTotal)}`}
          </p>
        </div>
        {isWon && <span className="ml-2 text-sm text-emerald-500">✓</span>}
        {isLost && <span className="ml-2 text-sm text-red-500">✗</span>}
      </div>

      {/* Card list (droppable) */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 space-y-2 overflow-y-auto p-2 transition-colors",
          isOver && "bg-[#E2F0EE]",
        )}
      >
        {deals.map((deal) => (
          <DealCard
            key={deal.id}
            deal={deal}
            isPending={pendingMoves.has(deal.id)}
            onClick={() => onDealClick(deal)}
          />
        ))}
        {deals.length === 0 && isFirst && (
          <p className="py-8 text-center text-xs text-[#3D5775]">Drag deals here</p>
        )}
      </div>
    </div>
  );
}

// ── KanbanBoard ───────────────────────────────────────────────────────────────

type Props = {
  workspace: { id: string; name: string; slug: string; color: string };
  stages: SerializedStage[];
  initialDeals: SerializedDeal[];
  contacts: ContactOption[];
  initialPipelineValue: number;
};

export function KanbanBoard({
  workspace,
  stages,
  initialDeals,
  contacts,
}: Props) {
  // ── State ──
  const [dealsByStage, setDealsByStage] = useState<Record<string, SerializedDeal[]>>(() => {
    const map: Record<string, SerializedDeal[]> = {};
    for (const stage of stages) {
      map[stage.id] = initialDeals
        .filter((d) => d.stageId === stage.id)
        .sort((a, b) => new Date(b.movedToStageAt).getTime() - new Date(a.movedToStageAt).getTime());
    }
    return map;
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingMoves, setPendingMoves] = useState<Set<string>>(new Set());
  const [newDealOpen, setNewDealOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<SerializedDeal | null>(null);

  const snapshotRef = useRef<Record<string, SerializedDeal[]> | null>(null);

  // ── Computed ──
  const pipelineValue = useMemo(
    () =>
      Object.values(dealsByStage)
        .flat()
        .filter((d) => d.status === "open" && d.value != null)
        .reduce((s, d) => s + (d.value ?? 0), 0),
    [dealsByStage],
  );

  const activeDeal = useMemo(() => {
    if (!activeId) return null;
    for (const deals of Object.values(dealsByStage)) {
      const found = deals.find((d) => d.id === activeId);
      if (found) return found;
    }
    return null;
  }, [activeId, dealsByStage]);

  const firstNonTerminalId = stages.find((s) => !s.isTerminal)?.id ?? stages[0]?.id;

  // ── DnD sensors ──
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  // ── DnD handlers ──
  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string);
    snapshotRef.current = JSON.parse(JSON.stringify(dealsByStage));
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);

    if (!over || !snapshotRef.current) {
      snapshotRef.current = null;
      return;
    }

    const dealId = active.id as string;
    const targetStageId = over.id as string;

    // Locate deal's current stage
    let fromStageId: string | null = null;
    let deal: SerializedDeal | null = null;
    for (const [sid, sdeals] of Object.entries(dealsByStage)) {
      const found = sdeals.find((d) => d.id === dealId);
      if (found) { fromStageId = sid; deal = found; break; }
    }

    if (!fromStageId || !deal || fromStageId === targetStageId) {
      snapshotRef.current = null;
      return;
    }

    const targetStage = stages.find((s) => s.id === targetStageId);
    const newStatus = targetStage?.isTerminal
      ? (targetStage.terminalOutcome ?? "open")
      : "open";

    const updatedDeal: SerializedDeal = {
      ...deal,
      stageId: targetStageId,
      status: newStatus,
      movedToStageAt: new Date().toISOString(),
    };

    // Optimistic update
    setDealsByStage((prev) => ({
      ...prev,
      [fromStageId!]: prev[fromStageId!].filter((d) => d.id !== dealId),
      [targetStageId]: [updatedDeal, ...(prev[targetStageId] ?? [])],
    }));

    setPendingMoves((prev) => new Set(prev).add(dealId));

    const snapshot = snapshotRef.current;
    snapshotRef.current = null;

    moveDealToStage(dealId, targetStageId).then((result) => {
      setPendingMoves((prev) => {
        const s = new Set(prev);
        s.delete(dealId);
        return s;
      });
      if ("error" in result) {
        setDealsByStage(snapshot!);
        toast.error(result.error ?? "Failed to move deal");
      } else {
        toast.success(`Moved to ${targetStage?.name ?? "new stage"}`);
      }
    });
  }

  function handleDragCancel() {
    setActiveId(null);
    if (snapshotRef.current) {
      setDealsByStage(snapshotRef.current);
      snapshotRef.current = null;
    }
  }

  // ── Dialog callbacks ──
  function handleDealCreated(deal: SerializedDeal) {
    setDealsByStage((prev) => ({
      ...prev,
      [deal.stageId]: [deal, ...(prev[deal.stageId] ?? [])],
    }));
    setNewDealOpen(false);
    toast.success("Deal created");
  }

  function handleDealUpdated(deal: SerializedDeal, originalStageId: string) {
    setDealsByStage((prev) => {
      const next = { ...prev };
      // Remove from original stage
      if (next[originalStageId]) {
        next[originalStageId] = next[originalStageId].filter((d) => d.id !== deal.id);
      }
      // Add or update in target stage
      const targetDeals = next[deal.stageId] ?? [];
      const idx = targetDeals.findIndex((d) => d.id === deal.id);
      if (idx >= 0) {
        next[deal.stageId] = targetDeals.map((d) => (d.id === deal.id ? deal : d));
      } else {
        next[deal.stageId] = [deal, ...targetDeals];
      }
      return next;
    });
    setEditingDeal(null);
    toast.success("Deal saved");
  }

  function handleDealDeleted(dealId: string, stageId: string) {
    setDealsByStage((prev) => ({
      ...prev,
      [stageId]: (prev[stageId] ?? []).filter((d) => d.id !== dealId),
    }));
    setEditingDeal(null);
    toast.success("Deal deleted");
  }

  // ── No stages ──
  if (stages.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <BoardHeader
          workspace={workspace}
          pipelineValue={pipelineValue}
          onNewDeal={() => {}}
          newDealDisabled
        />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-[#3D5775]">
            This workspace has no stages set up. Add stages in workspace settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <BoardHeader
        workspace={workspace}
        pipelineValue={pipelineValue}
        onNewDeal={() => setNewDealOpen(true)}
      />

      {/* Board */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex flex-1 gap-3 overflow-x-auto p-4">
          {stages.map((stage, i) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              deals={dealsByStage[stage.id] ?? []}
              pendingMoves={pendingMoves}
              isFirst={i === 0}
              onDealClick={setEditingDeal}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeDeal && <DealCard deal={activeDeal} isOverlay />}
        </DragOverlay>
      </DndContext>

      {/* Dialogs (outside DnD context) */}
      {newDealOpen && (
        <DealDialog
          mode="create"
          stages={stages}
          contacts={contacts}
          workspaceId={workspace.id}
          defaultStageId={firstNonTerminalId}
          onCreated={handleDealCreated}
          onUpdated={handleDealUpdated}
          onDeleted={handleDealDeleted}
          onClose={() => setNewDealOpen(false)}
        />
      )}
      {editingDeal && (
        <DealDialog
          mode="edit"
          deal={editingDeal}
          stages={stages}
          contacts={contacts}
          workspaceId={workspace.id}
          onCreated={handleDealCreated}
          onUpdated={handleDealUpdated}
          onDeleted={handleDealDeleted}
          onClose={() => setEditingDeal(null)}
        />
      )}
    </div>
  );
}

// ── BoardHeader ───────────────────────────────────────────────────────────────

function BoardHeader({
  workspace,
  pipelineValue,
  onNewDeal,
  newDealDisabled,
}: {
  workspace: { name: string; color: string };
  pipelineValue: number;
  onNewDeal: () => void;
  newDealDisabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b bg-white px-6 py-4">
      <div className="flex items-center gap-3">
        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: workspace.color }} />
        <div>
          <h1 className="text-lg font-semibold text-[#0F2540]">{workspace.name} · Deals</h1>
          {pipelineValue > 0 && (
            <p className="text-xs text-[#3D5775]">
              Pipeline:{" "}
              <span className="font-semibold text-[#3D5775]">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                  maximumFractionDigits: 0,
                }).format(pipelineValue)}
              </span>{" "}
              open
            </p>
          )}
        </div>
      </div>
      <Button size="sm" onClick={onNewDeal} disabled={newDealDisabled}>
        <Plus className="mr-1.5 h-4 w-4" />
        New Deal
      </Button>
    </div>
  );
}
