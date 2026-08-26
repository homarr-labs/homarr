ALTER TABLE `user` ADD `header_preferences` text DEFAULT ('{"version":3,"visible":true,"searchDisplay":"input","logoDisplay":"logoAndText","zones":{"left":[{"type":"builtin","id":"logo"}],"center":[{"type":"builtin","id":"search"}],"right":[{"type":"builtin","id":"boardEdit"},{"type":"builtin","id":"boardSettings"},{"type":"builtin","id":"user"}]}}') NOT NULL;
--> statement-breakpoint
INSERT IGNORE INTO `serverSetting` (`setting_key`, `value`)
VALUES ('branding', '{"json":{"appName":"Homarr","greeting":"","logoImageUrl":null,"faviconImageUrl":null,"primaryColor":"#fa5252","secondaryColor":"#fd7e14","lockPrimaryColor":false,"signInBackgroundImageUrl":null,"signInBackgroundOverlay":0.55,"authBranding":{"showAppName":true,"showLogo":true,"showGreeting":true},"defaultRadius":"md"}}');
