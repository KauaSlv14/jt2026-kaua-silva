'use strict';

/**
 * Cruza o price_consolidated.csv (snapshot 2025-01-20) com os dados de
 * localização (Mesh_Ids) e características (Details) para caracterizar
 * bairros e perfis de imóvel.
 *
 * Métricas por grupo: n (imóveis), média, mediana, P25, P75 do avg_daily_price.
 *
 * Considerações:
 *  - Não assumimos que number_of_bedrooms=0 significa "studio": os anúncios
 *    com 0 quartos são heterogêneos (casas, suítes, hostels e registros sem
 *    quarto declarado). Por isso usamos a label neutra "0 quartos".
 *  - Relatamos quantos dos 514 imóveis consolidados são encontrados em cada
 *    fonte e a perda de join.
 */

const path = require('path');
const { readCSV, writeCSV, escCSV } = require('./lib/csv');

const DATA_DIR = path.join(__dirname, '..', 'data');
const OUT_DIR = path.join(__dirname, 'output');

function percentile(sorted, p) {
  if (sorted.length === 0) return null;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function summarize(items, valueFn) {
  const vals = items.map(valueFn).filter((v) => v !== null && !isNaN(v)).sort((a, b) => a - b);
  const n = items.length;
  const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  return {
    n,
    mean: mean === null ? null : +mean.toFixed(2),
    median: vals.length ? +percentile(vals, 50).toFixed(2) : null,
    p25: vals.length ? +percentile(vals, 25).toFixed(2) : null,
    p75: vals.length ? +percentile(vals, 75).toFixed(2) : null,
  };
}

function main() {
  const consolidated = readCSV(path.join(OUT_DIR, 'price_consolidated.csv'));
  const mesh = readCSV(path.join(DATA_DIR, 'Mesh_Ids_Data_Itapema.csv'));
  const details = readCSV(path.join(DATA_DIR, 'Details_Itapema.csv'));

  console.log('Consolidado (preços):', consolidated.length, 'imóveis');
  console.log('Mesh (localização):', mesh.length, '| Details (características):', details.length);

  // ---- Join ----
  const meshById = new Map(mesh.map((r) => [r.airbnb_listing_id, r]));
  const detailsById = new Map(details.map((r) => [r.airbnb_listing_id, r]));

  const joined = [];
  let inMesh = 0, inDetails = 0, inBoth = 0;
  for (const rec of consolidated) {
    const m = meshById.get(rec.airbnb_listing_id);
    const d = detailsById.get(rec.airbnb_listing_id);
    if (m) inMesh++;
    if (d) inDetails++;
    if (m && d) inBoth++;
    joined.push({
      ...rec,
      suburb: m ? String(m.suburb).trim() : null,
      listing_type: d ? String(d.listing_type).trim() : null,
      n_bedrooms: d ? d.number_of_bedrooms : null,
    });
  }

  console.log(`\n=== EVENTOS DE JOIN (dos ${consolidated.length} consolidados) ===`);
  console.log(`Em Mesh (localização): ${inMesh}`);
  console.log(`Em Details (características): ${inDetails}`);
  console.log(`Em ambos (Mesh+Details): ${inBoth}`);
  console.log(`Perdidos (nem Mesh nem Details): ${consolidated.length - inBoth}`);

  // ---- Função de agregação e dashboard ----
  const groups = {
    suburb: {},
    listing_type: {},
    n_bedrooms: {},
  };
  for (const rec of joined) {
    if (rec.suburb) groups.suburb[rec.suburb] = groups.suburb[rec.suburb] || [];
    if (rec.suburb) groups.suburb[rec.suburb].push(rec);
    if (rec.listing_type) groups.listing_type[rec.listing_type] = groups.listing_type[rec.listing_type] || [];
    if (rec.listing_type) groups.listing_type[rec.listing_type].push(rec);
    if (rec.n_bedrooms !== null && rec.n_bedrooms !== '') {
      const key = rec.n_bedrooms === '0' ? '0 quartos' : rec.n_bedrooms + ' quarto(s)';
      groups.n_bedrooms[key] = groups.n_bedrooms[key] || [];
      groups.n_bedrooms[key].push(rec);
    }
  }

  const outCols = ['grupo', 'dimensao', 'n', 'media', 'mediana', 'p25', 'p75'];
  const rows = [];

  for (const [dim, g] of Object.entries(groups)) {
    for (const [label, items] of Object.entries(g)) {
      const s = summarize(items, (r) => Number(r.avg_daily_price));
      rows.push({ grupo: label, dimensao: dim, n: s.n, media: s.mean, mediana: s.median, p25: s.p25, p75: s.p75 });
    }
  }

  writeCSV(path.join(OUT_DIR, 'perfil_bairro_resumo.csv'), rows);

  // ---- Ordena para leitura ----
  const topBairro = rows.filter((r) => r.dimensao === 'suburb').sort((a, b) => (b.mediana||0) - (a.mediana||0));
  const topPerfil = rows.filter((r) => r.dimensao === 'n_bedrooms').sort((a, b) => (b.mediana||0) - (a.mediana||0));
  const topTipo = rows.filter((r) => r.dimensao === 'listing_type').sort((a, b) => (b.mediana||0) - (a.mediana||0));

  function print(dimTitle, arr) {
    console.log(`\n=== ${dimTitle} (por mediana de diária) ===`);
    console.log(['grupo','n','media','mediana','p25','p75'].map(h=>h.padEnd(22)).join(''));
    for (const r of arr) {
      console.log([r.grupo, r.n, r.media, r.mediana, r.p25, r.p75].map((v)=>String(v).padEnd(22)).join(''));
    }
  }
  print('BAIRROS', topBairro);
  print('Nº DE QUARTOS', topPerfil);
  print('TIPO DE ANÚNCIO', topTipo);

  fsWriteReport({ join: { total: consolidated.length, inMesh, inDetails, inBoth, lost: consolidated.length - inBoth },
    bairros: topBairro, perfis: topPerfil, tipos: topTipo });
}

function fsWriteReport(obj) {
  const fs = require('fs');
  fs.writeFileSync(path.join(OUT_DIR, 'perfil_bairro_report.json'), JSON.stringify(obj, null, 2), 'utf8');
}

main();
