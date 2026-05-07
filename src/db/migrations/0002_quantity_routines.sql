ALTER TABLE "routines" ADD COLUMN "kind" text DEFAULT 'check' NOT NULL;--> statement-breakpoint
ALTER TABLE "routines" ADD COLUMN "unit" text;--> statement-breakpoint
ALTER TABLE "routines" ADD COLUMN "daily_target" integer;--> statement-breakpoint
ALTER TABLE "routine_logs" ADD COLUMN "value" integer;--> statement-breakpoint
ALTER TABLE "routines" ADD CONSTRAINT "routines_kind_chk" CHECK ("routines"."kind" IN ('check','quantity'));--> statement-breakpoint
ALTER TABLE "routines" ADD CONSTRAINT "routines_quantity_unit_chk" CHECK (("routines"."kind" = 'check' AND "routines"."unit" IS NULL) OR ("routines"."kind" = 'quantity' AND "routines"."unit" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "routines" ADD CONSTRAINT "routines_daily_target_chk" CHECK ("routines"."daily_target" IS NULL OR "routines"."daily_target" > 0);