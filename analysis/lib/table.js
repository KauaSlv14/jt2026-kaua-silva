'use strict';

/**
 * Formatação de tabelas para saída no terminal (apenas apresentação; não
 * altera nenhum dado, cálculo ou CSV).
 *
 * Uso:
 *   const { printTable, fmtBRL } = require('./lib/table');
 *
 *   printTable([
 *     { key: 'grupo',  header: 'Grupo',   align: 'left' },
 *     { key: 'n',      header: 'N',       align: 'right' },
 *     { key: 'mediana', header: 'Mediana', align: 'right', fmt: (v) => fmtBRL(v, 2) },
 *   ], rows);
 *
 * - Largura das colunas calculada automaticamente -> nomes longos não encostam
 *   nas colunas seguintes.
 * - Valores textuais alinhados à esquerda, numéricos/monetários à direita.
 * - Custo zero de dependências externas (só código próprio).
 */

function displayWidth(s) {
  let w = 0;
  for (const ch of String(s)) w += ch.codePointAt(0) > 0x2e7f ? 2 : 1;
  return w;
}

function padCell(s, len, align) {
  s = String(s);
  const pad = len - displayWidth(s);
  if (pad <= 0) return s;
  if (align === 'right') return ' '.repeat(pad) + s;
  return s + ' '.repeat(pad);
}

/** Formata número como moeda R$ (pt-BR), ex.: R$ 515,28 / R$ 845.000. */
function fmtBRL(value, decimals) {
  if (value === null || value === undefined || value === '' || isNaN(Number(value))) return '-';
  const dec = decimals === undefined ? 2 : decimals;
  return 'R$ ' + Number(value).toLocaleString('pt-BR', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

/** Formata razão (0..1) como percentual, ex.: 11.9 -> 11,9%. */
function fmtPct(value) {
  if (value === null || value === undefined || value === '' || isNaN(Number(value))) return '-';
  return Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
}

function printTable(cols, rows, opts) {
  const cells = rows.map((r) => cols.map((c) => (c.fmt ? c.fmt(r[c.key]) : String(r[c.key]))));
  const widths = cols.map((c, i) => {
    let w = displayWidth(c.header);
    for (const row of cells) w = Math.max(w, displayWidth(row[i]));
    return w;
  });

  if (opts && opts.title) console.log(String(opts.title));
  console.log(cols.map((c, i) => padCell(c.header, widths[i], 'left')).join('  '));
  console.log(cols.map((c, i) => '-'.repeat(widths[i])).join('  '));
  for (const row of cells) {
    console.log(row.map((v, i) => padCell(v, widths[i], cols[i].align || 'left')).join('  '));
  }
}

module.exports = { printTable, fmtBRL, fmtPct };
