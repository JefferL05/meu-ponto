/** Abas acessíveis. Extras e Finanças só baixam/rodam quando abertas (zero JS desnecessário). */
import { $ } from "../lib/dom.js";
import { RECURSOS } from "../lib/recursos.js";
const carregar = {
  ponto: async () => {},
  extras: () => import("./extras.js").then((m) => m.renderExtras()),
  ...(RECURSOS.financas && { financas: () => import("./financas.js").then((m) => m.renderFinancas()) }),
};
async function ir(nome) {
  for (const a in carregar) { $("aba-" + a).setAttribute("aria-selected", a === nome); $("painel-" + a).hidden = a !== nome; }
  await carregar[nome]();
  history.replaceState(null, "", "#" + nome);
}
document.querySelector("[role=tablist]").addEventListener("click", (e) => { const b = e.target.closest("[role=tab]"); if (b) ir(b.dataset.aba); });
ir(location.hash.slice(1) in carregar ? location.hash.slice(1) : "ponto");
