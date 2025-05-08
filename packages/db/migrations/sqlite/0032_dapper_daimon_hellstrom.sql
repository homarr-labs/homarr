CREATE TABLE `trusted_certificate_hostname` (
	`hostname` text NOT NULL,
	`thumbprint` text NOT NULL,
	PRIMARY KEY(`hostname`, `thumbprint`)
);
