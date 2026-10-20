/* Ch v20 — interface apenas. Mantém funções financeiras e armazenamento originais. */
(()=>{
'use strict';
const el=id=>document.getElementById(id);
const mk=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
const mny=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(n)||0);
const tabs={dashboard:'Início',chat:'Chat',entries:'Lançamentos',reports:'Relatórios',fixed:'Gastos fixos',goals:'Metas',cards:'Cartões e parcelas',settings:'Dados e segurança'};
let moreButton,moreSheet,moreBackdrop,closeMore=()=>{},updateLock=false;

function addDashboard(){
 const root=el('dashboard')?.querySelector('.layout');if(!root||el('v20Hero'))return;
 root.classList.add('v20-dashboard');
 const head=root.querySelector('.pagehead');
 const hero=mk('section','v20-hero');hero.id='v20Hero';
 hero.innerHTML=`<div class="v20-hero-copy"><div class="v20-kicker"><span class="v20-kicker-dot"></span>VISÃO GERAL</div><p class="v20-hero-label">Saldo registrado em conta</p><h1 id="v20Balance">R$ 0,00</h1><p class="v20-hero-note">Estimativa com base nos seus lançamentos, não no saldo do banco.</p><div class="v20-hero-actions"><button type="button" id="v20NewEntry">+ Registrar movimentação</button><button type="button" id="v20OpenChat">Conversar com o Ch ↗</button></div></div><div class="v20-hero-figure" aria-hidden="true"><div class="v20-figure-ring"><span>Ch</span></div><div class="v20-figure-line"></div><div class="v20-figure-petal"></div></div>`;
 const stats=mk('div','v20-stats');stats.id='v20Stats';
 const config=[['↗','Entradas','v20Income','Valores registrados'],['↘','Saídas da conta','v20Out','Inclui faturas pagas'],['💳','Crédito','v20Credit','Compras e parcelas previstas'],['◷','Cobranças fixas','v20Fixed','Previstas neste mês']];
 for(const [icon,label,id,hint] of config){const card=mk('article','v20-stat');card.innerHTML=`<span class="v20-stat-icon" aria-hidden="true">${icon}</span><span class="v20-stat-label">${label}</span><strong id="${id}">R$ 0,00</strong><span class="v20-stat-hint">${hint}</span>`;stats.append(card)}
 const section=mk('section','v20-week-block');section.id='v20Weekly';
 section.innerHTML=`<div class="v20-section-head"><div><span class="v20-overline">ACOMPANHAMENTO</span><h3>Seus gastos nesta semana</h3><p id="v20WeekDates" class="v20-small-muted"></p></div><button id="v20GoReports" type="button" class="v20-text-btn">Ver relatórios ↗</button></div><div class="v20-week-content"><div class="v20-week-number"><span>Total gasto</span><strong id="v20WeekTotal">R$ 0,00</strong><small id="v20WeekComparison">Sem comparação</small><div class="v20-week-divider"></div><div class="v20-week-pay"><span>💳 Crédito <b id="v20WeekCredit">R$ 0,00</b></span><span>💰 Pix/Débito <b id="v20WeekCash">R$ 0,00</b></span></div></div><div class="v20-daychart" id="v20WeekChart" role="img" aria-label="Gráfico dos gastos por dia nesta semana"></div></div>`;
 const originalCards=root.querySelector('.cards');if(originalCards)originalCards.classList.add('v20-original-kpis');
 const oldCredit=originalCards?.nextElementSibling;if(oldCredit&&oldCredit.classList.contains('panel'))oldCredit.classList.add('v20-original-extra');
 head.insertAdjacentElement('afterend',hero);hero.insertAdjacentElement('afterend',stats);
 const charts=root.querySelector('.charts');charts?.insertAdjacentElement('beforebegin',section);
 const recent=el('dashRecent');if(recent?.parentElement)recent.parentElement.classList.add('v20-recent-panel');
 el('v20NewEntry').addEventListener('click',()=>{show('entries');el('newEntry')?.click()});
 el('v20OpenChat').addEventListener('click',()=>show('chat'));
 el('v20GoReports').addEventListener('click',()=>show('reports'));
}
function fixedForMonth(ym){
 let sum=0;
 for(const f of state.fixed||[]){
  const start=typeof f.startDate==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(f.startDate)?f.startDate:null;
  const active= f.recurring===false ? (start?.slice(0,7)===ym) : (!start||start.slice(0,7)<=ym);
  if(active)sum+=Number(f.amount)||0;
 }
 return sum;
}
function dashboardUpdate(){
 if(updateLock||!el('v20Hero'))return;
 updateLock=true;
 try{
  const ym=el('dashMonth')?.value||month();
  const sum=totals(ym); // Existing calculation — untouched.
  el('v20Balance').textContent=mny(balance(ym));
  el('v20Income').textContent=mny(sum.income);
  el('v20Out').textContent=mny(chCashOut(ym));
  el('v20Credit').textContent=mny(chCardSpent(ym));
  el('v20Fixed').textContent=mny(fixedForMonth(ym));
  const week=chWeeklyData(0),prev=chWeeklyData(-1);
  el('v20WeekTotal').textContent=mny(week.total);
  el('v20WeekCredit').textContent=mny(week.credit);
  el('v20WeekCash').textContent=mny(week.paid);
  el('v20WeekDates').textContent=`${week.period.from.slice(8,10)}/${week.period.from.slice(5,7)} a ${week.period.to.slice(8,10)}/${week.period.to.slice(5,7)}`;
  let comparison='';
  if(prev.total>0){let p=Math.round(Math.abs((week.total-prev.total)/prev.total*100));comparison=week.total===prev.total?'Igual à semana anterior':`${p}% ${week.total>prev.total?'a mais':'a menos'} que a semana anterior`}
  else comparison='Sem gastos registrados na semana anterior';
  el('v20WeekComparison').textContent=comparison;
  const chart=el('v20WeekChart');chart.replaceChildren();
  const maximum=Math.max(1,...week.days.map(d=>d.amount));
  week.days.forEach(day=>{
    const item=mk('div','v20-day');
    const barBox=mk('div','v20-day-area');const bar=mk('div','v20-day-bar');
    const pct=(day.amount/maximum*100);bar.style.height=(day.amount?Math.max(8,pct):3)+'%';
    bar.title=`${day.name}: ${mny(day.amount)}`;barBox.append(bar);
    item.append(mk('span','v20-day-value',day.amount?new Intl.NumberFormat('pt-BR',{notation:'compact',maximumFractionDigits:1}).format(day.amount):'—'),barBox,mk('span','v20-day-name',day.name));chart.append(item);
  });
  const existingRecent=el('dashRecent');
  if(existingRecent){
    const own=state.transactions.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,5);
    existingRecent.replaceChildren();
    if(!own.length){const no=mk('div','v20-empty');no.textContent='Nenhum lançamento ainda. Registre uma movimentação pelo chat para começar.';existingRecent.append(no)}
    else for(const t of own){const line=mk('div','v20-recent-line');
      const icon=mk('span','v20-recent-icon',t.type==='income'?'↗':chIsCredit(t)?'💳':'💰');
      const desc=mk('div','v20-recent-desc');desc.append(mk('strong','',t.description),mk('small','',`${String(t.date).split('-').reverse().join('/')} · ${t.type==='income'?'Entrada':chIsCredit(t)?'Crédito':t.paymentMethod==='pix'?'Pix':'Débito/Conta'}`));
      const value=mk('strong',`v20-recent-value ${t.type==='income'?'is-income':'is-expense'}`,`${t.type==='income'?'+':'−'} ${mny(t.amount)}`);
      line.append(icon,desc,value);existingRecent.append(line);
    }
  }
  const report=el('v20ReportInsight');
  if(report){const reportYm=el('reportMonth')?.value||month(),[y,m]=reportYm.split('-').map(Number);const prevD=new Date(y,m-2,1),previousYm=`${prevD.getFullYear()}-${String(prevD.getMonth()+1).padStart(2,'0')}`;const a=totals(reportYm).expense,b=totals(previousYm).expense;
   report.textContent=b>0?`As despesas registradas neste mês estão ${a>b?Math.round((a-b)/b*100)+'% acima':a<b?Math.round((b-a)/b*100)+'% abaixo':'iguais às'} do mês anterior.`:'Ainda não há despesas no mês anterior para comparação.';
  }
 }catch(e){console.warn('Ch v20: erro ao renderizar elementos visuais',e)}finally{updateLock=false}
}
function prepareReports(){const p=el('reports')?.querySelector('.layout');if(!p||el('v20ReportIntro'))return;
 const intro=mk('div','v20-reports-intro');intro.id='v20ReportIntro';intro.innerHTML='<span class="v20-overline">ANÁLISE FINANCEIRA</span><p id="v20ReportInsight">Comparando seus lançamentos com o período anterior.</p>';
 p.querySelector('.pagehead')?.insertAdjacentElement('afterend',intro);
 for(const area of ['pieChart','reportPie','barChart','reportBars']){el(area)?.parentElement?.classList.add('v20-chart-panel')}
}
function initMobileNavigation(){
 const nav=el('mobileTabs');if(!nav||el('v20MoreButton'))return;
 nav.classList.add('v20-tabbar');
 const keep=['dashboard','chat','entries','reports'];
 const homeButton=nav.querySelector('[data-tab="dashboard"]');if(homeButton)nav.prepend(homeButton);
 const labels={dashboard:['⌂','Início'],chat:['◌','Chat'],entries:['▤','Lançamentos'],reports:['▥','Relatórios']};
 for(const button of nav.querySelectorAll('[data-tab]')){
  const id=button.dataset.tab;
  if(!keep.includes(id)){button.classList.add('v20-tab-hidden');continue}
  button.classList.add('v20-main-tab');button.replaceChildren();
  button.append(mk('b','v20-tab-icon',labels[id][0]),mk('span','',labels[id][1]));
 }
 moreButton=mk('button','v20-main-tab v20-more-tab');moreButton.type='button';moreButton.id='v20MoreButton';moreButton.setAttribute('aria-label','Mais opções');moreButton.setAttribute('aria-expanded','false');moreButton.append(mk('b','v20-tab-icon','☰'),mk('span','','Mais'));nav.append(moreButton);
 moreBackdrop=mk('div','v20-more-backdrop');moreBackdrop.id='v20MoreBackdrop';moreBackdrop.hidden=true;
 moreSheet=mk('aside','v20-more-sheet');moreSheet.id='v20MoreSheet';moreSheet.setAttribute('role','dialog');moreSheet.setAttribute('aria-label','Outras áreas do Ch');moreSheet.setAttribute('aria-modal','true');moreSheet.hidden=true;
 const title=mk('div','v20-more-head');title.append(mk('h3','','Mais opções'));
 const close=mk('button','v20-close','✕');close.type='button';close.setAttribute('aria-label','Fechar menu');title.append(close);moreSheet.append(title);
 for(const [id,symbol] of [['fixed','↻'],['goals','◎'],['cards','▣'],['settings','⚙']]){
  const btn=mk('button','v20-more-link');btn.type='button';btn.dataset.go=id;btn.append(mk('span','v20-more-link-icon',symbol),mk('span','',tabs[id]),mk('span','v20-more-arrow','›'));btn.addEventListener('click',()=>{closeMore();show(id)});moreSheet.append(btn);
 }
 document.body.append(moreBackdrop,moreSheet);
 function openMore(){moreBackdrop.hidden=false;moreSheet.hidden=false;moreButton.setAttribute('aria-expanded','true');document.body.classList.add('v20-more-open');close.focus()}
 closeMore=()=>{moreBackdrop.hidden=true;moreSheet.hidden=true;moreButton.setAttribute('aria-expanded','false');document.body.classList.remove('v20-more-open')};
 moreButton.addEventListener('click',()=>moreSheet.hidden?openMore():closeMore());close.addEventListener('click',closeMore);moreBackdrop.addEventListener('click',closeMore);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!moreSheet.hidden){closeMore();moreButton.focus()}});
}
function markNavigation(id){
 if(!moreButton)return;
 const inMore=['fixed','goals','cards','settings'].includes(id);
 moreButton.classList.toggle('active',inMore);
 document.querySelectorAll('#mobileTabs [data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===id));
 if(!moreSheet?.hidden)closeMore();
}
function decorateBotMessage(){
 const list=el('messages');if(!list)return;
 for(const bubble of list.querySelectorAll('.bubble.bot:not([data-v20-rendered])')){
  bubble.dataset.v20Rendered='1';const textNode=[...bubble.childNodes].find(n=>n.nodeType===3);
  if(!textNode)continue;
  const content=textNode.nodeValue||'';
  if(!/(?:🧾|📊|📅 Relatório semanal|↘ Maiores despesas|💳 Compras no crédito|Total: R\$|Despesas por categoria|Gastos em )/i.test(content))continue;
  const lines=content.split('\n');
  const card=mk('div','v20-chat-summary');
  for(const [i,raw] of lines.entries()){
   if(!raw.trim())continue;
   const clean=raw.trim();const n=mk('div',i===0?'v20-chat-title':/^\d+\.|^•/.test(clean)?'v20-chat-item':/^(Total:|💸 Total|↗ Entradas|↘|💳 |💰 |🏦 )/.test(clean)?'v20-chat-total':/^(📂|📅|🧾|Categorias|Por categoria|Gasto por dia)/.test(clean)?'v20-chat-section':'v20-chat-line',clean);
   card.append(n);
  }
  textNode.nodeValue='';const time=bubble.querySelector('time');if(time)bubble.insertBefore(card,time);else bubble.append(card);bubble.classList.add('v20-structured-bubble');
 }
}
function init(){
 if(typeof state==='undefined'||typeof show!=='function'||typeof draw!=='function'){console.warn('Ch v20: aplicação principal indisponível');return}
 addDashboard();prepareReports();initMobileNavigation();
 const desktop=el('desktopTabs');const first=desktop?.querySelector('[data-tab="dashboard"]');if(first){desktop.prepend(first);first.textContent='⌂  Início';}
 const originalShow=show;show=function(id){originalShow(id);if(id==='chat'){el('viewName').textContent='Converse com Ch';el('viewCaption').textContent='Registre, consulte e acompanhe';}markNavigation(id);dashboardUpdate()};
 const originalDraw=draw;draw=function(...args){originalDraw(...args);dashboardUpdate();decorateBotMessage()};
 const originalMsg=msg;msg=function(...args){const result=originalMsg(...args);decorateBotMessage();return result};
 ['dashMonth','reportMonth'].forEach(id=>el(id)?.addEventListener('change',dashboardUpdate));
 decorateBotMessage();dashboardUpdate();const initial=document.querySelector('.view.active')?.id||'chat';if(initial==='chat'){el('viewName').textContent='Converse com Ch';el('viewCaption').textContent='Registre, consulte e acompanhe';}markNavigation(initial);
 const ob=new MutationObserver(()=>decorateBotMessage());if(el('messages'))ob.observe(el('messages'),{childList:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();