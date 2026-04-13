CREATE TABLE `cargas_combustible` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`camion_id` text NOT NULL,
	`fecha` text NOT NULL,
	`km_vehiculo` integer NOT NULL,
	`litros` real NOT NULL,
	`precio_por_litro` real NOT NULL,
	`monto_total` real NOT NULL,
	`gasolinera` text NOT NULL,
	`conductor_rut` text,
	`observaciones` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`camion_id`) REFERENCES `camiones`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `mantenciones_camion` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`camion_id` text NOT NULL,
	`fecha` text NOT NULL,
	`km_vehiculo` integer NOT NULL,
	`km_prox_mantencion` integer,
	`tipo_mantencion` text NOT NULL,
	`descripcion` text,
	`costo` real DEFAULT 0 NOT NULL,
	`taller` text,
	`observaciones` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`camion_id`) REFERENCES `camiones`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `camiones` ADD `tipo_propiedad` text DEFAULT 'propio' NOT NULL;--> statement-breakpoint
ALTER TABLE `camiones` ADD `km_actual` integer DEFAULT 0;