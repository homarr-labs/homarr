ALTER TABLE `user` ADD `default_search_engine_id` text REFERENCES search_engine(id);