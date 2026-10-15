/** Motor independente de interface. Minutos civis; virada de dia sempre explícita. */
export const dataHoje = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const horaAtual = () => new Date().toTimeString().slice(0,5);
export function dataValida(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s)) && new Date(s+'T12:00:00Z').toISOString().slice(0,10) === s; }
export const diaNumero = (s) => Date.parse(s+'T00:00:00Z') / 86400000;
export const somarDias = (s,n) => new Date((diaNumero(s)+n)*86400000).toISOString().slice(0,10);
export function minutos(h) { if(typeof h !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(h)) throw new Error('Horário inválido.'); return +h.slice(0,2)*60 + +h.slice(3); }
export const duracaoTexto = (n, sinal = false) => `${n<0?'-':sinal&&n>0?'+':''}${Math.floor(Math.abs(Math.round(n))/60)}h${String(Math.abs(Math.round(n))%60).padStart(2,'0')}`;
export const horarioTexto = (n) => `${String(Math.floor(((n%1440)+1440)%1440/60)).padStart(2,'0')}:${String(((n%1440)+1440)%1440%60).padStart(2,'0')}`;
export const CONFIG = { horasDia:8, diasTrabalho:[1,2,3,4,5], horasSemana:[0,8,8,8,8,8,0], escala:'semanal', cicloInicio:'2026-01-01', cicloTrabalho:1, cicloFolga:1, toleranciaMais:0, toleranciaMenos:0, arredondamento:0, sentido:'proximo', valorHora:0, adicional:50, noturno:20, noiteInicio:'22:00', noiteFim:'05:00', descansoMin:660, intervaloMin:60, moedaHora:'BRL' };
export function configEm(job,data) { return [...job.periodos].sort((a,b)=>a.inicio.localeCompare(b.inicio)).filter(p=>p.inicio<=data).at(-1)?.config ?? job.periodos[0].config; }
export function previsto(job,data) {
  if(data<job.inicio)return 0;
  const c=configEm(job,data), esp=job.especiais[data]?.tipo;
  if(['feriado','folga','ferias','abono'].includes(esp)) return 0;
  const dia=new Date(data+'T12:00:00Z').getUTCDay();
  if(c.escala==='ciclo') { const ciclo=c.cicloTrabalho+c.cicloFolga; return ((diaNumero(data)-diaNumero(c.cicloInicio))%ciclo+ciclo)%ciclo<c.cicloTrabalho ? Math.round(c.horasDia*60):0; }
  return Math.round(c.horasSemana[dia]*60);
}
export function limites(r) { const ini=minutos(r.entrada); return [ini,r.saida===null?null:minutos(r.saida)+(r.diaSeguinte?1440:0)]; }
export function validarRegistros(job,data,regs) {
  if(!dataValida(data)) throw new Error('Data inválida.');
  const todos=[];
  let duracaoTotal=0;
  for(const d of [somarDias(data,-1),data,somarDias(data,1)]) {
    const lista=d===data?regs:(job.registros[d]??[]);
    for(const r of lista) {
      const [ini,fim]=limites(r), base=diaNumero(d)*1440;
      if(fim!==null && (fim<=ini || fim-ini>1440)) throw new Error('O período precisa durar entre 1 minuto e 24 horas. Marque “dia seguinte” para turnos noturnos.');
      if(d===data && fim!==null)duracaoTotal+=fim-ini;
      todos.push({ini:base+ini,fim:fim===null?Infinity:base+fim});
    }
  }
  todos.sort((a,b)=>a.ini-b.ini);
  if(duracaoTotal>1440)throw new Error('A jornada não pode somar mais de 24 horas.');
  for(let i=1;i<todos.length;i++) if(todos[i].ini<todos[i-1].fim) throw new Error('Há sobreposição com outro período ou um registro aberto. Corrija-o primeiro.');
  return true;
}
function noiteEntre(ini,fim,c) {
  const a=minutos(c.noiteInicio), b=minutos(c.noiteFim); let total=0;
  if(a===b)return 0;
  for(let d=-1;d<=1;d++){const x=d*1440+a,y=d*1440+b+(b<a?1440:0);total+=Math.max(0,Math.min(fim,y)-Math.max(ini,x));}return total;
}
export function resumoDia(job,data,agora=new Date()) {
  const c=configEm(job,data), regs=[...(job.registros[data]??[])].sort((a,b)=>a.entrada.localeCompare(b.entrada));
  let bruto=0,noturno=0; const avisos=[]; let ultimoFim=null;
  try{validarRegistros(job,data,regs);}catch(e){avisos.push(e.message);}
  for(const r of regs){
    const [ini,fechado]=limites(r);
    let fim=fechado;
    if(fim===null){const atual=(diaNumero(dataHoje(agora))-diaNumero(data))*1440+agora.getHours()*60+agora.getMinutes();fim=atual>=ini&&atual-ini<=1440?atual:ini;avisos.push(atual-ini>1440?'Registro aberto há mais de 24h: corrija a saída.':'Período em andamento.');}
    if(ultimoFim!==null && ini-ultimoFim<c.intervaloMin) avisos.push('Intervalo menor que o configurado.');
    bruto+=Math.max(0,fim-ini);noturno+=noiteEntre(ini,fim,c);ultimoFim=fim;
  }
  const anterior=(job.registros[somarDias(data,-1)]??[]).filter(r=>r.saida!==null).map(r=>limites(r)[1]).sort((a,b)=>a-b).at(-1);
  if(regs.length && anterior!==undefined && 1440+minutos(regs[0].entrada)-anterior<c.descansoMin) avisos.push('Descanso entre jornadas menor que o configurado.');
  let trabalhado=bruto;
  if(c.arredondamento>0){const f=c.sentido==='baixo'?Math.floor:c.sentido==='cima'?Math.ceil:Math.round;trabalhado=f(bruto/c.arredondamento)*c.arredondamento;}
  const carga=data<dataHoje(agora)||regs.length||job.especiais[data]?previsto(job,data):0;
  let saldo=trabalhado-carga;
  if((saldo>0 && saldo<=c.toleranciaMais)||(saldo<0 && -saldo<=c.toleranciaMenos))saldo=0;
  if(data<dataHoje(agora) && carga>0 && !regs.length && !job.especiais[data])avisos.push('Dia previsto sem registros.');
  const manual=(job.extras??[]).filter(e=>e.data===data && !e.auto).reduce((n,e)=>n+e.min,0);
  const ajusteLegado=(job.extras??[]).find(e=>e.data===data&&e.auto&&e.editado);
  const extra=(ajusteLegado?ajusteLegado.min:Math.max(0,saldo))+manual;
  const pagamento=job.destinos[data]==='pagamento';
  const ajuste=job.ajustes.filter(a=>a.data===data).reduce((n,a)=>n+a.min,0);
  const banco=Math.min(0,saldo)+(pagamento?0:extra)+ajuste;
  const valorExtra=pagamento?Math.round(extra*c.valorHora*(1+c.adicional/100)/60):0;
  const valorNoturno=Math.round(noturno*c.valorHora*c.noturno/6000);
  return {data,bruto,trabalhado,carga,saldo,extra,noturno,banco,ajuste,valorExtra,valorNoturno,avisos:[...new Set(avisos)],aberto:regs.some(r=>r.saida===null)};
}
export function periodo(job,inicio,fim,agora=new Date()) {
  if(!dataValida(inicio)||!dataValida(fim)||fim<inicio||diaNumero(fim)-diaNumero(inicio)>3660)throw new Error('Selecione um período de até 10 anos.');
  const linhas=[];for(let d=inicio;d<=fim;d=somarDias(d,1))linhas.push(resumoDia(job,d,agora));
  const total={trabalhado:0,carga:0,saldo:0,extra:0,noturno:0,banco:0,valorExtra:0,valorNoturno:0};
  for(const l of linhas)for(const k of Object.keys(total))total[k]+=l[k];
  return {linhas,total};
}
export function csvCelula(v){let s=String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
export function relatorioCSV(job,inicio,fim){const {linhas}=periodo(job,inicio,fim);return '\uFEFF'+[['Data','Trabalhado (min)','Previsto (min)','Saldo (min)','Banco (min)','Noturno (min)','Tipo','Observações'],...linhas.map(l=>[l.data,l.trabalhado,l.carga,l.saldo,l.banco,l.noturno,job.especiais[l.data]?.tipo??'',(job.registros[l.data]??[]).map(r=>r.obs??'').join(' | ')])].map(r=>r.map(csvCelula).join(';')).join('\r\n');}
