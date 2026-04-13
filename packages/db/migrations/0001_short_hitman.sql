PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_entregas` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`ruta_id` text NOT NULL,
	`cliente_id` text NOT NULL,
	`cliente_nombre_snapshot` text NOT NULL,
	`cliente_direccion_snapshot` text,
	`guia_despacho_id` text,
	`tipo_caja_id` text,
	`cajas_solicitadas` integer DEFAULT 0 NOT NULL,
	`cajas_entregadas` integer DEFAULT 0 NOT NULL,
	`cajas_devueltas` integer DEFAULT 0 NOT NULL,
	`monto_cobrado` real DEFAULT 0 NOT NULL,
	`estado` text DEFAULT 'entregado' NOT NULL,
	`motivo_rechazo` text,
	`observaciones` text,
	`hora_entrega` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ruta_id`) REFERENCES `rutas`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`guia_despacho_id`) REFERENCES `guias_despacho`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tipo_caja_id`) REFERENCES `tipos_caja`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_entregas`("id", "tenant_id", "ruta_id", "cliente_id", "cliente_nombre_snapshot", "cliente_direccion_snapshot", "guia_despacho_id", "tipo_caja_id", "cajas_solicitadas", "cajas_entregadas", "cajas_devueltas", "monto_cobrado", "estado", "motivo_rechazo", "observaciones", "hora_entrega", "created_at", "updated_at") SELECT "id", "tenant_id", "ruta_id", "cliente_id", "cliente_nombre_snapshot", NULL, NULL, NULL, "cajas_entregadas", "cajas_entregadas", 0, 0, "estado", NULL, NULL, "hora_entrega", "created_at", "updated_at" FROM `entregas`;--> statement-breakpoint
DROP TABLE `entregas`;--> statement-breakpoint
ALTER TABLE `__new_entregas` RENAME TO `entregas`;--> statement-breakpoint
PRAGMA foreign_keys=ON;