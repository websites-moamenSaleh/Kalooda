export const CANCELLATION_REASONS = [
  "Customer changed mind",
  "Payment declined / credit issue",
  "Customer no-show",
  "Item out of stock",
  "Duplicate order",
  "Other",
] as const;

export type CancellationReason = (typeof CANCELLATION_REASONS)[number];

export const CANCELLATION_REASON_AR: Record<CancellationReason, string> = {
  "Customer changed mind": "العميل غيّر رأيه",
  "Payment declined / credit issue": "رُفض الدفع / مشكلة ائتمانية",
  "Customer no-show": "العميل لم يحضر",
  "Item out of stock": "المنتج غير متوفر",
  "Duplicate order": "طلب مكرر",
  "Other": "أخرى",
};

/** Returns the display label for a reason in the given locale. */
export function cancellationReasonLabel(
  reason: string,
  locale: string
): string {
  if (locale !== "ar") return reason;
  return CANCELLATION_REASON_AR[reason as CancellationReason] ?? reason;
}
