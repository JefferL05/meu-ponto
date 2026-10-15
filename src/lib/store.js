import { novoEstado,migrar,validarEstado } from './dados.js';
const BASE='meuponto:v3:';
let conta='local',ouvintes=[];
export let erroCarga='';
function ler(chave){const raw=localStorage.getItem(chave);return raw?migrar(JSON.parse(raw)):null;}
let inicial;
try { inicial=ler(BASE+'local')??ler('meuponto:v2')??novoEstado(); }catch(e){erroCarga='Não foi possível carregar os dados. O conteúdo original foi preservado: '+e.message;inicial=novoEstado();}
export const estado=inicial;
export const emprego=()=>estado.empregos.find(j=>j.id===estado.ativo);
export const aoSalvar=fn=>ouvintes.push(fn);
export const contaAtual=()=>conta;
function substituir(s){Object.keys(estado).forEach(k=>delete estado[k]);Object.assign(estado,s);}
export function salvar(){if(erroCarga)throw new Error(erroCarga);validarEstado(estado);estado.atualizadoEm=new Date().toISOString();localStorage.setItem(BASE+conta,JSON.stringify(estado));ouvintes.forEach(f=>{try{f();}catch(e){dispatchEvent(new CustomEvent('erro-sincronizacao',{detail:e.message}));}});}
export function transacao(fn){const anterior=structuredClone(estado);try{fn();salvar();}catch(e){substituir(anterior);throw e;}}
export function aplicarRemoto(s){validarEstado(s);localStorage.setItem(BASE+conta,JSON.stringify(s));substituir(structuredClone(s));dispatchEvent(new Event('dados-alterados'));}
export function trocarConta(id){const proxima=id??'local';if(conta===proxima)return;const s=ler(BASE+proxima)??novoEstado();conta=proxima;substituir(s);erroCarga='';dispatchEvent(new Event('dados-alterados'));}
export function importarLocal(){const s=ler(BASE+'local')??ler('meuponto:v2');if(!s)throw new Error('Não há dados locais para importar.');transacao(()=>substituir(s));dispatchEvent(new Event('dados-alterados'));}
export function restaurarBackup(s){const validado=migrar(s);const anterior=localStorage.getItem(BASE+conta);if(anterior)localStorage.setItem(BASE+conta+':antes-restaurar',anterior);erroCarga='';transacao(()=>substituir(validado));dispatchEvent(new Event('dados-alterados'));}
export const temDadosSalvos=()=>localStorage.getItem(BASE+conta)!==null;
