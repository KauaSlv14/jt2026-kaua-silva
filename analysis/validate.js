'use strict';

/**
 * Valida a integridade da consolidação e do parser CSV.
 *
 * Verifica:
 *  1. Que o parser não perdeu linhas (conta vs. referencia conhecida).
 *  2. Que o snapshot 2025-01-20 tem valores esperados.
 *  3. Que o output consolidado respeita a cobertura mínima e não tem
 *     duplicatas por airbnb_listing_id.
 */

const path = require('path');
const { readCSV } = require('./lib/csv');

const DATA_DIR = path.join(__dirname, '..', 'data');
const OUT_DIR = path.join(__dirname, 'output');
const SNAPSHOT_DATE = '2025-01-20';

function main() {
  const checks = [];
  function check(name, ok, detail) {
    checks.push({ name, ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${detail ? ' | ' + detail : ''}`);
  }

  // 1) Parser preserva linhas
  const priceRows = readCSV(path.join(DATA_DIR, 'Price_AV_Itapema.csv'));
  check('parser preserva 118839 registros Price_AV', priceRows.length === 118839, `got ${priceRows.length}`);

  // 2) Snapshot esperado
  const snap = priceRows.filter((r) => r.aquisition_date.slice(0, 10) === SNAPSHOT_DATE);
  check('snapshot 2025-01-20 tem 42023 linhas', snap.length === 42023, `got ${snap.length}`);
  const ids = new Set(snap.map((r) => r.airbnb_listing_id));
  check('snapshot tem 780 listings únicos', ids.size === 780, `got ${ids.size}`);

  // 3) Output consolidado
  const consolidated = readCSV(path.join(OUT_DIR, 'price_consolidated.csv'));
  check('output tem 514 imóveis', consolidated.length === 514, `got ${consolidated.length}`);

  const outIds = consolidated.map((r) => r.airbnb_listing_id);
  check('sem duplicatas de listing no output', new Set(outIds).size === outIds.length, `got ${new Set(outIds).size}/${outIds.length}`);

  // cobertura mínima respeitada
  const minRatio = Math.min(...consolidated.map((r) => Number(r.coverage_ratio)));
  check('todos acima da cobertura mínima (>=0.5)', minRatio >= 0.5, `min coverage ${minRatio}`);

  // relação entre avg price e receita anual (avg*365*occ)
  let revenueConsistent = true;
  for (const r of consolidated) {
    const avg = Number(r.avg_daily_price);
    const r40 = Number(r.annual_revenue_occ_40);
    if (Math.abs(r40 - avg * 365 * 0.4) > 1) { revenueConsistent = false; break; }
  }
  check('receita anual = avg*365*ocupação em todos', revenueConsistent);

  // 4) checagem de valores não-vazios
  const nonEmpty = consolidated.every((r) => r.avg_daily_price !== '' && Number(r.avg_daily_price) > 0);
  check('todos os avg_daily_price > 0', nonEmpty);

  const allPass = checks.every((c) => c.ok);
  console.log(`\n${allPass ? 'VALIDAÇÃO OK' : 'VALIDAÇÃO FALHOU'} (${checks.length} checagens)`);
  process.exit(allPass ? 0 : 1);
}

main();
