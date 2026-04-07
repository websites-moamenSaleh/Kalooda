import { z } from "zod";
import { ORDER_VALIDATION_ERROR } from "@/lib/order-validation-constants";

export { ORDER_VALIDATION_ERROR };

const orderItemSchema = z.object({
  product_id: z.string(),
  product_name: z.string(),
  product_name_ar: z.string().nullable().optional(),
  quantity: z.number().int().positive(),
  unit_price: z.number(),
});

export const createOrderBodySchema = z
  .object({
    customer_name: z.string().optional(),
    customer_phone: z.string().optional(),
    items: z.array(orderItemSchema).min(1),
    total_price: z.number(),
    fulfillment_type: z.enum(["delivery", "pickup"]).default("delivery"),
    delivery_address: z.union([z.string(), z.null()]).optional(),
    payment_method: z.literal("cash_on_delivery").default("cash_on_delivery"),
    save_address_to_profile: z.boolean().optional().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.fulfillment_type === "delivery") {
      const addr =
        data.delivery_address === null || data.delivery_address === undefined
          ? ""
          : String(data.delivery_address).trim();
      if (!addr) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Delivery address is required",
          path: ["delivery_address"],
        });
      }
    }
  })
  .transform((data) => {
    const fulfillment_type = data.fulfillment_type;
    const delivery_address =
      fulfillment_type === "pickup"
        ? null
        : String(data.delivery_address ?? "").trim();
    return {
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      items: data.items,
      total_price: data.total_price,
      fulfillment_type,
      delivery_address,
      payment_method: data.payment_method,
      save_address_to_profile: data.save_address_to_profile,
    };
  });

export type CreateOrderBodyParsed = z.output<typeof createOrderBodySchema>;
