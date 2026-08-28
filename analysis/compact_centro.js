'use strict';

/**
 * Comparação específica: imóveis compactos (1 quarto) no Centro vs outros
 * perfis que aparecem como relevantes.
 *
 * Alinhado à metodologia do ranking final (ranking_roi.js):
 *   - Considera APENAS apartamentos residenciais (listing_type === 'apartamento')
 *     com n_bedrooms >= 1. Não assumimos que number_of_bedrooms=0 é "studio":
 *     no VivaReal, 0 quartos são todos comercial/terreno/outros; no Airbnb são
 *     heterogêneos (casas, suítes, hostels). Logo, o "compacto" = apartamento
 *     de 1 quarto.
 *   - Diária: MEDIANA do avg_daily_price (robusta a outliers).
 *   - Receita anual: derivada da MEDIANA da diária (mediana x 365 x ocupação),
 *     e não da média das receitas individuais — igual ao ranking.
 *
 * Comparação em duas leituras:
 *   1) Por diária (avg_daily_price) - métrica principal.
 *   2) Por receita anual estimada em 3 cenários de ocupação (40/50/60%) -
 *      sensibilidade.
 */

const path = require('path');
const { readCSV, writeCSV } = require('./lib/csv');

const DATA_DIR = path.join(__dirname, '..', 'data');
const OUT_DIR = path.join(__dirname, 'output');

const OCC = [0.4, 0.5, 0.6];
const DAYS = 365;

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function stats(items, field) {
  const vals = items.map((r) => Number(r[field])).filter((v) => !isNaN(v)).sort((a, b) => a - b);
  const n = items.length;
  const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  return { n, mean, median: percentile(vals, 50), p25: percentile(vals, 25), p75: percentile(vals, 75) };
}

function main() {
  const consolidated = readCSV(path.join(OUT_DIR, 'price_consolidated.csv'));
  const mesh = readCSV(path.join(DATA_DIR, 'Mesh_Ids_Data_Itapema.csv'));
  const details = readCSV(path.join(DATA_DIR, 'Details_Itapema.csv'));

  const meshById = new Map(mesh.map((r) => [r.airbnb_listing_id, r]));
  const detailsById = new Map(details.map((r) => [r.airbnb_listing_id, r]));

  // Filtro idêntico ao ranking final: somente apartamentos residenciais (>=1 quarto)
  const joined = consolidated.map((rec) => {
    const m = meshById.get(rec.airbnb_listing_id);
    const d = detailsById.get(rec.airbnb_listing_id);
    return {
      ...rec,
      suburb: m ? String(m.suburb).trim() : null,
      listing_type: d ? String(d.listing_type).trim() : null,
      n_bedrooms: d ? d.number_of_bedrooms : null,
    };
  }).filter((r) => r.suburb
    && r.listing_type === 'apartamento'
    && r.n_bedrooms !== null
    && r.n_bedrooms !== ''
    && Number(r.n_bedrooms) >= 1);

  // ---- Definição dos grupos de comparação ----
  const groups = {
    'CENTRO - 1 quarto (compacto)': (r) => r.suburb === 'Centro' && r.n_bedrooms === '1',
    'CENTRO - 2 quartos': (r) => r.suburb === 'Centro' && r.n_bedrooms === '2',
    'CENTRO - 3 quartos': (r) => r.suburb === 'Centro' && r.n_bedrooms === '3',
    'MEIA PRAIA - 1 quarto (compacto)': (r) => r.suburb === 'Meia Praia' && r.n_bedrooms === '1',
    'MEIA PRAIA - 2 quartos': (r) => r.suburb === 'Meia Praia' && r.n_bedrooms === '2',
    'MEIA PRAIA - 3 quartos': (r) => r.suburb === 'Meia Praia' && r.n_bedrooms === '3',
    'MORRETES - 1 quarto (compacto)': (r) => r.suburb === 'Morretes' && r.n_bedrooms === '1',
    'MORRETES - 2 quartos': (r) => r.suburb === 'Morretes' && r.n_bedrooms === '2',
    'MORRETES - 3 quartos': (r) => r.suburb === 'Morretes' && r.n_bedrooms === '3',
  };

  const rows = [];
  for (const [label, fn] of Object.entries(groups)) {
    const items = joined.filter(fn);
    const daily = stats(items, 'avg_daily_price');
    const medianDaily = daily.median;
    const row = {
      grupo: label,
      n: daily.n,
      media: daily.mean,
      mediana: daily.median,
      p25: daily.p25,
      p75: daily.p75,
    };
    for (const occ of OCC) {
      const rev = medianDaily === null ? null : medianDaily * DAYS * occ;
      row[`receita_anual_occ${Math.round(occ * 100)}`] = rev;
    }
    const f = (v) => (v === null || v === undefined ? '' : +Number(v).toFixed(2));
    rows.push({
      grupo: label, n: row.n, media: f(row.media), mediana: f(row.mediana), p25: f(row.p25), p75: f(row.p75),
      'receita_anual_occ40': f(row.receita_anual_occ40),
      'receita_anual_occ50': f(row.receita_anual_occ50),
      'receita_anual_occ60': f(row.receita_anual_occ60),
    });
  }

  writeCSV(path.join(OUT_DIR, 'comparacao_compactos_centro.csv'), rows);

  const sorted = rows.slice().sort((a, b) => (b.mediana || 0) - (a.mediana || 0));
  console.log(['grupo', 'n', 'media', 'mediana', 'p25', 'p75', 'R50/ano'].map((h) => h.padEnd(34)).join(''));
  for (const r of sorted) {
    console.log([
      r.grupo, r.n, r.media, r.mediana, r.p25, r.p75, r.receita_anual_occ50,
    ].map((v) => String(v).padEnd(34)).join(''));
  }
}

main();
