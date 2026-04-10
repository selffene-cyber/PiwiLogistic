# TRANSPORT ERP SYSTEM - PROMPT MAESTRO

## OBJETIVO

Desarrollar un sistema ERP tipo PWA (Progressive Web App) enfocado en la gestion operativa y financiera de transporte de distribucion (modelo Coca-Cola / Andina), centrado en rutas diarias, control de cajas, ingresos, costos y productividad.

El sistema debe ser **modular, escalable, multi-tenant y optimizado para operacion en terreno (mobile-first)**.

---

# ARQUITECTURA GENERAL

## FRONTEND

- Framework: React 18 + Vite
- Estilo: TailwindCSS
- Componentes: Headless UI
- Iconos: Heroicons (NO usar emojis)
- Routing: React Router
- Estado: TanStack Query + Zustand
- Diseno: Mobile First (primero movil, luego desktop)
- PWA: Service Worker + manifest.json

## BACKEND

- Runtime: Cloudflare Workers (Hono framework)
- API: RESTful con Hono + TypeScript
- Base de datos: SQLite compatible con Cloudflare D1
- Storage: preparado para Cloudflare R2 (futuro uso de archivos)
- ORM: Drizzle ORM (compatible con D1, SQLite dialect)
- Autenticacion: JWT + roles (bcrypt para hash)
- Arquitectura: modular por dominio
- Desarrollo local: Wrangler dev server

## CLOUD READY

- Deploy frontend: Cloudflare Pages
- Deploy backend: Cloudflare Workers
- Base de datos: D1 (SQLite dialect)
- Archivos: R2 (no implementado aun, pero preparado)
- Desarrollo local: Wrangler + D1 local

## MONOREPO

Herramienta: pnpm workspaces

```
/apps
  /web        -> React + Vite + PWA (frontend)
  /api        -> Hono API (backend)
/packages
  /db         -> schema Drizzle + migraciones + seed
  /shared     -> tipos, utils, constantes
  /ui         -> componentes reutilizables
```

---

# MODELO MULTITENANT

## Requisitos

- Cada empresa = 1 tenant
- Todos los datos deben estar aislados por `tenant_id`

## Regla general

Toda tabla de negocio debe incluir:
- `id` (primary key)
- `tenant_id` (obligatorio, filtro en TODAS las queries)
- `created_at`
- `updated_at`

Opcionalmente segun contexto:
- `created_by`
- `updated_by`

El sistema debe permitir:
- multiples empresas
- multiples usuarios por empresa

---

# AUTENTICACION Y ROLES

## Flujo de autenticacion

1. Usuario inicia sesion con email + password
2. Backend valida credenciales (bcrypt)
3. Entrega access token (JWT corto, 15min) + refresh token
4. Frontend guarda sesion: access token en memoria, refresh token en cookie httpOnly
5. Al expirar access token, usa refresh para obtener uno nuevo
6. Logout invalida refresh token

## Tabla: `users`

| Campo | Tipo | Detalle |
|-------|------|---------|
| id | text | PK |
| tenant_id | text | FK tenants, obligatorio |
| nombre | text | |
| email | text | unique por tenant |
| password_hash | text | bcrypt |
| role_id | text | FK roles |
| activo | boolean | default true |
| created_at | text | ISO date |
| updated_at | text | ISO date |

## Tabla: `roles`

| Campo | Tipo | Detalle |
|-------|------|---------|
| id | text | PK |
| tenant_id | text | nullable (null = rol global) |
| nombre | text | |
| codigo | text | ADMIN, SUPERVISOR, OPERADOR, CONDUCTOR, VISUALIZADOR |
| descripcion | text | |
| permisos | text | JSON |
| created_at | text | ISO date |
| updated_at | text | ISO date |

## Roles base

| Rol | Codigo | Permisos |
|-----|--------|----------|
| Admin | ADMIN | acceso total, crear usuarios, editar configuraciones, reabrir rutas cerradas, ver auditoria |
| Supervisor | SUPERVISOR | crear y editar rutas, cerrar rutas, ver dashboard, gestionar clientes y cajas. No gestiona tenants globales |
| Operador | OPERADOR | crear guias, cargar detalle GD, registrar entregas. No cierra rutas sin permiso |
| Conductor | CONDUCTOR | ver su ruta asignada, actualizar estados operativos basicos, registrar incidencias. No edita configuracion |
| Visualizador | VISUALIZADOR | solo lectura |

## Endpoints auth

- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/refresh`
- `GET /auth/me`

---

# MODELO DE DATOS (COMPLETO)

## Tablas del sistema

### `tenants`

| Campo | Tipo | Detalle |
|-------|------|---------|
| id | text | PK |
| nombre | text | |
| rut_empresa | text | |
| estado | text | activo, suspendido |
| created_at | text | ISO date |
| updated_at | text | ISO date |

### `tenant_config`

| Campo | Tipo | Detalle |
|-------|------|---------|
| id | text | PK |
| tenant_id | text | FK tenants, unique |
| dias_habiles_mes | integer | default 26 |
| base_cajas_bono | integer | |
| hora_inicio_operacion | text | default "07:00" |
| hora_cierre_operacion | text | default "21:00" |
| bloquear_edicion_ruta_cerrada | boolean | default true |
| usar_auditoria | boolean | default true |
| moneda | text | default "CLP" |
| costo_arriendo_camion_mensual | real | |
| costo_mantencion_mensual | real | |
| costo_administracion_mensual | real | |
| created_at | text | ISO date |
| updated_at | text | ISO date |

### `camiones`

| Campo | Tipo | Detalle |
|-------|------|---------|
| id | text | PK |
| tenant_id | text | FK tenants |
| patente | text | |
| marca | text | |
| modelo | text | |
| anio | integer | |
| capacidad_cajas | integer | nullable |
| activo | boolean | default true (soft delete) |
| created_at | text | ISO date |
| updated_at | text | ISO date |

### `trabajadores`

Tabla unica para conductor, peoneta, administrativo, etc.

| Campo | Tipo | Detalle |
|-------|------|---------|
| id | text | PK |
| tenant_id | text | FK tenants |
| nombre | text | |
| rut | text | |
| tipo_trabajador | text | conductor, peoneta, administrativo, etc. |
| activo | boolean | default true (soft delete) |
| costo_mensual_empresa | real | |
| fecha_ingreso | text | ISO date |
| created_at | text | ISO date |
| updated_at | text | ISO date |

### `clientes`

| Campo | Tipo | Detalle |
|-------|------|---------|
| id | text | PK |
| tenant_id | text | FK tenants |
| nombre_comercial | text | |
| razon_social | text | nullable |
| rut | text | nullable |
| direccion | text | |
| comuna | text | |
| ciudad | text | |
| telefono | text | nullable |
| tipo_cliente | text | minorista, mayorista |
| activo | boolean | default true (soft delete) |
| created_at | text | ISO date |
| updated_at | text | ISO date |

### `tipos_caja`

| Campo | Tipo | Detalle |
|-------|------|---------|
| id | text | PK |
| tenant_id | text | FK tenants |
| nombre | text | |
| precio_unitario | real | |
| activo | boolean | default true (soft delete) |
| created_at | text | ISO date |
| updated_at | text | ISO date |

### `rutas`

| Campo | Tipo | Detalle |
|-------|------|---------|
| id | text | PK |
| tenant_id | text | FK tenants |
| fecha | text | ISO date |
| camion_id | text | FK camiones |
| conductor_id | text | FK trabajadores |
| peoneta_1_id | text | FK trabajadores, nullable |
| peoneta_2_id | text | FK trabajadores, nullable |
| estado | text | planificada, en_ruta, cerrada, reabierta, anulada |
| hora_salida | text | nullable, ISO datetime |
| hora_fin | text | nullable, ISO datetime |
| cerrada_at | text | nullable, ISO datetime |
| cerrada_by | text | nullable, FK users |
| created_at | text | ISO date |
| updated_at | text | ISO date |

### `guias_despacho`

| Campo | Tipo | Detalle |
|-------|------|---------|
| id | text | PK |
| tenant_id | text | FK tenants |
| ruta_id | text | FK rutas |
| numero_gd | text | |
| fecha | text | ISO date |
| tipo_gd | text | normal, mayorista, segunda_vuelta |
| observaciones | text | nullable |
| estado | text | abierta, cerrada, anulada |
| total_cajas | integer | |
| total_monto | real | |
| created_at | text | ISO date |
| updated_at | text | ISO date |

### `detalle_gd`

| Campo | Tipo | Detalle |
|-------|------|---------|
| id | text | PK |
| tenant_id | text | FK tenants |
| guia_despacho_id | text | FK guias_despacho |
| tipo_caja_id | text | FK tipos_caja |
| cantidad | integer | |
| precio_unitario_snapshot | real | snapshot del precio al momento de la GD |
| subtotal | real | cantidad * precio_unitario_snapshot |
| created_at | text | ISO date |
| updated_at | text | ISO date |

### `entregas`

| Campo | Tipo | Detalle |
|-------|------|---------|
| id | text | PK |
| tenant_id | text | FK tenants |
| ruta_id | text | FK rutas |
| cliente_id | text | FK clientes |
| cliente_nombre_snapshot | text | por si el cliente cambia nombre despues |
| cajas_entregadas | integer | |
| estado | text | entregado, parcial, rechazado |
| hora_entrega | text | ISO datetime |
| created_at | text | ISO date |
| updated_at | text | ISO date |

### `costos_operacion`

| Campo | Tipo | Detalle |
|-------|------|---------|
| id | text | PK |
| tenant_id | text | FK tenants |
| ruta_id | text | FK rutas |
| arriendo_camion | real | valor diario prorrateado |
| sueldo_conductor | real | valor diario prorrateado |
| peonetas | real | valor diario prorrateado |
| mantencion | real | valor diario prorrateado |
| administracion | real | valor diario prorrateado |
| total_costos | real | suma de todos los anteriores |
| created_at | text | ISO date |
| updated_at | text | ISO date |

### `bonus_tiers`

| Campo | Tipo | Detalle |
|-------|------|---------|
| id | text | PK |
| tenant_id | text | FK tenants |
| nombre | text | ej: "tramo 1", "tramo 2" |
| desde_cajas | integer | |
| hasta_cajas | integer | nullable (null = sin limite) |
| monto_por_caja | real | |
| activo | boolean | default true |
| orden | integer | para ordenar los tramos |
| created_at | text | ISO date |
| updated_at | text | ISO date |

Ejemplo de tiers por defecto:

| Nombre | Desde | Hasta | Monto/caja |
|--------|-------|-------|------------|
| Tramo 1 | 0 | 1000 | 0 |
| Tramo 2 | 1001 | 1300 | 10 |
| Tramo 3 | 1301 | 1500 | 15 |
| Tramo 4 | 1501 | null | 20 |

### `bonus_config`

| Campo | Tipo | Detalle |
|-------|------|---------|
| id | text | PK |
| tenant_id | text | FK tenants, unique |
| metodo_reparto | text | igualitario, ponderado_por_rol |
| incluir_conductor | boolean | default true |
| incluir_peoneta_1 | boolean | default true |
| incluir_peoneta_2 | boolean | default true |
| created_at | text | ISO date |
| updated_at | text | ISO date |

### `bonos`

| Campo | Tipo | Detalle |
|-------|------|---------|
| id | text | PK |
| tenant_id | text | FK tenants |
| ruta_id | text | FK rutas |
| cajas_excedentes | integer | |
| bono_total | real | |
| bono_por_persona | real | |
| created_at | text | ISO date |
| updated_at | text | ISO date |

### `audit_logs`

| Campo | Tipo | Detalle |
|-------|------|---------|
| id | text | PK |
| tenant_id | text | FK tenants |
| user_id | text | FK users |
| entidad | text | rutas, guias, entregas, bonos, configuraciones, usuarios |
| entidad_id | text | |
| accion | text | create, update, delete, close, reopen |
| valores_anteriores | text | JSON |
| valores_nuevos | text | JSON |
| created_at | text | ISO date |

---

# LOGICA DE NEGOCIO

## INGRESOS

```
ingresos = SUM(detalle_gd.subtotal WHERE ruta_id = X)
```

## COSTOS PRORRATEADOS

Formula:

```
costo_diario = costo_mensual / dias_habiles_mes
```

Donde `dias_habiles_mes` viene de `tenant_config` (default: 26, operacion lunes a sabado).

Desglose:

```
arriendo_camion_diario = costo_arriendo_camion_mensual / dias_habiles_mes
mantencion_diaria = costo_mantencion_mensual / dias_habiles_mes
administracion_diaria = costo_administracion_mensual / dias_habiles_mes
conductor_diario = trabajador.costo_mensual_empresa / dias_habiles_mes  (donde tipo = conductor)
peoneta_diario = trabajador.costo_mensual_empresa / dias_habiles_mes     (donde tipo = peoneta)
```

Nota: Esto no reemplaza contabilidad real, sirve para control operativo y rentabilidad por ruta.

## UTILIDAD

```
utilidad = ingresos - costos - bonos
```

## BONOS ESCALONADOS

Los bonos se calculan POR TRAMOS, no sobre el total bruto.

Formula por tramo:

```
cajas_en_tramo = min(total_cajas, hasta_cajas) - desde_cajas  (si hasta_cajas es null, solo total_cajas - desde_cajas)
bono_tramo = cajas_en_tramo * monto_por_caja
```

Solo se aplica si `total_cajas > desde_cajas`.

```
bono_total = SUM(bono_tramo) para todos los tramos aplicables
bono_por_persona = bono_total / cantidad_personas_bonificables
```

`cantidad_personas_bonificables` se determina segun `bonus_config`:
- Si `incluir_conductor` = true: +1
- Si `incluir_peoneta_1` = true: +1
- Si `incluir_peoneta_2` = true: +1

Metodos de reparto:
- `igualitario`: bono_por_persona = bono_total / cantidad_personas
- `ponderado_por_rol`: distribuir segun ponderacion definida

## CIERRE DE RUTA

Al pasar una ruta a estado `cerrada`:
- No puede editarse normalmente
- Solo ADMIN puede reabrir (estado `reabierta`)
- Se registra `cerrada_at` y `cerrada_by`
- Se bloquean ediciones si `tenant_config.bloquear_edicion_ruta_cerrada = true`
- Se audita en `audit_logs`

---

# KPI

| KPI | Formula | Observacion |
|-----|---------|-------------|
| Eficiencia de entrega | cajas_entregadas / cajas_despachadas * 100 | cajas_despachadas = SUM(detalle_gd.cantidad) |
| Cumplimiento de ruta | clientes_entregados / clientes_programados * 100 | |
| Productividad horaria | cajas_entregadas / horas_operativas | horas_operativas = hora_fin - hora_salida |
| Rentabilidad por caja | utilidad_ruta / cajas_entregadas | |
| Cajas/dia | total cajas entregadas / dias operativos | |
| Cajas/hora | cajas entregadas / horas en ruta | |

---

# UX / UI

## Principios

- Mobile First
- Interfaz rapida (uso en terreno)
- Botones grandes
- Navegacion simple
- Sin sobrecarga visual

## Estilo visual

- Diseno limpio, moderno, industrial
- Colores: escala de grises + acento azul
- Bordes: definidos (no excesivamente redondeados)
- Tipografia: Inter
- Iconos: Heroicons unicamente
- NO usar emojis

---

# FUNCIONALIDAD PWA

- Instalable en celular
- Offline basico (cache de rutas del dia)
- Carga rapida
- Service Worker configurado

---

# FLUJO OPERACIONAL

## Inicio de dia
- Crear ruta (asignar camion, conductor, peonetas)
- Crear guia de despacho (cabecera)
- Ingresar detalle GD (tipo de caja + cantidad, sistema snapshot de precio)

## En ruta
- Cambiar estado a en_ruta
- Registrar entregas por cliente (entregado / parcial / rechazado)
- Registrar hora de entrega

## Fin del dia
- Cerrar ruta (triggers automaticos):
  - Calcular ingresos (SUM detalle GD)
  - Calcular costos prorrateados diarios
  - Calcular bonos por tramos
  - Calcular utilidad
  - Bloquear ediciones
  - Registrar auditoria

---

# DASHBOARD

## Mostrar:
- Cajas del dia
- Ingresos
- Costos
- Utilidad
- KPIs: eficiencia, cajas/dia, cajas/hora, rentabilidad/caja

## Endpoints:
- `GET /dashboard/today`
- `GET /dashboard/week`
- `GET /dashboard/month`

---

# API ENDPOINTS (COMPLETO)

## Auth
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/refresh`
- `GET /auth/me`

## Tenants
- `GET /tenants/current`
- `PUT /tenants/current/config`

## Usuarios
- `GET /users`
- `POST /users`
- `GET /users/:id`
- `PUT /users/:id`
- `PATCH /users/:id/status`

## Roles
- `GET /roles`
- `POST /roles`
- `PUT /roles/:id`

## Trabajadores
- `GET /workers`
- `POST /workers`
- `PUT /workers/:id`

## Camiones
- `GET /trucks`
- `POST /trucks`
- `PUT /trucks/:id`

## Clientes
- `GET /clients`
- `POST /clients`
- `PUT /clients/:id`

## Tipos de caja
- `GET /box-types`
- `POST /box-types`
- `PUT /box-types/:id`

## Guias de despacho
- `GET /dispatch-guides`
- `POST /dispatch-guides`
- `GET /dispatch-guides/:id`
- `PUT /dispatch-guides/:id`
- `POST /dispatch-guides/:id/close`

## Rutas
- `GET /routes`
- `POST /routes`
- `GET /routes/:id`
- `PUT /routes/:id`
- `POST /routes/:id/start`
- `POST /routes/:id/close`
- `POST /routes/:id/reopen`

## Entregas
- `GET /deliveries`
- `POST /deliveries`
- `PUT /deliveries/:id`

## Bonos
- `GET /bonuses`
- `GET /bonus-tiers`
- `POST /bonus-tiers`
- `PUT /bonus-tiers/:id`

## Dashboard
- `GET /dashboard/today`
- `GET /dashboard/week`
- `GET /dashboard/month`

---

# CONVENCIONES

## Soft delete
En tablas maestras (clientes, camiones, trabajadores, tipos_caja):
- Campo `activo` boolean (true = activo, false = eliminado)
- O campo `deleted_at` nullable

## Snapshot de precio
En `detalle_gd` siempre guardar `precio_unitario_snapshot` al momento de la GD, nunca consultar el precio actual del tipo de caja para calculos historicos.

## Enums de estado
Usar estados consistentes definidos:

Rutas: `planificada`, `en_ruta`, `cerrada`, `reabierta`, `anulada`
Guias: `abierta`, `cerrada`, `anulada`
Entregas: `entregado`, `parcial`, `rechazado`

## Todos los IDs
Generar como UUID v4 o nano ID.

---

# SEED DATA INICIAL

## Tenant default
- Nombre: "GOFEX Demo"
- Rut: configurable

## Roles base
- ADMIN, SUPERVISOR, OPERADOR, CONDUCTOR, VISUALIZADOR

## Usuario admin inicial
- Email: configurable
- Password: temporal, obliga cambio al primer login

## Config tenant default
- 26 dias habiles
- Moneda: CLP
- Hora inicio: 07:00
- Hora cierre: 21:00
- Costos base: 0 (configurables)
- bloquear_edicion_ruta_cerrada: true
- usar_auditoria: true

## Bonus tiers iniciales (ejemplo, editables)
- Tramo 1: 0-1000: $0/caja
- Tramo 2: 1001-1300: $10/caja
- Tramo 3: 1301-1500: $15/caja
- Tramo 4: 1501+: $20/caja

## Bonus config default
- metodo_reparto: igualitario
- incluir_conductor: true
- incluir_peoneta_1: true
- incluir_peoneta_2: true

---

# ESCALABILIDAD

El sistema debe permitir:
- Multiples camiones
- Multiples rutas simultaneas
- Crecimiento sin modificar arquitectura

---

# BUENAS PRACTICAS

- Codigo limpio y modular
- Separacion frontend/backend
- Validaciones en backend
- Manejo de errores
- Tipado estricto (TypeScript)
- `tenant_id` en TODAS las queries de negocio
- Nunca hardcodear reglas que varian por tenant
- Siempre snapshot de precios en transacciones

---

# ENTREGABLE ESPERADO

- Proyecto funcional en local
- Base de datos inicial con seed
- CRUD completo: tipos de caja, rutas, entregas, guias de despacho, clientes, camiones, trabajadores
- Sistema de login con JWT
- Dashboard operativo con KPIs
- PWA instalable

---

# OBJETIVO FINAL

Construir un sistema que permita:
- Controlar operacion diaria
- Medir rentabilidad en tiempo real
- Escalar a multiples camiones
- Operar completamente desde el celular

---

# STACK DEFINITIVO (RESUMEN)

| Capa | Tecnologia |
|------|-----------|
| Frontend | React 18 + Vite + TailwindCSS + Heroicons + TanStack Query + Zustand |
| Backend | Hono + TypeScript |
| Base de datos | Drizzle ORM + SQLite dialect (compatible D1) |
| Deploy | Cloudflare Pages + Workers + D1 + R2 |
| Monorepo | pnpm workspaces |
| Auth | JWT (access + refresh) + bcrypt |

---

# TABLAS DEL SISTEMA (RESUMEN)

1. tenants
2. tenant_config
3. users
4. roles
5. trabajadores
6. camiones
7. clientes
8. tipos_caja
9. rutas
10. guias_despacho
11. detalle_gd
12. entregas
13. bonus_tiers
14. bonus_config
15. costos_operacion
16. bonos
17. audit_logs