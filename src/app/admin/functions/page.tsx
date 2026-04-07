"use client";

import { useState, useEffect, useCallback, useReducer, useRef } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  X,
  Users,
  Phone,
  Package,
  Tag,
  RefreshCw,
} from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import type { Product, Category, Driver } from "@/types/database";
import { CatalogImageField } from "@/components/admin/catalog-image-field";
import { AdminConfirmDialog } from "@/components/admin/confirm-dialog";
import { InlineBanner, inlineBannerErrorTextClassName } from "@/components/inline-banner";
import { adminUiReducer, initialAdminUiState } from "./admin-ui-reducer";

const PAGE_SIZE = 10;

type FunctionsTab = "products" | "categories" | "drivers";

interface ProductFormData {
  name: string;
  name_ar: string;
  description: string;
  description_ar: string;
  ingredients: string;
  ingredients_ar: string;
  price: string;
  stock_quantity: string;
  allergens: string;
  allergens_ar: string;
  image_url: string;
  category_id: string;
}

const emptyForm: ProductFormData = {
  name: "",
  name_ar: "",
  description: "",
  description_ar: "",
  ingredients: "",
  ingredients_ar: "",
  price: "",
  stock_quantity: "",
  allergens: "",
  allergens_ar: "",
  image_url: "",
  category_id: "",
};

function productToForm(p: Product): ProductFormData {
  return {
    name: p.name,
    name_ar: p.name_ar ?? "",
    description: p.description ?? "",
    description_ar: p.description_ar ?? "",
    ingredients: p.ingredients ?? "",
    ingredients_ar: p.ingredients_ar ?? "",
    price: String(p.price),
    stock_quantity: String(p.stock_quantity),
    allergens: p.allergens.join(", "),
    allergens_ar: (p.allergens_ar ?? []).join(", "),
    image_url: p.image_url ?? "",
    category_id: p.category_id ?? "",
  };
}

async function uploadCatalogFile(
  file: File,
  folder: "categories" | "products"
): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", folder);
  const res = await fetch("/api/uploads/catalog", { method: "POST", body: fd });
  const data = (await res.json().catch(() => ({}))) as { error?: string; url?: string };
  if (!res.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Upload failed"
    );
  }
  if (!data.url || typeof data.url !== "string") {
    throw new Error("Upload failed");
  }
  return data.url;
}

function formToPayload(form: ProductFormData) {
  return {
    name: form.name,
    name_ar: form.name_ar || null,
    description: form.description || null,
    description_ar: form.description_ar || null,
    ingredients: form.ingredients || null,
    ingredients_ar: form.ingredients_ar || null,
    price: Number(form.price) || 0,
    stock_quantity: Number(form.stock_quantity) || 0,
    allergens: form.allergens
      ? form.allergens.split(",").map((s) => s.trim()).filter(Boolean)
      : [],
    allergens_ar: form.allergens_ar
      ? form.allergens_ar.split(",").map((s) => s.trim()).filter(Boolean)
      : [],
    image_url: form.image_url || null,
    category_id: form.category_id || null,
  };
}

export default function FunctionsPage() {
  const { t, locale } = useLanguage();
  const [adminUi, dispatch] = useReducer(adminUiReducer, initialAdminUiState);

  const [activeTab, setActiveTab] = useState<FunctionsTab>("products");
  const driversLoaded = useRef(false);

  // --- Products state ---
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProductFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [langTab, setLangTab] = useState<"en" | "ar">("en");
  const [productsVisible, setProductsVisible] = useState(PAGE_SIZE);
  const [productImagePending, setProductImagePending] = useState<File | null>(null);

  // --- Categories state ---
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryNameAr, setNewCategoryNameAr] = useState("");
  const [newCategoryImagePending, setNewCategoryImagePending] = useState<File | null>(null);
  const [addingCategory, setAddingCategory] = useState(false);
  const [categoryEditOpen, setCategoryEditOpen] = useState(false);
  const [categoryEditForm, setCategoryEditForm] = useState({
    id: "",
    name: "",
    name_ar: "",
    image_url: "",
  });
  const [categoryEditImagePending, setCategoryEditImagePending] = useState<File | null>(null);
  const [categoryEditSaving, setCategoryEditSaving] = useState(false);
  const [categoriesVisible, setCategoriesVisible] = useState(PAGE_SIZE);

  // --- Drivers state ---
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [newDriverName, setNewDriverName] = useState("");
  const [newDriverPhone, setNewDriverPhone] = useState("");
  const [addingDriver, setAddingDriver] = useState(false);
  const [driversVisible, setDriversVisible] = useState(PAGE_SIZE);
  const [driversLoading, setDriversLoading] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      if (Array.isArray(data)) setProducts(data);
    } catch (err) {
      console.error("Failed to fetch products:", err);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      if (Array.isArray(data)) setCategories(data);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  }, []);

  const fetchDrivers = useCallback(async () => {
    setDriversLoading(true);
    try {
      const res = await fetch("/api/drivers");
      const data = await res.json();
      if (Array.isArray(data)) {
        setDrivers(data);
        driversLoaded.current = true;
      }
    } catch (err) {
      console.error("Failed to fetch drivers:", err);
    } finally {
      setDriversLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  function handleTabChange(tab: FunctionsTab) {
    setActiveTab(tab);
    if (tab === "drivers" && !driversLoaded.current) {
      void fetchDrivers();
    }
  }

  // --- Product CRUD handlers ---
  function openNewProduct() {
    dispatch({ type: "setProductFormError", value: null });
    setEditingId(null);
    setForm(emptyForm);
    setProductImagePending(null);
    setLangTab("en");
    setShowForm(true);
  }

  function openEditProduct(p: Product) {
    dispatch({ type: "setProductFormError", value: null });
    setEditingId(p.id);
    setForm(productToForm(p));
    setProductImagePending(null);
    setLangTab("en");
    setShowForm(true);
  }

  function closeForm() {
    dispatch({ type: "setProductFormError", value: null });
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setProductImagePending(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || saving) return;
    dispatch({ type: "setProductFormError", value: null });
    setSaving(true);

    try {
      let image_url = form.image_url;
      if (productImagePending) {
        try {
          image_url = await uploadCatalogFile(productImagePending, "products");
        } catch {
          dispatch({ type: "setProductFormError", value: t("imageUploadFailed") });
          setSaving(false);
          return;
        }
      }
      const payload = formToPayload({ ...form, image_url });

      let res: Response;
      if (editingId) {
        res = await fetch("/api/products", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, ...payload }),
        });
      } else {
        res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) throw new Error();
      const saved: Product = await res.json();

      setProducts((prev) => {
        if (editingId) {
          return prev.map((p) => (p.id === editingId ? saved : p));
        }
        return [saved, ...prev];
      });
      closeForm();
    } catch {
      dispatch({ type: "setProductFormError", value: t("productSaveFailed") });
    } finally {
      setSaving(false);
    }
  }

  function requestDeleteProduct(id: string) {
    dispatch({ type: "setPendingDelete", value: { kind: "product", id } });
  }

  async function toggleAvailability(product: Product) {
    const next = !product.unavailable_today;
    const msg = t("availabilityUpdateFailed");

    dispatch({ type: "clearMapError", map: "availabilityErrors", id: product.id });

    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, unavailable_today: next } : p))
    );

    try {
      const res = await fetch(`/api/products/${product.id}/availability`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unavailable_today: next }),
      });
      if (!res.ok) throw new Error("availability failed");
      dispatch({ type: "clearMapError", map: "availabilityErrors", id: product.id });
    } catch {
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, unavailable_today: !next } : p))
      );
      dispatch({ type: "setMapError", map: "availabilityErrors", id: product.id, message: msg });
    }
  }

  // --- Category handlers ---
  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategoryName.trim() || addingCategory) return;
    dispatch({ type: "setCategoryAddError", value: null });
    setAddingCategory(true);
    try {
      let image_url: string | null = null;
      if (newCategoryImagePending) {
        try {
          image_url = await uploadCatalogFile(newCategoryImagePending, "categories");
        } catch {
          dispatch({ type: "setCategoryAddError", value: t("imageUploadFailed") });
          setAddingCategory(false);
          return;
        }
      }
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          name_ar: newCategoryNameAr.trim() || null,
          image_url,
        }),
      });
      if (!res.ok) throw new Error();
      const category: Category = await res.json();
      setCategories((prev) =>
        [...prev, category].sort((a, b) => a.name.localeCompare(b.name))
      );
      setNewCategoryName("");
      setNewCategoryNameAr("");
      setNewCategoryImagePending(null);
    } catch {
      dispatch({ type: "setCategoryAddError", value: t("categoryAddFailed") });
    } finally {
      setAddingCategory(false);
    }
  }

  function openCategoryEdit(cat: Category) {
    setCategoryEditForm({
      id: cat.id,
      name: cat.name,
      name_ar: cat.name_ar ?? "",
      image_url: cat.image_url ?? "",
    });
    setCategoryEditImagePending(null);
    dispatch({ type: "setCategoryEditError", value: null });
    setCategoryEditOpen(true);
  }

  function closeCategoryEdit() {
    dispatch({ type: "setCategoryEditError", value: null });
    setCategoryEditOpen(false);
    setCategoryEditImagePending(null);
    setCategoryEditForm({ id: "", name: "", name_ar: "", image_url: "" });
  }

  async function saveCategoryEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryEditForm.id || !categoryEditForm.name.trim()) return;
    dispatch({ type: "setCategoryEditError", value: null });
    setCategoryEditSaving(true);
    try {
      let image_url = categoryEditForm.image_url;
      if (categoryEditImagePending) {
        try {
          image_url = await uploadCatalogFile(categoryEditImagePending, "categories");
        } catch {
          dispatch({ type: "setCategoryEditError", value: t("imageUploadFailed") });
          setCategoryEditSaving(false);
          return;
        }
      }
      const res = await fetch("/api/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: categoryEditForm.id,
          name: categoryEditForm.name.trim(),
          name_ar: categoryEditForm.name_ar.trim() || null,
          image_url,
        }),
      });
      if (!res.ok) throw new Error();
      const updated: Category = await res.json();
      setCategories((prev) =>
        prev
          .map((c) => (c.id === updated.id ? updated : c))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      closeCategoryEdit();
    } catch {
      dispatch({ type: "setCategoryEditError", value: t("categoryUpdateFailed") });
    } finally {
      setCategoryEditSaving(false);
    }
  }

  function requestDeleteCategory(id: string) {
    dispatch({ type: "setPendingDelete", value: { kind: "category", id } });
  }

  async function removeCategory(id: string) {
    dispatch({ type: "clearMapError", map: "categoryDeleteErrors", id });
    try {
      const res = await fetch("/api/categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      setCategories((prev) => prev.filter((c) => c.id !== id));
      dispatch({ type: "clearMapError", map: "categoryDeleteErrors", id });
    } catch {
      dispatch({
        type: "setMapError",
        map: "categoryDeleteErrors",
        id,
        message: t("categoryDeleteFailed"),
      });
    }
  }

  // --- Driver handlers ---
  async function addDriver(e: React.FormEvent) {
    e.preventDefault();
    if (!newDriverName.trim() || addingDriver) return;
    dispatch({ type: "setDriverAddError", value: null });
    setAddingDriver(true);
    try {
      const res = await fetch("/api/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newDriverName.trim(),
          phone: newDriverPhone.trim() || null,
        }),
      });
      if (!res.ok) throw new Error();
      const driver: Driver = await res.json();
      setDrivers((prev) => [driver, ...prev]);
      setNewDriverName("");
      setNewDriverPhone("");
    } catch {
      dispatch({ type: "setDriverAddError", value: t("driverAddFailed") });
    } finally {
      setAddingDriver(false);
    }
  }

  async function removeDriver(id: string) {
    dispatch({ type: "clearMapError", map: "driverDeleteErrors", id });
    try {
      const res = await fetch("/api/drivers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      setDrivers((prev) => prev.filter((d) => d.id !== id));
      dispatch({ type: "clearMapError", map: "driverDeleteErrors", id });
    } catch {
      dispatch({
        type: "setMapError",
        map: "driverDeleteErrors",
        id,
        message: t("driverDeleteFailed"),
      });
    }
  }

  async function confirmPendingDelete() {
    const pending = adminUi.pendingDelete;
    if (!pending) return;
    dispatch({ type: "setDeleteSubmitting", value: true });
    try {
      if (pending.kind === "product") {
        try {
          const res = await fetch("/api/products", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: pending.id }),
          });
          if (!res.ok) throw new Error();
          setProducts((prev) => prev.filter((p) => p.id !== pending.id));
          dispatch({ type: "clearMapError", map: "productDeleteErrors", id: pending.id });
          dispatch({ type: "setPendingDelete", value: null });
        } catch {
          dispatch({
            type: "setMapError",
            map: "productDeleteErrors",
            id: pending.id,
            message: t("productDeleteFailed"),
          });
          dispatch({ type: "setPendingDelete", value: null });
        }
      } else {
        await removeCategory(pending.id);
        dispatch({ type: "setPendingDelete", value: null });
      }
    } finally {
      dispatch({ type: "setDeleteSubmitting", value: false });
    }
  }

  function updateField(field: keyof ProductFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const deleteConfirmCopy =
    adminUi.pendingDelete?.kind === "product"
      ? { message: t("confirmDeleteProduct"), confirm: t("deleteProduct") }
      : { message: t("confirmDeleteCategory"), confirm: t("removeCategory") };

  const visibleProducts = products.slice(0, productsVisible);
  const visibleCategories = categories.slice(0, categoriesVisible);
  const visibleDrivers = drivers.slice(0, driversVisible);

  return (
    <>
      <AdminConfirmDialog
        open={adminUi.pendingDelete !== null}
        message={deleteConfirmCopy.message}
        confirmLabel={deleteConfirmCopy.confirm}
        cancelLabel={t("cancel")}
        pending={adminUi.deleteSubmitting}
        onCancel={() => {
          if (!adminUi.deleteSubmitting) {
            dispatch({ type: "setPendingDelete", value: null });
          }
        }}
        onConfirm={() => void confirmPendingDelete()}
      />

      {/* Category edit modal */}
      {categoryEditOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal
          aria-labelledby="category-edit-title"
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-admin-border bg-admin-panel p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 id="category-edit-title" className="font-semibold text-admin-ink">
                {t("editCategory")}
              </h3>
              <button
                type="button"
                onClick={closeCategoryEdit}
                className="rounded-lg p-1 text-admin-muted hover:bg-[rgba(31,68,60,0.06)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={saveCategoryEdit} className="space-y-4">
              {adminUi.categoryEditError ? (
                <InlineBanner variant="error">
                  <p>{adminUi.categoryEditError}</p>
                </InlineBanner>
              ) : null}
              <div>
                <label className="mb-1 block text-xs font-medium text-admin-muted">
                  {t("categoryName")}
                </label>
                <input
                  type="text"
                  value={categoryEditForm.name}
                  onChange={(e) =>
                    setCategoryEditForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                  className="w-full rounded-lg border border-admin-border bg-[#fffcf8] px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-admin-muted">
                  {t("categoryNameAr")}
                </label>
                <input
                  type="text"
                  value={categoryEditForm.name_ar}
                  onChange={(e) =>
                    setCategoryEditForm((prev) => ({ ...prev, name_ar: e.target.value }))
                  }
                  dir="rtl"
                  className="w-full rounded-lg border border-admin-border bg-[#fffcf8] px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <CatalogImageField
                label={t("catalogImage")}
                storedUrl={categoryEditForm.image_url}
                pendingFile={categoryEditImagePending}
                onPendingFileChange={setCategoryEditImagePending}
                onClear={() =>
                  setCategoryEditForm((prev) => ({ ...prev, image_url: "" }))
                }
                disabled={categoryEditSaving}
                chooseImageLabel={t("catalogImageHint")}
                removeImageLabel={t("removeCatalogImage")}
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeCategoryEdit}
                  className="rounded-lg border border-admin-border px-4 py-2 text-sm font-medium text-admin-muted hover:bg-[rgba(31,68,60,0.06)]"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={categoryEditSaving || !categoryEditForm.name.trim()}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-[#082018] hover:bg-primary/90 disabled:opacity-50"
                >
                  {categoryEditSaving ? t("saving") : t("saveCategory")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Tab nav */}
      <div className="mb-6 flex w-fit gap-1 rounded-xl border border-admin-border bg-admin-panel p-1">
        {(["products", "categories", "drivers"] as FunctionsTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => handleTabChange(tab)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === tab
                ? "bg-admin-ink text-white"
                : "text-admin-muted hover:bg-[rgba(31,68,60,0.05)] hover:text-admin-ink"
            }`}
          >
            {tab === "products"
              ? t("products")
              : tab === "categories"
                ? t("categories")
                : t("drivers")}
          </button>
        ))}
      </div>

      {/* ── Products tab ── */}
      {activeTab === "products" && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Package className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-admin-ink">{t("products")}</h2>
            </div>
            {!showForm && (
              <button
                onClick={openNewProduct}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-[#082018] transition-colors hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                {t("addProduct")}
              </button>
            )}
          </div>

          {/* Product form */}
          {showForm && (
            <div className="mb-6 rounded-xl border border-admin-border bg-admin-panel p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-admin-ink">
                  {editingId ? t("editProduct") : t("addProduct")}
                </h3>
                <button
                  onClick={closeForm}
                  className="rounded-lg p-1 text-admin-muted transition-colors hover:bg-[rgba(31,68,60,0.06)] hover:text-admin-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {adminUi.productFormError ? (
                <div className="mb-4">
                  <InlineBanner variant="error">
                    <p>{adminUi.productFormError}</p>
                  </InlineBanner>
                </div>
              ) : null}

              {/* Language tabs */}
              <div className="mb-4 flex gap-1 rounded-lg bg-[rgba(31,68,60,0.06)] p-1">
                {(["en", "ar"] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setLangTab(lang)}
                    className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      langTab === lang
                        ? "bg-[#fffcf8] text-admin-ink shadow-sm"
                        : "text-admin-muted hover:text-admin-ink"
                    }`}
                  >
                    {lang === "en" ? t("english") : t("arabic")}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                {langTab === "en" ? (
                  <div className="space-y-4">
                    <Field
                      label={t("productName")}
                      value={form.name}
                      onChange={(v) => updateField("name", v)}
                      required
                    />
                    <Field
                      label={t("description")}
                      value={form.description}
                      onChange={(v) => updateField("description", v)}
                      textarea
                    />
                    <Field
                      label={t("ingredients")}
                      value={form.ingredients}
                      onChange={(v) => updateField("ingredients", v)}
                      textarea
                    />
                  </div>
                ) : (
                  <div className="space-y-4" dir="rtl">
                    <Field
                      label={t("productNameAr")}
                      value={form.name_ar}
                      onChange={(v) => updateField("name_ar", v)}
                    />
                    <Field
                      label={t("descriptionAr")}
                      value={form.description_ar}
                      onChange={(v) => updateField("description_ar", v)}
                      textarea
                    />
                    <Field
                      label={t("ingredientsAr")}
                      value={form.ingredients_ar}
                      onChange={(v) => updateField("ingredients_ar", v)}
                      textarea
                    />
                  </div>
                )}

                {/* Shared fields */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field
                    label={t("price")}
                    value={form.price}
                    onChange={(v) => updateField("price", v)}
                    type="number"
                    required
                  />
                  <Field
                    label={t("stockQuantity")}
                    value={form.stock_quantity}
                    onChange={(v) => updateField("stock_quantity", v)}
                    type="number"
                  />
                </div>

                <Field
                  label={t("allergens")}
                  value={form.allergens}
                  onChange={(v) => updateField("allergens", v)}
                  placeholder={t("allergensPlaceholder")}
                />

                <Field
                  label={t("allergensAr")}
                  value={form.allergens_ar}
                  onChange={(v) => updateField("allergens_ar", v)}
                  placeholder={t("allergensArPlaceholder")}
                />

                <CatalogImageField
                  label={t("catalogImage")}
                  storedUrl={form.image_url}
                  pendingFile={productImagePending}
                  onPendingFileChange={setProductImagePending}
                  onClear={() => updateField("image_url", "")}
                  disabled={saving}
                  chooseImageLabel={t("catalogImageHint")}
                  removeImageLabel={t("removeCatalogImage")}
                />

                <div>
                  <label className="mb-1 block text-xs font-medium text-admin-muted">
                    {t("category")}
                  </label>
                  <select
                    value={form.category_id}
                    onChange={(e) => updateField("category_id", e.target.value)}
                    className="admin-input"
                  >
                    <option value="">{t("selectCategory")}</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {locale === "ar" && c.name_ar ? c.name_ar : c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="rounded-lg border border-admin-border px-4 py-2 text-sm font-medium text-admin-muted transition-colors hover:bg-[rgba(31,68,60,0.06)]"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !form.name.trim()}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-[#082018] transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? t("saving") : t("saveProduct")}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Products table */}
          <div className="overflow-hidden rounded-xl border border-admin-border bg-admin-panel shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="admin-table-head text-start">
                    <th className="px-4 py-3 text-start font-semibold text-admin-muted">
                      {t("productName")}
                    </th>
                    <th className="px-4 py-3 text-start font-semibold text-admin-muted">
                      {t("price")}
                    </th>
                    <th className="px-4 py-3 text-start font-semibold text-admin-muted">
                      {t("category")}
                    </th>
                    <th className="px-4 py-3 text-start font-semibold text-admin-muted">
                      {t("status")}
                    </th>
                    <th className="w-40 px-4 py-3 text-start font-semibold text-admin-muted">
                      {t("actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-border">
                  {visibleProducts.map((p) => {
                    const cat = categories.find((c) => c.id === p.category_id);
                    return (
                      <tr key={p.id}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-admin-ink">{p.name}</p>
                          {p.name_ar && (
                            <p className="text-xs text-admin-muted" dir="rtl">
                              {p.name_ar}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-admin-ink">
                          ₪{p.price.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-admin-muted">
                          {cat
                            ? locale === "ar" && cat.name_ar
                              ? cat.name_ar
                              : cat.name
                            : "—"}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex flex-col gap-1.5">
                            <button
                              type="button"
                              onClick={() => void toggleAvailability(p)}
                              className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                                p.unavailable_today
                                  ? "bg-red-100 text-red-700 hover:bg-red-200"
                                  : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                              }`}
                            >
                              {p.unavailable_today
                                ? t("unavailableToday")
                                : t("available")}
                            </button>
                            {adminUi.availabilityErrors[p.id] ? (
                              <p
                                className={`max-w-[14rem] text-xs font-medium ${inlineBannerErrorTextClassName}`}
                              >
                                {adminUi.availabilityErrors[p.id]}
                              </p>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => openEditProduct(p)}
                                className="inline-flex items-center gap-1 rounded-lg border border-admin-border px-2.5 py-1.5 text-xs font-medium text-admin-ink transition-colors hover:bg-[rgba(31,68,60,0.06)]"
                              >
                                <Pencil className="h-3 w-3" />
                                {t("editProduct")}
                              </button>
                              <button
                                type="button"
                                onClick={() => requestDeleteProduct(p.id)}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                              >
                                <Trash2 className="h-3 w-3" />
                                {t("deleteProduct")}
                              </button>
                            </div>
                            {adminUi.productDeleteErrors[p.id] ? (
                              <p
                                className={`max-w-[14rem] text-xs font-medium ${inlineBannerErrorTextClassName}`}
                              >
                                {adminUi.productDeleteErrors[p.id]}
                              </p>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {products.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-12 text-center text-admin-muted"
                      >
                        {t("noProductsYet")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {products.length > productsVisible && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setProductsVisible((v) => v + PAGE_SIZE)}
                className="rounded-lg border border-admin-border bg-admin-panel px-5 py-2 text-sm font-semibold text-admin-ink transition-colors hover:bg-[rgba(31,68,60,0.05)]"
              >
                {t("loadMore")}
              </button>
            </div>
          )}
        </section>
      )}

      {/* ── Categories tab ── */}
      {activeTab === "categories" && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
              <Tag className="h-4 w-4 text-amber-600" />
            </div>
            <h2 className="text-lg font-semibold text-admin-ink">{t("categories")}</h2>
          </div>

          <form onSubmit={addCategory} className="mb-4 flex flex-col gap-3">
            {adminUi.categoryAddError ? (
              <InlineBanner variant="error">
                <p>{adminUi.categoryAddError}</p>
              </InlineBanner>
            ) : null}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-admin-muted">
                  {t("categoryName")}
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder={t("categoryNamePlaceholder")}
                  required
                  className="w-full rounded-lg border border-admin-border bg-[#fffcf8] px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-admin-muted">
                  {t("categoryNameAr")}
                </label>
                <input
                  type="text"
                  value={newCategoryNameAr}
                  onChange={(e) => setNewCategoryNameAr(e.target.value)}
                  placeholder={t("categoryNameArPlaceholder")}
                  dir="rtl"
                  className="w-full rounded-lg border border-admin-border bg-[#fffcf8] px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <button
                type="submit"
                disabled={addingCategory || !newCategoryName.trim()}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-[#082018] transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {addingCategory ? t("adding") : t("addCategory")}
              </button>
            </div>
            <CatalogImageField
              label={t("catalogImage")}
              storedUrl=""
              pendingFile={newCategoryImagePending}
              onPendingFileChange={setNewCategoryImagePending}
              onClear={() => {}}
              disabled={addingCategory}
              chooseImageLabel={t("catalogImageHint")}
              removeImageLabel={t("removeCatalogImage")}
            />
          </form>

          <div className="overflow-hidden rounded-xl border border-admin-border bg-admin-panel shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="admin-table-head text-start">
                    <th className="px-4 py-3 text-start font-semibold text-admin-muted">
                      {t("categoryName")}
                    </th>
                    <th className="px-4 py-3 text-start font-semibold text-admin-muted">
                      {t("categoryNameAr")}
                    </th>
                    <th className="w-44 px-4 py-3 text-start font-semibold text-admin-muted" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-border">
                  {visibleCategories.map((cat) => (
                    <tr key={cat.id}>
                      <td className="px-4 py-3 font-medium text-admin-ink">{cat.name}</td>
                      <td className="px-4 py-3 text-admin-muted" dir="rtl">
                        {cat.name_ar || <span className="text-admin-muted">—</span>}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openCategoryEdit(cat)}
                              className="inline-flex items-center gap-1 rounded-lg border border-admin-border px-2.5 py-1.5 text-xs font-medium text-admin-ink transition-colors hover:bg-[rgba(31,68,60,0.06)]"
                            >
                              <Pencil className="h-3 w-3" />
                              {t("editCategory")}
                            </button>
                            <button
                              type="button"
                              onClick={() => requestDeleteCategory(cat.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3" />
                              {t("removeCategory")}
                            </button>
                          </div>
                          {adminUi.categoryDeleteErrors[cat.id] ? (
                            <p
                              className={`text-xs font-medium ${inlineBannerErrorTextClassName}`}
                            >
                              {adminUi.categoryDeleteErrors[cat.id]}
                            </p>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {categories.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-12 text-center text-admin-muted"
                      >
                        {t("noCategories")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {categories.length > categoriesVisible && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setCategoriesVisible((v) => v + PAGE_SIZE)}
                className="rounded-lg border border-admin-border bg-admin-panel px-5 py-2 text-sm font-semibold text-admin-ink transition-colors hover:bg-[rgba(31,68,60,0.05)]"
              >
                {t("loadMore")}
              </button>
            </div>
          )}
        </section>
      )}

      {/* ── Drivers tab ── */}
      {activeTab === "drivers" && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(31,68,60,0.06)]">
              <Users className="h-4 w-4 text-admin-muted" />
            </div>
            <h2 className="text-lg font-semibold text-admin-ink">{t("drivers")}</h2>
          </div>

          <form onSubmit={addDriver} className="mb-4 flex flex-col gap-3">
            {adminUi.driverAddError ? (
              <InlineBanner variant="error">
                <p>{adminUi.driverAddError}</p>
              </InlineBanner>
            ) : null}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-admin-muted">
                  {t("driverName")}
                </label>
                <input
                  type="text"
                  value={newDriverName}
                  onChange={(e) => setNewDriverName(e.target.value)}
                  placeholder={t("driverNamePlaceholder")}
                  required
                  className="w-full rounded-lg border border-admin-border bg-[#fffcf8] px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-admin-muted">
                  {t("driverPhone")}
                </label>
                <input
                  type="tel"
                  value={newDriverPhone}
                  onChange={(e) => setNewDriverPhone(e.target.value)}
                  placeholder={t("driverPhonePlaceholder")}
                  className="w-full rounded-lg border border-admin-border bg-[#fffcf8] px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <button
                type="submit"
                disabled={addingDriver || !newDriverName.trim()}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-[#082018] transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {addingDriver ? t("adding") : t("addDriver")}
              </button>
            </div>
          </form>

          <div className="overflow-hidden rounded-xl border border-admin-border bg-admin-panel shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="admin-table-head text-start">
                    <th className="px-4 py-3 text-start font-semibold text-admin-muted">
                      {t("driverName")}
                    </th>
                    <th className="px-4 py-3 text-start font-semibold text-admin-muted">
                      {t("driverPhone")}
                    </th>
                    <th className="w-20 px-4 py-3 text-start font-semibold text-admin-muted" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-border">
                  {visibleDrivers.map((driver) => (
                    <tr key={driver.id}>
                      <td className="px-4 py-3 font-medium text-admin-ink">
                        {driver.name}
                      </td>
                      <td className="px-4 py-3 text-admin-muted">
                        {driver.phone ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-admin-muted" />
                            {driver.phone}
                          </span>
                        ) : (
                          <span className="text-admin-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col gap-1.5">
                          <button
                            type="button"
                            onClick={() => void removeDriver(driver.id)}
                            className="inline-flex w-fit items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" />
                            {t("removeDriver")}
                          </button>
                          {adminUi.driverDeleteErrors[driver.id] ? (
                            <p
                              className={`text-xs font-medium ${inlineBannerErrorTextClassName}`}
                            >
                              {adminUi.driverDeleteErrors[driver.id]}
                            </p>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {driversLoading && (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-12 text-center text-admin-muted"
                      >
                        <RefreshCw className="mx-auto h-5 w-5 animate-spin opacity-50" />
                      </td>
                    </tr>
                  )}
                  {!driversLoading && drivers.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-12 text-center text-admin-muted"
                      >
                        {t("noDrivers")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {drivers.length > driversVisible && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setDriversVisible((v) => v + PAGE_SIZE)}
                className="rounded-lg border border-admin-border bg-admin-panel px-5 py-2 text-sm font-semibold text-admin-ink transition-colors hover:bg-[rgba(31,68,60,0.05)]"
              >
                {t("loadMore")}
              </button>
            </div>
          )}
        </section>
      )}
    </>
  );
}

/* ─── Reusable field component ─── */

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  textarea?: boolean;
}) {
  const cls = "admin-input";

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-admin-muted">
        {label}
      </label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          required={required}
          placeholder={placeholder}
          className={cls + " resize-none"}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          placeholder={placeholder}
          className={cls}
          step={type === "number" ? "0.01" : undefined}
        />
      )}
    </div>
  );
}
