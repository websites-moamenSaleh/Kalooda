ALTER TABLE orders DROP CONSTRAINT orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status = ANY (ARRAY[
    'pending',
    'preparing',
    'out_for_delivery',
    'ready_for_pickup',
    'completed',
    'cancelled'
  ]));
