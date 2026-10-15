/** Fluxo guiado do dia (4 cliques). O estado é DERIVADO dos registros: nada extra para guardar. */
import { paraMin } from "./tempo.js";
import { sincronizar } from "./horasExtras.js";

/** Etapa atual a partir dos intervalos do dia. */
export function etapa(regs) {
  const u = regs.at(-1);
  if (!u) return { id: "inicio", rotulo: "Iniciar jornada", info: "Nenhum registro hoje" };
  if (u.saida === null)
    return regs.length === 1
      ? { id: "trab1", rotulo: "Saída para almoço", info: `Trabalhando desde ${u.entrada}` }
      : { id: "trab2", rotulo: "Finalizar jornada", info: `Trabalhando desde ${u.entrada}` };
  if (regs.length === 1) return { id: "almoco", rotulo: "Retornar do almoço", info: `Em almoço desde ${u.saida}` };
  return { id: "fim", rotulo: "Jornada finalizada", fim: true, info: `Finalizada às ${u.saida}` };
}

/** Um clique: avança a etapa e recalcula a hora extra. Jornada finalizada ignora cliques (sem duplicar). */
export function clicar(estado, data, hora) {
  const regs = (estado.registros[data] ??= []);
  if (etapa(regs).fim) return false;
  const u = regs.at(-1);
  if (u && u.saida === null) u.saida = hora; else regs.push({ entrada: hora, saida: null, obs: "" });
  sincronizar(estado, data);
  return true;
}

/** Desfaz o último clique: reabre o último intervalo fechado ou remove o aberto. */
export function desfazer(estado, data) {
  const regs = estado.registros[data]; const u = regs?.at(-1); if (!u) return;
  if (u.saida !== null) u.saida = null; else regs.pop();
  if (!regs.length) delete estado.registros[data];
  sincronizar(estado, data);
}

/** Corrige o horário de um intervalo (campo: "entrada" | "saida"). Recusa horários inválidos. */
export function ajustarHorario(estado, data, i, campo, valor) {
  const r = estado.registros[data]?.[i]; if (!r) return false;
  const n = { ...r, [campo]: valor || null };
  if (!n.entrada || (n.saida && paraMin(n.saida) <= paraMin(n.entrada))) return false;
  r[campo] = n[campo]; sincronizar(estado, data); return true;
}

/** Primeiro dia anterior a `hoje` com intervalo ainda aberto (virada de dia), ou null. */
export const diaAbertoAnterior = (registros, hoje) =>
  Object.keys(registros).sort().find((d) => d < hoje && registros[d].at(-1)?.saida === null) ?? null;
