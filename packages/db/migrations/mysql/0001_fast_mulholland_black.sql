CREATE TABLE `serverSetting` (
	`serverSetting_settingKey` varchar(64) NOT NULL,
	`serverSetting_value` text NOT NULL DEFAULT ('{"json": {}}'),
	CONSTRAINT `serverSetting_serverSetting_settingKey` PRIMARY KEY(`serverSetting_settingKey`),
	CONSTRAINT `serverSetting_serverSetting_settingKey_unique` UNIQUE(`serverSetting_settingKey`)
);
