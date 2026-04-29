update public.orders
set delivery_token_expires_at = created_at + interval '3 hours'
where (fulfillment_type is null or fulfillment_type = 'delivery')
  and status not in ('completed', 'cancelled');
