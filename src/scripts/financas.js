/** Aba Finanças (BRL/PYG): carregada sob demanda. */
import { estado, salvar } from "../lib/store.js";
import { chaveData } from "../lib/tempo.js";
import { fmtMoeda, lerValor, converter } from "../lib/moeda.js";
import { $, esc } from "../lib/dom.js";

const cfg = estado.config;

export function renderFinancas() {
  const ex = cfg.moedaExibicao, mes = chaveData().slice(0, 7);
  const lan = estado.lancamentos.filter((l) => l.data.startsWith(mes));
  const soma = { receita: 0, despesa: 0 }, saldo = { BRL: 0, PYG: 0 };
  for (const l of lan) {
    soma[l.tipo] += converter(l.valor, l.moeda, ex, cfg.taxa);
    saldo[l.moeda] += l.tipo === "receita" ? l.valor : -l.valor;
  }
  const liquido = soma.receita - soma.despesa;
  $("fnResumo").innerHTML = `
    <div class="stat"><span class="muted">Receitas</span><strong style="color:var(--success)">${fmtMoeda(soma.receita, ex)}</strong></div>
    <div class="stat"><span class="muted">Despesas</span><strong style="color:var(--danger)">${fmtMoeda(soma.despesa, ex)}</strong></div>
    <div class="stat"><span class="muted">Saldo</span><strong style="color:var(${liquido >= 0 ? "--success" : "--danger"})">${fmtMoeda(liquido, ex)}</strong></div>
    <p class="muted" style="grid-column:1/-1">Por moeda: ${fmtMoeda(saldo.BRL, "BRL")} · ${fmtMoeda(saldo.PYG, "PYG")}</p>`;
  $("fnLista").innerHTML = lan.length ? lan.sort((a, b) => b.data.localeCompare(a.data)).map((l) => `<div class="linha dia">
    <span>${l.data.split("-").reverse().slice(0, 2).join("/")} ${esc(l.desc)}</span>
    <span style="color:var(${l.tipo === "receita" ? "--success" : "--danger"})">${l.tipo === "receita" ? "+" : "−"}${fmtMoeda(l.valor, l.moeda)}</span>
    <button data-del="${l.id}" aria-label="Remover">✕</button></div>`).join("") : `<p class="muted">Sem lançamentos neste mês.</p>`;
}

$("fnData").value = chaveData();
$("fnTaxa").value = cfg.taxa; $("fnExibe").value = cfg.moedaExibicao;
["fnTaxa", "fnExibe"].forEach((id) => $(id).addEventListener("change", () => {
  cfg.taxa = Math.max(0.0001, +String($("fnTaxa").value).replace(",", ".") || cfg.taxa);
  cfg.moedaExibicao = $("fnExibe").value; salvar(); renderFinancas();
}));
$("fnAdd").onclick = () => {
  const moeda = $("fnMoeda").value, valor = lerValor($("fnValor").value, moeda);
  if (!valor) return $("fnValor").focus();
  estado.lancamentos.push({ id: crypto.randomUUID(), data: $("fnData").value, tipo: $("fnTipo").value, moeda, valor, desc: $("fnDesc").value.trim() });
  $("fnValor").value = $("fnDesc").value = ""; salvar(); renderFinancas();
};
$("fnLista").addEventListener("click", (e) => {
  const id = e.target.closest("[data-del]")?.dataset.del; if (!id) return;
  estado.lancamentos = estado.lancamentos.filter((x) => x.id !== id); salvar(); renderFinancas();
});
