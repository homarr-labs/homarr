RENAME TABLE
  `custom_widget_definition` TO `custom_widget_v2_definition`,
  `custom_widget_secret` TO `custom_widget_v2_secret`,
  `legacy_custom_widget_definition` TO `custom_widget_definition`,
  `legacy_custom_widget_secret` TO `custom_widget_secret`;--> statement-breakpoint
ALTER TABLE `custom_widget_v2_definition`
  DROP FOREIGN KEY `custom_widget_definition_creator_id_user_id_fk`,
  ADD CONSTRAINT `custom_widget_v2_definition_creator_id_user_id_fk`
    FOREIGN KEY (`creator_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custom_widget_v2_secret`
  DROP FOREIGN KEY `cw_secret_definition_id_fk`,
  ADD CONSTRAINT `custom_widget_v2_secret_definition_id_fk`
    FOREIGN KEY (`definition_id`) REFERENCES `custom_widget_v2_definition`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custom_widget_definition`
  DROP FOREIGN KEY `legacy_cw_definition_creator_id_user_id_fk`,
  ADD CONSTRAINT `custom_widget_definition_creator_id_user_id_fk`
    FOREIGN KEY (`creator_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custom_widget_secret`
  DROP FOREIGN KEY `legacy_cw_secret_definition_id_fk`,
  ADD CONSTRAINT `cw_secret_definition_id_cw_definition_id_fk`
    FOREIGN KEY (`definition_id`) REFERENCES `custom_widget_definition`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
DELETE FROM `groupPermission` WHERE `permission` IN ('custom-widget-manage', 'custom-widget-secret-write');
