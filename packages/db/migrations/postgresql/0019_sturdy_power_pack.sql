CREATE TABLE "user_item_state" (
	"user_id" varchar(64) NOT NULL,
	"item_id" varchar(64) NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	CONSTRAINT "user_item_state_user_id_item_id_key_pk" PRIMARY KEY("user_id","item_id","key")
);
--> statement-breakpoint
ALTER TABLE "user_item_state" ADD CONSTRAINT "user_item_state_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_item_state" ADD CONSTRAINT "user_item_state_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE no action;