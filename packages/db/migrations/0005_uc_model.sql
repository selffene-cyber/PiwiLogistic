CREATE TABLE `centros_distribucion` (
  `id` text PRIMARY KEY NOT NULL,
  `tenant_id` text NOT NULL,
  `nombre` text NOT NULL,
  `codigo` text,
  `ciudad` text,
  `direccion` text,
  `activo` integer DEFAULT 1 NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
ALTER TABLE `tipos_caja` ADD `litros_por_caja` real DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `detalle_gd` ADD `litros_por_caja` real DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `detalle_gd` ADD `uc_totales` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `guias_despacho` ADD `total_uc` real DEFAULT 0;--> statement-breakpoint
ALTER TABLE `guias_despacho` ADD `total_palets` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `guias_despacho` ADD `cd_id` text;--> statement-breakpoint
ALTER TABLE `entregas` ADD `uc_entregadas` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `tenant_config` ADD `valor_uc` real DEFAULT 200 NOT NULL;