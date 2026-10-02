CREATE TYPE "public"."order_cancel_reason" AS ENUM('expired', 'payment_failed', 'session_create_failed');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'confirmed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('unpaid', 'processing', 'paid', 'failed');--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" integer NOT NULL,
	"size" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"product_name" text NOT NULL,
	"product_slug" text NOT NULL,
	"image" jsonb,
	CONSTRAINT "order_items_order_id_product_id_size_unique" UNIQUE("order_id","product_id","size"),
	CONSTRAINT "order_items_quantity_positive" CHECK ("order_items"."quantity" > 0),
	CONSTRAINT "order_items_unit_price_cents_non_negative" CHECK ("order_items"."unit_price_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"payment_status" "payment_status" DEFAULT 'unpaid' NOT NULL,
	"cancel_reason" "order_cancel_reason",
	"currency" text DEFAULT 'usd' NOT NULL,
	"subtotal_cents" integer NOT NULL,
	"shipping_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer NOT NULL,
	"stripe_checkout_session_id" text,
	"stripe_payment_intent_id" text,
	"email" text,
	"shipping" jsonb,
	"reserved_until" timestamp with time zone NOT NULL,
	"paid_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_stripe_checkout_session_id_unique" UNIQUE("stripe_checkout_session_id"),
	CONSTRAINT "orders_stripe_payment_intent_id_unique" UNIQUE("stripe_payment_intent_id"),
	CONSTRAINT "orders_subtotal_cents_non_negative" CHECK ("orders"."subtotal_cents" >= 0),
	CONSTRAINT "orders_shipping_cents_non_negative" CHECK ("orders"."shipping_cents" >= 0),
	CONSTRAINT "orders_total_cents_sum" CHECK ("orders"."total_cents" = "orders"."subtotal_cents" + "orders"."shipping_cents"),
	CONSTRAINT "orders_currency_code" CHECK ("orders"."currency" ~ '^[a-z]{3}$'),
	CONSTRAINT "orders_status_payment_status" CHECK (("orders"."status" = 'pending' and "orders"."payment_status" in ('unpaid', 'processing'))
        or ("orders"."status" = 'confirmed' and "orders"."payment_status" = 'paid')
        or ("orders"."status" = 'cancelled' and "orders"."payment_status" in ('unpaid', 'failed'))),
	CONSTRAINT "orders_paid_fields" CHECK (("orders"."payment_status" = 'paid') = ("orders"."paid_at" is not null)
        and ("orders"."payment_status" <> 'paid' or "orders"."stripe_checkout_session_id" is not null)),
	CONSTRAINT "orders_cancelled_fields" CHECK (("orders"."status" = 'cancelled') = ("orders"."cancelled_at" is not null)
        and ("orders"."status" = 'cancelled') = ("orders"."cancel_reason" is not null))
);
--> statement-breakpoint
CREATE TABLE "stripe_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"order_id" uuid,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stripe_events" ADD CONSTRAINT "stripe_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_items_product_id_idx" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "orders_user_id_created_at_idx" ON "orders" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "orders_status_reserved_until_idx" ON "orders" USING btree ("status","reserved_until");