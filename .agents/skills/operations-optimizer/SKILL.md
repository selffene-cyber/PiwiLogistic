---
name: operations-optimizer
description: Use when optimizing logistics, transport, supply chain, or distribution operations — including route planning, fleet management, cost analysis, KPI tracking, workload balancing, and operational efficiency improvements. Invoke for operations research, scheduling, resource allocation, capacity planning, and performance benchmarking.
license: MIT
metadata:
  author: PiwiLogistic
  version: "1.0.0"
  domain: operations
  triggers: operations, logistics, transport, optimization, routing, fleet, KPI, efficiency, cost, scheduling, capacity, distribution
  role: specialist
  scope: implementation
  output-format: code
  related-skills: mobile-design, secure-code-guardian, fullstack-developer
---

# Operations Optimizer

## Core Workflow

1. **Analyze** — Identify operational bottlenecks, inefficiencies, and constraints
2. **Model** — Create data models representing the operational domain (routes, vehicles, personnel, costs)
3. **Optimize** — Apply algorithms and heuristics to improve resource allocation and scheduling
4. **Implement** — Build optimized systems with real-time tracking and automated calculations
5. **Monitor** — Track KPIs and iterate on improvements

### Validation Checkpoints

After each implementation step, verify:

- **Route efficiency**: Validate that route assignments minimize cost and maximize delivery coverage
- **Cost accuracy**: Ensure all operational costs (fuel, labor, maintenance, admin) are captured and prorated correctly
- **KPI calculations**: Confirm KPIs (boxes/day, boxes/hour, utilization %) compute correctly from source data
- **Data integrity**: Verify that closing a route locks all related data and triggers correct financial calculations

## Reference Guide

| Topic | Context |
|-------|---------|
| Route Optimization | Vehicle Routing Problem (VRP), Traveling Salesman (TSP), time windows |
| Fleet Management | Capacity planning, maintenance scheduling, utilization tracking |
| Cost Modeling | Activity-based costing, prorated daily costs, marginal cost analysis |
| KPI Design | OEE, throughput, on-time delivery, cost per unit, revenue per route |
| Scheduling | Shift planning, driver assignment, workload balancing |
| Distribution | Last-mile optimization, delivery windows, batch processing |

## Constraints

### MUST DO
- Model all entities with tenant isolation (tenant_id on every table)
- Calculate costs as prorated daily values from monthly/periodic inputs
- Auto-compute bonuses using configurable tiered rules per tenant
- Track all operational states with defined transitions (planificada -> en_ruta -> finalizada)
- Snapshot prices at transaction time to preserve historical accuracy
- Design for mobile-first field operations (offline-capable, fast input)

### MUST NOT DO
- Hardcode business rules that vary by tenant
- Calculate financials on unverified or incomplete route data
- Allow route modifications after finalization without audit trail
- Mix tenant data in queries or reports
- Assume always-on connectivity for field operations

## Code Patterns

### Route Cost Calculation

```typescript
interface RouteCostInput {
  arriendoCamion: number;
  sueldoConductor: number;
  peonetas: number;
  mantencion: number;
  administracion: number;
}

function calculateDailyCosts(monthlyCosts: RouteCostInput): number {
  const workingDays = 25; // configurable per tenant
  const totalMonthly = Object.values(monthlyCosts).reduce((sum, v) => sum + v, 0);
  return totalMonthly / workingDays;
}
```

### Tiered Bonus System

```typescript
interface BonusTier {
  minBoxes: number;
  maxBoxes: number;
  bonusPerBox: number;
}

function calculateBonus(totalBoxes: number, tiers: BonusTier[], personnelCount: number): {
  bonusTotal: number;
  bonusPerPerson: number;
  boxesExcedentes: number;
} {
  let bonusTotal = 0;
  for (const tier of tiers) {
    if (totalBoxes > tier.minBoxes) {
      const boxesInTier = Math.min(totalBoxes, tier.maxBoxes) - tier.minBoxes;
      bonusTotal += boxesInTier * tier.bonusPerBox;
    }
  }
  const baseBoxes = tiers[0]?.minBoxes ?? 0;
  const boxesExcedentes = Math.max(0, totalBoxes - baseBoxes);
  return {
    bonusTotal,
    bonusPerPerson: personnelCount > 0 ? bonusTotal / personnelCount : 0,
    boxesExcedentes,
  };
}
```

### Route State Machine

```typescript
type RouteState = 'planificada' | 'en_ruta' | 'finalizada';

const VALID_TRANSITIONS: Record<RouteState, RouteState[]> = {
  planificada: ['en_ruta'],
  en_ruta: ['finalizada'],
  finalizada: [],
};

function canTransition(from: RouteState, to: RouteState): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}
```

### Daily Profitability Calculation

```typescript
interface DailyMetrics {
  ingresos: number;      // SUM(detalle_gd.subtotal)
  costos: number;        // prorated daily costs
  bonos: number;         // tiered bonus total
}

function calculateProfitability(metrics: DailyMetrics) {
  const utilidad = metrics.ingresos - metrics.costos - metrics.bonos;
  const margen = metrics.ingresos > 0 ? (utilidad / metrics.ingresos) * 100 : 0;
  return { utilidad, margen };
}
```

## KPI Definitions

| KPI | Formula | Target |
|-----|---------|--------|
| Cajas/dia | Total cajas entregadas / dias operativos | Configurable |
| Cajas/hora | Cajas entregadas / horas en ruta | Configurable |
| Eficiencia | Cajas entregadas / cajas despachadas * 100 | > 95% |
| Utilidad/ruta | (Ingresos - Costos - Bonos) / ruta | Positive |
| Costo por caja | Total costos / total cajas | Minimize |
| On-time delivery | % entregas dentro de ventana | > 90% |

## Operational Flow

### Start of Day
1. Create route with assigned vehicle and crew
2. Enter dispatch guide (GD) details by box type with quantities
3. System snapshots current box prices

### En Route
1. Register deliveries per client (delivered / partial / rejected)
2. Record delivery timestamps
3. Track route progress

### End of Day
1. Close route (triggers state transition)
2. System auto-calculates:
   - Ingresos: SUM of all GD detail subtotals
   - Costos: prorated daily operational costs
   - Bonos: tiered bonus based on total boxes
   - Utilidad: ingresos - costos - bonos
3. Lock all financial data for audit

## Output Templates

When implementing operations features, provide:
1. Data model and schema definitions
2. Business logic implementation with calculations
3. State machine for workflow transitions
4. KPI computation functions
5. API endpoints for mobile consumption

## Knowledge Reference

Vehicle Routing Problem, Activity-Based Costing, OEE, Supply Chain KPIs, Last-Mile Delivery, Fleet Utilization, Route Profitability Analysis, Tiered Compensation Systems, PWA for Field Operations