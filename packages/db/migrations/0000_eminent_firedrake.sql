CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`user_id` text,
	`entidad` text NOT NULL,
	`entidad_id` text NOT NULL,
	`accion` text NOT NULL,
	`valores_anteriores` text,
	`valores_nuevos` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `bonos` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`ruta_id` text NOT NULL,
	`cajas_excedentes` integer DEFAULT 0 NOT NULL,
	`bono_total` real DEFAULT 0 NOT NULL,
	`bono_por_persona` real DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ruta_id`) REFERENCES `rutas`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `bonus_config` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`metodo_reparto` text DEFAULT 'igualitario' NOT NULL,
	`incluir_conductor` integer DEFAULT true NOT NULL,
	`incluir_peoneta_1` integer DEFAULT true NOT NULL,
	`incluir_peoneta_2` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `bonus_tiers` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`nombre` text NOT NULL,
	`desde_cajas` integer NOT NULL,
	`hasta_cajas` integer,
	`monto_por_caja` real NOT NULL,
	`activo` integer DEFAULT true NOT NULL,
	`orden` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `camiones` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`patente` text NOT NULL,
	`marca` text,
	`modelo` text,
	`anio` integer,
	`capacidad_cajas` integer,
	`activo` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `clientes` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`nombre_comercial` text NOT NULL,
	`razon_social` text,
	`rut` text,
	`direccion` text,
	`comuna` text,
	`ciudad` text,
	`telefono` text,
	`tipo_cliente` text DEFAULT 'minorista' NOT NULL,
	`activo` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `costos_operacion` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`ruta_id` text NOT NULL,
	`arriendo_camion` real DEFAULT 0 NOT NULL,
	`sueldo_conductor` real DEFAULT 0 NOT NULL,
	`peonetas` real DEFAULT 0 NOT NULL,
	`mantencion` real DEFAULT 0 NOT NULL,
	`administracion` real DEFAULT 0 NOT NULL,
	`total_costos` real DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ruta_id`) REFERENCES `rutas`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `detalle_gd` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`guia_despacho_id` text NOT NULL,
	`tipo_caja_id` text NOT NULL,
	`cantidad` integer NOT NULL,
	`precio_unitario_snapshot` real NOT NULL,
	`subtotal` real NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`guia_despacho_id`) REFERENCES `guias_despacho`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tipo_caja_id`) REFERENCES `tipos_caja`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `entregas` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`ruta_id` text NOT NULL,
	`cliente_id` text NOT NULL,
	`cliente_nombre_snapshot` text NOT NULL,
	`cajas_entregadas` integer NOT NULL,
	`estado` text DEFAULT 'entregado' NOT NULL,
	`hora_entrega` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ruta_id`) REFERENCES `rutas`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `guias_despacho` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`ruta_id` text NOT NULL,
	`numero_gd` text NOT NULL,
	`fecha` text NOT NULL,
	`tipo_gd` text DEFAULT 'normal' NOT NULL,
	`observaciones` text,
	`estado` text DEFAULT 'abierta' NOT NULL,
	`total_cajas` integer DEFAULT 0,
	`total_monto` real DEFAULT 0,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ruta_id`) REFERENCES `rutas`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text,
	`nombre` text NOT NULL,
	`codigo` text NOT NULL,
	`descripcion` text,
	`permisos` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rutas` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`fecha` text NOT NULL,
	`camion_id` text NOT NULL,
	`conductor_id` text NOT NULL,
	`peoneta_1_id` text,
	`peoneta_2_id` text,
	`estado` text DEFAULT 'planificada' NOT NULL,
	`hora_salida` text,
	`hora_fin` text,
	`cerrada_at` text,
	`cerrada_by` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`camion_id`) REFERENCES `camiones`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`conductor_id`) REFERENCES `trabajadores`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`peoneta_1_id`) REFERENCES `trabajadores`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`peoneta_2_id`) REFERENCES `trabajadores`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cerrada_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tenant_config` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`dias_habiles_mes` integer DEFAULT 26 NOT NULL,
	`base_cajas_bono` integer,
	`hora_inicio_operacion` text DEFAULT '07:00' NOT NULL,
	`hora_cierre_operacion` text DEFAULT '21:00' NOT NULL,
	`bloquear_edicion_ruta_cerrada` integer DEFAULT true NOT NULL,
	`usar_auditoria` integer DEFAULT true NOT NULL,
	`moneda` text DEFAULT 'CLP' NOT NULL,
	`costo_arriendo_camion_mensual` real DEFAULT 0,
	`costo_mantencion_mensual` real DEFAULT 0,
	`costo_administracion_mensual` real DEFAULT 0,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` text PRIMARY KEY NOT NULL,
	`nombre` text NOT NULL,
	`rut_empresa` text NOT NULL,
	`estado` text DEFAULT 'activo' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tipos_caja` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`nombre` text NOT NULL,
	`precio_unitario` real NOT NULL,
	`activo` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `trabajadores` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`nombre` text NOT NULL,
	`rut` text NOT NULL,
	`tipo_trabajador` text NOT NULL,
	`activo` integer DEFAULT true NOT NULL,
	`costo_mensual_empresa` real DEFAULT 0,
	`fecha_ingreso` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`nombre` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role_id` text NOT NULL,
	`activo` integer DEFAULT true NOT NULL,
	`debe_cambiar_password` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE no action
);
