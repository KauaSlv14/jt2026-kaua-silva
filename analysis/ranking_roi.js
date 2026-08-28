'use strict';

/**
 * Ranking refinado de perfis de investimento aplicando um tamanho mínimo de
 * amostra (n_airbnb) para excluir perfis com estimativa de receita instável.
 *
 * Motivação: o perfil "Morretes 3 quartos" tem o maior ROI bruto, mas com
 * apenas 6 imóveis no Airbnb a estimativa de receita não é confiável.
 *
 * Aqui aplicamos um corte de MIN_AIRBNB_SAMPLE (default 15) e mostramos:
 * amostra Airbnb, amostra VivaReal, mediana da diária, preço mediano de compra
 * e ROI bruto nos cenários de ocupação 40/50/60%.
 */

const path = require('path');
const { readCSV, writeCSV } = require('./lib/csv');

const DATA_DIR = path.join(__dirname, '..', 'data');
const OUT_DIR = path.join(__dirname, 'output');

const OCC = [0.4, 0.5, 0.6];
const DAYS = 365;
const MIN_AIRBNB_SAMPLE = 15;

// O mínimo de amostra Airbnb pode ser passado via argv: node ranking_roi.js 20
const MIN_AIRBNB_SAMPLE_ACTIVE = process.argv[2] ? Number(process.argv[2]) : MIN_AIRBNB_SAMPLE;

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
const seen = new Set();
viva = viva.filter((r) => { if (seen.has(r.listing_id)) return false; seen.add(r.listing_id); return true; });

// ---- Airbnb receita por perfil ----
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

const profiles = [
  { suburbCanon: 'Centro', bedrooms: '1', label: 'Centro 1 quarto (compacto)' },
  { suburbCanon: 'Centro', bedrooms: '2', label: 'Centro 2 quartos' },
  { suburbCanon: 'Centro', bedrooms: '3', label: 'Centro 3 quartos' },
  { suburbCanon: 'Meia Praia', bedrooms: '1', label: 'Meia Praia 1 quarto (compacto)' },
  { suburbCanon: 'Meia Praia', bedrooms: '2', label: 'Meia Praia 2 quartos' },
  { suburbCanon: 'Meia Praia', bedrooms: '3', label: 'Meia Praia 3 quartos' },
  { suburbCanon: 'Morretes', bedrooms: '1', label: 'Morretes 1 quarto (compacto)' },
  { suburbCanon: 'Morretes', bedrooms: '2', label: 'Morretes 2 quartos' },
  { suburbCanon: 'Morretes', bedrooms: '3', label: 'Morretes 3 quartos' },
];

const rows = [];
for (const prof of profiles) {
  const sale = viva
    .filter((r) => subMap.get(norm(r.suburb)) === prof.suburbCanon && String(r.bedrooms) === prof.bedrooms)
    .map((r) => Number(r.sale_price)).sort((a, b) => a - b);
  const air = airbnbRows.filter(
    (r) => norm(r.suburb) === norm(prof.suburbCanon) && String(r.n_bedrooms) === prof.bedrooms
  ).map((r) => r.avg_daily_price).sort((a, b) => a - b);

  const salePriceMedian = percentile(sale, 50);
  const dailyMedian = percentile(air, 50);
  const passesSample = air.length >= MIN_AIRBNB_SAMPLE_ACTIVE;

  const row = {
    perfil: prof.label,
    bairro: prof.suburbCanon,
    quartos: prof.bedrooms,
    passa_amostra_minima: passesSample ? 'sim' : 'nao',
    n_airbnb: air.length,
    n_vivareal: sale.length,
    diaria_mediana: dailyMedian === null ? '' : dailyMedian.toFixed(2),
    preco_mediana: salePriceMedian === null ? '' : Math.round(salePriceMedian),
  };
  for (const occ of OCC) {
    const rev = dailyMedian === null ? null : dailyMedian * DAYS * occ;
    row[`receita_anual_occ${Math.round(occ * 100)}`] = rev === null ? '' : Math.round(rev);
    const roi = rev !== null && salePriceMedian ? rev / salePriceMedian : null;
    row[`roi_bruto_occ${Math.round(occ * 100)}`] = roi === null ? '' : (roi * 100).toFixed(1);
  }
  rows.push(row);
}

writeCSV(path.join(OUT_DIR, 'ranking_roi.csv'), rows);

// ---- Print ----
console.log(`Corte de amostra mínima Airbnb: >= ${MIN_AIRBNB_SAMPLE_ACTIVE} imóveis`);
console.log(
  ['perfil', 'passa', 'nAir', 'nViva', 'diaria_med', 'preco_med', 'ROI40%', 'ROI50%', 'ROI60%']
    .map((h) => h.padEnd(24)).join('')
);
const sorted = rows
  .slice()
  .filter((r) => r.passa_amostra_minima === 'sim')
  .sort((a, b) => (Number(b.roi_bruto_occ50) || 0) - (Number(a.roi_bruto_occ50) || 0));
for (const r of sorted) {
  console.log([
    r.perfil, r.passa_amostra_minima, r.n_airbnb, r.n_vivareal, r.diaria_mediana, r.preco_mediana,
    r.roi_bruto_occ40, r.roi_bruto_occ50, r.roi_bruto_occ60,
  ].map((v) => String(v).padEnd(24)).join(''));
}

// Opções que passaram no corte e ficaram fora (referência)
const out = rows.filter((r) => r.passa_amostra_minima === 'nao');
if (out.length) {
  console.log('\n--- Opções EXCLUÍDAS por amostra mínima (referência) ---');
  for (const r of out) {
    console.log(`${r.perfil}: nAir=${r.n_airbnb} nViva=${r.n_vivareal} diaria=${r.diaria_mediana} preco=${r.preco_mediana} ROI50=${r.roi_bruto_occ50}`);
  }
}
