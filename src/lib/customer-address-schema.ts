import { z } from "zod";

export const CUSTOMER_ADDRESS_LIMIT = 5;

const customerAddressBaseSchema = z.object({
  label_type: z.enum(["home", "work", "other"]).optional().nullable(),
  custom_label: z.string().trim().max(40, "Address label is too long").optional().nullable(),
  city: z.string().trim().min(1, "City is required").max(120, "City is too long"),
  street_line: z
    .string()
    .trim()
    .min(1, "Street and number are required")
    .max(180, "Street is too long"),
  building_number: z
    .string()
    .trim()
    .min(1, "Building number is required")
    .max(50, "Building number is too long"),
  formatted_address: z.string().trim().max(500, "Address is too long").optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  is_default: z.boolean().optional().default(false),
});

export const customerAddressSchema = customerAddressBaseSchema.superRefine((value, ctx) => {
  if (value.label_type === "other" && value.custom_label && !value.custom_label.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Custom label cannot be empty",
      path: ["custom_label"],
    });
  }
});

export const customerAddressPatchSchema = customerAddressBaseSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  {
    message: "At least one field must be updated",
  }
);

export type CustomerAddressInput = z.output<typeof customerAddressSchema>;
export type CustomerAddressPatchInput = z.output<typeof customerAddressPatchSchema>;
