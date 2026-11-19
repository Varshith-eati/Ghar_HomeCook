CREATE TABLE IF NOT EXISTS ghar_delivery_orders (
  id TEXT PRIMARY KEY NOT NULL,
  customer_id TEXT NOT NULL,
  chef_id TEXT NOT NULL,
  menu_id TEXT NOT NULL,
  details TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Placed',
  timeline TEXT NOT NULL,
  created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS ghar_delivery_customer ON ghar_delivery_orders(customer_id, created_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS ghar_delivery_chef ON ghar_delivery_orders(chef_id, created_at);
