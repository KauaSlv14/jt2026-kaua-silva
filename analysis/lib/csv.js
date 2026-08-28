'use strict';

/**
 * Parser CSV robusto que respeita aspas, delimitadores e quebras de linha
 * dentro de campos citados (RFC 4180).
 *
 * Ex.: `"a","b\nc","d""e"` -> ["a", "b\nc", "d\"e"]
 *
 * Importante: importar a partir de módulos locais.
 */
function parseCSV(text, { delimiter = ',', header = true } = {}) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === delimiter) {
      row.push(field);
      field = '';
      i++;
      continue;
    }
    if (c === '\n') {
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
      i++;
      continue;
    }
    if (c === '\r') {
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/**
 * Lê um arquivo CSV e retorna array de objetos (por cabeçalho) ou array de
 * arrays (se header=false). Nunca quebra registros por causa de quebras de
 * linha internas.
 */
function readCSV(filePath, options = {}) {
  const fs = require('fs');
  const text = fs.readFileSync(filePath, 'utf8');
  const rows = parseCSV(text, options);
  if (options.header === false) return rows;
  const headers = rows[0].map((h) => h.trim());
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = rows[i][j] !== undefined ? rows[i][j] : '';
    }
    out.push(obj);
  }
  return out;
}

function writeCSV(filePath, records) {
  const fs = require('fs');
  const headers = Object.keys(records[0] || {});
  const lines = [headers.map((h) => escCSV(h)).join(',')];
  for (const rec of records) {
    lines.push(headers.map((h) => escCSV(rec[h])).join(','));
  }
  fs.mkdirSync(require('path').dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, '\uFEFF' + lines.join('\n'), 'utf8');
}

function escCSV(v) {
  const s = v === undefined || v === null ? '' : String(v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

/** Remove aspas duplas simples que envolvem um valor (quando lido cru). */
function cleanField(v) {
  if (v === undefined || v === null) return '';
  return String(v).replace(/^"|"$/g, '');
}

module.exports = { parseCSV, readCSV, writeCSV, escCSV, cleanField };
