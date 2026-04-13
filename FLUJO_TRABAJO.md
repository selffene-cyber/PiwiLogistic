# PiwiLogistic - Flujo de Trabajo

## Cadena de Distribucion

```
Andina/Coca-Cola (Fabricante)
    |
    v
GOFEX (Mandante / Cliente Principal)
    |
    v
VILBA (Transportista / Tu Empresa)
    |
    v
Clientes Internos (Clientes finales de Andina: almacenes, botillerias, etc.)
```

## Flujo Diario de Operaciones

### 1. Planificacion (Manana)

- **Crear Ruta**: Se selecciona camion, conductor y peonetas
- **Estado inicial**: `planificada`
- La ruta queda lista para recibir guias

### 2. Recepcion de Guias de Despacho (Manana)

GOFEX entrega a VILBA las Guias de Despacho. Cada guia contiene:
- **Numero GD**: Numero de la guia emitida por GOFEX
- **Tipo**: Normal, Mayorista, Segunda Vuelta
- **Detalle por cliente interno**: Por cada linea:
  - **Cliente Interno**: Nombre del cliente final (almacen, botilleria, etc.)
  - **Direccion**: Direccion de entrega del cliente interno
  - **Tipo de Caja**: Ej. Caja General, Retornable, etc.
  - **Cantidad**: Cajas despachadas para ese cliente

**Se registra en PiwiLogistic**: `/dispatch-guides` → Nueva Guia

### 3. Inicio de Ruta

- **Iniciar ruta**: Cambia estado a `en_ruta`
- Se registra hora de salida
- El conductor carga el camion segun las guias

### 4. Entregas en Terreno (Durante el dia)

Por cada cliente interno en la ruta:
- **Entregado**: Se registro la cantidad entregada y monto cobrado
- **Parcial**: Se entrego parte del pedido (se registro diferencia como devuelto)
- **Rechazado**: No se pudo entregar, se selecciona motivo:
  - Pedido errado (vendedor/programadora mando mal)
  - Cliente cerrado
  - Cliente no encontrado
  - Saldo vencido
  - No recibe
  - Otro

**Se registra en PiwiLogistic**: `/deliveries` → Nueva Entrega

Cada entrega vincula:
- La ruta
- El cliente
- La guia de despacho (opcional)
- El tipo de caja (opcional)
- Cajas solicitadas vs entregadas vs devueltas
- Monto cobrado
- Motivo de rechazo (si aplica)

### 5. Cierre de Ruta (Fin del dia)

- **Cerrar ruta**: Cambia estado a `cerrada`
- El sistema calcula automaticamente:
  - **Costos operacionales**: Arriendo camion, sueldo conductor, peonetas, mantencion, administracion (prorrateados del mensual)
  - **Bono**: Segun tramos configurados (cajas excedentes x monto por caja)
  - **Cuadre**: Despachado vs Entregado vs Devuelto

### 6. Cuadre y Reporte

En el detalle de ruta (`/routes/:id`) se muestra el **Cuadre**:

| Concepto | Calculo |
|----------|----------|
| Cajas Despachadas | SUM de todas las guias |
| Cajas Entregadas | SUM de todas las entregas |
| Cajas Devueltas | Solicitadas - Entregadas |
| Eficiencia | Entregadas / Despachadas x 100 |
| Ingresos | SUM montoCobrado de entregas |
| Costos | Arriendo + Sueldo + Peonetas + Mantencion + Admin |
| Bonos | Calculo por tramo |
| Utilidad | Ingresos - Costos - Bonos |
| Margen | Utilidad / Ingresos x 100 |

**Exportacion**: Disponible en Excel por ruta y por periodo.

## Entidades Principales

### Ruta
- Fecha, camion, conductor, peonetas
- Estados: planificada → en_ruta → cerrada → (reabierta → cerrada)

### Guia de Despacho
- Numero GD, fecha, tipo (normal/mayorista/segunda vuelta)
- Vinculada a una ruta
- **Detalle**: Cada linea tiene cliente interno, direccion, tipo de caja, cantidad y precio
- Se cierra para bloquear edicion

### Entrega
- Por cliente interno en la ruta
- Cajas solicitadas (lo que manda el mandante)
- Cajas entregadas (lo que realmente se entrego)
- Cajas devueltas (solicitadas - entregadas, auto-calculado)
- Monto cobrado
- Estado: entregado / parcial / rechazado
- Motivo de rechazo si aplica
- Vinculada a guia de despacho y tipo de caja

### Costos
- Se calculan automaticamente al cerrar ruta
- Basados en configuracion mensual prorrateada

### Bonos
- Tramos configurables (ej: 200+ cajas = $30/caja)
- Se calculan al cerrar ruta segun cajas excedentes

## Permisos por Rol

| Perfil | Crear | Editar | Eliminar | Cerrar Ruta | Ver Reportes |
|--------|-------|-------|----------|-------------|--------------|
| ADMIN | Si | Si | Si | Si | Si |
| SUPERVISOR | Si | Si | No | Si | Si |
| OPERADOR | Si | Propio | No | No | Solo propias |
| CONDUCTOR | Ver | No | No | No | Solo propias |
| VISUALIZADOR | No | No | No | No | Si |