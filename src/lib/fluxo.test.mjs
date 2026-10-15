import assert from "node:assert/strict";
import { etapa, clicar, ajustarHorario } from "./fluxo.js";
const novo = () => ({ config: { horasDia: 8 }, registros: {}, extras: [] });
const D = "2026-10-13";
const dia = (est, horas) => horas.forEach((h) => clicar(est, D, h));
const extra = (est) => est.extras.find((e) => e.id === "auto-" + D)?.min ?? 0;

// 1) 08:00 / 12:00 / 13:00 / 17:00 -> 8h00, sem extra
let e = novo(); dia(e, ["08:00", "12:00", "13:00", "17:00"]);
assert.equal(etapa(e.registros[D]).id, "fim"); assert.equal(extra(e), 0);
// 2) finalizando 18:30 -> extra 1h30
e = novo(); dia(e, ["08:00", "12:00", "13:00", "18:30"]); assert.equal(extra(e), 90);
// 3) clique extra após finalizar: ignorado, sem duplicar
assert.equal(clicar(e, D, "19:00"), false); assert.equal(e.extras.length, 1); assert.equal(extra(e), 90);
// 4) editar saída para 17:45 -> 45 min
assert.equal(ajustarHorario(e, D, 1, "saida", "17:45"), true); assert.equal(extra(e), 45);
assert.equal(ajustarHorario(e, D, 1, "saida", "12:30"), false); // inválido é recusado
// 5) recarregar (JSON) mantém etapa e totais
const r = JSON.parse(JSON.stringify(e)); assert.equal(etapa(r.registros[D]).id, "fim"); assert.equal(extra(r), 45);
// etapas intermediárias
e = novo(); assert.equal(etapa(e.registros[D] ?? []).rotulo, "Iniciar jornada");
clicar(e, D, "08:00"); assert.equal(etapa(e.registros[D]).rotulo, "Saída para almoço");
clicar(e, D, "12:03"); assert.equal(etapa(e.registros[D]).info, "Em almoço desde 12:03");
clicar(e, D, "13:00"); assert.equal(etapa(e.registros[D]).rotulo, "Finalizar jornada");
console.log("5 critérios + etapas: OK");
