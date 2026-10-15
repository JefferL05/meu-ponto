/** Interface da nuvem (Preferências → Nuvem). Não faz nada se o Supabase não estiver configurado. */
import { syncAtivo, iniciarSync, entrar, sair } from "../lib/sync.js";
import { $ } from "../lib/dom.js";

if (syncAtivo) {
  $("nuvem").hidden = false;
  const status = (t) => ($("syncStatus").textContent = t);
  iniciarSync({ status, aplicado: () => location.reload() }); // dados novos da nuvem: recarrega a tela
  $("syncEmail").addEventListener("change", (e) => e.stopPropagation()); // não confundir com "preferências alteradas"
  $("syncEntrar").onclick = async () => {
    const email = $("syncEmail").value.trim(); if (!email) return $("syncEmail").focus();
    status("Enviando link…");
    const erro = await entrar(email);
    status(erro ? `Erro: ${erro}` : "Link enviado. Abra o e-mail neste aparelho.");
  };
  $("syncSair").onclick = () => sair();
}
