'use strict';

/**
 * Análise do custo de aquisição (VivaReal) e retorno bruto por perfil de
 * investimento.
 *
 * Pareamento Airbnb x VivaReal por características semelhantes, já que não há
 * chave direta:
 *   - bairro (normalizado)
 *   - número de quartos (n>=1; "0 quartos" no VivaReal = comercial/terreno, NÃO
 *     é apartamento residencial, portanto o perfil compacto = 1 quarto)
 *   - tipo = apartamento
 *
 * Métrica robusta de preço típico: MEDIANA do preço de venda (imune a outliers
 * como anúncios de R$44M). Reporta também p25/p75 e mediana de R$/m².
 *
 * Receita por perfil: MEDIANA do avg_daily_price do Airbnb (robusta) -> receita
 * anual = mediana_avg_daily x 365 x ocupação.
 *
 * ROI bruto anual = receita anual estimada / preço de compra mediano, nos
 * cenários de ocupação 40/50/60%.
 */

const path = require('path');
const { readCSV, writeCSV } = require('./lib/csv');

const DATA_DIR = path.join(__dirname, '..', 'data');
const OUT_DIR = path.join(__dirname, 'output');

const OCC = [0.4, 0.5, 0.6];
const DAYS = 365;

function norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

const subMap = new Map();
const add = (raws, canon) => raws.forEach((r) => subMap.set(norm(r), canon));
add(['Centro', 'CENTRO'], 'Centro');
add(['Meia Praia', 'Meia praia', 'MEIA PRAIA', 'meia praia', 'Meia Praia - Frente Mar'], 'Meia Praia');
add(['Morretes'], 'Morretes');
add(['Castelo Branco'], 'Castelo Branco');
add(['Andorinha'], 'Andorinha');
add(['Tabuleiro dos Oliveiras', 'Tabuleiro', 'Taboleiro'], 'Tabuleiro dos Oliveiras');
add(['Varzea'], 'Varzea');
add(['Canto da Praia'], 'Canto da Praia');
add(['Jardim Praia Mar'], 'Jardim Praiamar');
add(['Casa Branca'], 'Casa Branca');
add(['Alto São Bento'], 'Alto Sao Bento');
add(['Ilhota'], 'Ilhota');
add(['Sertaozinho', 'Sertãozinho'], 'Sertaozinho');
add(['Sertao do Trombudo', 'Sertão do Trombudo', 'Sertão Do Trombudo'], 'Sertao do Trombudo');

// ---- VivaReal: apartamentos residenciais ----
let viva = readCSV(path.join(DATA_DIR, 'VivaReal_Itapema.csv'))
  .filter((r) => r.listing_type === 'apartamento')
  .filter((r) => String(r.bedrooms) !== '0' && Number(r.bedrooms) >= 1)
  .filter((r) => subMap.has(norm(r.suburb)));

// deduplica por listing_id (mantém o primeiro)
const seen = new Set();
viva = viva.filter((r) => { if (seen.has(r.listing_id)) return false; seen.add(r.listing_id); return true; });

// ---- Airbnb receita por perfil (mediana robusta) ----
const consolidated = readCSV(path.join(OUT_DIR, 'price_consolidated.csv'));
const mesh = readCSV(path.join(DATA_DIR, 'Mesh_Ids_Data_Itapema.csv'));
const details = readCSV(path.join(DATA_DIR, 'Details_Itapema.csv'));
const meshById = new Map(mesh.map((r) => [r.airbnb_listing_id, r]));
const detailsById = new Map(details.map((r) => [r.airbnb_listing_id, r]));
const airbnbRows = consolidated
  .map((rec) => {
    const m = meshById.get(rec.airbnb_listing_id);
    const d = detailsById.get(rec.airbnb_listing_id);
    return {
      suburb: m ? norm(String(m.suburb).trim()) : null,
      listing_type: d ? String(d.listing_type).trim() : null,
      n_bedrooms: d ? d.number_of_bedrooms : null,
      avg_daily_price: Number(rec.avg_daily_price),
    };
  })
  .filter((r) => r.suburb && r.listing_type === 'apartamento' && r.n_bedrooms !== null && Number(r.n_bedrooms) >= 1);

// ---- Definição dos perfis de comparação (bairro, quartos) ----
const profiles = [
  { suburb: 'Centro', suburbCanon: 'Centro', bedrooms: '1', label: 'Centro 1 quarto (compacto)' },
  { suburb: 'Centro', suburbCanon: 'Centro', bedrooms: '2', label: 'Centro 2 quartos' },
  { suburb: 'Centro', suburbCanon: 'Centro', bedrooms: '3', label: 'Centro 3 quartos' },
  { suburb: 'Meia Praia', suburbCanon: 'Meia Praia', bedrooms: '1', label: 'Meia Praia 1 quarto (compacto)' },
  { suburb: 'Meia Praia', suburbCanon: 'Meia Praia', bedrooms: '2', label: 'Meia Praia 2 quartos' },
  { suburb: 'Meia Praia', suburbCanon: 'Meia Praia', bedrooms: '3', label: 'Meia Praia 3 quartos' },
  { suburb: 'Morretes', suburbCanon: 'Morretes', bedrooms: '2', label: 'Morretes 2 quartos' },
  { suburb: 'Morretes', suburbCanon: 'Morretes', bedrooms: '3', label: 'Morretes 3 quartos' },
];

const rows = [];
for (const prof of profiles) {
  // Custo (VivaReal)
  const sale = viva
    .filter((r) => subMap.get(norm(r.suburb)) === prof.suburbCanon && String(r.bedrooms) === prof.bedrooms)
    .map((r) => Number(r.sale_price)).sort((a, b) => a - b);
  const area = viva
    .filter((r) => subMap.get(norm(r.suburb)) === prof.suburbCanon && String(r.bedrooms) === prof.bedrooms)
    .map((r) => Number(r.usable_area)).filter((a) => a > 0);
  const salePriceMedian = percentile(sale, 50);
  const salePriceP25 = percentile(sale, 25);
  const salePriceP75 = percentile(sale, 75);

  // R$/m² mediana (quantis de preço / quantis de área por observação individual)
  const psm = viva
    .filter((r) => subMap.get(norm(r.suburb)) === prof.suburbCanon && String(r.bedrooms) === prof.bedrooms)
    .map((r) => { const a = Number(r.usable_area); return a > 0 ? Number(r.sale_price) / a : null; })
    .filter((v) => v !== null).sort((a, b) => a - b);
  const pricePerM2Median = percentile(psm, 50);

  // Receita (Airbnb) - mediana do avg_daily_price
  const air = airbnbRows.filter(
    (r) => norm(r.suburb) === norm(prof.suburb) && String(r.n_bedrooms) === prof.bedrooms
  ).map((r) => r.avg_daily_price).sort((a, b) => a - b);
  const dailyMedian = percentile(air, 50);
  const nAirbnb = air.length;

  const row = {
    perfil: prof.label,
    bairro: prof.suburbCanon,
    quartos: prof.bedrooms,
    n_vivareal: sale.length,
    preco_mediana: salePriceMedian === null ? '' : Math.round(salePriceMedian),
    preco_p25: salePriceP25 === null ? '' : Math.round(salePriceP25),
    preco_p75: salePriceP75 === null ? '' : Math.round(salePriceP75),
    preco_m2_mediana: pricePerM2Median === null ? '' : Math.round(pricePerM2Median),
    n_airbnb: nAirbnb,
    diaria_mediana: dailyMedian === null ? '' : dailyMedian.toFixed(2),
  };
  for (const occ of OCC) {
    const rev = dailyMedian === null ? null : dailyMedian * DAYS * occ;
    row[`receita_anual_occ${Math.round(occ * 100)}`] = rev === null ? '' : Math.round(rev);
    const roi = rev !== null && salePriceMedian ? rev / salePriceMedian : null;
    row[`roi_bruto_occ${Math.round(occ * 100)}`] = roi === null ? '' : (roi * 100).toFixed(1);
  }
  rows.push(row);
}

writeCSV(path.join(OUT_DIR, 'vivareal_roi.csv'), rows);

// ---- Print ordenado pelo ROI (occ50) ----
const sorted = rows.slice().sort((a, b) => (Number(b.roi_bruto_occ50) || 0) - (Number(a.roi_bruto_occ50) || 0));
console.log(['perfil','nViva','preco_med','nAir','diaria_med','R40','ROI40%','ROI50%','ROI60%'].map((h) => h.padEnd(16)).join(''));
for (const r of sorted) {
  console.log([
    r.perfil, r.n_vivareal, r.preco_mediana, r.n_airbnb, r.diaria_mediana,
    r.receita_anual_occ40, r.roi_bruto_occ40, r.roi_bruto_occ50, r.roi_bruto_occ60,
  ].map((v) => String(v).padEnd(16)).join(''));
}
