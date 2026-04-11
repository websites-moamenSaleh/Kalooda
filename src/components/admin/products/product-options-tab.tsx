"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

type Junction = {
  product_id: string;
  option_id: string;
  sort_order: number;
  min_select: number;
  max_select: number;
  items_free: number;
  must_select_count: number;
};

type CatalogOption = {
  id: string;
  title_en: string;
  type: string;
};

function cloneJunctions(j: Junction[]): Junction[] {
  return j.map((x) => ({ ...x }));
}

function junctionsSignature(junctions: Junction[]): string {
  return JSON.stringify(
    junctions.map((j, idx) => ({
      oid: j.option_id,
      idx,
      min: j.min_select,
      max: j.max_select,
      free: j.items_free,
      must: j.must_select_count,
    }))
  );
}

function isDirty(baseline: Junction[], draft: Junction[]): boolean {
  return junctionsSignature(baseline) !== junctionsSignature(draft);
}

function makeDraftJunction(
  productId: string,
  optionId: string,
  catalogOptions: CatalogOption[],
  sortOrder: number
): Junction {
  const o = catalogOptions.find((x) => x.id === optionId);
  const isMultiple = o?.type === "multiple";
  return {
    product_id: productId,
    option_id: optionId,
    sort_order: sortOrder,
    min_select: isMultiple ? 0 : 1,
    max_select: isMultiple ? 50 : 1,
    items_free: 0,
    must_select_count: 0,
  };
}

function withSortOrder(junctions: Junction[]): Junction[] {
  return junctions.map((j, i) => ({ ...j, sort_order: i }));
}

/**
 * Removes junction rows that existed on the server but were removed from the draft.
 * Sequential DELETEs — same behavior as before; not a single DB transaction.
 */
async function deleteRemovedProductJunctions(
  productId: string,
  baseline: Junction[],
  draft: Junction[]
): Promise<void> {
  for (const j of baseline) {
    if (draft.some((d) => d.option_id === j.option_id)) continue;
    const res = await fetch(
      `/api/admin/products/${productId}/options?option_id=${encodeURIComponent(j.option_id)}`,
      { method: "DELETE" }
    );
    if (!res.ok) throw new Error(`delete:${j.option_id}`);
  }
}

type JunctionUpsertBody = {
  option_id: string;
  sort_order: number;
  min_select: number;
  max_select: number;
  items_free: number;
  must_select_count: number;
};

/** POST new links, PATCH existing — order matches draft (same as prior loop). */
async function upsertOrderedProductJunctions(
  productId: string,
  ordered: Junction[],
  baselineIds: Set<string>
): Promise<void> {
  for (let i = 0; i < ordered.length; i++) {
    const j = ordered[i];
    const body: JunctionUpsertBody = {
      option_id: j.option_id,
      sort_order: i,
      min_select: j.min_select,
      max_select: j.max_select,
      items_free: j.items_free,
      must_select_count: j.must_select_count,
    };
    const isNew = !baselineIds.has(j.option_id);
    const res = await fetch(`/api/admin/products/${productId}/options`, {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${isNew ? "POST" : "PATCH"}:${j.option_id}`);
  }
}

function SortableJunctionRow({
  junction,
  title,
  onDetach,
  onPatch,
}: {
  junction: Junction;
  title: string;
  onDetach: () => void;
  onPatch: (partial: Partial<Junction>) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: junction.option_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex flex-col gap-3 rounded-lg border border-admin-border bg-[#fffcf8] p-3 sm:flex-row sm:items-center"
    >
      <button
        type="button"
        className="touch-none text-admin-muted hover:text-admin-ink"
        {...attributes}
        {...listeners}
        aria-label="Reorder"
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-admin-ink">{title}</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <label className="text-xs text-admin-muted">
            min
            <input
              type="number"
              className="admin-input mt-1 w-full"
              value={junction.min_select}
              onChange={(e) =>
                onPatch({ min_select: Math.max(0, Number(e.target.value) || 0) })
              }
            />
          </label>
          <label className="text-xs text-admin-muted">
            max
            <input
              type="number"
              className="admin-input mt-1 w-full"
              value={junction.max_select}
              onChange={(e) =>
                onPatch({
                  max_select: Math.max(1, Number(e.target.value) || 1),
                })
              }
            />
          </label>
          <label className="text-xs text-admin-muted">
            free
            <input
              type="number"
              className="admin-input mt-1 w-full"
              value={junction.items_free}
              onChange={(e) =>
                onPatch({ items_free: Math.max(0, Number(e.target.value) || 0) })
              }
            />
          </label>
          <label className="text-xs text-admin-muted">
            must
            <input
              type="number"
              className="admin-input mt-1 w-full"
              value={junction.must_select_count}
              onChange={(e) =>
                onPatch({
                  must_select_count: Math.max(
                    0,
                    Number(e.target.value) || 0
                  ),
                })
              }
            />
          </label>
        </div>
      </div>
      <button
        type="button"
        onClick={onDetach}
        className="self-end text-red-600 sm:self-center"
        aria-label="Detach"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

export function ProductOptionsTab({
  productId,
  onSaveSuccess,
}: {
  productId: string;
  /** Called after options are persisted successfully (e.g. close the edit panel). */
  onSaveSuccess?: () => void;
}) {
  const { t } = useLanguage();
  const [baseline, setBaseline] = useState<Junction[]>([]);
  const [draft, setDraft] = useState<Junction[]>([]);
  const [catalogOptions, setCatalogOptions] = useState<CatalogOption[]>([]);
  const [attachId, setAttachId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  const dirty = useMemo(() => isDirty(baseline, draft), [baseline, draft]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const load = useCallback(
    async (showSpinner: boolean) => {
      if (showSpinner) setLoading(true);
      try {
        const [jRes, oRes] = await Promise.all([
          fetch(`/api/admin/products/${productId}/options`),
          fetch("/api/admin/options"),
        ]);
        if (jRes.ok) {
          const jData = (await jRes.json()) as { junctions?: Junction[] };
          const list = jData.junctions ?? [];
          const normalized = withSortOrder(list);
          setBaseline(cloneJunctions(normalized));
          setDraft(cloneJunctions(normalized));
        }
        if (oRes.ok) {
          const oData = (await oRes.json()) as { options?: CatalogOption[] };
          setCatalogOptions(oData.options ?? []);
        }
      } finally {
        if (showSpinner) setLoading(false);
      }
    },
    [productId]
  );

  useEffect(() => {
    void load(true);
  }, [load]);

  useEffect(() => {
    if (!saveOk) return;
    const tmr = setTimeout(() => setSaveOk(false), 4000);
    return () => clearTimeout(tmr);
  }, [saveOk]);

  useEffect(() => {
    if (dirty) setSaveOk(false);
  }, [dirty]);

  const optionTitle = useCallback(
    (id: string) => {
      const o = catalogOptions.find((x) => x.id === id);
      if (!o) return id;
      return o.title_en;
    },
    [catalogOptions]
  );

  const attachable = useMemo(() => {
    const linked = new Set(draft.map((j) => j.option_id));
    return catalogOptions.filter((o) => !linked.has(o.id));
  }, [catalogOptions, draft]);

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = draft.findIndex((j) => j.option_id === active.id);
    const newIndex = draft.findIndex((j) => j.option_id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = withSortOrder(arrayMove(draft, oldIndex, newIndex));
    setDraft(next);
  }

  function patchDraftRow(optionId: string, partial: Partial<Junction>) {
    setDraft((prev) =>
      prev.map((x) => (x.option_id === optionId ? { ...x, ...partial } : x))
    );
  }

  function attachToDraft() {
    if (!attachId) return;
    setDraft((prev) => {
      if (prev.some((j) => j.option_id === attachId)) return prev;
      const row = makeDraftJunction(
        productId,
        attachId,
        catalogOptions,
        prev.length
      );
      return withSortOrder([...prev, row]);
    });
    setAttachId("");
  }

  function detachFromDraft(optionId: string) {
    setDraft((prev) => withSortOrder(prev.filter((j) => j.option_id !== optionId)));
  }

  function cancelDraft() {
    setSaveError(null);
    setDraft(cloneJunctions(baseline));
  }

  async function saveDraft() {
    if (!dirty || saving) return;
    setSaving(true);
    setSaveError(null);
    setSaveOk(false);
    const baselineSnap = baseline;
    const baselineIds = new Set(baselineSnap.map((j) => j.option_id));

    try {
      await deleteRemovedProductJunctions(productId, baselineSnap, draft);
      await upsertOrderedProductJunctions(
        productId,
        withSortOrder(draft),
        baselineIds
      );

      await load(false);
      onSaveSuccess?.();
      if (!onSaveSuccess) setSaveOk(true);
    } catch (e) {
      console.error("ProductOptionsTab saveDraft failed:", e);
      setSaveError(t("productOptionsSaveFailed"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-admin-muted">{t("loadingProducts")}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[12rem] flex-1">
          <label className="mb-1 block text-xs font-medium text-admin-muted">
            {t("attachOption")}
          </label>
          <select
            value={attachId}
            onChange={(e) => setAttachId(e.target.value)}
            className="admin-input w-full"
          >
            <option value="">{t("selectCategory")}</option>
            {attachable.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title_en} ({o.type})
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={attachToDraft}
          disabled={!attachId}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-[#082018] disabled:opacity-50"
        >
          {t("attachOption")}
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={draft.map((j) => j.option_id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-2">
            {draft.map((j) => (
              <SortableJunctionRow
                key={j.option_id}
                junction={j}
                title={optionTitle(j.option_id)}
                onDetach={() => detachFromDraft(j.option_id)}
                onPatch={(partial) => patchDraftRow(j.option_id, partial)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {draft.length === 0 ? (
        <p className="text-sm text-admin-muted">{t("noProductOptions")}</p>
      ) : null}

      <div className="sticky bottom-0 -mx-1 border-t border-admin-border bg-[#fffcf8] px-1 pt-4 pb-1">
        {dirty ? (
          <p className="mb-2 text-xs text-amber-800/90">
            {t("productOptionsUnsavedHint")}
          </p>
        ) : null}
        {saveError ? (
          <p className="mb-2 text-xs text-red-600">{saveError}</p>
        ) : null}
        {saveOk ? (
          <p className="mb-2 text-xs text-emerald-700">{t("productOptionsSaved")}</p>
        ) : null}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={cancelDraft}
            disabled={!dirty || saving}
            className="rounded-lg border border-admin-border bg-white px-4 py-2 text-sm font-semibold text-admin-ink disabled:opacity-50"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={() => void saveDraft()}
            disabled={!dirty || saving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-[#082018] disabled:opacity-50"
          >
            {saving ? t("saving") : t("saveProduct")}
          </button>
        </div>
      </div>
    </div>
  );
}
