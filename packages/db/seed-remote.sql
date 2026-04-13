INSERT INTO roles (id, tenant_id, nombre, codigo, descripcion, permisos, created_at, updated_at) VALUES
('role-admin-00000000-0000-0000-0000-000000000001', 'tenant-gofex-00000000-0000-0000-0000-000000000001', 'Administrador', 'ADMIN', 'Acceso total al sistema', '{"all": true}', '2026-04-10T00:00:00.000Z', '2026-04-10T00:00:00.000Z');

INSERT INTO roles (id, tenant_id, nombre, codigo, descripcion, permisos, created_at, updated_at) VALUES
('role-super-00000000-0000-0000-0000-000000000001', 'tenant-gofex-00000000-0000-0000-0000-000000000001', 'Supervisor', 'SUPERVISOR', 'Gestiona rutas y operaciones', '{"routes": true, "dispatch": true, "deliveries": true, "dashboard": true}', '2026-04-10T00:00:00.000Z', '2026-04-10T00:00:00.000Z');

INSERT INTO roles (id, tenant_id, nombre, codigo, descripcion, permisos, created_at, updated_at) VALUES
('role-opera-00000000-0000-0000-0000-000000000001', 'tenant-gofex-00000000-0000-0000-0000-000000000001', 'Operador', 'OPERADOR', 'Registra guias y entregas', '{"dispatch": true, "deliveries": true}', '2026-04-10T00:00:00.000Z', '2026-04-10T00:00:00.000Z');

INSERT INTO roles (id, tenant_id, nombre, codigo, descripcion, permisos, created_at, updated_at) VALUES
('role-condu-00000000-0000-0000-0000-000000000001', 'tenant-gofex-00000000-0000-0000-0000-000000000001', 'Conductor', 'CONDUCTOR', 'Ve su ruta asignada', '{"routes": "read_own"}', '2026-04-10T00:00:00.000Z', '2026-04-10T00:00:00.000Z');

INSERT INTO roles (id, tenant_id, nombre, codigo, descripcion, permisos, created_at, updated_at) VALUES
('role-visua-00000000-0000-0000-0000-000000000001', 'tenant-gofex-00000000-0000-0000-0000-0000-000000000001', 'Visualizador', 'VISUALIZADOR', 'Solo lectura', '{"all": "read"}', '2026-04-10T00:00:00.000Z', '2026-04-10T00:00:00.000Z');

INSERT INTO users (id, tenant_id, nombre, email, password_hash, role_id, activo, debe_cambiar_password, created_at, updated_at)
VALUES ('user-admin-00000000-0000-0000-0000-000000000001', 'tenant-gofex-00000000-0000-0000-0000-000000000001', 'Admin GOFEX', 'admin@gofex.cl', '$2b$12$GgjPLDJ4WhBEZBYUFG9njOqOCdaKKN7UkEUHS7oH8/HL0SzIK2zAm', 'role-admin-00000000-0000-0000-0000-000000000001', 1, 1, '2026-04-10T00:00:00.000Z', '2026-04-10T00:00:00.000Z');

INSERT INTO tenant_config (id, tenant_id, dias_habiles_mes, base_cajas_bono, hora_inicio_operacion, hora_cierre_operacion, bloquear_edicion_ruta_cerrada, usar_auditoria, moneda, costo_arriendo_camion_mensual, costo_mantencion_mensual, costo_administracion_mensual, created_at, updated_at)
VALUES ('cfg-00000000-0000-0000-0000-000000000001', 'tenant-gofex-00000000-0000-0000-0000-000000000001', 26, 1000, '07:00', '21:00', 1, 1, 'CLP', 500000, 150000, 300000, '2026-04-10T00:00:00.000Z', '2026-04-10T00:00:00.000Z');

INSERT INTO bonus_tiers (id, tenant_id, nombre, desde_cajas, hasta_cajas, monto_por_caja, activo, orden, created_at, updated_at) VALUES
('tier-00000001-0000-0000-0000-000000000001', 'tenant-gofex-00000000-0000-0000-0000-000000000001', 'Tramo 1', 0, 1000, 0, 1, 1, '2026-04-10T00:00:00.000Z', '2026-04-10T00:00:00.000Z');

INSERT INTO bonus_tiers (id, tenant_id, nombre, desde_cajas, hasta_cajas, monto_por_caja, activo, orden, created_at, updated_at) VALUES
('tier-00000002-0000-0000-0000-000000000001', 'tenant-gofex-00000000-0000-0000-0000-000000000001', 'Tramo 2', 1001, 1300, 10, 1, 2, '2026-04-10T00:00:00.000Z', '2026-04-10T00:00:00.000Z');

INSERT INTO bonus_tiers (id, tenant_id, nombre, desde_cajas, hasta_cajas, monto_por_caja, activo, orden, created_at, updated_at) VALUES
('tier-00000003-0000-0000-0000-000000000001', 'tenant-gofex-00000000-0000-0000-0000-000000000001', 'Tramo 3', 1301, 1500, 15, 1, 3, '2026-04-10T00:00:00.000Z', '2026-04-10T00:00:00.000Z');

INSERT INTO bonus_tiers (id, tenant_id, nombre, desde_cajas, hasta_cajas, monto_por_caja, activo, orden, created_at, updated_at) VALUES
('tier-00000004-0000-0000-0000-000000000001', 'tenant-gofex-00000000-0000-0000-0000-000000000001', 'Tramo 4', 1501, NULL, 20, 1, 4, '2026-04-10T00:00:00.000Z', '2026-04-10T00:00:00.000Z');

INSERT INTO bonus_config (id, tenant_id, metodo_reparto, incluir_conductor, incluir_peoneta_1, incluir_peoneta_2, created_at, updated_at)
VALUES ('bconfig-00000000-0000-0000-0000-000000000001', 'tenant-gofex-00000000-0000-0000-0000-000000000001', 'igualitario', 1, 1, 1, '2026-04-10T00:00:00.000Z', '2026-04-10T00:00:00.000Z');