/** Cálculo de horas extras: tudo em minutos inteiros; arredonda o dinheiro uma única vez, no total. */
import { paraMin, deMin, chaveData } from "./tempo.js";

/** Minutos entre início e fim; se o fim for "menor", o turno virou a meia-noite. */
export const duracao = (ini, fim) => { const d = paraMin(fim) - paraMin(ini); return d > 0 ? d : d + 1440; };

/** Segunda-feira da semana da data (AAAA-MM-DD). */
export function inicioSemana(data) {
  const d = new Date(data + "T00:00");
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return chaveData(d);
}

/** Totais em minutos: dia, semana (seg-dom) e mês da data de referência. */
export function totais(extras, ref) {
  const sem = inicioSemana(ref), mes = ref.slice(0, 7);
  const t = { dia: 0, semana: 0, mes: 0 };
  for (const e of extras) {
    if (e.data === ref) t.dia += e.min;
    if (inicioSemana(e.data) === sem) t.semana += e.min;
    if (e.data.startsWith(mes)) t.mes += e.min;
  }
  return t;
}

/** valor = minutos/60 × valorHora × (1 + adicional%). valorHora em unidade menor; adicional em %. */
export const valorExtras = (min, valorHora, adicional) => Math.round((min * valorHora * (100 + adicional)) / 6000);

/**
 * Auto-lançamento: o que passar da jornada (config.horasDia, padrão 8h) vira hora extra.
 * Só intervalos FECHADOS contam. Se o usuário editar o lançamento (editado=true), o automático não sobrescreve.
 */
export function sincronizar(estado, data) {
  const regs = (estado.registros[data] ?? []).filter((r) => r.saida);
  const total = regs.reduce((t, r) => t + Math.max(0, paraMin(r.saida) - paraMin(r.entrada)), 0);
  const excesso = Math.max(0, total - Math.round(estado.config.horasDia * 60));
  const id = "auto-" + data;
  const atual = estado.extras.find((e) => e.id === id);
  if (atual?.editado) return;
  if (!excesso) { if (atual) estado.extras = estado.extras.filter((e) => e !== atual); return; }
  const fim = regs.at(-1).saida;
  const ini = deMin((((paraMin(fim) - excesso) % 1440) + 1440) % 1440);
  const novo = { id, data, ini, fim, min: excesso, obs: "", auto: true, editado: false };
  if (atual) Object.assign(atual, novo); else estado.extras.push(novo);
}
