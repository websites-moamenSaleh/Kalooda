"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { ModalBackdrop } from "@/components/ui/modal-backdrop";

type ChoiceRow = {
  id?: string;
  name_en: string;
  name_ar: string;
  price_markup: string;
  is_enabled: boolean;
};

type ChoiceSource = "manual" | "category_products";

type OptionRow = {
  id: string;
  type: "single" | "multiple";
  title_en: string;
  title_ar: string | null;
  choice_source?: ChoiceSource;
  source_category_id?: string | null;
};

type StoredChoiceRow = {
  id: string;
  option_id: string;
  name_en: string;
  name_ar: string | null;
  price_markup: number;
  is_enabled: boolean;
};

type CategoryRow = {
  id: string;
  name: string;
  name_ar: string | null;
};

function emptyChoiceRow(): ChoiceRow {
  return { name_en: "", name_ar: "", price_markup: "", is_enabled: true };
}

function priceAdjustmentLabel(value: number) {
  if (value === 0) return "";
  return `${value > 0 ? "+" : "-"}₪${Math.abs(value).toFixed(2)}`;
}

export function OptionsLibraryPanel() {
  const { t } = useLanguage();
  const [options, setOptions] = useState<OptionRow[]>([]);
  const [choices, setChoices] = useState<StoredChoiceRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const [titleEn, setTitleEn] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [optType, setOptType] = useState<"single" | "multiple">("single");
  const [choiceSource, setChoiceSource] = useState<ChoiceSource>("manual");
  const [sourceCategoryId, setSourceCategoryId] = useState("");
  const [newChoices, setNewChoices] = useState<ChoiceRow[]>([emptyChoiceRow()]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, catRes] = await Promise.all([
        fetch("/api/admin/options"),
        fetch("/api/categories"),
      ]);
      if (catRes.ok) {
        const catData = (await catRes.json()) as CategoryRow[];
        setCategories(Array.isArray(catData) ? catData : []);
      }
      if (!res.ok) return;
      const data = (await res.json()) as {
        options?: typeof options;
        choices?: typeof choices;
      };
      setOptions(data.options ?? []);
      setChoices(data.choices ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function resetCreateFormFields() {
    setEditingOptionId(null);
    setTitleEn("");
    setTitleAr("");
    setOptType("single");
    setChoiceSource("manual");
    setSourceCategoryId("");
    setNewChoices([emptyChoiceRow()]);
  }

  function openCreateForm() {
    resetCreateFormFields();
    setFormOpen(true);
  }

  function openEditForm(option: OptionRow) {
    const optionChoices = choices
      .filter((c) => c.option_id === option.id)
      .map((c) => ({
        id: c.id,
        name_en: c.name_en,
        name_ar: c.name_ar ?? "",
        price_markup: c.price_markup === 0 ? "" : String(c.price_markup),
        is_enabled: c.is_enabled,
      }));
    setEditingOptionId(option.id);
    setTitleEn(option.title_en);
    setTitleAr(option.title_ar ?? "");
    setOptType(option.type);
    setChoiceSource(option.choice_source ?? "manual");
    setSourceCategoryId(option.source_category_id ?? "");
    setNewChoices(optionChoices.length > 0 ? optionChoices : [emptyChoiceRow()]);
    setFormOpen(true);
  }

  function closeForm() {
    resetCreateFormFields();
    setFormOpen(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!titleEn.trim()) return;
    const usesCategoryProducts = choiceSource === "category_products";
    if (usesCategoryProducts && !sourceCategoryId) return;
    setSaving(true);
    try {
      const body = {
        type: optType,
        title_en: titleEn.trim(),
        title_ar: titleAr.trim() || null,
        choice_source: choiceSource,
        source_category_id: usesCategoryProducts ? sourceCategoryId : null,
        choices: usesCategoryProducts
          ? []
          : newChoices
              .filter((c) => c.name_en.trim())
              .map((c) => ({
                id: c.id,
                name_en: c.name_en.trim(),
                name_ar: c.name_ar.trim() || null,
                price_markup: Number(c.price_markup) || 0,
                is_enabled: c.is_enabled,
              })),
      };
      const res = await fetch(
        editingOptionId
          ? `/api/admin/options/${editingOptionId}`
          : "/api/admin/options",
        {
          method: editingOptionId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (res.ok) {
        await load();
        closeForm();
      }
    } finally {
      setSaving(false);
    }
  }

  function updateChoice(index: number, patch: Partial<ChoiceRow>) {
    const next = [...newChoices];
    next[index] = { ...next[index], ...patch };
    setNewChoices(next);
  }

  function removeChoice(index: number) {
    setNewChoices((current) => {
      const next = current.filter((_, i) => i !== index);
      return next.length > 0 ? next : [emptyChoiceRow()];
    });
  }

  async function handleDeleteOption(id: string) {
    if (!confirm("Delete this option? It will detach from all products.")) return;
    const res = await fetch(`/api/admin/options/${id}`, { method: "DELETE" });
    if (res.ok) {
      if (editingOptionId === id) closeForm();
      void load();
    }
  }

  const formTitle = editingOptionId ? t("editOption") : t("createOption");
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  );

  if (loading) {
    return <p className="text-sm text-admin-muted">{t("loadingProducts")}</p>;
  }

  return (
    <div className="space-y-8">
      <button
        type="button"
        onClick={openCreateForm}
        className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-[#082018] transition-colors hover:bg-primary/90"
      >
        {t("addOption")}
      </button>

      {formOpen ? (
        <ModalBackdrop
          onClose={closeForm}
          disabled={saving}
          role="dialog"
          aria-modal
          aria-labelledby="option-form-title"
        >
          <div
            className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-admin-border bg-admin-panel p-6 shadow-lg"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 id="option-form-title" className="font-semibold text-admin-ink">
                {formTitle}
              </h3>
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-lg p-1 text-admin-muted hover:bg-[rgba(31,68,60,0.06)] disabled:opacity-50"
                aria-label={t("cancel")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-admin-muted">
                    {t("optionType")}
                  </label>
                  <select
                    value={optType}
                    onChange={(e) =>
                      setOptType(e.target.value as "single" | "multiple")
                    }
                    className="admin-input w-full"
                  >
                    <option value="single">single</option>
                    <option value="multiple">multiple</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-admin-muted">
                    {t("optionTitleEn")}
                  </label>
                  <input
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    className="admin-input w-full"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-admin-muted">
                  {t("optionTitleAr")}
                </label>
                <input
                  value={titleAr}
                  onChange={(e) => setTitleAr(e.target.value)}
                  className="admin-input w-full"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-admin-muted">
                    Choice source
                  </label>
                  <select
                    value={choiceSource}
                    onChange={(e) => {
                      const next = e.target.value as ChoiceSource;
                      setChoiceSource(next);
                      if (next === "manual") setSourceCategoryId("");
                    }}
                    className="admin-input w-full"
                  >
                    <option value="manual">Manual choices</option>
                    <option value="category_products">Products in category</option>
                  </select>
                </div>
                {choiceSource === "category_products" ? (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-admin-muted">
                      Category
                    </label>
                    <select
                      value={sourceCategoryId}
                      onChange={(e) => setSourceCategoryId(e.target.value)}
                      className="admin-input w-full"
                      required
                    >
                      <option value="">Choose a category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                          {category.name_ar ? ` / ${category.name_ar}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-admin-muted">
                  {t("choices")}
                </p>
                {choiceSource === "category_products" ? (
                  <p className="rounded-lg border border-admin-border bg-[#fffcf8] p-3 text-sm text-admin-muted">
                    Choices will be the currently available products in the selected
                    category. They are always zero-cost and update as products move,
                    become unavailable, or become available again.
                  </p>
                ) : (
                  <>
                    <div className="space-y-2">
                      {newChoices.map((row, i) => (
                        <div key={row.id ?? i} className="flex flex-wrap gap-2">
                          <input
                            placeholder={t("choiceNameEn")}
                            value={row.name_en}
                            onChange={(e) => updateChoice(i, { name_en: e.target.value })}
                            className="admin-input min-w-[8rem] flex-1"
                          />
                          <input
                            placeholder={t("choiceNameAr")}
                            value={row.name_ar}
                            onChange={(e) => updateChoice(i, { name_ar: e.target.value })}
                            className="admin-input min-w-[8rem] flex-1"
                          />
                          <input
                            type="number"
                            step="0.01"
                            placeholder={t("priceMarkup")}
                            value={row.price_markup}
                            onChange={(e) =>
                              updateChoice(i, { price_markup: e.target.value })
                            }
                            className="admin-input w-24"
                          />
                          <button
                            type="button"
                            onClick={() => removeChoice(i)}
                            className="rounded-lg border border-admin-border px-3 text-admin-muted hover:bg-[rgba(31,68,60,0.06)]"
                            aria-label={t("remove")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewChoices([...newChoices, emptyChoiceRow()])}
                      className="mt-2 text-sm font-medium text-primary"
                    >
                      + {t("addChoice")}
                    </button>
                  </>
                )}
              </div>
              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-lg border border-admin-border px-4 py-2 text-sm font-medium text-admin-muted hover:bg-[rgba(31,68,60,0.06)] disabled:opacity-50"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={
                    saving ||
                    (choiceSource === "category_products" && !sourceCategoryId)
                  }
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-[#082018] disabled:opacity-50"
                >
                  {saving ? t("saving") : t("saveOption")}
                </button>
              </div>
            </form>
          </div>
        </ModalBackdrop>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-admin-border bg-admin-panel shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="admin-table-head">
              <th className="px-4 py-3 text-start">{t("optionTitleEn")}</th>
              <th className="px-4 py-3 text-start">{t("optionType")}</th>
              <th className="px-4 py-3 text-start">{t("choices")}</th>
              <th className="w-28 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-admin-border">
            {options.map((o) => {
              const optionChoices = choices.filter((c) => c.option_id === o.id);
              return (
                <tr key={o.id}>
                  <td className="px-4 py-3 font-medium text-admin-ink">
                    <div>{o.title_en}</div>
                    {o.title_ar ? (
                      <div className="text-xs font-normal text-admin-muted">
                        {o.title_ar}
                      </div>
                    ) : null}
                    {o.choice_source === "category_products" ? (
                      <div className="text-xs font-normal text-primary">
                        Products in{" "}
                        {categoryById.get(o.source_category_id ?? "")?.name ??
                          "selected category"}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-admin-muted">{o.type}</td>
                  <td className="px-4 py-3 text-admin-muted">
                    {optionChoices.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {optionChoices.map((choice) => {
                          const priceLabel = priceAdjustmentLabel(
                            Number(choice.price_markup) || 0
                          );
                          return (
                            <span
                              key={choice.id}
                              className="rounded-full border border-admin-border px-2 py-1 text-xs"
                            >
                              {choice.name_en}
                              {choice.name_ar ? ` / ${choice.name_ar}` : ""}
                              {priceLabel ? ` (${priceLabel})` : ""}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      "0"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditForm(o)}
                        className="text-admin-muted hover:text-admin-ink"
                        aria-label={t("edit")}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteOption(o.id)}
                        className="text-red-600 hover:text-red-700"
                        aria-label={t("deleteProduct")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {options.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-admin-muted">
            {t("noOptionsYet")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
