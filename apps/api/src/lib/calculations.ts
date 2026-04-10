export function calculateProratedDailyCost(monthlyCost: number, diasHabiles: number): number {
  return monthlyCost / diasHabiles;
}

export function calculateBonus(totalCajas: number, tiers: Array<{desdeCajas: number, hastaCajas: number | null, montoPorCaja: number}>): { bonoTotal: number; cajasExcedentes: number } {
  let bonoTotal = 0;
  let baseCajas = tiers[0]?.desdeCajas ?? 0;

  for (const tier of tiers) {
    if (totalCajas > tier.desdeCajas) {
      const max = tier.hastaCajas ?? totalCajas;
      const cajasEnTramo = Math.min(totalCajas, max) - tier.desdeCajas;
      bonoTotal += cajasEnTramo * tier.montoPorCaja;
    }
  }

  const cajasExcedentes = Math.max(0, totalCajas - baseCajas);
  return { bonoTotal, cajasExcedentes };
}

export function calculateBonusPerPerson(bonoTotal: number, config: { incluirConductor: boolean; incluirPeoneta1: boolean; incluirPeoneta2: boolean }, ruta: { conductorId: string | null; peoneta1Id: string | null; peoneta2Id: string | null }): number {
  let personas = 0;
  if (config.incluirConductor && ruta.conductorId) personas++;
  if (config.incluirPeoneta1 && ruta.peoneta1Id) personas++;
  if (config.incluirPeoneta2 && ruta.peoneta2Id) personas++;
  return personas > 0 ? bonoTotal / personas : 0;
}