/* Ch v13 — carteira separada da fatura; chat guiado por forma de pagamento.
   Código local. Não envia informações financeiras a outro serviço além da sincronização Supabase já existente. */
(()=>{
'use strict';
const byId=id=>document.getElementById(id);
const cents=n=>Math.round((Number(n)||0)*100)/100;
const txMethod=t=>{
 if(t.paymentMethod==='invoice')return 'invoice';
 if(t.paymentMethod==='credit'||t.purchaseId)return 'credit';
 if(t.paymentMethod==='pix')return 'pix';
 return t.type==='income'?'income':'debit';
};
const txSpending=t=>t.type==='expense'&&txMethod(t)!=='invoice';
const txCard=t=>t.card||state.purchases.find(p=>p.id===t.purchaseId)?.card||'';
const txCashOut=t=>t.type==='expense'&&txMethod(t)!=='credit';
const cashName=t=>t.type==='income'?'Receita':txMethod(t)==='credit'?'Crédito':txMethod(t)==='invoice'?'Fatura paga':txMethod(t)==='pix'?'Pix':'Débito';
const invoiceTotals=(card,month)=>{
 const spending=state.transactions.filter(t=>txMethod(t)==='credit'&&txCard(t)===card&&t.date.slice(0,7)===month).reduce((a,t)=>a+Number(t.amount),0);
 const paid=state.transactions.filter(t=>txMethod(t)==='invoice'&&t.card===card&&t.invoiceMonth===month).reduce((a,t)=>a+Number(t.amount),0);
 return {spending:cents(spending),paid:cents(paid),due:cents(spending-paid)};
};
// Gasto reconhecido (pix + débito + crédito) é distinto de saída de dinheiro (pix + débito + fatura paga).
totals=function(ym){
 const items=state.transactions.filter(t=>t.date.slice(0,7)===ym);
 return items.reduce((a,t)=>{
  if(t.type==='income')a.income+=Number(t.amount);
  else if(txMethod(t)==='credit'){a.credit+=Number(t.amount);a.expense+=Number(t.amount)}
  else if(txMethod(t)==='invoice'){a.invoicePaid+=Number(t.amount);a.accountOut+=Number(t.amount)}
  else {a.accountOut+=Number(t.amount);a.expense+=Number(t.amount)}
  return a;
 },{income:0,expense:0,credit:0,accountOut:0,invoicePaid:0});
};
balance=function(ym){const s=totals(ym);return cents(s.income-s.accountOut)};

// Somente gastos de compras entram no gráfico por categoria. A fatura é pagamento desses mesmos gastos.
const originalPie=pie;
pie=function(ym){
 const map={};state.transactions.filter(t=>txSpending(t)&&t.date.slice(0,7)===ym).forEach(t=>map[chEffectiveCategory(t)]=(map[chEffectiveCategory(t)]||0)+Number(t.amount));
 const items=Object.entries(map).sort((a,b)=>b[1]-a[1]);
 if(!items.length)return '<p class="muted">Nenhuma despesa no período.</p>';
 const colors=['#ff62aa','#c62b79','#9a62c3','#ff98ca','#d1a1eb','#ed8b83','#6ea8c5','#e1c282'];
 const total=items.reduce((a,x)=>a+x[1],0);let acc=0;
 let svg='<svg class="chart" viewBox="0 0 270 230" style="max-height:230px" aria-label="Gastos por categoria" role="img">';
 items.forEach(([cat,v],i)=>{const f=v/total;svg+=`<circle cx="135" cy="107" r="72" stroke="${colors[i%colors.length]}" stroke-width="29" stroke-dasharray="${(f*452.39).toFixed(3)} 452.39" stroke-dashoffset="${(-acc*452.39).toFixed(3)}" transform="rotate(-90 135 107)" fill="none"><title>${esc(cat)}: ${money(v)}</title></circle>`;acc+=f});
 svg+=`<text x="135" y="104" fill="#c7adc0" text-anchor="middle" font-size="12">Gastos</text><text x="135" y="124" text-anchor="middle" fill="white" font-size="17">${money(total)}</text></svg><div class="legend">`;
 items.forEach(([cat,v],i)=>svg+=`<span><i class="dot" style="background:${colors[i%colors.length]}"></i>${esc(cat)} ${Math.round(v/total*100)}%</span>`);
 return svg+'</div>';
};
const originalDraw=draw;
draw=function(){
 originalDraw();
 const ym=byId('dashMonth').value||month(), s=totals(ym);
 byId('kExpense').textContent=money(s.accountOut);
 byId('kBalance').textContent=money(s.income-s.accountOut);
 byId('kCredit').textContent=money(s.credit);
 byId('miniBalance').textContent=money(balance(month()));
 const rym=byId('reportMonth').value||month(),rs=totals(rym);
 byId('rBalance').textContent=money(rs.income-rs.accountOut);
 byId('rAccountOut').textContent=money(rs.accountOut);
 byId('rCredit').textContent=money(rs.credit);
 const map={};state.transactions.filter(t=>txSpending(t)&&t.date.slice(0,7)===rym).forEach(t=>map[chEffectiveCategory(t)]=(map[chEffectiveCategory(t)]||0)+Number(t.amount));
 byId('reportCategories').innerHTML=Object.entries(map).sort((a,b)=>b[1]-a[1]).map(([cat,v])=>`<div class="row" style="padding:9px 0;border-bottom:1px solid #38283b"><span>${esc(cat)}</span><strong>${money(v)}</strong></div>`).join('')||'<p class="muted">Sem gastos neste mês.</p>';
 const report=byId('methodSummary');if(report)report.textContent=`No mês: ${money(rs.expense)} em compras (${money(rs.credit)} no crédito; ${money(rs.expense-rs.credit)} no débito/Pix). Pagamentos de fatura: ${money(rs.invoicePaid)}. Pagamentos de fatura não duplicam os gastos por categoria.`;
 const summary=byId('cashSummary');if(summary)summary.textContent=`Saldo movimentado em ${ym}: ${money(s.income-s.accountOut)} = ${money(s.income)} recebidos − ${money(s.accountOut)} pagos. É uma estimativa baseada nos registros, não o extrato da conta.`;
 const last=byId('dashRecent');last.innerHTML=state.transactions.slice(-5).reverse().map(t=>`<div class="row" style="padding:9px 0;border-bottom:1px solid #38283b"><span>${esc(t.description)}<br><small class="muted">${esc(t.date)} · ${cashName(t)}</small></span><b>${t.type==='expense'?'−':'+'} ${money(t.amount)}</b></div>`).join('')||'<p class="muted">Nenhum lançamento.</p>';
 drawInvoices();
};
const originalDrawEntries=drawEntries;
drawEntries=function(){
 const em=byId('entryMonth').value||month(),kind=byId('entryType').value,q=norm(byId('entrySearch').value);
 const rows=state.transactions.filter(t=>t.date.slice(0,7)===em&&(kind==='all'||t.type===kind)&&norm(t.description).includes(q)).sort((a,b)=>b.date.localeCompare(a.date));
 byId('entryRows').innerHTML=rows.map(t=>`<tr><td>${esc(t.date)}</td><td>${esc(t.description)}</td><td>${esc(chEffectiveCategory(t))}</td><td>${esc(cashName(t))}${txCard(t)?' · '+esc(txCard(t)):''}</td><td style="color:${t.type==='income'?'#ff84bf':'#f2c2dc'}">${t.type==='income'?'+':'−'} ${money(t.amount)}</td><td><div class="actions"><button class="secondary" data-edit="${esc(t.id)}">Editar</button><button class="danger" data-delete="${esc(t.id)}">Excluir</button></div></td></tr>`).join('')||'<tr><td colspan="6">Nenhum registro encontrado.</td></tr>';
};

// Ajuste direto nos lançamentos: forma de pagamento e cartão.
const origOpenEdit=openEdit;
openEdit=function(id){origOpenEdit(id);const t=state.transactions.find(x=>x.id===id);byId('editMethod').value=t?.type==='income'?'debit':txMethod(t);byId('editCard').value=t?.card||'';toggleEntryPay()};
const toggleEntryPay=()=>{const showCard=byId('editKind').value==='expense'&&byId('editMethod').value==='credit';byId('editMethodLabel').classList.toggle('hidden',byId('editKind').value!=='expense');byId('editCardLabel').classList.toggle('hidden',!showCard)};
byId('editKind').addEventListener('change',toggleEntryPay);byId('editMethod').addEventListener('change',toggleEntryPay);
const editForm=byId('editForm');editForm.onsubmit=e=>{
 e.preventDefault();const id=byId('editId').value,kind=byId('editKind').value,method=kind==='income'?'income':byId('editMethod').value,card=byId('editCard').value.trim();
 if(method==='credit'&&!card)return alert('Informe o cartão de crédito.');
 const t={type:kind,amount:Number(byId('editAmount').value),description:byId('editDescription').value.trim(),category:byId('editCategory').value.trim(),date:byId('editDate').value,paymentMethod:method==='income'?null:method,card:method==='credit'?card:''};
 if(!t.description||!t.category||!t.date||!Number.isFinite(t.amount)||t.amount<=0)return alert('Confira os campos.');
 const old=state.transactions.find(x=>x.id===id);
 if(old?.purchaseId&&method!=='credit')return alert('Esta é uma parcela vinculada a uma compra. Ajuste a compra na aba Parcelas.');
 if(old?.paymentMethod==='invoice')return alert('Pagamentos de fatura são ajustados em Cartões e parcelas. Exclua e registre novamente para não perder a vinculação.');
 if(old)Object.assign(old,t);else state.transactions.push({id:uid(),...t});
 persist();draw();byId('editDialog').close();
};

// Parcelamento desde a criação: digite diretamente 1/10, 4/10 etc.
const originInstallments=chInstallments;
chInstallments=function(total,parts,start,due,name,card,purchaseId){return originInstallments(total,parts,start,due,name,card,purchaseId).map(t=>({...t,paymentMethod:'credit',card}));};
const origOpenPurchase=chOpenPurchase;
chOpenPurchase=function(id){origOpenPurchase(id);const p=state.purchases.find(x=>x.id===id);byId('purchaseRatio').value=`${p?.startPart||1}/${p?.parts||10}`;byId('purchaseCategory').value=p?.category||'Compras parceladas';};
const parseRatio=(value)=>{const m=String(value).trim().match(/^(\d{1,2})\s*\/\s*(\d{1,2})$/);if(!m)return null;const a=Number(m[1]),b=Number(m[2]);return a>=1&&b>=1&&b<=48&&a<=b?{start:a,parts:b}:null};
const syncRatio=()=>{const v=parseRatio(byId('purchaseRatio').value);if(!v)return false;byId('purchaseParts').value=v.parts;byId('purchaseStartPart').value=v.start;byId('purchaseStartPart').dispatchEvent(new Event('input',{bubbles:true}));return true};
byId('purchaseRatio').addEventListener('input',()=>{if(syncRatio())chPurchasePreview();else byId('purchasePreview').textContent='Formato esperado: 1/10, 4/10 ou 1/1 (à vista no crédito).'});
const originalSavePurchase=chSavePurchase;
chSavePurchase=function(e){
 if(!syncRatio()){e.preventDefault();alert('Informe a parcela no formato 1/10.');return}
 // Formulário original só aceita 2–48; permitimos 1/1 como compra no crédito em parcela única.
 const one=parseRatio(byId('purchaseRatio').value)?.parts===1;
 if(one){
  e.preventDefault();const pid=byId('purchaseId').value;const old=state.purchases.find(p=>p.id===pid);const name=byId('purchaseName').value.trim(),card=byId('purchaseCard').value.trim(),val=Number(byId('purchaseTotal').value),date=byId('purchaseDate').value,cat=byId('purchaseCategory').value;
  if(!name||!card||!(val>0)||!date)return alert('Preencha os dados da compra.');
  if(old&&!confirm('Transformar este parcelamento em compra 1/1? As parcelas futuras serão substituídas.'))return;
  const id=old?.id||uid();state.purchases=state.purchases.filter(p=>p.id!==id);state.transactions=state.transactions.filter(t=>t.purchaseId!==id);
  state.purchases.push({id,name,card,total:cents(val),parts:1,startPart:1,first:date,category:cat});
  state.transactions.push({id:uid(),purchaseId:id,purchasePart:1,date,amount:cents(val),type:'expense',description:`${name} (1/1) · ${card}`,category:cat,paymentMethod:'credit',card});
  persist();draw();byId('purchaseDialog').close();return;
 }
 const cat=byId('purchaseCategory').value;
 originalSavePurchase(e);
 // Se cancelou a confirmação, o diálogo permanece aberto.
 if(byId('purchaseDialog').open)return;
 const id=byId('purchaseId').value;
 const p=state.purchases.find(p=>p.id===id)||state.purchases[state.purchases.length-1];if(!p)return;
 p.category=cat;
 for(const t of state.transactions.filter(t=>t.purchaseId===p.id)){t.category=cat;t.paymentMethod='credit';t.card=p.card}
 persist();draw();
};
byId('purchaseForm').onsubmit=chSavePurchase;

function drawInvoices(){
 const el=byId('invoiceRows');if(!el)return;
 const ym=byId('invoiceFilterMonth').value||month();
 const cards=[...new Set([...state.purchases.map(p=>p.card),...state.transactions.filter(t=>t.card).map(t=>t.card)])].filter(Boolean);
 const rows=cards.map(card=>({card,...invoiceTotals(card,ym)})).filter(x=>x.spending||x.paid);
 el.innerHTML=rows.map(x=>`<tr><td>${esc(x.card)}</td><td>${money(x.spending)}</td><td>${money(x.paid)}</td><td>${money(x.due)}</td></tr>`).join('')||'<tr><td colspan="4">Nenhuma compra ou pagamento para este mês.</td></tr>';
}
byId('invoiceFilterMonth').value=month();byId('invoiceFilterMonth').addEventListener('change',drawInvoices);
byId('invoiceNew').onclick=()=>{
 byId('invoiceForm').reset();byId('invoiceMonth').value=byId('invoiceFilterMonth').value||month();byId('invoicePaidAt').value=today();byId('invoiceDialog').showModal();
};
byId('invoiceForm').onsubmit=e=>{
 e.preventDefault();const card=byId('invoiceCard').value.trim(),invoiceMonth=byId('invoiceMonth').value,date=byId('invoicePaidAt').value,amount=Number(byId('invoiceAmount').value);
 if(!card||!/\d{4}-\d{2}/.test(invoiceMonth)||!date||!Number.isFinite(amount)||amount<=0)return alert('Confira os dados do pagamento.');
 const status=invoiceTotals(card,invoiceMonth);
 if(status.due<=0&&!confirm('Não há fatura pendente registrada para esse cartão e mês. Registrar pagamento assim mesmo?'))return;
 if(status.due>0&&amount>status.due+.005&&!confirm('O pagamento informado é maior que as compras ainda pendentes neste cartão/mês. Registrar mesmo assim?'))return;
 if(!confirm(`Registrar pagamento de ${money(amount)} da fatura ${card} (${invoiceMonth})? Isso reduz o saldo da conta, sem duplicar despesas.`))return;
 state.transactions.push({id:uid(),type:'expense',paymentMethod:'invoice',card,invoiceMonth,date,category:'Pagamento de fatura',description:`Pagamento fatura ${card} (${invoiceMonth})`,amount:cents(amount)});
 persist();draw();byId('invoiceDialog').close();
};

const originalChat=chSmartAnswer;
let paymentFlow=null;
const replyIntro=(flow)=>{
 const e=flow.entries[flow.index];return `Entendi ${money(e.amount)} em “${e.description}”.\nComo você pagou?\n\n1. Débito\n2. Pix\n3. Crédito\n\nResponda “débito”, “Pix” ou “crédito”.`;
};
const finishPaymentFlow=()=>{
 const p=paymentFlow;paymentFlow=null;
 for(const item of p.entries){
  if(item.type==='income'){state.transactions.push({id:uid(),...item});continue}
  if(item.paymentMethod==='credit'){
   const id=uid(),parts=item.parts||1,start=item.startPart||1,card=item.card;
   const due=item.due||item.date;
   state.purchases.push({id,name:item.description,card,total:item.amount,parts,startPart:start,first:due,category:item.category});
   state.transactions.push(...chInstallments(item.amount,parts,start,due,item.description,card,id).map(t=>({...t,category:item.category,paymentMethod:'credit',card})));
  }else state.transactions.push({id:uid(),...item,paymentMethod:item.paymentMethod});
 }
 persist();draw();
 return `✅ Registrei ${p.entries.length} movimentação(ões).\n${p.entries.map(x=>`• ${x.description}: ${money(x.amount)} — ${x.type==='income'?'Receita':x.paymentMethod==='credit'?`Crédito (${x.startPart||1}/${x.parts||1}, ${x.card})`:x.paymentMethod==='pix'?'Pix':'Débito'}`).join('\n')}\n\nAs compras no crédito vão para a fatura e não diminuem o saldo da conta até o pagamento.`;
};
function methodFlow(original){
 const s=norm(original.trim()),p=paymentFlow;
 if(chIsNo(s)||/^(cancelar|cancela|parar|esquece)$/.test(s)){paymentFlow=null;return 'Tudo bem, cancelado. Nenhum gasto foi registrado.'}
 const e=p.entries[p.index];
 if(p.step==='amount'){
  const a=chParseAmount(original);if(!a)return 'Qual foi o valor dessa compra? Ex.: “35,50”.';
  e.amount=a.number;
  if(!e.description){p.step='description';return `Foi ${money(e.amount)}. O que você comprou?`}
  p.step='method';return replyIntro(p);
 }
 if(p.step==='description'){
  const d=original.trim();if(d.length<2||d.length>100)return 'Me diga uma descrição curta da compra.';
  e.description=d;e.category=chCat(d);p.step='method';return replyIntro(p);
 }
 if(p.step==='method'){
  const method=/^(1|debito|cartao de debito|no debito)/.test(s)?'debit':/^(2|pix|no pix)/.test(s)?'pix':/^(3|credito|cartao de credito|no credito)/.test(s)?'credit':null;
  if(!method)return 'Foi no débito, no Pix ou no crédito? Responda “débito”, “Pix” ou “crédito”.';
  e.paymentMethod=method;
  if(method==='credit'){p.step='credit';return `💳 Qual cartão e parcelamento?\nEx.: “Nubank 1/10 vence 10/11”\nOu “Nubank 1/1” para compra à vista no crédito.\nO valor de ${money(e.amount)} será considerado o TOTAL da compra.`}
  do{p.index++}while(p.index<p.entries.length&&p.entries[p.index].type!=='expense');if(p.index<p.entries.length){p.step='method';return replyIntro(p)}
  p.step='confirm';return confirmFlow();
 }
 if(p.step==='credit'){
  const fraction=String(original).match(/\b(\d{1,2})\s*\/\s*(\d{1,2})\b/);
  const ratio=fraction?parseRatio(fraction[0]):null;
  const card=original.replace(/\b(?:vence(?:ndo)?|vencimento)\s*(?:dia)?\s*\d{1,2}(?:\/\d{1,2}(?:\/\d{4})?)?/ig,' ').replace(/\b\d{1,2}\s*\/\s*\d{1,2}\b/g,' ').replace(/\b(?:a vista|parcelad[oa]|no credito|em|cartao|cr[eé]dito)\b/ig,' ').replace(/\s+/g,' ').trim();
  if(!card||card.length>60)return 'Informe o nome do cartão e o parcelamento, por exemplo “Nubank 1/10 vence 10/11”.';
  e.card=card;e.startPart=ratio?.start||1;e.parts=ratio?.parts||1;
  // Sem vencimento explícito, o padrão é hoje, ajustável depois na aba Parcelas.
  const dueMatch=norm(original).match(/\b(?:vence(?:ndo)?|vencimento)\s*(?:dia\s*)?(\d{1,2})\/(\d{1,2})(?:\/(20\d\d))?/);
  if(dueMatch){let y=Number(dueMatch[3]||new Date().getFullYear());const m=Number(dueMatch[2]),d=Number(dueMatch[1]);if(m<1||m>12||d<1||d>new Date(y,m,0).getDate())return 'Vencimento inválido. Ex.: “Nubank 1/10 vence 10/11”.';e.due=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`}
  else e.due=e.date;
  do{p.index++}while(p.index<p.entries.length&&p.entries[p.index].type!=='expense');if(p.index<p.entries.length){p.step='method';return replyIntro(p)}
  p.step='confirm';return confirmFlow();
 }
 if(p.step==='confirm'){
  if(!chIsYes(s))return 'Para registrar, responda “sim”; para desistir, “não”.';
  return finishPaymentFlow();
 }
 return 'Pode cancelar e começar de novo.';
}
function confirmFlow(){
 const list=paymentFlow.entries.map(e=>`• ${e.description}: ${money(e.amount)} — ${e.type==='income'?'Receita':e.paymentMethod==='credit'?`Crédito ${e.startPart||1}/${e.parts||1} · ${e.card} · vence ${e.due}`:e.paymentMethod==='pix'?'Pix':'Débito'}`).join('\n');
 return `Confira os lançamentos:\n${list}\n\nNo crédito, o valor informado é o total da compra; as parcelas serão previstas nos meses seguintes e não reduzem o saldo até pagar a fatura.\n\nConfirmar? (sim/não)`;
}
function candidatePayments(raw,s){
 if(/\b(resumo|saldo|balanco|quanto|onde|maior|ultimos|historico|categorias|ajuda|corrig|altera|apaga|exclu|deleta|remover|relatorios|grafico|mostre|paguei? a? fatura)\b/.test(s))return null;
 const parts=chSplitStatements(raw);let inherited=null;const entries=[];
 if(parts.length>8)return null;
 for(const part of parts){
  const kind=chKind(part,inherited);inherited=kind||inherited;
  if(!kind||!chParseAmount(part))return null;
  const info=chParseAmount(part),desc=chDescription(part,info);
  if(!desc)return null;
  entries.push({type:kind,amount:info.number,description:desc,category:kind==='income'?'Receitas':chCat(part),date:chDateIn(part)});
 }
 if(!entries.length||!entries.some(e=>e.type==='expense'))return null;
 return entries;
}
chSmartAnswer=function(raw){
 const s=norm(String(raw).trim());
 if(paymentFlow)return methodFlow(raw);
 if(chPending)return originalChat(raw);
 if(/\b(?:paguei|pagar|pagamento)\b.*\bfatura\b/.test(s)){show('cards');byId('invoiceNew').click();return 'Abri o registro de pagamento de fatura. Informe o cartão, o mês da fatura e quanto saiu da sua conta.'}
 const entries=candidatePayments(raw,s);
 if(entries){paymentFlow={entries,index:entries.findIndex(e=>e.type==='expense'),step:'method'};return replyIntro(paymentFlow)}
 // Se falta valor ou descrição, ainda é obrigatório definir a forma de pagamento.
 const k=chKind(s,null);
 if(k==='expense'&&!/\b(resumo|saldo|historico|ultimo|fixos|parcela|cartao|corrige|altera|apaga|exclui)\b/.test(s)){
  const a=chParseAmount(raw),desc=chDescription(raw,a),entry={type:'expense',amount:a?.number||0,description:desc,category:chCat(desc||raw),date:chDateIn(raw)};
  paymentFlow={entries:[entry],index:0,step:!a?'amount':!desc?'description':'method'};
  return !a?'Quanto custou essa compra?':!desc?`Foi ${money(a.number)}. O que você comprou?`:replyIntro(paymentFlow);
 }
 return originalChat(raw);
};
const previousActionUpdate=chUpdateActionButtons;
chUpdateActionButtons=function(){
 previousActionUpdate();
 const box=byId('chatActions');if(!paymentFlow)return;
 box.replaceChildren();const note=document.createElement('span');note.textContent=paymentFlow.step==='method'?'Como foi pago?':paymentFlow.step==='credit'?'Nome do cartão e parcela (ex.: Nubank 1/10)':'Confirma os registros?';box.append(note);
 const opts=paymentFlow.step==='method'?[['Débito','débito'],['Pix','pix'],['Crédito','crédito'],['Cancelar','cancelar']]:paymentFlow.step==='confirm'?[['Confirmar','sim'],['Cancelar','cancelar']]:[['Cancelar','cancelar']];
 for(const [label,value] of opts){const b=document.createElement('button');b.type='button';b.className=value==='cancelar'?'secondary':'primary';b.textContent=label;b.onclick=()=>submitChat(value);box.append(b)}box.hidden=false;
};
// O submitChat já usa chSmartAnswer dinamicamente. Força botões mesmo após cada resposta.
const previousSubmit=submitChat;
submitChat=function(text){previousSubmit(text);chUpdateActionButtons()};
const originalSummary=chSummaryAnswer;
chSummaryAnswer=function(s){
 const period=chPeriod(s),items=chItemsFor(period);
 if(/\b(quanto gastei|gastei quanto|gastos com|despesas com|quanto foi gasto|quanto eu gastei)\b/.test(s)){
  let spent=items.filter(txSpending);const cat=chCategoryRequest(s);
  if(cat)spent=spent.filter(t=>chEffectiveCategory(t)===cat);
  const vendor=[['Uber',/\buber\b/],['99',/\b99\b/],['Spotify',/\bspotify\b/],['Netflix',/\bnetflix\b/]].find(v=>v[1].test(s));
  if(vendor)spent=items.filter(t=>txSpending(t)&&vendor[1].test(norm(t.description)));
  return `Você registrou ${money(cents(spent.reduce((a,t)=>a+t.amount,0)))} em ${vendor?.[0]||cat||'compras'} no período ${period.name}. Faturas pagas não são contadas novamente.`;
 }
 const income=cents(items.filter(t=>t.type==='income').reduce((a,t)=>a+t.amount,0));
 const debit=cents(items.filter(t=>txSpending(t)&&txMethod(t)!=='credit').reduce((a,t)=>a+t.amount,0));
 const credit=cents(items.filter(t=>txMethod(t)==='credit').reduce((a,t)=>a+t.amount,0));
 const invoice=cents(items.filter(t=>txMethod(t)==='invoice').reduce((a,t)=>a+t.amount,0));
 const map=new Map();for(const t of items.filter(txSpending)){const c=chEffectiveCategory(t);map.set(c,cents((map.get(c)||0)+t.amount))}
 const cats=map.size?[...map].sort((a,b)=>b[1]-a[1]).map(([c,a])=>`• ${c}: ${money(a)}`).join('\n'):'Nenhum gasto registrado.';
 return `📊 Resumo — ${period.name}\n\n↗ Entradas: ${money(income)}\n💳 Compras no crédito: ${money(credit)}\n💸 Compras no débito/Pix: ${money(debit)}\n🧾 Faturas pagas: ${money(invoice)}\n\nGastos por categoria (sem duplicar fatura):\n${cats}\n\n🏦 Saldo movimentado na conta: ${money(income-debit-invoice)}\n(Somente registros deste período; não equivale ao extrato bancário.)`;
};
// Resumo lançado no chat já usa a função de resumo substituída.
try{draw();chUpdateActionButtons()}catch(error){console.error('Falha ao ativar pagamentos',error)}
})();
