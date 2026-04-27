"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  type RefObject,
} from "react";
import { Minus, Plus, ShieldAlert, X } from "lucide-react";
import { isHttpUrl } from "@/lib/is-http-url";
import { useLanguage } from "@/contexts/language-context";
import { useCart } from "@/contexts/cart-context";
import { useFlyToCart } from "@/contexts/fly-to-cart-context";
import type { Product } from "@/types/database";
import type { ProductOptionsApiResponse } from "@/lib/product-options/queries";
import { visibleJunctionsSorted } from "@/lib/product-options/visibility";
import {
  validateStepSelections,
  validateAllVisibleSteps,
} from "@/lib/product-options/validate-selections";
import {
  buildProductOptionsBundle,
  computeOptionsPricing,
} from "@/lib/product-options/pricing";
import { getProductEffectivePrice } from "@/lib/product-pricing";
import { getSupabaseCustomerBrowser } from "@/lib/supabase-client-customer";
import type { SelectionsMap } from "@/lib/product-options/types";

type State = {
  stepIndex: number;
  selections: SelectionsMap;
  bundle: ProductOptionsApiResponse | null;
  loading: boolean;
  error: string | null;
  stepError: string | null;
  quantity: number;
};

const initialState: State = {
  stepIndex: 0,
  selections: {},
  bundle: null,
  loading: true,
  error: null,
  stepError: null,
  quantity: 1,
};

function defaultSelectionsForBundle(
  bundle: ProductOptionsApiResponse
): SelectionsMap {
  const m: SelectionsMap = {};
  for (const j of bundle.junctions) {
    const enabled = bundle.choices.filter(
      (c) => c.option_id === j.option_id && c.is_enabled
    );
    const defaults = enabled.filter((c) => c.is_default).map((c) => c.id);
    const opt = bundle.options.find((o) => o.id === j.option_id);
    if (defaults.length > 0) {
      m[j.option_id] = defaults;
    } else if (opt?.type === "single" && j.min_select <= 1 && enabled[0]) {
      m[j.option_id] = [enabled[0].id];
    } else {
      m[j.option_id] = [];
    }
  }
  return m;
}

function pruneSelections(
  bundle: ProductOptionsApiResponse,
  prev: SelectionsMap
): SelectionsMap {
  const next: SelectionsMap = {};
  for (const j of bundle.junctions) {
    const enabled = new Set(
      bundle.choices
        .filter((c) => c.option_id === j.option_id && c.is_enabled)
        .map((c) => c.id)
    );
    const kept = (prev[j.option_id] ?? []).filter((id) => enabled.has(id));
    next[j.option_id] = kept;
  }
  return next;
}

type Action =
  | { type: "load_start" }
  | {
      type: "load_ok";
      bundle: ProductOptionsApiResponse;
      initialSelections?: SelectionsMap;
    }
  | { type: "load_err"; message: string }
  | { type: "set_step"; index: number }
  | { type: "set_selections"; selections: SelectionsMap }
  | { type: "clear_step_error" }
  | { type: "set_step_error"; message: string }
  | { type: "set_quantity"; quantity: number }
  | { type: "decrement_quantity" }
  | { type: "increment_quantity" }
  | { type: "reset" }
  | { type: "no_options_ready" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "reset":
      return { ...initialState };
    case "no_options_ready":
      return {
        ...initialState,
        loading: false,
        error: null,
        bundle: null,
        selections: {},
        stepIndex: 0,
        stepError: null,
      };
    case "load_start":
      return { ...state, loading: true, error: null, stepError: null };
    case "load_ok": {
      const defaults = defaultSelectionsForBundle(action.bundle);
      const pruned = pruneSelections(action.bundle, state.selections);
      const fromInitial = action.initialSelections
        ? pruneSelections(action.bundle, action.initialSelections)
        : null;
      const selections: SelectionsMap = {};
      for (const j of action.bundle.junctions) {
        const pr = pruned[j.option_id] ?? [];
        const def = defaults[j.option_id] ?? [];
        if (fromInitial) {
          selections[j.option_id] = fromInitial[j.option_id] ?? [];
        } else {
          selections[j.option_id] = pr.length > 0 ? pr : def;
        }
      }
      return {
        ...state,
        bundle: action.bundle,
        selections,
        loading: false,
        error: null,
        stepIndex: Math.min(state.stepIndex, Math.max(0, action.bundle.junctions.length - 1)),
      };
    }
    case "load_err":
      return {
        ...state,
        loading: false,
        error: action.message,
        bundle: null,
      };
    case "set_step":
      return { ...state, stepIndex: action.index, stepError: null };
    case "set_selections":
      return { ...state, selections: action.selections, stepError: null };
    case "clear_step_error":
      return { ...state, stepError: null };
    case "set_step_error":
      return { ...state, stepError: action.message };
    case "set_quantity":
      return { ...state, quantity: Math.max(1, Math.floor(action.quantity || 1)) };
    case "decrement_quantity":
      return { ...state, quantity: Math.max(1, state.quantity - 1) };
    case "increment_quantity":
      return { ...state, quantity: state.quantity + 1 };
    default:
      return state;
  }
}

const productEmoji: Record<string, string> = {
  "prod-1": "🍫",
  "prod-2": "🍉",
  "prod-3": "🌰",
  "prod-4": "🍑",
  "prod-5": "🍭",
  "prod-6": "🍯",
  "prod-7": "🥮",
  "prod-8": "🍓",
};

function ProductModalHero({
  product,
  titleId,
}: {
  product: Product;
  titleId: string;
}) {
  const { t, locale } = useLanguage();
  const [imgLoaded, setImgLoaded] = useState(false);
  const name =
    locale === "ar" && product.name_ar ? product.name_ar : product.name;
  const description =
    locale === "ar" && product.description_ar
      ? product.description_ar
      : product.description;
  const ingredientsRaw =
    locale === "ar" && product.ingredients_ar
      ? product.ingredients_ar
      : product.ingredients;
  const ingredientsText = (ingredientsRaw ?? "").trim();
  const emoji = productEmoji[product.id] ?? "🍰";
  const showImage =
    product.image_url && isHttpUrl(product.image_url.trim());

  return (
    <div className="space-y-2 sm:space-y-3">
      <div className="relative h-[min(22vh,152px)] w-full shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-[#EBE0D4] via-[#E5D9CC] to-[#DDD0C2] sm:h-[min(24vh,168px)]">
        {showImage ? (
          <>
            {!imgLoaded && (
              <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-[#EBE0D4] via-[#D9CCBE] to-[#EBE0D4] bg-[length:200%_100%]" />
            )}
            <Image
              src={product.image_url.trim()}
              alt={name}
              fill
              sizes="(max-width: 640px) 100vw, 512px"
              className={`object-cover object-center ${imgLoaded ? "opacity-100" : "opacity-0"}`}
              onLoad={() => setImgLoaded(true)}
              priority={false}
            />
          </>
        ) : (
          <>
            <div
              className="absolute inset-0 flex items-center justify-center"
              aria-hidden
            >
              <span className="text-5xl drop-shadow-md sm:text-6xl">
                {emoji}
              </span>
            </div>
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.07]"
              aria-hidden
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231F443C' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />
          </>
        )}
      </div>

      <div>
        <h2
          id={titleId}
          className="font-display text-lg font-semibold leading-snug text-ink sm:text-xl"
        >
          {name}
        </h2>
        {description ? (
          <p className="mt-1 line-clamp-2 text-xs leading-snug text-ink-soft sm:mt-1.5 sm:text-sm sm:leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>

      {ingredientsText ? (
        <div>
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
            {t("ingredients")}
          </h3>
          <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-ink sm:line-clamp-3">
            {ingredientsText}
          </p>
        </div>
      ) : null}

      {product.allergens.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {(locale === "ar" && product.allergens_ar?.length
            ? product.allergens_ar
            : product.allergens
          ).map((a) => (
            <span
              key={a}
              className="inline-flex items-center gap-1 rounded-md border border-[#946E2A]/25 bg-[#FFF8E6] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#946E2A]"
            >
              <ShieldAlert className="h-3 w-3 shrink-0" />
              {a}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ProductStorefrontModal({
  product,
  open,
  onClose,
  flySourceRef,
  mode = "add",
  initialSelections,
  initialQuantity = 1,
  onEditConfigured,
}: {
  product: Product;
  open: boolean;
  onClose: () => void;
  /** Animate from this element (e.g. the product card). Falls back to the add button. */
  flySourceRef?: RefObject<HTMLElement | null>;
  mode?: "add" | "edit";
  initialSelections?: SelectionsMap;
  initialQuantity?: number;
  onEditConfigured?: (lineOptions: {
    selections: SelectionsMap;
    snapshot: {
      choice_lines: ReturnType<typeof computeOptionsPricing>["choice_lines"];
      options_subtotal: number;
      unit_price: number;
    };
    quantity: number;
  }) => void;
}) {
  const { t, locale } = useLanguage();
  const { addItem, addItemWithOptions } = useCart();
  const { flyToCart } = useFlyToCart();
  const [state, dispatch] = useReducer(reducer, initialState);
  const primaryRef = useRef<HTMLButtonElement | null>(null);

  const loadBundle = useCallback(async () => {
    dispatch({ type: "load_start" });
    try {
      const res = await fetch(`/api/products/${product.id}/options`);
      if (!res.ok) {
        dispatch({ type: "load_err", message: t("loadingProducts") });
        return;
      }
      const data = (await res.json()) as ProductOptionsApiResponse;
      if (!data.junctions?.length) {
        dispatch({ type: "load_err", message: t("noProducts") });
        return;
      }
      dispatch({ type: "load_ok", bundle: data, initialSelections });
    } catch {
      dispatch({ type: "load_err", message: t("orderFailed") });
    }
  }, [initialSelections, product.id, t]);

  useEffect(() => {
    if (!open) {
      dispatch({ type: "reset" });
      return;
    }
    dispatch({ type: "set_quantity", quantity: initialQuantity });
    if (product.has_options) {
      void loadBundle();
    } else {
      dispatch({ type: "no_options_ready" });
    }
  }, [open, product.has_options, product.id, initialQuantity, loadBundle]);

  useEffect(() => {
    if (!open || !product.has_options) return;
    const sb = getSupabaseCustomerBrowser();
    const ch = sb
      .channel(`optswiz-${product.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "option_choices" },
        () => void loadBundle()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "options" },
        () => void loadBundle()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "product_options_junction",
          filter: `product_id=eq.${product.id}`,
        },
        () => void loadBundle()
      )
      .subscribe();
    return () => {
      void sb.removeChannel(ch);
    };
  }, [open, product.has_options, product.id, loadBundle]);

  if (!open) return null;

  const hasOptions = Boolean(product.has_options);
  const unavailable = product.unavailable_today;

  const bundle = state.bundle;
  const productOptionsBundle = bundle
    ? buildProductOptionsBundle(bundle.junctions, bundle.options, bundle.choices)
    : null;
  const visible = productOptionsBundle
    ? visibleJunctionsSorted(productOptionsBundle.junctions, state.selections)
    : [];
  const step = visible[state.stepIndex] ?? null;
  const optRow = step
    ? bundle?.options.find((o) => o.id === step.option_id)
    : null;
  const stepChoices =
    bundle && step
      ? bundle.choices.filter(
          (c) => c.option_id === step.option_id && c.is_enabled
        )
      : [];

  function pickChoice(choiceId: string) {
    if (unavailable || !bundle || !step || !optRow) return;
    const cur = state.selections[step.option_id] ?? [];
    let next: string[];
    const behavesAsSingle =
      optRow.type === "single" ||
      (optRow.type === "multiple" && step.max_select <= 1);
    if (behavesAsSingle) {
      next = [choiceId];
    } else {
      if (cur.length >= step.max_select) return;
      next = [...cur, choiceId];
    }
    dispatch({
      type: "set_selections",
      selections: { ...state.selections, [step.option_id]: next },
    });
    dispatch({ type: "clear_step_error" });
  }

  function removeOnePick(choiceId: string) {
    if (unavailable || !bundle || !step || !optRow) return;
    const behavesAsSingle =
      optRow.type === "single" ||
      (optRow.type === "multiple" && step.max_select <= 1);
    if (behavesAsSingle) return;
    const cur = state.selections[step.option_id] ?? [];
    const idx = cur.lastIndexOf(choiceId);
    if (idx === -1) return;
    const next = [...cur.slice(0, idx), ...cur.slice(idx + 1)];
    dispatch({
      type: "set_selections",
      selections: { ...state.selections, [step.option_id]: next },
    });
    dispatch({ type: "clear_step_error" });
  }

  function validateCurrent(): boolean {
    if (!bundle || !step || !optRow) return false;
    const enabled = new Set(stepChoices.map((c) => c.id));
    const selected = state.selections[step.option_id] ?? [];
    const err = validateStepSelections(
      step,
      optRow.type,
      enabled,
      selected
    );
    if (err) {
      dispatch({ type: "set_step_error", message: t("optionsStepInvalid") });
      return false;
    }
    dispatch({ type: "clear_step_error" });
    return true;
  }

  function handleNext() {
    if (unavailable) return;
    if (!validateCurrent()) return;
    if (state.stepIndex < visible.length - 1) {
      dispatch({ type: "set_step", index: state.stepIndex + 1 });
    }
  }

  function handleBack() {
    dispatch({ type: "clear_step_error" });
    if (state.stepIndex > 0) {
      dispatch({ type: "set_step", index: state.stepIndex - 1 });
    }
  }

  function handleAddToCart() {
    if (unavailable) return;
    if (!validateCurrent()) return;
    if (!productOptionsBundle || !bundle) return;
    const allOk = validateAllVisibleSteps(productOptionsBundle, state.selections);
    if (!allOk.ok) {
      dispatch({ type: "set_step_error", message: t("optionsStepInvalid") });
      return;
    }
    const base = getProductEffectivePrice(product);
    const pricing = computeOptionsPricing(
      productOptionsBundle,
      state.selections,
      base
    );
    const lineOptions = {
      selections: state.selections,
      snapshot: {
        choice_lines: pricing.choice_lines,
        options_subtotal: pricing.options_subtotal,
        unit_price: pricing.unit_price,
      },
      quantity: state.quantity,
    };
    if (mode === "edit" && onEditConfigured) {
      onEditConfigured(lineOptions);
      onClose();
      return;
    }
    addItemWithOptions(product, lineOptions, state.quantity);
    flyToCart({
      sourceEl: flySourceRef?.current ?? primaryRef.current,
    });
    onClose();
  }

  function handleSimpleAddToCart() {
    if (unavailable) return;
    for (let i = 0; i < state.quantity; i += 1) {
      addItem(product);
    }
    flyToCart({
      sourceEl: flySourceRef?.current ?? primaryRef.current,
    });
    onClose();
  }

  const displayOptionTitle = (junction: typeof step) => {
    if (!junction) return "";
    if (locale === "ar" && junction.display_name_ar) {
      return junction.display_name_ar;
    }
    if (junction.display_name_en) return junction.display_name_en;
    const o = bundle?.options.find((x) => x.id === junction.option_id);
    if (!o) return "";
    return locale === "ar" && o.title_ar ? o.title_ar : o.title_en;
  };

  const runningTotal =
    productOptionsBundle && bundle
      ? computeOptionsPricing(
          productOptionsBundle,
          state.selections,
          getProductEffectivePrice(product)
        ).unit_price
      : getProductEffectivePrice(product);
  const lineTotal = runningTotal * state.quantity;
  const isEditing = mode === "edit";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`product-modal-title-${product.id}`}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        aria-label="Close"
        onMouseDown={(e) => { e.currentTarget.dataset.closeIntent = "true"; }}
        onClick={(e) => {
          if (e.currentTarget.dataset.closeIntent === "true") onClose();
          delete e.currentTarget.dataset.closeIntent;
        }}
      />
      <div className="relative flex max-h-[min(92vh,820px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[#1F443C]/15 bg-[#fffcf8] shadow-[var(--shadow-elevated)]">
        <div className="flex shrink-0 items-center justify-end border-b border-[#1F443C]/10 px-3 py-2 sm:px-5 sm:py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-ink-soft hover:bg-[#1F443C]/8"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
          <ProductModalHero
            product={product}
            titleId={`product-modal-title-${product.id}`}
          />

          {hasOptions ? (
            <div className="mt-3 border-t border-[#1F443C]/10 pt-3 sm:mt-4 sm:pt-4">
              {state.loading ? (
                <p className="text-sm text-ink-soft">{t("loadingProducts")}</p>
              ) : state.error ? (
                <p className="text-sm text-red-600">{state.error}</p>
              ) : step && optRow ? (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                    {t("configure")}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {state.stepIndex + 1} / {visible.length}
                  </p>
                  <h3 className="mt-1 font-display text-lg font-semibold text-ink sm:text-xl">
                    {displayOptionTitle(step)}
                  </h3>
                  {state.stepError ? (
                    <p className="mt-1.5 text-sm text-red-600">{state.stepError}</p>
                  ) : null}
                  <ul className="mt-2 space-y-1.5 sm:mt-3 sm:space-y-2">
                    {stepChoices.map((c) => {
                      const picks = state.selections[step.option_id] ?? [];
                      const countFor = picks.filter((id) => id === c.id).length;
                      const selected = countFor > 0;
                      const behavesAsSingle =
                        optRow.type === "single" ||
                        (optRow.type === "multiple" && step.max_select <= 1);
                      const atCap = picks.length >= step.max_select;
                      const label =
                        locale === "ar" && c.name_ar ? c.name_ar : c.name_en;
                      const extra =
                        Number(c.price_markup) > 0
                          ? `+₪${Number(c.price_markup).toFixed(2)}`
                          : "";
                      return (
                        <li key={c.id}>
                          <div
                            className={`flex items-stretch gap-2 rounded-xl border transition-colors ${
                              selected
                                ? "border-[#D3A94C] bg-[#FFF8E6] text-ink"
                                : "border-[#1F443C]/12 bg-white/90 text-ink"
                            }`}
                          >
                            {!behavesAsSingle && selected ? (
                              <button
                                type="button"
                                disabled={unavailable}
                                onClick={() => removeOnePick(c.id)}
                                className="flex w-11 shrink-0 items-center justify-center rounded-s-xl border-e border-[#D3A94C]/35 text-ink hover:bg-[#D3A94C]/15 disabled:opacity-50"
                                aria-label={t("optionRemoveOne")}
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                            ) : null}
                            <button
                              type="button"
                              disabled={
                                unavailable ||
                                (!behavesAsSingle && atCap)
                              }
                              onClick={() => pickChoice(c.id)}
                              className={`flex min-w-0 flex-1 items-center justify-between px-3 py-2.5 text-left text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                                !behavesAsSingle && !selected
                                  ? "hover:border-[#D3A94C]/40"
                                  : ""
                              } ${behavesAsSingle && !selected ? "hover:border-[#D3A94C]/40" : ""} rounded-e-xl`}
                            >
                              <span className="flex items-center gap-2">
                                {label}
                                {!behavesAsSingle && countFor > 1 ? (
                                  <span className="rounded-full bg-[#0A2923]/10 px-2 py-0.5 text-xs font-bold text-ink">
                                    ×{countFor}
                                  </span>
                                ) : null}
                              </span>
                              {extra ? (
                                <span className="shrink-0 text-xs text-ink-soft">
                                  {extra}
                                </span>
                              ) : null}
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : (
                <p className="text-sm text-ink-soft">{t("noProducts")}</p>
              )}
            </div>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-[#1F443C]/10 bg-[#fffcf8] px-4 py-3 sm:px-5 sm:py-4">
          {unavailable ? (
            <p className="text-center text-sm font-medium text-ink-soft">
              {t("unavailableToday")}
            </p>
          ) : hasOptions ? (
            <>
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="text-ink-soft">{t("total")}</span>
                <span className="font-display text-lg font-bold text-primary-dark">
                  ₪{lineTotal.toFixed(2)}{" "}
                  <span className="text-sm font-semibold text-ink-soft">
                    ({state.quantity} × ₪{runningTotal.toFixed(2)})
                  </span>
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {state.stepIndex > 0 ? (
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={unavailable}
                    className="rounded-lg border border-[#1F443C]/20 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-[#1F443C]/5 disabled:opacity-50"
                  >
                    {t("wizardBack")}
                  </button>
                ) : null}
                {state.stepIndex < visible.length - 1 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={unavailable || state.loading || !bundle}
                    className="ml-auto rounded-lg bg-[#0A2923] px-4 py-2.5 text-sm font-bold text-[#FFEC94] shadow-md hover:bg-[#082018] disabled:opacity-50"
                  >
                    {t("wizardNext")}
                  </button>
                ) : (
                  <>
                    <div className="flex items-center gap-1 rounded-lg border border-[#1f443c]/12 bg-[#faf6ef] p-1">
                      <button
                        type="button"
                        onClick={() => dispatch({ type: "decrement_quantity" })}
                        className="rounded-md p-2 text-ink transition-colors hover:bg-[#D3A94C]/15"
                        aria-label={t("optionRemoveOne")}
                        disabled={unavailable}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-8 text-center text-sm font-bold text-ink">
                        {state.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => dispatch({ type: "increment_quantity" })}
                        className="rounded-md p-2 text-ink transition-colors hover:bg-[#D3A94C]/15"
                        aria-label={t("add")}
                        disabled={unavailable}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <button
                      ref={primaryRef}
                      type="button"
                      onClick={handleAddToCart}
                      disabled={unavailable || state.loading || !bundle}
                      className="ml-auto rounded-lg bg-[#0A2923] px-4 py-2.5 text-sm font-bold text-[#FFEC94] shadow-md hover:bg-[#082018] disabled:opacity-50"
                    >
                      {isEditing ? t("saveChanges") : t("addConfiguredToCart")}
                    </button>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="text-ink-soft">{t("total")}</span>
                <span className="font-display text-lg font-bold text-primary-dark">
                  ₪{lineTotal.toFixed(2)}{" "}
                  <span className="text-sm font-semibold text-ink-soft">
                    ({state.quantity} × ₪{runningTotal.toFixed(2)})
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-lg border border-[#1f443c]/12 bg-[#faf6ef] p-1">
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "decrement_quantity" })}
                    className="rounded-md p-2 text-ink transition-colors hover:bg-[#D3A94C]/15"
                    aria-label={t("optionRemoveOne")}
                    disabled={unavailable}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="min-w-8 text-center text-sm font-bold text-ink">
                    {state.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "increment_quantity" })}
                    className="rounded-md p-2 text-ink transition-colors hover:bg-[#D3A94C]/15"
                    aria-label={t("add")}
                    disabled={unavailable}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  ref={primaryRef}
                  type="button"
                  onClick={handleSimpleAddToCart}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#0A2923] px-4 py-3 text-sm font-bold text-[#FFEC94] shadow-md transition-colors hover:bg-[#082018] active:scale-[0.99]"
                >
                  <Plus className="h-4 w-4" />
                  {t("add")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** @deprecated Use ProductStorefrontModal — kept for any external imports */
export const ProductOptionsWizardModal = ProductStorefrontModal;
