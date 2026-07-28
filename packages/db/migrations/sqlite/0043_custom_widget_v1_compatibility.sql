ALTER TABLE `custom_widget_secret` RENAME TO `custom_widget_v2_secret`;--> statement-breakpoint
ALTER TABLE `custom_widget_definition` RENAME TO `custom_widget_v2_definition`;--> statement-breakpoint
ALTER TABLE `legacy_custom_widget_secret` RENAME TO `custom_widget_secret`;--> statement-breakpoint
ALTER TABLE `legacy_custom_widget_definition` RENAME TO `custom_widget_definition`;--> statement-breakpoint
DELETE FROM `groupPermission` WHERE `permission` IN ('custom-widget-manage', 'custom-widget-secret-write');
