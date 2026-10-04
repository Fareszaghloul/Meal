/**
 * RFC 4180 CSV: CRLF rows, fields quoted when they contain a comma, quote, CR/LF or edge whitespace,
 * quotes doubled. Text cells that a spreadsheet would run as a formula (= + - @ tab) get a leading
 * apostrophe; numbers are written as-is. Prefixed with a UTF-8 BOM so Excel reads accents correctly.
 */
export function toCsv(columns: string[], rows: ReadonlyArray<ReadonlyArray<unknown>>): string {
  const lines = [columns, ...rows].map((r) => r.map(cell).join(","));
  return "﻿" + lines.join("\r\n") + "\r\n";
}

function cell(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  let s = v instanceof Date ? v.toISOString() : String(v);
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]|^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
