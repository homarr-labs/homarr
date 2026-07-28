ALTER TABLE "custom_widget_definition" RENAME TO "custom_widget_v2_definition";--> statement-breakpoint
ALTER TABLE "custom_widget_secret" RENAME TO "custom_widget_v2_secret";--> statement-breakpoint
ALTER TABLE "legacy_custom_widget_definition" RENAME TO "custom_widget_definition";--> statement-breakpoint
ALTER TABLE "legacy_custom_widget_secret" RENAME TO "custom_widget_secret";--> statement-breakpoint
ALTER TABLE "custom_widget_v2_definition"
  RENAME CONSTRAINT "custom_widget_definition_creator_id_user_id_fk"
  TO "custom_widget_v2_definition_creator_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "custom_widget_v2_secret"
  RENAME CONSTRAINT "cw_secret_definition_id_fk"
  TO "custom_widget_v2_secret_definition_id_fk";--> statement-breakpoint
ALTER TABLE "custom_widget_v2_secret"
  RENAME CONSTRAINT "custom_widget_secret_definition_id_source_id_kind_pk"
  TO "custom_widget_v2_secret_definition_id_source_id_kind_pk";--> statement-breakpoint
ALTER TABLE "custom_widget_definition"
  RENAME CONSTRAINT "legacy_cw_definition_creator_id_user_id_fk"
  TO "custom_widget_definition_creator_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "custom_widget_secret"
  RENAME CONSTRAINT "legacy_cw_secret_definition_id_fk"
  TO "custom_widget_secret_definition_id_custom_widget_definition_id_fk";--> statement-breakpoint
ALTER TABLE "custom_widget_secret"
  RENAME CONSTRAINT "legacy_custom_widget_secret_definition_id_kind_pk"
  TO "custom_widget_secret_definition_id_kind_pk";--> statement-breakpoint
DELETE FROM "groupPermission" WHERE "permission" IN ('custom-widget-manage', 'custom-widget-secret-write');
