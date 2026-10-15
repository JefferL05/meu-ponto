/** Camada de UI: lê o estado, escreve no DOM. Eventos delegados, sem framework. */
import { estado, salvar, registrosDe, emAberto, baterPonto, removerRegistro, definirObs, desfazerClique, definirHorario } from "../lib/store.js";
import { etapa, diaAbertoAnterior } from "../lib/fluxo.js";
import { sincronizar } from "../lib/horasExtras.js";
import { chaveData, minutosDoDia, fmtDuracao, diasUteisDoMes, saidaPrevista } from "../lib/tempo.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => s.replace(/[&<>"\x27]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "\x27": "&#39;" })[c]);
const hoje = new Date();
let vis = { ano: hoje.getFullYear(), mes: hoje.getMonth() };
const fmtMes = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
const fmtDia = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });

function renderHoje() {
  const regs = registrosDe(chaveData());
  const aberto = emAberto();
  $("hoje").textContent = new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(new Date());
  $("trabalhado").textContent = fmtDuracao(minutosDoDia(regs));
  const tot = minutosDoDia(regs), jor = Math.round(estado.config.horasDia * 60);
  $("divisao").textContent = tot > jor ? `Regular ${fmtDuracao(jor)} · Hora extra ${fmtDuracao(tot - jor)} (lançada em Horas extras)` : `Jornada regular: ${fmtDuracao(jor)}`;
  const prev = saidaPrevista(regs, estado.config);
  const et = etapa(regs);
  $("previsao").textContent = (prev ? `Saída prevista: ${prev} · ` : "") + et.info;
  $("bater").textContent = et.rotulo; $("bater").disabled = !!et.fim;
  $("bater").classList.toggle("saida", aberto);
  $("desfazer").hidden = !regs.length;
  const antigo = diaAbertoAnterior(estado.registros, chaveData());
  $("aviso").hidden = !antigo;
  if (antigo) { $("aviso").dataset.ir = antigo.slice(0, 7); $("aviso").textContent = `Intervalo aberto em ${antigo.split("-").reverse().join("/")}: toque para corrigir a saída`; }
}

function renderMes() {
  const { ano, mes } = vis;
  const { horasDia, diasTrabalho } = estado.config;
  const total = new Date(ano, mes + 1, 0).getDate();
  const metaMin = diasUteisDoMes(ano, mes, diasTrabalho) * horasDia * 60;
  let feitoMin = 0, barras = "";
  for (let d = 1; d <= total; d++) {
    const min = minutosDoDia(registrosDe(chaveData(new Date(ano, mes, d))));
    feitoMin += min;
    const h = Math.min(100, (min / (horasDia * 60 * 1.25)) * 100);
    barras += `<i class="${min >= horasDia * 60 ? "cheio" : ""}" style="height:${h}%" title="Dia ${d}: ${fmtDuracao(min)}"></i>`;
  }
  $("mesTitulo").textContent = fmtMes.format(new Date(ano, mes));
  $("meta").style.width = `${metaMin ? Math.min(100, (feitoMin / metaMin) * 100) : 0}%`;
  $("metaTxt").textContent = `${fmtDuracao(feitoMin)} de ${fmtDuracao(metaMin)} (saldo ${feitoMin >= metaMin ? "+" : "-"}${fmtDuracao(Math.abs(feitoMin - metaMin))})`;
  $("grafico").innerHTML = barras;

  const prefixo = `${ano}-${String(mes + 1).padStart(2, "0")}-`;
  const dias = Object.keys(estado.registros).filter((k) => k.startsWith(prefixo)).sort().reverse();
  $("lista").innerHTML = dias.length ? dias.map((data) => {
    const regs = registrosDe(data);
    return `<div class="dia"><div class="linha"><strong>${fmtDia.format(new Date(data + "T00:00"))}</strong>
      <span>${fmtDuracao(minutosDoDia(regs))}</span></div>` + regs.map((r, i) => `
      <div class="linha muted"><input type="time" value="${r.entrada}" data-ent="${data}|${i}" aria-label="Entrada" /> → <input type="time" value="${r.saida ?? ""}" data-sai="${data}|${i}" aria-label="Saída" />
        <input type="text" value="${esc(r.obs)}" placeholder="observação" data-obs="${data}|${i}" />
        <button data-del="${data}|${i}" aria-label="Remover">✕</button></div>`).join("") + "</div>";
  }).join("") : `<p class="muted">Sem registros neste mês.</p>`;
}

function renderConfig() {
  $("horasDia").value = estado.config.horasDia;
  $("almocoH").value = estado.config.almocoH;
  document.querySelectorAll("[name=dia]").forEach((c) => (c.checked = estado.config.diasTrabalho.includes(+c.value)));
}

const renderTudo = () => { renderHoje(); renderMes(); };

$("bater").onclick = () => { baterPonto(); renderTudo(); };
$("mesAnt").onclick = () => { vis = { ano: vis.mes ? vis.ano : vis.ano - 1, mes: (vis.mes + 11) % 12 }; renderMes(); };
$("mesProx").onclick = () => { vis = { ano: vis.mes < 11 ? vis.ano : vis.ano + 1, mes: (vis.mes + 1) % 12 }; renderMes(); };
$("desfazer").onclick = () => { desfazerClique(); renderTudo(); };
$("aviso").onclick = () => { const [a, m] = $("aviso").dataset.ir.split("-"); vis = { ano: +a, mes: +m - 1 }; renderMes(); };
$("tema").onclick = () => {
  const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = t;
  localStorage.setItem("meuponto:tema", t);
};
$("lista").addEventListener("click", (e) => {
  const alvo = e.target.closest("[data-del]"); if (!alvo) return;
  const [data, i] = alvo.dataset.del.split("|"); removerRegistro(data, +i); renderTudo();
});
$("lista").addEventListener("change", (e) => {
  const { obs, ent, sai } = e.target.dataset;
  if (obs) { const [data, i] = obs.split("|"); return definirObs(data, +i, e.target.value); }
  const ref = ent ?? sai; if (!ref) return;
  const [data, i] = ref.split("|");
  definirHorario(data, +i, ent ? "entrada" : "saida", e.target.value);
  renderTudo(); // atualiza totais/hora extra e reverte o campo se o horário era inválido
});
document.querySelector("details").addEventListener("change", () => {
  estado.config.horasDia = Math.max(1, +$("horasDia").value || 8);
  estado.config.almocoH = Math.max(0, +$("almocoH").value || 0);
  estado.config.diasTrabalho = [...document.querySelectorAll("[name=dia]:checked")].map((c) => +c.value);
  sincronizar(estado, chaveData());
  salvar(); renderTudo();
});

renderConfig(); renderTudo();
setInterval(renderHoje, 30_000); // contador "ao vivo" sem re-renderizar a lista

if ("serviceWorker" in navigator && import.meta.env.PROD)
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
