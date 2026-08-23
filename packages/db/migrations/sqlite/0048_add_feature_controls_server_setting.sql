INSERT INTO `serverSetting` (`setting_key`, `value`)
VALUES ('featureControls', '{"json":{"assistantEnabled":true,"boardSwitcherEnabled":true,"widgetContextMenuEnabled":true}}')
ON CONFLICT (`setting_key`) DO NOTHING;
