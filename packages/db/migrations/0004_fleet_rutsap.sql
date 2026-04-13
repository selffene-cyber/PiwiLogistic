ALTER TABLE `clientes` RENAME COLUMN `rut` TO `rut_sap`;--> statement-breakpoint
ALTER TABLE `detalle_gd` ADD `cliente_interno_id` text;--> statement-breakpoint
ALTER TABLE `detalle_gd` ADD `cliente_interno_nombre` text;--> statement-breakpoint
ALTER TABLE `detalle_gd` DROP COLUMN `cliente_interno`;