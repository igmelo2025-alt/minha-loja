const KEY="minha_loja_v1";
const months=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
let db={"products":[],"sales":[],"expenses":[]};
try{const raw=localStorage.getItem(KEY); if(raw) db=JSON.parse(raw);}catch(e){console.warn("Armazenamento local indisponível",e);}
function save(){
  try{localStorage.setItem(KEY,JSON.stringify(db));}
  catch(e){alert("O navegador bloqueou o armazenamento local. Abra novamente pelo endereço http://localhost:8080 e permita o armazenamento.");console.error(e);return false;}
  renderAll(); return true;
}
function money(v){return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});}
function dateBR(s){if(!s)return "";const [y,m,d]=s.split("-");return `${d}/${m}/${y}`;}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function monthName(date){return months[new Date(date+"T12:00:00").getMonth()];}
function currentYear(){return new Date().getFullYear();}
function years(){const ys=new Set([currentYear()]);db.sales.forEach(x=>ys.add(new Date(x.date+"T12:00:00").getFullYear()));db.expenses.forEach(x=>ys.add(new Date(x.date+"T12:00:00").getFullYear()));return [...ys].sort((a,b)=>b-a);}
function selectedYear(){return Number(document.getElementById("yearFilter").value)||currentYear();}


function renderToday(){
  const today=new Date().toISOString().slice(0,10);
  const sales=db.sales.filter(s=>s.date===today);
  const revenue=sales.reduce((a,s)=>a+s.qty*s.price,0);
  const profit=sales.reduce((a,s)=>a+s.qty*(s.price-s.cost),0);
  const count=sales.reduce((a,s)=>a+s.qty,0);
  const el=document.getElementById("todayStrip");
  if(el)el.innerHTML=`<div><span>Hoje</span><b>${count} ${count===1?"item":"itens"}</b></div><div><span>Vendas</span><b>${money(revenue)}</b></div><div><span>Lucro</span><b class="${profit<0?"negative":"positive"}">${money(profit)}</b></div>`;
  const ss=document.getElementById("salesSummary");
  if(ss){const total=sales.reduce((a,s)=>a+s.qty*s.price,0);ss.innerHTML=`<div><span>Vendas exibidas</span><b>${sales.length}</b></div><div><span>Total</span><b>${money(total)}</b></div>`;}
}
function renderDashboard(){
  const y=selectedYear();
  const sales=db.sales.filter(x=>new Date(x.date+"T12:00:00").getFullYear()===y);
  const expenses=db.expenses.filter(x=>new Date(x.date+"T12:00:00").getFullYear()===y);
  const revenue=sales.reduce((a,x)=>a+x.qty*x.price,0);
  const cost=sales.reduce((a,x)=>a+x.qty*x.cost,0);
  const gastos=expenses.reduce((a,x)=>a+x.value,0);
  const profit=revenue-cost-gastos;
  const stock=db.products.reduce((a,p)=>a+stockCurrent(p),0);
  const stockValue=db.products.reduce((a,p)=>a+stockCurrent(p)*p.cost,0);
  document.getElementById("kpiRevenue").textContent=money(revenue);
  document.getElementById("kpiCost").textContent=money(cost);
  document.getElementById("kpiExpenses").textContent=money(gastos);
  const kp=document.getElementById("kpiProfit");kp.textContent=money(profit);kp.className=profit<0?"negative":"positive";
  document.getElementById("kpiStock").textContent=stock;
  document.getElementById("kpiStockValue").textContent=money(stockValue);
  drawChart(y);
  const low=db.products.filter(p=>stockCurrent(p)<=Number(p.min||0));
  document.getElementById("lowStock").innerHTML=low.length?low.map(p=>`<div class="item"><div><div class="item-title">${esc(p.name)}</div><div class="item-sub">Mínimo: ${p.min||0}</div></div><div class="item-value stock-low">${stockCurrent(p)} un.</div></div>`).join(""):`<div class="empty">Nenhum produto abaixo do estoque mínimo.</div>`;
}
function stockCurrent(p){return Number(p.initial||0)+Number(p.entries||0)-db.sales.filter(s=>s.productId===p.id).reduce((a,s)=>a+Number(s.qty),0);}
function drawChart(y){
  const c=document.getElementById("monthlyChart"),ctx=c.getContext("2d"),w=c.clientWidth||700,h=220,dpr=devicePixelRatio||1;
  c.width=w*dpr;c.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  const data=months.map((m,i)=>{const s=db.sales.filter(x=>new Date(x.date+"T12:00:00").getFullYear()===y&&new Date(x.date+"T12:00:00").getMonth()===i);const e=db.expenses.filter(x=>new Date(x.date+"T12:00:00").getFullYear()===y&&new Date(x.date+"T12:00:00").getMonth()===i);const rev=s.reduce((a,x)=>a+x.qty*x.price,0);const cost=s.reduce((a,x)=>a+x.qty*x.cost,0);return {rev,profit:rev-cost-e.reduce((a,x)=>a+x.value,0)};});
  const max=Math.max(1,...data.map(x=>Math.max(x.rev,Math.abs(x.profit))));
  const pad={l:8,r:8,t:10,b:30},cw=w-pad.l-pad.r,ch=h-pad.t-pad.b;
  if(data.every(x=>x.rev===0&&x.profit===0)){ctx.fillStyle="#6b7280";ctx.font="14px system-ui";ctx.textAlign="center";ctx.fillText("Cadastre uma venda para ver o gráfico",w/2,h/2);return;}
  ctx.font="10px system-ui";ctx.textAlign="center";
  data.forEach((x,i)=>{const x0=pad.l+i*(cw/12)+4,bw=Math.max(5,cw/12-9);const rh=x.rev/max*(ch-15);ctx.fillStyle="#111827";ctx.fillRect(x0,h-pad.b-rh,bw/2,rh);const ph=Math.max(0,x.profit)/max*(ch-15);ctx.fillStyle="#9ca3af";ctx.fillRect(x0+bw/2,h-pad.b-ph,bw/2,ph);ctx.fillStyle="#6b7280";ctx.fillText(months[i].slice(0,3),x0+bw/2,h-10);});
}
function renderYears(){
  const sel=document.getElementById("yearFilter"),old=sel.value;sel.innerHTML=years().map(y=>`<option>${y}</option>`).join("");sel.value=years().includes(Number(old))?old:currentYear();
}
function renderSales(){
  const el=document.getElementById("salesList"), q=(document.getElementById("salesSearch")?.value||"").toLowerCase(), mo=document.getElementById("salesMonth")?.value||"";
  const arr=[...db.sales].sort((a,b)=>b.date.localeCompare(a.date)).filter(s=>(!q||String(s.productName||db.products.find(x=>x.id===s.productId)?.name||"").toLowerCase().includes(q))&&(!mo||s.date.startsWith(mo)));
  el.innerHTML=arr.length?arr.map(s=>{const p=db.products.find(x=>x.id===s.productId);const total=s.qty*s.price;const lucro=s.qty*(s.price-s.cost);return `<div class="item"><div><div class="item-title">${esc(p?.name||s.productName||"Produto removido")}</div><div class="item-sub">${dateBR(s.date)} · ${s.qty} un. · ${esc(s.payment||"Não informado")} · venda ${money(s.price)}/un.</div></div><div><div class="item-value">${money(total)}</div><div class="item-sub ${lucro<0?"negative":"positive"}">Lucro ${money(lucro)}</div><div class="item-actions"><button class="mini" onclick="editSale('${s.id}')">Editar</button><button class="mini" onclick="deleteSale('${s.id}')">Excluir</button></div></div></div>`}).join(""):`<div class="empty">Nenhuma venda encontrada.</div>`;
}
function renderStock(){
  const el=document.getElementById("stockList"), q=(document.getElementById("stockSearch")?.value||"").toLowerCase(), status=document.getElementById("stockStatus")?.value||"all";
  const arr=db.products.filter(p=>{const st=stockCurrent(p),low=st<=Number(p.min||0);return (!q||p.name.toLowerCase().includes(q))&&(status==="all"||(status==="low"&&low)||(status==="ok"&&!low))});
  el.innerHTML=arr.length?arr.map(p=>{const st=stockCurrent(p);return `<div class="item"><div><div class="item-title">${esc(p.name)}</div><div class="item-sub">${p.category?esc(p.category)+" · ":""}${p.code?"Código: "+esc(p.code)+" · ":""}Custo ${money(p.cost)} · Venda ${money(p.salePrice||0)}</div></div><div><div class="item-value ${st<=Number(p.min||0)?"stock-low":""}">${st} un.</div><div class="item-sub">Estoque: ${money(st*p.cost)}</div><div class="item-actions"><button class="mini" onclick="openProductForm('${p.id}')">Editar</button><button class="mini" onclick="deleteProduct('${p.id}')">Excluir</button></div></div></div>`}).join(""):`<div class="empty">Nenhum produto encontrado.</div>`;
}
function renderExpenses(){
  const el=document.getElementById("expensesList"),arr=[...db.expenses].sort((a,b)=>b.date.localeCompare(a.date)),q=(document.getElementById("expenseSearch")?.value||"").toLowerCase(),mo=document.getElementById("expenseMonth")?.value||"";
  const filtered=arr.filter(x=>(!q||(`${x.description} ${x.category||""}`).toLowerCase().includes(q))&&(!mo||x.date.startsWith(mo)));
  el.innerHTML=filtered.length?filtered.map(x=>`<div class="item"><div><div class="item-title">${esc(x.description)}</div><div class="item-sub">${dateBR(x.date)} · ${esc(x.category||"Sem categoria")}</div></div><div><div class="item-value">${money(x.value)}</div><div class="item-actions"><button class="mini" onclick="editExpense('${x.id}')">Editar</button><button class="mini" onclick="deleteExpense('${x.id}')">Excluir</button></div></div></div>`).join(""):`<div class="empty">Nenhum gasto encontrado.</div>`;
}

function showScreen(screenId){
  document.querySelectorAll(".nav-item").forEach(x=>x.classList.toggle("active",x.dataset.screen===screenId));
  document.querySelectorAll(".screen").forEach(x=>x.classList.remove("active"));
  const screen=document.getElementById(screenId);
  if(screen){screen.classList.add("active");}
  if(screenId==="more"){renderReports();renderClosing();}
  window.scrollTo({top:0,behavior:"smooth"});
}
function renderClosing(){
  const input=document.getElementById("closingDate");
  if(!input)return;
  if(!input.value) input.value=new Date().toISOString().slice(0,10);
  const date=input.value;
  const sales=db.sales.filter(s=>s.date===date);
  const total=sales.reduce((a,s)=>a+Number(s.qty||0)*Number(s.price||0),0);
  const cost=sales.reduce((a,s)=>a+Number(s.qty||0)*Number(s.cost||0),0);
  const profit=total-cost;
  const items=sales.reduce((a,s)=>a+Number(s.qty||0),0);
  const payments={};
  sales.forEach(s=>{const k=s.payment||"Não informado";payments[k]=(payments[k]||0)+Number(s.qty||0)*Number(s.price||0);});
  const summary=document.getElementById("closingSummary");
  summary.innerHTML=`
    <div class="closing-card"><span>Faturamento</span><b>${money(total)}</b></div>
    <div class="closing-card"><span>Lucro</span><b class="${profit<0?"negative":"positive"}">${money(profit)}</b></div>
    <div class="closing-card"><span>Itens vendidos</span><b>${items}</b></div>
    <div class="closing-card"><span>Nº de vendas</span><b>${sales.length}</b></div>`;
  const pe=document.getElementById("closingPayments");
  const order=["Pix","Dinheiro","Cartão","Outro","Não informado"];
  const entries=[...order.filter(k=>payments[k]!==undefined).map(k=>[k,payments[k]]),...Object.entries(payments).filter(([k])=>!order.includes(k))];
  pe.innerHTML=entries.length?entries.map(([k,v])=>`<div class="payment-row"><span>${esc(k)}</span><strong>${money(v)}</strong></div>`).join(""):`<div class="empty">Nenhuma venda neste dia.</div>`;
  document.getElementById("closingFooter").innerHTML=sales.length?`<span>Ticket médio</span><b>${money(total/sales.length)}</b>`:`<span>Selecione uma data para consultar o fechamento.</span>`;
}
function renderReports(){
  const cats={};db.expenses.forEach(x=>cats[x.category||"Sem categoria"]=(cats[x.category||"Sem categoria"]||0)+Number(x.value||0));
  const vals=Object.entries(cats).sort((a,b)=>b[1]-a[1]);const max=vals[0]?.[1]||1;
  document.getElementById("expenseCategories").innerHTML=vals.length?vals.map(([k,v])=>`<div class="report-row"><div style="display:flex;justify-content:space-between"><span>${esc(k)}</span><b>${money(v)}</b></div><div class="bar"><i style="width:${Math.round(v/max*100)}%"></i></div></div>`).join(""):`<div class="empty">Nenhum gasto cadastrado.</div>`;
  const top={};db.sales.forEach(s=>top[s.productId]=(top[s.productId]||0)+Number(s.qty||0));const tp=Object.entries(top).sort((a,b)=>b[1]-a[1]).slice(0,5);
  document.getElementById("topProducts").innerHTML=tp.length?tp.map(([id,q],i)=>{const p=db.products.find(x=>x.id===id);return `<div class="report-row"><div style="display:flex;justify-content:space-between"><span>${i+1}. ${esc(p?.name||"Produto")}</span><b>${q} un.</b></div></div>`}).join(""):`<div class="empty">Nenhuma venda cadastrada.</div>`;
  const pays={};db.sales.forEach(s=>{const k=s.payment||"Não informado";pays[k]=(pays[k]||0)+s.qty*s.price});
  const pv=Object.entries(pays).sort((a,b)=>b[1]-a[1]);
  document.getElementById("paymentSummary").innerHTML=pv.length?pv.map(([k,v])=>`<div class="report-row"><div style="display:flex;justify-content:space-between"><span>${esc(k)}</span><b>${money(v)}</b></div></div>`).join(""):`<div class="empty">Nenhuma venda cadastrada.</div>`;

}
function renderAll(){renderYears();renderDashboard();renderSales();renderStock();renderExpenses();renderReports();renderToday();renderClosing();}

function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function openModal(title,html,onSubmit){document.getElementById("modalTitle").textContent=title;const f=document.getElementById("modalForm");f.innerHTML=html;f.onsubmit=e=>{e.preventDefault();try{const ok=onSubmit(new FormData(f));if(ok!==false){closeModal();}}catch(err){console.error(err);alert("Não foi possível salvar. Veja o console para detalhes.");}};document.getElementById("modal").classList.remove("hidden");}
function closeModal(){document.getElementById("modal").classList.add("hidden");}
function openSaleForm(){
  if(!db.products.length){alert("Cadastre um produto primeiro.");return;}
  const opts=db.products.map(p=>`<option value="${p.id}">${esc(p.name)} — estoque ${stockCurrent(p)} · ${money(p.salePrice||0)}</option>`).join("");
  openModal("Registrar venda",`<div class="form-grid">
    <div class="field"><label>Data</label><input name="date" type="date" value="${new Date().toISOString().slice(0,10)}" required></div>
    <div class="field"><label>Produto</label><select name="productId" class="select">${opts}</select></div>
    <div class="field"><label>Quantidade</label><input name="qty" type="number" min="1" step="1" value="1" required></div>
    <div class="field"><label>Preço de venda por unidade</label><input id="salePriceInput" name="price" type="number" min="0" step="0.01" required></div>
    <div class="field"><label>Forma de pagamento</label><select name="payment" class="select"><option>Pix</option><option>Dinheiro</option><option>Cartão</option><option>Outro</option></select></div>
    <div class="form-actions"><button type="button" class="secondary" onclick="closeModal()">Cancelar</button><button class="primary">Finalizar venda</button></div>
  </div>`,fd=>{
    const p=db.products.find(x=>x.id===fd.get("productId"));const qty=Number(fd.get("qty"));if(qty>stockCurrent(p)){if(!confirm("A quantidade é maior que o estoque atual. Registrar mesmo assim?"))return false;}
    db.sales.push({id:uid(),date:fd.get("date"),productId:p.id,productName:p.name,qty,price:Number(fd.get("price")),cost:Number(p.cost),payment:fd.get("payment")});return save();
  });
  const sel=document.querySelector('#modalForm select[name="productId"]'), price=document.getElementById("salePriceInput");
  function fill(){const p=db.products.find(x=>x.id===sel.value);if(p)price.value=Number(p.salePrice||0).toFixed(2);}
  sel.addEventListener("change",fill);fill();
}
function openProductForm(id){
  const p=db.products.find(x=>x.id===id)||{name:"",code:"",category:"",initial:0,entries:0,cost:0,salePrice:0,min:0};
  openModal(id?"Editar produto":"Novo produto",`<div class="form-grid">
    <div class="field"><label>Nome do produto</label><input name="name" value="${esc(p.name)}" placeholder="Ex.: Caixa de bombons" required></div>
    <div class="field"><label>Código / referência</label><input name="code" value="${esc(p.code||"")}" placeholder="Opcional"></div>
    <div class="field"><label>Categoria</label><input name="category" value="${esc(p.category||"")}" placeholder="Ex.: Chocolates"></div>
    <div class="field"><label>Estoque inicial</label><input name="initial" type="number" min="0" step="1" value="${p.initial||0}"></div>
    <div class="field"><label>Entradas de estoque</label><input name="entries" type="number" min="0" step="1" value="${p.entries||0}"></div>
    <div class="field"><label>Custo unitário</label><input name="cost" type="number" min="0" step="0.01" value="${p.cost||0}" required></div>
    <div class="field"><label>Preço de venda</label><input name="salePrice" type="number" min="0" step="0.01" value="${p.salePrice||0}" required></div>
    <div class="field"><label>Estoque mínimo (alerta)</label><input name="min" type="number" min="0" step="1" value="${p.min||0}"></div>
    <div class="form-actions"><button type="button" class="secondary" onclick="closeModal()">Cancelar</button><button class="primary">Salvar produto</button></div>
  </div>`,fd=>{
    const obj={id:p.id||uid(),name:fd.get("name").trim(),code:fd.get("code").trim(),category:fd.get("category").trim(),initial:Number(fd.get("initial")),entries:Number(fd.get("entries")),cost:Number(fd.get("cost")),salePrice:Number(fd.get("salePrice")),min:Number(fd.get("min"))};
    if(id){const i=db.products.findIndex(x=>x.id===id);db.products[i]=obj}else db.products.push(obj);return save();
  });
}
function openExpenseForm(){
  openModal("Registrar gasto",`<div class="form-grid"><div class="field"><label>Data</label><input name="date" type="date" value="${new Date().toISOString().slice(0,10)}" required></div><div class="field"><label>Descrição</label><input name="description" placeholder="Ex.: aluguel, energia, embalagem..." required></div><div class="field"><label>Categoria</label><input name="category" placeholder="Ex.: Operacional"></div><div class="field"><label>Valor</label><input name="value" type="number" min="0" step="0.01" required></div><div class="form-actions"><button type="button" class="secondary" onclick="closeModal()">Cancelar</button><button class="primary">Salvar gasto</button></div></div>`,fd=>{
    db.expenses.push({id:uid(),date:fd.get("date"),description:fd.get("description").trim(),category:fd.get("category").trim(),value:Number(fd.get("value"))});return save();
  });
}
function editSale(id){
  const s=db.sales.find(x=>x.id===id);if(!s)return;
  const opts=db.products.map(p=>`<option value="${p.id}" ${p.id===s.productId?"selected":""}>${esc(p.name)} — estoque ${stockCurrent(p)+Number(s.qty||0)}</option>`).join("");
  openModal("Editar venda",`<div class="form-grid"><div class="field"><label>Data</label><input name="date" type="date" value="${s.date}" required></div><div class="field"><label>Produto</label><select name="productId" class="select">${opts}</select></div><div class="field"><label>Quantidade</label><input name="qty" type="number" min="1" step="1" value="${s.qty}" required></div><div class="field"><label>Preço de venda por unidade</label><input name="price" type="number" min="0" step="0.01" value="${s.price}" required></div><div class="field"><label>Forma de pagamento</label><select name="payment" class="select"><option ${s.payment==="Pix"?"selected":""}>Pix</option><option ${s.payment==="Dinheiro"?"selected":""}>Dinheiro</option><option ${s.payment==="Cartão"?"selected":""}>Cartão</option><option ${(!s.payment||s.payment==="Outro")?"selected":""}>Outro</option></select></div><div class="form-actions"><button type="button" class="secondary" onclick="closeModal()">Cancelar</button><button class="primary">Salvar</button></div></div>`,fd=>{
    const p=db.products.find(x=>x.id===fd.get("productId"));Object.assign(s,{date:fd.get("date"),productId:p.id,productName:p.name,qty:Number(fd.get("qty")),price:Number(fd.get("price")),cost:Number(p.cost),payment:fd.get("payment")});return save();
  });
}
function editExpense(id){
  const x=db.expenses.find(e=>e.id===id);if(!x)return;
  openModal("Editar gasto",`<div class="form-grid"><div class="field"><label>Data</label><input name="date" type="date" value="${x.date}" required></div><div class="field"><label>Descrição</label><input name="description" value="${esc(x.description)}" required></div><div class="field"><label>Categoria</label><input name="category" value="${esc(x.category||"")}"></div><div class="field"><label>Valor</label><input name="value" type="number" min="0" step="0.01" value="${x.value}" required></div><div class="form-actions"><button type="button" class="secondary" onclick="closeModal()">Cancelar</button><button class="primary">Salvar</button></div></div>`,fd=>{Object.assign(x,{date:fd.get("date"),description:fd.get("description").trim(),category:fd.get("category").trim(),value:Number(fd.get("value"))});return save()});
}
function deleteSale(id){if(confirm("Excluir esta venda?")){db.sales=db.sales.filter(x=>x.id!==id);save()}}
function deleteExpense(id){if(confirm("Excluir este gasto?")){db.expenses=db.expenses.filter(x=>x.id!==id);save()}}
function deleteProduct(id){if(db.sales.some(x=>x.productId===id)){alert("Este produto possui vendas registradas. Exclua as vendas primeiro ou mantenha o produto cadastrado.");return}if(confirm("Excluir este produto?")){db.products=db.products.filter(x=>x.id!==id);save()}}
function backupPayload(){
  return {app:"Minha Loja",version:"V12.7",createdAt:new Date().toISOString(),data:{products:db.products||[],sales:db.sales||[],expenses:db.expenses||[]}};
}
function markBackup(){try{localStorage.setItem("minha_loja_last_backup",new Date().toISOString());}catch(e){};renderBackupStatus();}
function renderBackupStatus(){
  const el=document.getElementById("backupStatus"); if(!el)return;
  let v=null; try{v=localStorage.getItem("minha_loja_last_backup")}catch(e){}
  el.innerHTML=v?`Último backup: <b>${new Date(v).toLocaleString("pt-BR")}</b>`:`<b>Nenhum backup exportado ainda.</b>`;
}
function downloadBackup(){
  const blob=new Blob([JSON.stringify(backupPayload(),null,2)],{type:"application/json"});
  const a=document.createElement("a");const url=URL.createObjectURL(blob);a.href=url;a.download=`backup-minha-loja-${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  markBackup(); alert("Backup exportado com sucesso. Guarde o arquivo em um local seguro.");
}
function normalizeBackup(x){
  const d=x?.data||x;
  if(!d || !Array.isArray(d.products)||!Array.isArray(d.sales)||!Array.isArray(d.expenses)) throw new Error("invalid");
  return {products:d.products,sales:d.sales,expenses:d.expenses};
}
function createSafetyBackup(){
  try{localStorage.setItem("minha_loja_safety_backup",JSON.stringify(backupPayload()));}catch(e){}
}
function restoreBackupFile(file){
  const r=new FileReader();
  r.onload=()=>{try{const x=normalizeBackup(JSON.parse(r.result));createSafetyBackup();if(confirm("Restaurar este backup? Os dados atuais serão substituídos.")){db=x;save();alert("Backup restaurado com sucesso.");}}catch(e){alert("Arquivo de backup inválido ou incompatível com a Minha Loja.");}};
  r.readAsText(file);
}
document.querySelectorAll(".nav-item").forEach(b=>b.onclick=()=>{document.querySelectorAll(".nav-item").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.querySelectorAll(".screen").forEach(x=>x.classList.remove("active"));document.getElementById(b.dataset.screen).classList.add("active");});
document.getElementById("yearFilter").onchange=renderDashboard;
document.getElementById("closeModal").onclick=closeModal;
document.getElementById("modal").onclick=e=>{if(e.target.id==="modal")closeModal()};

// V12.7 — backup automático e nuvem
const AUTO_CFG_KEY="minha_loja_auto_backup_v12_8";
let autoBackupTimer=null;
let lastBackupFingerprint="";
function dataFingerprint(){try{return JSON.stringify(db)}catch(e){return ""}}
function getAutoCfg(){try{return Object.assign({enabled:false,interval:20,cloudEnabled:false,supabaseUrl:"",supabaseAnonKey:"",cloudProvider:"supabase",googleClientId:"",googleFolderName:"Minha Loja - Backups"},JSON.parse(localStorage.getItem(AUTO_CFG_KEY)||"{}"));}catch(e){return {enabled:false,interval:20,cloudEnabled:false,supabaseUrl:"",supabaseAnonKey:"",cloudProvider:"supabase",googleClientId:"",googleFolderName:"Minha Loja - Backups"}}}
function setAutoCfg(c){try{localStorage.setItem(AUTO_CFG_KEY,JSON.stringify(c))}catch(e){}}
function renderAutoBackupSettings(){
 const c=getAutoCfg();
 const en=document.getElementById("autoBackupEnabled"),iv=document.getElementById("autoBackupInterval"),ce=document.getElementById("cloudBackupEnabled"),su=document.getElementById("supabaseUrl"),sk=document.getElementById("supabaseAnonKey"),st=document.getElementById("autoBackupStatus");
 const provider=document.getElementById("cloudProvider"),gb=document.getElementById("gdriveCloudBox"),sb=document.getElementById("supabaseCloudBox"),cid=document.getElementById("googleClientId"),fn=document.getElementById("googleFolderName");
 if(en)en.checked=!!c.enabled;if(iv)iv.value=String(c.interval||20);if(ce)ce.checked=!!c.cloudEnabled;if(su)su.value=c.supabaseUrl||"";if(sk)sk.value=c.supabaseAnonKey||"";if(provider)provider.value=c.cloudProvider||"supabase";if(cid)cid.value=c.googleClientId||"";if(fn)fn.value=c.googleFolderName||"Minha Loja - Backups";
 if(sb)sb.style.display=(c.cloudProvider||"supabase")==="supabase"?"block":"none";if(gb)gb.style.display=(c.cloudProvider||"supabase")==="gdrive"?"block":"none";
 if(st){let a=null,n=null;try{a=localStorage.getItem("minha_loja_auto_last_backup");n=localStorage.getItem("minha_loja_cloud_last_backup")}catch(e){}st.innerHTML=`<b>Backup automático:</b> ${c.enabled?"Ativado":"Desativado"}<br>Frequência: ${c.interval===1440?"diário":c.interval+" min"}${a?`<br>Último automático: <b>${new Date(a).toLocaleString("pt-BR")}</b>`:""}${n?`<br>Último na nuvem: <b>${new Date(n).toLocaleString("pt-BR")}</b>`:""}`}
 renderGoogleDriveStatus();
}

function scheduleAutoBackup(){if(autoBackupTimer)clearInterval(autoBackupTimer);autoBackupTimer=null;const c=getAutoCfg();if(!c.enabled)return;const mins=Math.max(20,Number(c.interval)||20);autoBackupTimer=setInterval(()=>runAutoBackup(),mins*60*1000)}
async function runAutoBackup(){const c=getAutoCfg();if(!c.enabled)return false;const fp=dataFingerprint();if(!fp||fp===lastBackupFingerprint)return false;try{localStorage.setItem("minha_loja_auto_backup",JSON.stringify(backupPayload()))}catch(e){console.error(e)};lastBackupFingerprint=fp;try{localStorage.setItem("minha_loja_auto_last_backup",new Date().toISOString())}catch(e){};renderAutoBackupSettings();if(c.cloudEnabled){if(c.cloudProvider==="gdrive")await uploadGoogleDriveBackup(false);else await uploadCloudBackup(false);}return true}
function normalizeUrl(u){return String(u||"").trim().replace(/\/+$/,"")}
async function uploadCloudBackup(showAlert=true){const c=getAutoCfg(),url=normalizeUrl(c.supabaseUrl),key=String(c.supabaseAnonKey||"").trim();if(!url||!key){if(showAlert)alert("Preencha a URL do Supabase e a chave pública anon.");return false}try{const r=await fetch(url+"/rest/v1/app_backups",{method:"POST",headers:{"Content-Type":"application/json","apikey":key,"Authorization":"Bearer "+key,"Prefer":"return=minimal"},body:JSON.stringify({backup:backupPayload(),created_at:new Date().toISOString()})});if(!r.ok)throw new Error(await r.text());try{localStorage.setItem("minha_loja_cloud_last_backup",new Date().toISOString())}catch(e){}renderAutoBackupSettings();if(showAlert)alert("Backup salvo na nuvem com sucesso!");return true}catch(e){console.error(e);if(showAlert)alert("Não foi possível salvar na nuvem. Confira a URL, a chave anon e as políticas da tabela app_backups.");return false}}
async function testCloud(){const c=getAutoCfg(),url=normalizeUrl(c.supabaseUrl),key=String(c.supabaseAnonKey||"").trim();if(!url||!key){alert("Preencha a URL do Supabase e a chave pública anon.");return}try{const r=await fetch(url+"/rest/v1/app_backups?select=id&limit=1",{headers:{apikey:key,Authorization:"Bearer "+key}});if(!r.ok)throw new Error(await r.text());alert("Conexão com a nuvem funcionando!")}catch(e){console.error(e);alert("A conexão falhou. Confira a URL, a chave anon e o SQL/RLS da tabela app_backups.")}}
let googleAccessToken=null;
let googleTokenClient=null;
const GDRIVE_SCOPE="https://www.googleapis.com/auth/drive.file";
function renderGoogleDriveStatus(msg){const el=document.getElementById("googleDriveStatus");if(!el)return;const c=getAutoCfg();el.innerHTML=msg|| (googleAccessToken?"<b>Google Drive conectado.</b>":(c.googleClientId?"Client ID configurado. Toque em Conectar Google Drive.":"Configure o Client ID OAuth do Google."));}
function initGoogleTokenClient(){const c=getAutoCfg();if(!c.googleClientId){alert("Informe o Client ID OAuth do Google primeiro.");return false}if(!window.google||!google.accounts||!google.accounts.oauth2){alert("A biblioteca do Google ainda está carregando. Aguarde alguns segundos e tente novamente.");return false}googleTokenClient=google.accounts.oauth2.initTokenClient({client_id:c.googleClientId,scope:GDRIVE_SCOPE,callback:(resp)=>{if(resp.error){renderGoogleDriveStatus("Falha na autorização do Google.");return}googleAccessToken=resp.access_token;renderGoogleDriveStatus("<b>Google Drive conectado.</b>");}});return true}
function connectGoogleDrive(){if(!initGoogleTokenClient())return;googleTokenClient.requestAccessToken({prompt:"consent"});}
async function ensureGoogleToken(){if(googleAccessToken)return true;if(!initGoogleTokenClient())return false;return new Promise(resolve=>{const old=googleTokenClient.callback;googleTokenClient.callback=(resp)=>{if(resp.error){resolve(false);return}googleAccessToken=resp.access_token;resolve(true)};googleTokenClient.requestAccessToken({prompt:""})})}
async function driveFindOrCreateFolder(){const c=getAutoCfg();const name=(c.googleFolderName||"Minha Loja - Backups").trim();const q=`name='${name.replace(/'/g,"\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;let r=await fetch("https://www.googleapis.com/drive/v3/files?spaces=drive&q="+encodeURIComponent(q)+"&fields=files(id,name)&pageSize=10",{headers:{Authorization:"Bearer "+googleAccessToken}});if(!r.ok)throw new Error(await r.text());let d=await r.json();if(d.files&&d.files[0])return d.files[0].id;r=await fetch("https://www.googleapis.com/drive/v3/files",{method:"POST",headers:{Authorization:"Bearer "+googleAccessToken,"Content-Type":"application/json"},body:JSON.stringify({name,mimeType:"application/vnd.google-apps.folder"})});if(!r.ok)throw new Error(await r.text());d=await r.json();return d.id}
async function uploadGoogleDriveBackup(showAlert=true){if(!(await ensureGoogleToken())){if(showAlert)alert("Não foi possível conectar ao Google Drive.");return false}try{const folderId=await driveFindOrCreateFolder();const payload=JSON.stringify(backupPayload(),null,2);const metadata={name:`backup-minha-loja-${new Date().toISOString().replace(/[:.]/g,"-")}.json`,parents:[folderId],mimeType:"application/json"};const boundary="-------minhaloja"+Date.now();const body="--"+boundary+"\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n"+JSON.stringify(metadata)+"\r\n--"+boundary+"\r\nContent-Type: application/json\r\n\r\n"+payload+"\r\n--"+boundary+"--";const r=await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",{method:"POST",headers:{Authorization:"Bearer "+googleAccessToken,"Content-Type":"multipart/related; boundary="+boundary},body});if(!r.ok)throw new Error(await r.text());const d=await r.json();try{localStorage.setItem("minha_loja_cloud_last_backup",new Date().toISOString())}catch(e){}renderAutoBackupSettings();renderGoogleDriveStatus(`<b>Backup enviado ao Google Drive.</b><br>${d.name||"Arquivo criado"}`);if(showAlert)alert("Backup salvo no Google Drive com sucesso!");return true}catch(e){console.error(e);renderGoogleDriveStatus("Não foi possível enviar o backup ao Google Drive.");if(showAlert)alert("Não foi possível salvar no Google Drive. Confira o Client ID, a origem autorizada e se a Drive API está habilitada.");return false}}

function wireAutoBackup(){
 ["autoBackupEnabled","autoBackupInterval","cloudBackupEnabled","supabaseUrl","supabaseAnonKey","cloudProvider","googleClientId","googleFolderName"].forEach(id=>document.getElementById(id)?.addEventListener("change",()=>{const c=getAutoCfg(),el=document.getElementById(id);if(id==="autoBackupEnabled")c.enabled=el.checked;if(id==="autoBackupInterval")c.interval=Number(el.value);if(id==="cloudBackupEnabled")c.cloudEnabled=el.checked;if(id==="supabaseUrl")c.supabaseUrl=el.value.trim();if(id==="supabaseAnonKey")c.supabaseAnonKey=el.value.trim();if(id==="cloudProvider")c.cloudProvider=el.value;if(id==="googleClientId")c.googleClientId=el.value.trim();if(id==="googleFolderName")c.googleFolderName=el.value.trim()||"Minha Loja - Backups";setAutoCfg(c);renderAutoBackupSettings();scheduleAutoBackup()}));
 document.getElementById("cloudTestBtn")?.addEventListener("click",testCloud);document.getElementById("cloudSyncBtn")?.addEventListener("click",()=>uploadCloudBackup(true));document.getElementById("googleConnectBtn")?.addEventListener("click",connectGoogleDrive);document.getElementById("googleSyncBtn")?.addEventListener("click",()=>uploadGoogleDriveBackup(true));renderAutoBackupSettings();lastBackupFingerprint=dataFingerprint();scheduleAutoBackup();
}


document.getElementById("backupBtn").onclick=downloadBackup;
document.getElementById("exportBtn").onclick=downloadBackup;
document.getElementById("importInput").onchange=e=>{const f=e.target.files[0];if(f)restoreBackupFile(f);e.target.value=""};
document.getElementById("clearBtn").onclick=()=>{if(confirm("Apagar TODOS os produtos, vendas e gastos? Esta ação não pode ser desfeita.")){createSafetyBackup();db={products:[],sales:[],expenses:[]};save();alert("Dados apagados. Um backup de segurança dos dados anteriores foi mantido neste navegador.");}};
renderBackupStatus();
wireAutoBackup();
window.addEventListener("resize",()=>renderDashboard());
renderAll();
["salesSearch","salesMonth","stockSearch","stockStatus","expenseSearch","expenseMonth"].forEach(id=>document.getElementById(id)?.addEventListener("input",()=>{renderSales();renderStock();renderExpenses();}));
document.getElementById("closingDate")?.addEventListener("change",renderClosing);
