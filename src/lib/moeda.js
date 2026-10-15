/**
 * Dinheiro sempre em INTEIROS na menor unidade (BRL = centavos, PYG = guaranis).
 * Evita erros de ponto flutuante (0.1 + 0.2). Só arredonda ao converter.
 * Taxa = quantos PYG valem R$ 1 (ex.: 1400).
 */
export const MOEDAS = { BRL: { loc: "pt-BR", dec: 2 }, PYG: { loc: "es-PY", dec: 0 } };

export const fmtMoeda = (minor, m) =>
  new Intl.NumberFormat(MOEDAS[m].loc, { style: "currency", currency: m, minimumFractionDigits: MOEDAS[m].dec, maximumFractionDigits: MOEDAS[m].dec }).format(minor / 10 ** MOEDAS[m].dec);

/** "1.234,56" -> 123456 (BRL) | "1.500.000" -> 1500000 (PYG). Ponto = milhar, vírgula = decimal. */
export function lerValor(txt, m) {
  const v = Number(String(txt).trim().replace(/\./g, "").replace(",", "."));
  return Number.isFinite(v) && v >= 0 ? Math.round(v * 10 ** MOEDAS[m].dec) : null;
}

/** Inteiro -> texto editável ("1234,56"). */
export const paraCampo = (minor, m) => (minor / 10 ** MOEDAS[m].dec).toFixed(MOEDAS[m].dec).replace(".", ",");

/** BRL(centavos) -> PYG: c/100 * taxa | PYG -> BRL(centavos): pyg/taxa * 100 */
export function converter(minor, de, para, taxa) {
  if (de === para) return minor;
  return de === "BRL" ? Math.round((minor * taxa) / 100) : Math.round((minor * 100) / taxa);
}
