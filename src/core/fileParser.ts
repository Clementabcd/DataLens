// ============================================================
// DataLens Core — Import Engine
// Parsing 100% côté client (aucune donnée ne quitte le navigateur)
// ============================================================

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { Dataset } from '../types';

export interface ParsedTable {
  headers: string[];
  rows: Record<string, unknown>[];
}

function isNumericCell(v: unknown): boolean {
  if (typeof v === 'number') return Number.isFinite(v);
  if (typeof v === 'string') {
    const trimmed = v.trim().replace(',', '.');
    if (trimmed === '') return false;
    return Number.isFinite(Number(trimmed));
  }
  return false;
}

function toNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  return Number(String(v).trim().replace(',', '.'));
}

export async function parseFile(file: File): Promise<ParsedTable> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'csv' || ext === 'tsv') {
    const text = await file.text();
    const delimiter = ext === 'tsv' ? '\t' : undefined; // Papa auto-détecte sinon
    const result = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      delimiter,
    });
    const headers = result.meta.fields ?? [];
    return { headers, rows: result.data };
  }

  if (ext === 'json') {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const rows: Record<string, unknown>[] = Array.isArray(parsed) ? parsed : [parsed];
    const headerSet = new Set<string>();
    for (const row of rows) Object.keys(row ?? {}).forEach((k) => headerSet.add(k));
    return { headers: Array.from(headerSet), rows };
  }

  if (ext === 'xlsx' || ext === 'xls') {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: null });
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    return { headers, rows };
  }

  throw new Error(`Format de fichier non supporté : .${ext}`);
}

/** Détecte les colonnes majoritairement numériques (>= 60% de cellules valides) */
export function detectNumericColumns(table: ParsedTable): string[] {
  const { headers, rows } = table;
  if (rows.length === 0) return [];
  return headers.filter((h) => {
    let numericCount = 0;
    let nonEmptyCount = 0;
    for (const row of rows) {
      const v = row[h];
      if (v === null || v === undefined || v === '') continue;
      nonEmptyCount++;
      if (isNumericCell(v)) numericCount++;
    }
    return nonEmptyCount > 0 && numericCount / nonEmptyCount >= 0.6;
  });
}

/** Extrait un Dataset exploitable (valeurs numériques valides uniquement) pour une colonne donnée */
export function extractDataset(table: ParsedTable, columnName: string): Dataset {
  const rawCount = table.rows.length;
  const values: number[] = [];
  for (const row of table.rows) {
    const v = row[columnName];
    if (v === null || v === undefined || v === '') continue;
    if (isNumericCell(v)) values.push(toNumber(v));
  }
  return { columnName, values, rawCount };
}
