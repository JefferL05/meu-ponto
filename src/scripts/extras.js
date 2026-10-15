/** Aba Horas Extras: carregada sob demanda (code splitting). */
import { estado, salvar } from "../lib/store.js";
import { chaveData, fmtDuracao } from "../lib/tempo.js";
import { duracao, totais, valorExtras, sincronizar } from "../lib/horasExtras.js";
import { fmtMoeda, lerValor, paraCampo, converter } from "../lib/moeda.js";
import { $, esc } from "../lib/dom.js";
import { RECURSOS } from "../lib/recursos.js";

const cfg = estado.config;
const fmtDataBR = (d) => d.split("-").reverse().join("/");

export function renderExtras() {
  const outra = cfg.moedaHora === "BRL" ? "PYG" : "BRL";
  const card = (rotulo, min) => {
    const v = valorExtras(min, cfg.valorHora, cfg.adicional);
    const valor = RECURSOS.valorHoraExtra
      ? `<span class="muted">${fmtMoeda(v, cfg.moedaHora)} · ${fmtMoeda(converter(v, cfg.moedaHora, outra, cfg.taxa), outra)}</span>` : "";
    return `<div class="stat"><span class="muted">${rotulo}</span><strong>${fmtDuracao(min)}</strong>${valor}</div>`;
  };
  const t = totais(estado.extras, chaveData());
  $("exTot").innerHTML = card("Hoje", t.dia) + card("Semana", t.semana) + card("Mês", t.mes);
  const mes = chaveData().slice(0, 7);
  const itens = estado.extras.filter((e) => e.data.startsWith(mes)).sort((a, b) => b.data.localeCompare(a.data) || b.ini.localeCompare(a.ini));
  $("exLista").innerHTML = itens.length ? itens.map((e) => `<div class="dia"><div class="linha"><span>${fmtDataBR(e.data)} <strong>${fmtDuracao(e.min)}</strong>
    <span class="muted">${e.auto ? (e.editado ? "automático · ajustado" : "automático") : ""} ${esc(e.obs)}</span></span>
    <span>${e.auto && e.editado ? `<button data-auto="${e.id}" title="Recalcular automático" aria-label="Recalcular">↺</button>` : ""}<button data-del="${e.id}" aria-label="Remover">✕</button></span></div>
    <div class="linha"><input type="time" value="${e.ini}" data-ini="${e.id}" /><input type="time" value="${e.fim}" data-fim="${e.id}" /></div></div>`).join("") : `<p class="muted">Nenhuma hora extra neste mês.</p>`;
}

function lerConfig() {
  cfg.moedaHora = $("exMoeda").value;
  cfg.valorHora = lerValor($("exVH").value, cfg.moedaHora) ?? 0;
  cfg.adicional = Math.max(0, +$("exAdic").value || 0);
  salvar(); renderExtras();
}

$("exData").value = chaveData();
if (RECURSOS.valorHoraExtra) {
  $("exMoeda").value = cfg.moedaHora;
  $("exVH").value = paraCampo(cfg.valorHora, cfg.moedaHora);
  $("exAdic").value = cfg.adicional;
  ["exVH", "exMoeda", "exAdic"].forEach((id) => $(id).addEventListener("change", lerConfig));
}

$("exAdd").onclick = () => {
  const ini = $("exIni").value, fim = $("exFim").value, data = $("exData").value;
  if (!ini || !fim || !data) return $("exIni").focus();
  estado.extras.push({ id: crypto.randomUUID(), data, ini, fim, min: duracao(ini, fim), obs: $("exObs").value.trim() });
  $("exObs").value = ""; salvar(); renderExtras();
};
$("exLista").addEventListener("click", (e) => {
  const del = e.target.closest("[data-del]")?.dataset.del, auto = e.target.closest("[data-auto]")?.dataset.auto;
  const alvo = estado.extras.find((x) => x.id === (del ?? auto)); if (!alvo) return;
  if (auto) { alvo.editado = false; sincronizar(estado, alvo.data); }            // ↺ volta ao valor automático
  else if (alvo.auto) { Object.assign(alvo, { editado: true, min: 0, fim: alvo.ini }); } // apagar o automático = zerar (não recria)
  else estado.extras = estado.extras.filter((x) => x !== alvo);
  salvar(); renderExtras();
});
// Ajuste manual dos horários (também nos lançamentos automáticos)
$("exLista").addEventListener("change", (e) => {
  const campo = e.target.dataset.ini ? "ini" : e.target.dataset.fim ? "fim" : null; if (!campo) return;
  const alvo = estado.extras.find((x) => x.id === (e.target.dataset.ini ?? e.target.dataset.fim));
  if (!alvo || !e.target.value) return;
  alvo[campo] = e.target.value; alvo.min = duracao(alvo.ini, alvo.fim);
  if (alvo.auto) alvo.editado = true;
  salvar(); renderExtras();
});
