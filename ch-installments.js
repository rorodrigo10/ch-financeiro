/* Ch v12 — Ajuste de parcelamentos. Mantém dados e login existentes. */
(() => {
  'use strict';
  const get = id => document.getElementById(id);
  const old = get('purchaseDialog');
  if (!old || !get('purchaseRows')) return;
  const styles = document.createElement('style');
  styles.textContent = '.ch-parcelas-modal{width:min(560px,95vw);max-height:90dvh;overflow:auto}.ch-parcelas-modal input[type=number]{width:100%}.ch-parcelas-preview{border:1px solid #73415b;border-radius:12px;background:#2c1728;padding:13px;color:#ffe1ee;line-height:1.5;font-size:13px}.ch-keep{display:flex!important;flex-direction:row!important;align-items:flex-start;gap:10px!important;padding:12px;background:#251923;border:1px solid #603952;border-radius:11px}.ch-keep input{width:18px;height:18px;flex:none;accent-color:#e84396}.ch-keep span{font-size:12px;line-height:1.5}.ch-actions{display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap}@media(max-width:760px){.ch-parcelas-modal{max-height:94dvh;width:calc(100vw - 18px);padding:18px}.ch-actions{flex-wrap:nowrap}}';
  document.head.appendChild(styles);
  old.outerHTML = '<dialog id="purchaseDialog" class="ch-parcelas-modal" aria-labelledby="purchaseTitle"><h3 id="purchaseTitle">Nova compra parcelada</h3><p class="muted" id="purchaseHelp">Se já está na 4ª de 10, coloque 4 em Parcela atual.</p><form id="purchaseForm" class="formgrid"><input id="purchaseId" type="hidden"><label class="span2">Descrição<input id="purchaseName" maxlength="100" required placeholder="Ex.: notebook"></label><label>Cartão<input id="purchaseCard" maxlength="60" required placeholder="Ex.: Nubank"></label><label>Valor total da compra (R$)<input id="purchaseTotal" type="number" min="0.01" step="0.01" required></label><label>Total de parcelas<input id="purchaseParts" type="number" min="2" max="48" required></label><label>Parcela atual / inicial<input id="purchaseStartPart" type="number" min="1" max="48" value="1" required></label><label class="span2">Vencimento da parcela informada<input id="purchaseDate" type="date" required></label><div class="span2 ch-parcelas-preview" id="purchasePreview" aria-live="polite">Preencha os campos para ver a previsão.</div><label class="span2 ch-keep hidden" id="purchaseKeepGroup"><input id="purchaseKeepPast" type="checkbox" checked><span><b>Manter lançamentos anteriores</b><br>Se desmarcar, as parcelas anteriores desta compra serão removidas do histórico.</span></label><div class="span2 controls" style="justify-content:flex-end"><button type="button" class="secondary" id="purchaseCancel">Cancelar</button><button type="submit" class="primary" id="purchaseSubmit">Salvar</button></div></form></dialog>';
  const dlg = get('purchaseDialog');
  get('purchaseCancel').onclick = () => dlg.close();
  const $p = id => get(id);
  const nPart = t => Number.isInteger(t.purchasePart) ? t.purchasePart : (Number(String(t.description||'').match(/\((\d+)\/\d+\)/)?.[1]) || null);
  function due(date, offset) {
    const [y,m,day] = date.split('-').map(Number);
    const d = new Date(y,m-1+offset,1,12),last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(Math.min(day,last)).padStart(2,'0');
  }
  function schedule(total,parts,firstPart,date,name,card,purchaseId) {
    const cents=Math.round(total*100),base=Math.floor(cents/parts),remainder=cents%parts,rows=[];
    for(let part=firstPart;part<=parts;part++) rows.push({id:uid(),purchaseId,purchasePart:part,type:'expense',category:'Compras parceladas',description:name+' ('+part+'/'+parts+') · '+card,date:due(date,part-firstPart),amount:(base+(part-1<remainder?1:0))/100});
    return rows;
  }
  let baselinePart=1,baselineDate=today(),manualDate=false;
  function preview() {
    const total=Number($p('purchaseTotal').value),parts=Number($p('purchaseParts').value),firstPart=Number($p('purchaseStartPart').value),date=$p('purchaseDate').value;
    if (!(total>0&&Number.isInteger(parts)&&parts>=2&&parts<=48&&Number.isInteger(firstPart)&&firstPart>=1&&firstPart<=parts&&/^\d{4}-\d\d-\d\d$/.test(date))){$p('purchasePreview').textContent='Confira o valor, a parcela atual, o total de parcelas e o vencimento.';return}
    const rows=schedule(total,parts,firstPart,date,'Prévia','Cartão','preview'), sum=rows.reduce((a,b)=>a+b.amount,0);
    $p('purchasePreview').textContent='Parcela '+firstPart+'/'+parts+' vence em '+date.split('-').reverse().join('/')+'. '+rows.length+' parcela(s) de '+firstPart+'/'+parts+' até '+parts+'/'+parts+'; total previsto: '+money(sum)+'. Parcelas anteriores não serão marcadas como pagas.';
  }
  function edit(id) {
    const p=state.purchases.find(x=>x.id===id),firstPart=Math.max(1,Number(p?.startPart)||1);
    $p('purchaseForm').reset();$p('purchaseId').value=p?.id||'';$p('purchaseName').value=p?.name||'';$p('purchaseCard').value=p?.card||'';$p('purchaseTotal').value=p?.total??'';$p('purchaseParts').value=p?.parts??10;$p('purchaseStartPart').value=firstPart;
    const prior=p?state.transactions.find(t=>t.purchaseId===p.id&&nPart(t)===firstPart):null;
    $p('purchaseDate').value=prior?.date||p?.first||today();baselinePart=firstPart;baselineDate=$p('purchaseDate').value;manualDate=false;
    $p('purchaseKeepPast').checked=true;$p('purchaseKeepGroup').classList.toggle('hidden',!p);
    $p('purchaseTitle').textContent=p?'Ajustar parcelamento':'Nova compra parcelada';$p('purchaseSubmit').textContent=p?'Salvar ajustes':'Criar parcelas';
    $p('purchaseHelp').textContent=p?'Altere a parcela atual (ex.: 4/10), o cartão, valor ou vencimento. A previsão será refeita após confirmação.':'Informe a primeira parcela que deseja acompanhar. Ex.: 4 de 10.';
    preview();dlg.showModal();
  }
  get('newPurchase').onclick=()=>edit();
  $p('purchaseStartPart').addEventListener('input',()=>{const part=Number($p('purchaseStartPart').value);if(!manualDate&&Number.isInteger(part)&&part>=1)$p('purchaseDate').value=due(baselineDate,part-baselinePart);preview()});
  $p('purchaseDate').addEventListener('input',()=>{manualDate=true;preview()});
  ['purchaseName','purchaseCard','purchaseTotal','purchaseParts'].forEach(k=>$p(k).addEventListener('input',preview));
  $p('purchaseForm').onsubmit=e=>{
    e.preventDefault();const id=$p('purchaseId').value,oldPurchase=state.purchases.find(x=>x.id===id),name=$p('purchaseName').value.trim(),card=$p('purchaseCard').value.trim(),total=Number($p('purchaseTotal').value),parts=Number($p('purchaseParts').value),start=Number($p('purchaseStartPart').value),first=$p('purchaseDate').value;
    if(!name||!card||!Number.isFinite(total)||total<=0||total>100000000||!Number.isInteger(parts)||parts<2||parts>48||!Number.isInteger(start)||start<1||start>parts||!/^\d{4}-\d\d-\d\d$/.test(first))return alert('Confira os dados. Exemplo: parcela 4 de 10 e vencimento correspondente.');
    const purchaseId=oldPurchase?.id||uid(),linked=oldPurchase?state.transactions.filter(t=>t.purchaseId===purchaseId):[],keep=oldPurchase&&$p('purchaseKeepPast').checked;
    const retained=keep?linked.filter(t=>{const n=nPart(t);return n!==null&&n<start}):[];
    const rows=schedule(total,parts,start,first,name,card,purchaseId);
    if(oldPurchase&&!confirm('Salvar compra '+start+'/'+parts+'?\nSerão refeitos '+rows.length+' lançamentos; '+retained.length+' anterior(es) preservados e '+(linked.length-retained.length)+' substituído(s), incluindo edições manuais. Faça backup antes se necessário.'))return;
    const updated={id:purchaseId,name,card,total:Math.round(total*100)/100,parts,startPart:start,first};
    if(oldPurchase)state.purchases=state.purchases.map(p=>p.id===purchaseId?updated:p);else state.purchases.push(updated);
    if(oldPurchase)state.transactions=state.transactions.filter(t=>t.purchaseId!==purchaseId).concat(retained);
    state.transactions.push(...rows);persist();draw();dlg.close();
  };
  drawPurchases=()=>{
    get('purchaseRows').innerHTML=state.purchases.map(p=>{const start=Number(p.startPart)||1, count=state.transactions.filter(t=>t.purchaseId===p.id).length;
      return '<tr><td>'+esc(p.name)+'</td><td>'+esc(p.card)+'</td><td><b>'+start+'/'+p.parts+'</b><br><small class="muted">'+count+' lançamento(s)</small></td><td>'+money(p.total)+'</td><td><div class="ch-actions"><button class="secondary" data-adjustpurchase="'+esc(p.id)+'">✎ Ajustar</button><button class="danger" data-deletepurchase="'+esc(p.id)+'">Excluir</button></div></td></tr>';
    }).join('')||'<tr><td colspan="5">Nenhuma compra parcelada.</td></tr>';
  };
  document.addEventListener('click',e=>{const b=e.target.closest('[data-adjustpurchase]');if(b)edit(b.dataset.adjustpurchase)});
  const notice=document.querySelector('#cards .notice');if(notice)notice.textContent='É possível ajustar uma compra para 4/10 e alterar o vencimento da parcela atual. As parcelas criadas são previsões, não pagamentos confirmados. Faça backup antes de editar.';
  drawPurchases();
})();
