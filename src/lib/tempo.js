/** Funções puras de data/hora e cálculo de jornada. Sem DOM, sem estado. */
export const paraMin = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
export const deMin = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
export const fmtDuracao = (min) => { const s = Math.max(0, Math.round(min)); return `${Math.floor(s / 60)}h${String(s % 60).padStart(2, "0")}`; };
export const chaveData = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const horaAgora = () => new Date().toTimeString().slice(0, 5);

/** Minutos trabalhados no dia: intervalos fechados + o aberto até agora. */
export function minutosDoDia(regs, agora = horaAgora()) {
  return regs.reduce((t, r) => t + Math.max(0, paraMin(r.saida ?? agora) - paraMin(r.entrada)), 0);
}

/** Dias de trabalho previstos no mês (mes: 0-11). */
export function diasUteisDoMes(ano, mes, diasTrabalho) {
  const total = new Date(ano, mes + 1, 0).getDate();
  let n = 0;
  for (let d = 1; d <= total; d++) if (diasTrabalho.includes(new Date(ano, mes, d).getDay())) n++;
  return n;
}

/** Saída prevista = 1ª entrada + jornada + almoço. */
export const saidaPrevista = (regs, cfg) =>
  regs.length ? deMin(paraMin(regs[0].entrada) + Math.round((cfg.horasDia + cfg.almocoH) * 60)) : null;
