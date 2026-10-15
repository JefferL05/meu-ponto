import { estado,emprego,transacao,erroCarga,restaurarBackup,importarLocal,contaAtual } from '../lib/store.js';
import { idNovo,novoEmprego,inserirRegistro,excluirRegistro,restaurarRegistro,validarConfig } from '../lib/dados.js';
import { dataHoje,horaAtual,dataValida,diaNumero,somarDias,minutos,limites,configEm,previsto,resumoDia,periodo,duracaoTexto as dur,horarioTexto,relatorioCSV } from '../lib/jornada.js';
import { $,esc } from '../lib/dom.js';
import { fmtMoeda } from '../lib/moeda.js';
import { syncAtivo,iniciarSync,entrar,sair,sincronizar,resolverConflito } from '../lib/sync.js';

let aba='hoje',registroOriginal=null;
const fData=d=>new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(d+'T12:00:00'));
const sinal=n=>n<0?'negativo':'positivo';
const aviso=t=>{$('mensagem').textContent=t;$('mensagem').hidden=!t;};
const executar=fn=>async e=>{try{await fn(e);}catch(err){aviso(err.message??'Não foi possível concluir.');}};
const cartao=(nome,valor,classe='')=>`<div class="stat"><span class="muted">${esc(nome)}</span><strong class="${classe}">${esc(valor)}</strong></div>`;
function baixar(nome,conteudo,tipo){const url=URL.createObjectURL(new Blob([conteudo],{type:tipo}));const a=document.createElement('a');a.href=url;a.download=nome;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function trocarAba(nome){if(!['hoje','historico','relatorios','ajustes'].includes(nome))nome='hoje';aba=nome;for(const b of document.querySelectorAll('[data-tab]')){if(b.dataset.tab===nome)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}$('painel-hoje').hidden=nome!=='hoje';$('painel-historico').hidden=nome!=='historico';$('painel-relatorios').hidden=nome!=='relatorios';$('painel-ajustes').hidden=nome!=='ajustes';history.replaceState(null,'','#'+nome);render();}
const diaAtivo=()=>Object.keys(emprego().registros).sort().find(d=>d<=dataHoje()&&emprego().registros[d].some(r=>r.saida===null))??dataHoje();
function registrosHTML(data,rs){return rs.length?rs.map(r=>`<div class="registro"><div><strong>${esc(r.entrada)} → ${esc(r.saida??'em andamento')}${r.diaSeguinte?' +1 dia':''}</strong>${r.tag?`<span class="tag">${esc(r.tag)}</span>`:''}<p class="muted">${esc(r.obs??'')}</p></div><div class="acoes"><button data-editar="${esc(r.id)}" data-data="${data}">Editar</button><button data-excluir="${esc(r.id)}" data-data="${data}">Excluir</button></div></div>`).join(''):'<p class="vazio">Sem períodos registrados. Comece sua jornada ou adicione um horário.</p>';}
function renderHoje(){
  const j=emprego(),d=diaAtivo(),s=resumoDia(j,d),rs=j.registros[d]??[],aberto=rs.find(r=>r.saida===null),fim=j.encerrados[d];
  $('data-jornada').textContent=new Intl.DateTimeFormat('pt-BR',{dateStyle:'full'}).format(new Date(d+'T12:00:00'));
  $('tempo-dia').textContent=dur(s.bruto);$('etapa-dia').textContent=aberto?`Trabalhando desde ${aberto.entrada}`:fim?'Jornada finalizada':rs.length?'Em intervalo':'Tudo pronto para começar';
  const carga=previsto(j,d);$('progresso-dia').value=carga?Math.min(100,s.bruto/carga*100):0;
  const faltam=Math.max(0,carga-s.bruto);
  $('previsao-dia').textContent=`Meta ${dur(carga)} · ${carga?`faltam ${dur(faltam)}`:'dia sem carga prevista'}${aberto&&faltam?` · saída estimada ${horarioTexto(minutos(horaAtual())+faltam)}`:''}`;
  $('bater').textContent=aberto?'Iniciar intervalo':fim?'Retomar jornada':rs.length?'Retornar ao trabalho':'Iniciar jornada';
  $('finalizar').hidden=!rs.length||!!fim;$('aviso-dia').textContent=s.avisos.join(' ');
  const inicioBanco=j.inicio<=dataHoje()?j.inicio:dataHoje();const banco=periodo(j,inicioBanco,dataHoje()).total.banco;
  $('resumo-hoje').innerHTML=cartao('Saldo do dia',dur(s.saldo,true),sinal(s.saldo))+cartao('Banco acumulado',dur(banco,true),sinal(banco))+cartao('Horas noturnas',dur(s.noturno))+cartao('Horas extras',dur(s.extra));
  $('registros-hoje').innerHTML=registrosHTML(d,rs);$('destino').value=j.destinos[d]??'banco';
  const dow=new Date(dataHoje()+'T12:00:00Z').getUTCDay(),seg=somarDias(dataHoje(),-((dow+6)%7)),sem=periodo(j,seg,somarDias(seg,6));
  $('grafico-semana').innerHTML=sem.linhas.map((l,i)=>`<div title="${fData(l.data)}: ${dur(l.bruto)}"><i style="height:${Math.min(85,l.bruto/720*85)}px"></i><span>${['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'][i]}</span></div>`).join('');
  $('resumo-semana').textContent=`${dur(sem.total.trabalhado)} trabalhadas · saldo ${dur(sem.total.saldo,true)} até agora`;
}
function renderHistorico(){
  const j=emprego(),mes=$('hist-mes').value,q=$('hist-busca').value.toLocaleLowerCase('pt-BR');if(!/^\d{4}-\d{2}$/.test(mes))return;
  const primeiro=mes+'-01',fim=somarDias(new Date(Date.UTC(+mes.slice(0,4),+mes.slice(5),1)).toISOString().slice(0,10),-1);
  const linhas=periodo(j,primeiro,fim).linhas.filter(l=>l.data>=j.inicio&&(l.data<=dataHoje()||j.especiais[l.data]||j.registros[l.data]?.length)).reverse();
  $('historico').innerHTML=linhas.filter(l=>!q||(j.registros[l.data]??[]).some(r=>`${r.obs} ${r.tag}`.toLocaleLowerCase('pt-BR').includes(q))||(j.especiais[l.data]?.obs??'').toLocaleLowerCase('pt-BR').includes(q)).map(l=>`<details class="historico-dia"><summary><span>${fData(l.data)} ${j.especiais[l.data]?`<span class="tag">${esc(j.especiais[l.data].tipo)}</span>`:''}</span><span>${dur(l.bruto)} · <span class="${sinal(l.saldo)}">${dur(l.saldo,true)}</span></span></summary><p class="muted">${esc(l.avisos.join(' '))} ${esc(j.especiais[l.data]?.obs??'')}</p>${registrosHTML(l.data,j.registros[l.data]??[])}<button data-abrir-registro="${l.data}">+ Período neste dia</button><label class="destino-label">Destino das extras<select data-destino="${l.data}"><option value="banco" ${j.destinos[l.data]!=='pagamento'?'selected':''}>Banco 1:1</option><option value="pagamento" ${j.destinos[l.data]==='pagamento'?'selected':''}>Pagamento</option></select></label></details>`).join('')||'<p class="vazio">Nenhum dia encontrado neste período.</p>';
  $('lixeira').innerHTML=j.lixeira.length?j.lixeira.map(x=>`<div class="registro"><span>${fData(x.data)} · ${esc(x.registro.entrada)} → ${esc(x.registro.saida??'aberto')}</span><button data-restaurar="${esc(x.id)}">Restaurar</button><button data-purgar="${esc(x.id)}">Apagar definitivamente</button></div>`).join(''):'<p class="vazio">Sua lixeira está vazia.</p>';
}
function renderRelatorio(){
  const j=emprego(),inicio=$('rel-inicio').value,fim=$('rel-fim').value;if(!inicio||!fim)return;
  const {linhas,total:t}=periodo(j,inicio,fim);
  $('rel-titulo').textContent=j.nome+' · Resumo do período';$('rel-legenda').textContent=`${fData(inicio)} a ${fData(fim)} · Saldo = trabalhado − previsto, após tolerância. Banco inclui ajustes e destino das extras.`;
  const valores={};for(const l of linhas){const moeda=configEm(j,l.data).moedaHora;valores[moeda]??={extra:0,noite:0};valores[moeda].extra+=l.valorExtra;valores[moeda].noite+=l.valorNoturno;}
  $('rel-totais').innerHTML=cartao('Trabalhado',dur(t.trabalhado))+cartao('Previsto até agora',dur(t.carga))+cartao('Saldo',dur(t.saldo,true),sinal(t.saldo))+cartao('Variação do banco',dur(t.banco,true),sinal(t.banco))+Object.entries(valores).map(([m,v])=>cartao(`Extras a pagar (${m})`,fmtMoeda(v.extra,m))+cartao(`Noturno estimado (${m})`,fmtMoeda(v.noite,m))).join('');
  $('rel-linhas').innerHTML=linhas.map(l=>`<tr><td>${fData(l.data)}${l.aberto?' *':''}</td><td>${dur(l.trabalhado)}</td><td>${dur(l.carga)}</td><td class="${sinal(l.saldo)}">${dur(l.saldo,true)}</td><td>${dur(l.banco,true)}</td></tr>`).join('');
  const tags=Object.create(null);for(const l of linhas)for(const r of j.registros[l.data]??[]){const [a,b]=limites(r);if(b!==null){const tag=r.tag||'Sem marcador';tags[tag]=(tags[tag]??0)+b-a;}}
  $('rel-tags').innerHTML=Object.entries(tags).map(([k,v])=>`<div class="linha"><span>${esc(k)}</span><strong>${dur(v)}</strong></div>`).join('')||'<p class="muted">Sem períodos fechados.</p>';
  $('ajustes-banco').innerHTML=j.ajustes.map(a=>`<div class="registro"><span>${fData(a.data)} · ${dur(a.min,true)} · ${esc(a.obs??'')}</span><button data-remover-ajuste="${esc(a.id)}">Remover</button></div>`).join('');
}
function carregarConfig(data){
  const j=emprego(),c=configEm(j,data),f=$('config-form');f.elements.inicio.value=data;
  for(const [k,v] of Object.entries(c))if(f.elements[k])f.elements[k].value=v;
  f.elements.valorHora.value=c.valorHora/(c.moedaHora==='BRL'?100:1);
  c.horasSemana.forEach((h,i)=>f.elements['dia'+i].value=h);
  $('cfg-periodos').textContent='Vigências salvas: '+j.periodos.map(p=>fData(p.inicio)).join(' · ');
}
function render(){
  $('emprego').innerHTML=estado.empregos.map(j=>`<option value="${esc(j.id)}">${esc(j.nome)}</option>`).join('');$('emprego').value=estado.ativo;
  $('conexao').textContent=navigator.onLine?'Dados salvos neste aparelho':'Offline · dados neste aparelho';
  if(aba==='hoje')renderHoje();if(aba==='historico')renderHistorico();if(aba==='relatorios')renderRelatorio();
}
function abrirRegistro(data=dataHoje(),id){
  const f=$('registro-form');f.reset();const r=id?emprego().registros[data].find(r=>r.id===id):null;registroOriginal=r?{data,id}:null;
  f.elements.data.value=data;f.elements.id.value=r?.id??'';f.elements.entrada.value=r?.entrada??horaAtual();f.elements.saida.value=r?.saida??'';f.elements.diaSeguinte.checked=r?.diaSeguinte??false;f.elements.tag.value=r?.tag??'';f.elements.obs.value=r?.obs??'';
  $('registro-titulo').textContent=r?'Editar período':'Adicionar período';$('registro-erro').textContent='';$('registro-dialog').showModal();
}
function fecharAtual(finalizar=false){
  const j=emprego(),d=diaAtivo(),r=j.registros[d]?.find(r=>r.saida===null);
  if(r){const delta=diaNumero(dataHoje())-diaNumero(d);if(delta>1){abrirRegistro(d,r.id);return;}transacao(()=>{inserirRegistro(j,d,{...r,saida:horaAtual(),diaSeguinte:delta===1});if(finalizar)j.encerrados[d]=true;});}
  else if(finalizar)transacao(()=>j.encerrados[d]=true);
  else transacao(()=>{inserirRegistro(j,d,{id:idNovo(),entrada:horaAtual(),saida:null,diaSeguinte:false,obs:'',tag:''});delete j.encerrados[d];});
  render();
}
document.querySelector('nav').addEventListener('click',executar(e=>{const b=e.target.closest('[data-tab]');if(b)trocarAba(b.dataset.tab);}));
$('bater').onclick=executar(()=>fecharAtual());$('finalizar').onclick=executar(()=>fecharAtual(true));
$('destino').onchange=executar(()=>{transacao(()=>emprego().destinos[diaAtivo()]=$('destino').value);render();});
$('emprego').onchange=executar(()=>{transacao(()=>estado.ativo=$('emprego').value);carregarConfig(dataHoje());render();});
$('tema').onclick=()=>{const t=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=t;localStorage.setItem('meuponto:tema',t);};
$('hist-mes').onchange=executar(renderHistorico);$('hist-busca').oninput=executar(renderHistorico);
document.addEventListener('click',executar(e=>{
  const b=e.target.closest('button');if(!b)return;const d=b.dataset,j=emprego();
  if(d.abrirRegistro!==undefined)abrirRegistro(d.abrirRegistro||dataHoje());
  if(d.editar)abrirRegistro(d.data,d.editar);
  if(d.excluir){transacao(()=>excluirRegistro(j,d.data,d.excluir));render();aviso('Período movido para a lixeira. Você pode restaurá-lo no Histórico.');}
  if(d.restaurar){transacao(()=>restaurarRegistro(j,d.restaurar));render();aviso('Período restaurado.');}
  if(d.purgar&&confirm('Excluir definitivamente este período da lixeira?')){transacao(()=>j.lixeira=j.lixeira.filter(x=>x.id!==d.purgar));render();}
  if(d.removerAjuste){transacao(()=>j.ajustes=j.ajustes.filter(x=>x.id!==d.removerAjuste));render();}
}));
document.addEventListener('change',executar(e=>{if(e.target.dataset.destino){transacao(()=>emprego().destinos[e.target.dataset.destino]=e.target.value);render();}}));
$('cancelar-registro').onclick=()=>$('registro-dialog').close();
$('registro-form').onsubmit=e=>{e.preventDefault();try{const f=e.target.elements,data=f.data.value,j=emprego();if(data<j.inicio)throw new Error('A data é anterior ao início do controle deste emprego.');const r={id:f.id.value||idNovo(),entrada:f.entrada.value,saida:f.saida.value||null,diaSeguinte:f.diaSeguinte.checked,tag:f.tag.value.trim(),obs:f.obs.value.trim()};transacao(()=>{if(registroOriginal&&registroOriginal.data!==data)j.registros[registroOriginal.data]=j.registros[registroOriginal.data].filter(x=>x.id!==r.id);inserirRegistro(j,data,r);});$('registro-dialog').close();render();aviso('Período salvo.');}catch(err){$('registro-erro').textContent=err.message;}};
$('especial-form').onsubmit=executar(e=>{e.preventDefault();const f=e.target.elements,j=emprego(),inicio=f.inicio.value,fim=f.fim.value;if(!dataValida(inicio)||!dataValida(fim)||fim<inicio||diaNumero(fim)-diaNumero(inicio)>366||inicio<j.inicio)throw new Error('Selecione até 367 dias a partir do início do controle.');transacao(()=>{for(let d=inicio;d<=fim;d=somarDias(d,1)){if(f.tipo.value==='remover')delete j.especiais[d];else j.especiais[d]={tipo:f.tipo.value,obs:f.obs.value.trim()};}});render();aviso('Ocorrências atualizadas.');});
$('banco-form').onsubmit=executar(e=>{e.preventDefault();const f=e.target.elements;if(f.data.value<emprego().inicio)throw new Error('Data anterior ao início do controle.');transacao(()=>emprego().ajustes.push({id:idNovo(),data:f.data.value,min:+f.min.value,obs:f.obs.value.trim()}));render();aviso('Ajuste registrado no banco.');});
$('emprego-form').onsubmit=executar(e=>{e.preventDefault();const f=e.target.elements;transacao(()=>{const j=novoEmprego(f.nome.value.trim(),f.inicio.value);j.periodos[0].config.cicloInicio=f.inicio.value;estado.empregos.push(j);estado.ativo=j.id;});carregarConfig(f.inicio.value);render();aviso('Emprego adicionado. Configure sua jornada abaixo.');});
$('cfg-consulta').onchange=executar(()=>{if(dataValida($('cfg-consulta').value))carregarConfig($('cfg-consulta').value);});
$('ciclo-modelo').onchange=()=>{if(!$('ciclo-modelo').value)return;const [trab,folga,horas]=$('ciclo-modelo').value.split(','),f=$('config-form').elements;f.escala.value='ciclo';f.cicloTrabalho.value=trab;f.cicloFolga.value=folga;f.horasDia.value=horas;};
$('config-form').onsubmit=executar(e=>{
  e.preventDefault();const f=e.target.elements,j=emprego(),inicio=f.inicio.value;if(inicio<j.inicio)throw new Error('A vigência deve começar após o início do controle.');
  const c=structuredClone(configEm(j,inicio));for(const k of ['horasDia','cicloTrabalho','cicloFolga','toleranciaMais','toleranciaMenos','arredondamento','adicional','noturno','descansoMin','intervaloMin'])c[k]=+f[k].value;
  for(const k of ['escala','cicloInicio','sentido','noiteInicio','noiteFim','moedaHora'])c[k]=f[k].value;
  c.valorHora=Math.round(+f.valorHora.value*(c.moedaHora==='BRL'?100:1));c.horasSemana=Array.from({length:7},(_,i)=>+f['dia'+i].value);validarConfig(c);
  if(inicio<dataHoje()&&!confirm('Esta vigência recalculará os dias a partir da data escolhida, até a próxima vigência. Continuar?'))return;
  transacao(()=>{j.periodos=j.periodos.filter(p=>p.inicio!==inicio);j.periodos.push({inicio,config:c});j.periodos.sort((a,b)=>a.inicio.localeCompare(b.inicio));});carregarConfig(inicio);aviso('Configuração salva com vigência em '+fData(inicio)+'.');
});
$('relatorio-form').onsubmit=executar(e=>{e.preventDefault();renderRelatorio();});
$('export-csv').onclick=executar(()=>baixar(`meu-ponto-${$('rel-inicio').value}-${$('rel-fim').value}.csv`,relatorioCSV(emprego(),$('rel-inicio').value,$('rel-fim').value),'text/csv;charset=utf-8'));
$('imprimir').onclick=executar(()=>{renderRelatorio();window.print();});
$('backup').onclick=()=>baixar(`meu-ponto-backup-${dataHoje()}.json`,JSON.stringify(estado,null,2),'application/json');
$('restaurar').onchange=executar(async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>10*1024*1024)throw new Error('O backup deve ter até 10 MB.');const s=JSON.parse(await file.text());if(!confirm('Substituir o perfil atual pelo backup? Uma cópia anterior será guardada neste navegador.'))return;restaurarBackup(s);carregarConfig(dataHoje());render();aviso('Backup restaurado.');}finally{e.target.value='';}});
$('login-form').onsubmit=executar(async e=>{e.preventDefault();await entrar(e.target.elements.email.value);aviso('Link enviado. Abra seu e-mail neste aparelho.');});
$('sync-agora').onclick=executar(sincronizar);$('sync-sair').onclick=executar(sair);
$('sync-importar').onclick=executar(()=>{if(contaAtual()==='local')throw new Error('Entre em uma conta primeiro.');if(confirm('Substituir o conteúdo desta conta pelo perfil local?'))importarLocal();});
$('usar-local').onclick=executar(()=>resolverConflito('local'));$('usar-nuvem').onclick=executar(()=>resolverConflito('nuvem'));

const hoje=dataHoje();$('hist-mes').value=hoje.slice(0,7);$('rel-inicio').value=hoje.slice(0,7)+'-01';$('rel-fim').value=hoje;$('cfg-consulta').value=hoje;
for(const form of ['especial-form','banco-form','emprego-form'])for(const el of $(form).querySelectorAll('input[type=date]'))el.value=hoje;
carregarConfig(hoje);trocarAba(location.hash.slice(1));if(erroCarga)aviso(erroCarga);
addEventListener('dados-alterados',()=>{carregarConfig(dataHoje());render();});addEventListener('online',render);addEventListener('offline',render);
addEventListener('erro-sincronizacao',e=>aviso('Os dados foram salvos, mas a sincronização falhou: '+e.detail));
setInterval(()=>{if(aba==='hoje')try{renderHoje();}catch(e){aviso(e.message);}},30000);
if(syncAtivo){$('sync-controles').hidden=false;iniciarSync({status:t=>$('sync-status').textContent=t,conta:email=>$('sync-conta').textContent=email??'Sem conta conectada',conflito:b=>$('sync-conflito').hidden=!b}).catch(e=>aviso(e.message));}
if('serviceWorker' in navigator&&import.meta.env.PROD)navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).then(()=>navigator.serviceWorker.ready).then(()=>$('versao-offline').textContent='· Cache offline pronto').catch(()=>aviso('Não foi possível preparar o cache offline.'));
