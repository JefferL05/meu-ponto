import { CONFIG,dataHoje,dataValida,minutos,validarRegistros } from './jornada.js';
export const idNovo=()=>crypto.randomUUID();
export function novoEmprego(nome='Meu trabalho',inicio=dataHoje()) {return {id:idNovo(),nome,inicio,periodos:[{inicio,config:structuredClone(CONFIG)}],registros:{},especiais:{},destinos:{},encerrados:{},ajustes:[],extras:[],lixeira:[]};}
export function novoEstado(){const j=novoEmprego();return {schemaVersion:3,ativo:j.id,empregos:[j]};}
export function migrar(s){
  if(s?.schemaVersion===3){validarEstado(s);return structuredClone(s);}
  if(!s||typeof s!=='object'||!s.registros||!Array.isArray(s.extras))throw new Error('Backup não reconhecido.');
  const inicio=Object.keys(s.registros).sort()[0]??dataHoje(),j=novoEmprego('Meu trabalho',inicio),c={...CONFIG,...s.config};
  c.horasSemana=Array.from({length:7},(_,d)=>c.diasTrabalho.includes(d)?c.horasDia:0);
  j.periodos=[{inicio,config:c}];j.registros=structuredClone(s.registros);j.extras=structuredClone(s.extras);
  for(const [d,rs] of Object.entries(j.registros)){for(const r of rs){r.id??=idNovo();r.diaSeguinte=false;r.tag??='';}if(rs.length>=2&&rs.at(-1).saida!==null)j.encerrados[d]=true;}
  const n={schemaVersion:3,ativo:j.id,empregos:[j],legado:{config:s.config,lancamentos:s.lancamentos??[],extras:s.extras}};
  validarEstado(n);return n;
}
function exigir(ok,m){if(!ok)throw new Error('Dados inválidos: '+m);}
function numero(n,min,max){return Number.isFinite(n)&&n>=min&&n<=max;}
function texto(s,max=1000){return typeof s==='string'&&s.length<=max;}
export function validarConfig(c){
  exigir(c&&['semanal','ciclo'].includes(c.escala),'escala');
  exigir(Array.isArray(c.horasSemana)&&c.horasSemana.length===7&&c.horasSemana.every(n=>numero(n,0,24)),'horas semanais');
  for(const [k,a,b] of [['horasDia',0,24],['cicloTrabalho',1,365],['cicloFolga',0,365],['toleranciaMais',0,120],['toleranciaMenos',0,120],['arredondamento',0,60],['valorHora',0,100000000],['adicional',0,1000],['noturno',0,1000],['descansoMin',0,2880],['intervaloMin',0,1440]])exigir(numero(c[k],a,b),k);
  exigir(Number.isInteger(c.cicloTrabalho)&&Number.isInteger(c.cicloFolga),'ciclo inteiro');
  exigir(dataValida(c.cicloInicio)&&['baixo','cima','proximo'].includes(c.sentido),'opções de cálculo');
  exigir(['BRL','PYG'].includes(c.moedaHora),'moeda');minutos(c.noiteInicio);minutos(c.noiteFim);
}
export function validarEstado(s){
  const inspecionar=(o,n=0)=>{exigir(n<30,'profundidade do JSON');if(o&&typeof o==='object')for(const [k,v] of Object.entries(o)){exigir(!['__proto__','prototype','constructor'].includes(k),'chave reservada');inspecionar(v,n+1);}};inspecionar(s);
  exigir(s?.schemaVersion===3&&Array.isArray(s.empregos)&&s.empregos.length>0&&s.empregos.length<=50,'empregos');
  exigir(new Set(s.empregos.map(j=>j.id)).size===s.empregos.length&&s.empregos.some(j=>j.id===s.ativo),'identificadores');
  for(const j of s.empregos){
    exigir(texto(j.id,100)&&texto(j.nome,100)&&j.nome.trim()&&dataValida(j.inicio),'emprego');
    exigir(Array.isArray(j.periodos)&&j.periodos.length>0&&new Set(j.periodos.map(p=>p.inicio)).size===j.periodos.length,'vigências');
    for(const p of j.periodos){exigir(dataValida(p.inicio),'vigência');validarConfig(p.config);}
    for(const k of ['registros','especiais','destinos','encerrados'])exigir(j[k]&&typeof j[k]==='object'&&!Array.isArray(j[k]),k);
    const ids=new Set();
    for(const [d,rs] of Object.entries(j.registros)){exigir(dataValida(d)&&Array.isArray(rs)&&rs.length<=100,'registros');for(const r of rs){exigir(texto(r.id,100)&&r.id&&!ids.has(r.id)&&texto(r.obs)&&texto(r.tag,100)&&typeof r.diaSeguinte==='boolean','registro');ids.add(r.id);minutos(r.entrada);if(r.saida!==null)minutos(r.saida);}}
    // Preserva inconsistências de backups antigos para correção na interface.
    for(const [d,e] of Object.entries(j.especiais))exigir(dataValida(d)&&['ferias','feriado','folga','abono','falta'].includes(e.tipo)&&texto(e.obs),'dia especial');
    for(const [d,v] of Object.entries(j.destinos))exigir(dataValida(d)&&['banco','pagamento'].includes(v),'destino');
    exigir(Array.isArray(j.ajustes)&&Array.isArray(j.lixeira)&&Array.isArray(j.extras),'listas');
    for(const a of [...j.ajustes,...j.extras])exigir(dataValida(a.data)&&numero(a.min,-5256000,5256000),'ajuste/extra');
    for(const item of j.lixeira){exigir(texto(item.id,100)&&dataValida(item.data)&&item.registro,'lixeira');const r=item.registro;exigir(texto(r.id,100)&&texto(r.obs)&&texto(r.tag,100)&&typeof r.diaSeguinte==='boolean','registro excluído');minutos(r.entrada);if(r.saida!==null)minutos(r.saida);}
  }return true;
}
export function inserirRegistro(job,data,r){const lista=[...(job.registros[data]??[]).filter(x=>x.id!==r.id),r].sort((a,b)=>a.entrada.localeCompare(b.entrada));validarRegistros(job,data,lista);job.registros[data]=lista;}
export function excluirRegistro(job,data,id){const r=job.registros[data]?.find(x=>x.id===id);if(!r)return;job.lixeira.push({id:idNovo(),data,registro:r,excluidoEm:new Date().toISOString()});job.registros[data]=job.registros[data].filter(x=>x.id!==id);delete job.encerrados[data];}
export function restaurarRegistro(job,id){const item=job.lixeira.find(x=>x.id===id);if(!item)return;inserirRegistro(job,item.data,item.registro);job.lixeira=job.lixeira.filter(x=>x.id!==id);}
