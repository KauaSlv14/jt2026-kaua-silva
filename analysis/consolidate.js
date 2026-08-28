'use strict';

/**
 * Consolidação do Price_AV (preços de diária Airbnb).
 *
 * Estratégia (acordada com o cliente):
 *  - Usar APENAS o snapshot de captura 2025-01-20 (o mais recente e completo),
 *    para não misturar tarifas coletadas em momentos diferentes.
 *  - Medir, por imóvel, o preço médio da diária ao longo das datas de estadia
 *    cobertas pelo snapshot (janela de ~3 meses).
 *  - Validar a cobertura mínima de cada imóvel dentro do próprio processo:
 *    só entram imóveis com um número mínimo de datas de estadia na janela.
 *
 * Saídas:
 *  - analysis/output/price_consolidated.csv  : um registro por imóvel com a métrica principal
 *    e a receita anual estimada por cenário de ocupação (40/50/60%).
 *  - analysis/output/consolidation_report.json: reporte de cobertura e validade do processo.
 */

const path = require('path');
const { readCSV, writeCSV } = require('./lib/csv');

const DATA_DIR = path.join(__dirname, '..', 'data');
const OUT_DIR = path.join(__dirname, 'output');

const SNAPSHOT_DATE = '2025-01-20'; // aquisition_date (dia) a usar
const MIN_COVERAGE_RATIO = 0.5; // fração mínima da janela de referência
const OCCUPANCY_SCENARIOS = [0.4, 0.5, 0.6]; // cenários explícitos de ocupação
const DAYS_PER_YEAR = 365;

function main() {
  const priceFile = path.join(DATA_DIR, 'Price_AV_Itapema.csv');
  const rows = readCSV(priceFile);

  // 1) Filtrar snapshot 2025-01-20
  const snapshot = rows.filter((r) => r.aquisition_date.slice(0, 10) === SNAPSHOT_DATE);
  // 2) Determinar a janela de referencia do snapshot (sem duplicar em lógica)
  const stayDates = new Set(snapshot.map((r) => r.date));
  const windowDates = stayDates.size;
  console.log(`Snapshot ${SNAPSHOT_DATE}: ${snapshot.length} linhas, ${windowDates} datas de estadia distintas.`);

  // 3) Agrupar por imóvel: coletar preços por data de estadia
  const byListing = new Map();
  for (const r of snapshot) {
    const price = Number(r.price);
    if (isNaN(price) || price <= 0) continue; // ignora preços inválidos
    if (!byListing.has(r.airbnb_listing_id)) {
      byListing.set(r.airbnb_listing_id, { dates: new Set(), prices: [] });
    }
    const rec = byListing.get(r.airbnb_listing_id);
    rec.dates.add(r.date);
    rec.prices.push(price);
  }

  // 4) Cobertura mínima
  const minDatesRequired = Math.ceil(windowDates * MIN_COVERAGE_RATIO);
  console.log(`Cobertura mínima exigida: >= ${minDatesRequired} das ${windowDates} datas (${MIN_COVERAGE_RATIO * 100}%).`);

  const coverageHistogram = {};
  let covered = 0;
  let notCovered = 0;

  const records = [];
  for (const [id, rec] of byListing) {
    const coverageRatio = rec.dates.size / windowDates;
    const coverageBucket = Math.floor(coverageRatio * 10) * 10; // 0%,10%,...,100%
    coverageHistogram[coverageBucket] = (coverageHistogram[coverageBucket] || 0) + 1;

    if (rec.dates.size < minDatesRequired) {
      notCovered++;
      continue;
    }

    // métrica principal: preço médio da diária (ademais, ambas médias aritmética e por-data)
    const avgPrice = rec.prices.reduce((a, b) => a + b, 0) / rec.prices.length;
    covered++;

    // receita anual estimada por cenário de ocupação (sensibilidade)
    const recOut = {
      airbnb_listing_id: id,
      n_stay_dates: rec.dates.size,
      coverage_ratio: coverageRatio.toFixed(4),
      avg_daily_price: avgPrice.toFixed(2),
    };
    for (const occ of OCCUPANCY_SCENARIOS) {
      const annualRevenue = avgPrice * DAYS_PER_YEAR * occ;
      recOut[`annual_revenue_occ_${Math.round(occ * 100)}`] = annualRevenue.toFixed(2);
    }
    records.push(recOut);
  }

  // 5) Saídas
  writeCSV(path.join(OUT_DIR, 'price_consolidated.csv'), records);

  const report = {
    input_file: 'Price_AV_Itapema.csv',
    snapshot_date: SNAPSHOT_DATE,
    total_price_rows: rows.length,
    snapshot_rows: snapshot.length,
    snapshot_unique_listings: byListing.size,
    window_unique_stay_dates: windowDates,
    min_coverage_ratio: MIN_COVERAGE_RATIO,
    min_dates_required: minDatesRequired,
    listings_meeting_coverage: covered,
    listings_below_coverage: notCovered,
    coverage_histogram_by_10pct: coverageHistogram,
    occupancy_scenarios: OCCUPANCY_SCENARIOS,
    metric_note: 'avg_daily_price = média aritmética das diárias por data de estadia coberta pelo snapshot.',
  };
  const fs = require('fs');
  fs.writeFileSync(path.join(OUT_DIR, 'consolidation_report.json'), JSON.stringify(report, null, 2), 'utf8');

  console.log('\n=== REPORTE ===');
  console.log(JSON.stringify(report, null, 2));
  console.log('\nConsolidado gerado:', records.length, 'imóveis ->', path.join(OUT_DIR, 'price_consolidated.csv'));
}

main();
