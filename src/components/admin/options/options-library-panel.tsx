"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

type ChoiceRow = {
  id?: string;
  name_en: string;
  name_ar: string;
  price_markup: string;
  is_enabled: boolean;
};

export function OptionsLibraryPanel() {
  const { t } = useLanguage();
  const [options, setOptions] = useState<
    Array<{
      id: string;
      type: string;
      title_en: string;
      title_ar: string | null;
    }>
  >([]);
  const [choices, setChoices] = useState<
    Array<{
      id: string;
      option_id: string;
      name_en: string;
      price_markup: number;
      is_enabled: boolean;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [titleEn, setTitleEn] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [optType, setOptType] = useState<"single" | "multiple">("single");
  const [newChoices, setNewChoices] = useState<ChoiceRow[]>([
    { name_en: "", name_ar: "", price_markup: "0", is_enabled: true },
  ]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/options");
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
    setTitleEn("");
    setTitleAr("");
    setOptType("single");
    setNewChoices([
      { name_en: "", name_ar: "", price_markup: "0", is_enabled: true },
    ]);
  }

  function closeCreateForm() {
    resetCreateFormFields();
    setCreateFormOpen(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!titleEn.trim()) return;
    setCreating(true);
    try {
      const body = {
        type: optType,
        title_en: titleEn.trim(),
        title_ar: titleAr.trim() || null,
        choices: newChoices
          .filter((c) => c.name_en.trim())
          .map((c) => ({
            name_en: c.name_en.trim(),
            name_ar: c.name_ar.trim() || null,
            price_markup: Number(c.price_markup) || 0,
            is_enabled: c.is_enabled,
          })),
      };
      const res = await fetch("/api/admin/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        await load();
        closeCreateForm();
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteOption(id: string) {
    if (!confirm("Delete this option? It will detach from all products.")) return;
    const res = await fetch(`/api/admin/options/${id}`, { method: "DELETE" });
    if (res.ok) void load();
  }

  if (loading) {
    return <p className="text-sm text-admin-muted">{t("loadingProducts")}</p>;
  }

  return (
    <div className="space-y-8">
      {!createFormOpen ? (
        <button
          type="button"
          onClick={() => setCreateFormOpen(true)}
          className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-[#082018] transition-colors hover:bg-primary/90"
        >
          {t("addOption")}
        </button>
      ) : null}

      {createFormOpen ? (
      <div className="rounded-xl border border-admin-border bg-admin-panel p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold text-admin-ink">{t("createOption")}</h3>
          <button
            type="button"
            onClick={closeCreateForm}
            className="rounded-lg border border-admin-border bg-white px-3 py-1.5 text-sm font-medium text-admin-ink hover:bg-[rgba(31,68,60,0.04)]"
          >
            {t("cancel")}
          </button>
        </div>
        <form onSubmit={handleCreate} className="mt-4 space-y-4">
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
          <div>
            <p className="mb-2 text-xs font-medium text-admin-muted">
              {t("choices")}
            </p>
            <div className="space-y-2">
              {newChoices.map((row, i) => (
                <div key={i} className="flex flex-wrap gap-2">
                  <input
                    placeholder={t("choiceNameEn")}
                    value={row.name_en}
                    onChange={(e) => {
                      const next = [...newChoices];
                      next[i] = { ...next[i], name_en: e.target.value };
                      setNewChoices(next);
                    }}
                    className="admin-input min-w-[8rem] flex-1"
                  />
                  <input
                    placeholder={t("choiceNameAr")}
                    value={row.name_ar}
                    onChange={(e) => {
                      const next = [...newChoices];
                      next[i] = { ...next[i], name_ar: e.target.value };
                      setNewChoices(next);
                    }}
                    className="admin-input min-w-[8rem] flex-1"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder={t("priceMarkup")}
                    value={row.price_markup}
                    onChange={(e) => {
                      const next = [...newChoices];
                      next[i] = { ...next[i], price_markup: e.target.value };
                      setNewChoices(next);
                    }}
                    className="admin-input w-24"
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                setNewChoices([
                  ...newChoices,
                  {
                    name_en: "",
                    name_ar: "",
                    price_markup: "0",
                    is_enabled: true,
                  },
                ])
              }
              className="mt-2 text-sm font-medium text-primary"
            >
              + {t("addChoice")}
            </button>
          </div>
          <button
            type="submit"
            disabled={creating}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-[#082018]"
          >
            {creating ? t("saving") : t("saveOption")}
          </button>
        </form>
      </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-admin-border bg-admin-panel shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="admin-table-head">
              <th className="px-4 py-3 text-start">{t("optionTitleEn")}</th>
              <th className="px-4 py-3 text-start">{t("optionType")}</th>
              <th className="px-4 py-3 text-start">{t("choices")}</th>
              <th className="w-24 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-admin-border">
            {options.map((o) => {
              const n = choices.filter((c) => c.option_id === o.id).length;
              return (
                <tr key={o.id}>
                  <td className="px-4 py-3 font-medium text-admin-ink">
                    {o.title_en}
                  </td>
                  <td className="px-4 py-3 text-admin-muted">{o.type}</td>
                  <td className="px-4 py-3 text-admin-muted">{n}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => void handleDeleteOption(o.id)}
                      className="text-red-600 hover:text-red-700"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
