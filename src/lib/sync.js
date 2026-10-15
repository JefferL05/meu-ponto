/** Espelho por conta com revisão atômica. Conflitos exigem escolha explícita. */
import { estado,aoSalvar,aplicarRemoto,trocarConta,contaAtual,temDadosSalvos } from './store.js';
import { migrar } from './dados.js';
const URL=import.meta.env.PUBLIC_SUPABASE_URL,KEY=import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
export const syncAtivo=Boolean(URL&&KEY);
let sb,sessao,cb={},timer,ocupado=false,repetir=false;
const metaKey=()=>`meuponto:sync:${contaAtual()}`;
const meta=()=>JSON.parse(localStorage.getItem(metaKey())??'{"revisao":0,"pendente":false}');
const setMeta=m=>localStorage.setItem(metaKey(),JSON.stringify(m));
export async function iniciarSync(callbacks){
  cb=callbacks;const {createClient}=await import('@supabase/supabase-js');sb=createClient(URL,KEY);
  aoSalvar(()=>{if(!sessao)return;setMeta({...meta(),pendente:true});clearTimeout(timer);timer=setTimeout(sincronizar,1500);});
  sb.auth.onAuthStateChange((_ev,s)=>{setTimeout(()=>{try{sessao=s;trocarConta(s?.user.id);cb.conta?.(s?.user.email);if(s)sincronizar();else cb.status('Dados deste aparelho');}catch(e){cb.status(e.message);}},0);});
  addEventListener('online',sincronizar);
}
export async function entrar(email){const {error}=await sb.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+location.pathname}});if(error)throw error;}
export async function sair(){const {error}=await sb.auth.signOut();if(error)throw error;}
export async function sincronizar(){
  if(!sessao||!navigator.onLine)return;
  if(ocupado){repetir=true;return;}
  ocupado=true;const uid=sessao.user.id;
  try{
    const {data,error}=await sb.from('dados').select('conteudo,revisao').eq('user_id',uid).maybeSingle();if(error)throw error;
    if(uid!==contaAtual())return;
    const m=meta(),rev=data?.revisao??0;
    if(data&&rev!==m.revisao&&m.pendente){cb.status('Conflito: há alterações nos dois aparelhos. Exporte um backup antes de escolher.');cb.conflito?.(true);return;}
    if(data&&!m.pendente){aplicarRemoto(migrar(data.conteudo));setMeta({revisao:rev,pendente:false});cb.status('Sincronizado');return;}
    if(!temDadosSalvos()&&!data){cb.status('Conta pronta. Registre um ponto ou importe os dados locais.');return;}
    const snapshot=JSON.stringify(estado);
    const {data:nova,error:erro}=await sb.rpc('salvar_meu_ponto',{esperada:rev,payload:JSON.parse(snapshot)});
    if(erro)throw erro;if(uid!==contaAtual())return;
    if(nova===null){cb.conflito?.(true);cb.status('Conflito de versão. Escolha qual cópia manter.');return;}
    const pendente=JSON.stringify(estado)!==snapshot;setMeta({revisao:nova,pendente});repetir||=pendente;cb.status('Sincronizado');cb.conflito?.(false);
  }catch(e){cb.status('Nuvem indisponível; dados locais preservados. '+e.message);}
  finally{ocupado=false;if(repetir){repetir=false;clearTimeout(timer);timer=setTimeout(sincronizar,1500);}}
}
export async function resolverConflito(origem){
  if(!sessao)throw new Error('Entre na conta primeiro.');
  const uid=sessao.user.id;const {data,error}=await sb.from('dados').select('conteudo,revisao').eq('user_id',uid).single();if(error)throw error;
  if(uid!==contaAtual())return;
  if(origem==='nuvem'){localStorage.setItem('meuponto:backup-conflito:'+uid,JSON.stringify(estado));aplicarRemoto(migrar(data.conteudo));setMeta({revisao:data.revisao,pendente:false});cb.conflito?.(false);cb.status('Cópia da nuvem aplicada; cópia anterior preservada neste navegador.');}
  else {setMeta({revisao:data.revisao,pendente:true});await sincronizar();}
}
