const KEY="minha_loja_v1";
const months=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
let db={"products":[],"sales":[],"expenses":[],"users":[]};
try{const raw=localStorage.getItem(KEY); if(raw) db=JSON.parse(raw);}catch(e){console.warn("Armazenamento local indisponível",e);}
if(!Array.isArray(db.products)) db.products=[];
if(!Array.isArray(db.sales)) db.sales=[];
if(!Array.isArray(db.expenses)) db.expenses=[];
if(!Array.isArray(db.users) || !db.users.length) db.users=[{id:"admin",username:"admin",name:"Administrador",role:"admin",passwordHash:"03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4"}]; else { let __admins=db.users.filter(x=>x&&x.role==="admin"); let __keeper=db.users.find(x=>x&&x.username==="admin")||__admins[0]; if(!__keeper){__keeper={id:"admin",username:"admin",name:"Administrador",role:"admin",passwordHash:"03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4"};db.users.unshift(__keeper);} db.users=db.users.map(x=>x===__keeper?{...x,id:"admin",username:"admin",role:"admin",name:x.name||"Administrador"}:{...x,role:"user"}); try{localStorage.setItem(KEY,JSON.stringify(db));}catch(e){} }
let currentUser=null;
try{currentUser=JSON.parse(sessionStorage.getItem("minha_loja_login_session")||"null");}catch(e){}

function save(){
  try{localStorage.setItem(KEY,JSON.stringify(db));localStorage.setItem("minha_loja_local_changed_at",new Date().toISOString());}
  catch(e){alert("O navegador bloqueou o armazenamento local. Abra novamente pelo endereço http://localhost:8080 e permita o armazenamento.");console.error(e);return false;}
  renderAll();
  if(typeof scheduleV138CloudPush==="function") scheduleV138CloudPush();
  return true;
}
function money(v){return "R$ "+Number(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});}
function validSale(s){return !(s?.status==="cancelled"||s?.cancelled===true);}
function saleGroupKey(s){return String(s?.saleGroupId||s?.groupId||s?.id||"");}
function dateBR(s){if(!s)return "";const [y,m,d]=s.split("-");return `${d}/${m}/${y}`;}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function monthName(date){return months[new Date(date+"T12:00:00").getMonth()];}
function currentYear(){return new Date().getFullYear();}
function years(){const ys=new Set([currentYear()]);db.sales.forEach(x=>ys.add(new Date(x.date+"T12:00:00").getFullYear()));db.expenses.forEach(x=>ys.add(new Date(x.date+"T12:00:00").getFullYear()));return [...ys].sort((a,b)=>b-a);}
function selectedYear(){return Number(document.getElementById("yearFilter").value)||currentYear();}


function renderToday(){
  const today=new Date().toISOString().slice(0,10);
  const sales=db.sales.filter(s=>s.date===today&&validSale(s));
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
  const sales=db.sales.filter(x=>new Date(x.date+"T12:00:00").getFullYear()===y&&validSale(x));
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
function stockCurrent(p){return Number(p.initial||0)+Number(p.entries||0)-db.sales.filter(s=>s.productId===p.id&&validSale(s)).reduce((a,s)=>a+Number(s.qty||0),0);}
function drawChart(y){
  const c=document.getElementById("monthlyChart"),ctx=c.getContext("2d"),w=c.clientWidth||700,h=220,dpr=devicePixelRatio||1;
  c.width=w*dpr;c.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  const data=months.map((m,i)=>{const s=db.sales.filter(x=>new Date(x.date+"T12:00:00").getFullYear()===y&&new Date(x.date+"T12:00:00").getMonth()===i&&validSale(x));const e=db.expenses.filter(x=>new Date(x.date+"T12:00:00").getFullYear()===y&&new Date(x.date+"T12:00:00").getMonth()===i);const rev=s.reduce((a,x)=>a+x.qty*x.price,0);const cost=s.reduce((a,x)=>a+x.qty*x.cost,0);return {rev,profit:rev-cost-e.reduce((a,x)=>a+x.value,0)};});
  const max=Math.max(1,...data.map(x=>Math.max(x.rev,Math.abs(x.profit))));
  const pad={l:8,r:8,t:10,b:30},cw=w-pad.l-pad.r,ch=h-pad.t-pad.b;
  if(data.every(x=>x.rev===0&&x.profit===0)){ctx.fillStyle="#6b7280";ctx.font="14px system-ui";ctx.textAlign="center";ctx.fillText("Cadastre uma venda para ver o gráfico",w/2,h/2);return;}
  ctx.font="10px system-ui";ctx.textAlign="center";
  data.forEach((x,i)=>{const x0=pad.l+i*(cw/12)+4,bw=Math.max(5,cw/12-9);const rh=x.rev/max*(ch-15);ctx.fillStyle="#111827";ctx.fillRect(x0,h-pad.b-rh,bw/2,rh);const ph=Math.max(0,x.profit)/max*(ch-15);ctx.fillStyle="#9ca3af";ctx.fillRect(x0+bw/2,h-pad.b-ph,bw/2,ph);ctx.fillStyle="#6b7280";ctx.fillText(months[i].slice(0,3),x0+bw/2,h-10);});
}
function renderYears(){
  const sel=document.getElementById("yearFilter"),old=sel.value;sel.innerHTML=years().map(y=>`<option>${y}</option>`).join("");sel.value=years().includes(Number(old))?old:currentYear();
}
function viewSaleDetailsV137(groupId){
  const gid=String(groupId);
  const rows=db.sales.filter(s=>saleGroupKey(s)===gid);
  if(!rows.length){alert("Venda não encontrada.");return;}
  const cancelled=rows.every(s=>!validSale(s));
  const total=rows.reduce((a,s)=>a+Number(s.qty||0)*Number(s.price||0),0);
  const cost=rows.reduce((a,s)=>a+Number(s.qty||0)*Number(s.cost||0),0);
  const profit=total-cost;
  const payment=esc(rows[0].payment||"Não informado");
  const date=dateBR(rows[0].date);
  const customer=esc(rows[0].customerName||"");
  const list=rows.map(s=>`<div class="item" style="margin-bottom:8px;padding:10px 12px"><div><b>${esc(s.productName||"Produto")}</b><div class="item-sub">${s.qty} un. · ${money(s.price)}/un.</div></div><div><b>${money(Number(s.qty||0)*Number(s.price||0))}</b></div></div>`).join("");
  openModal(cancelled?"Detalhes da venda · Cancelada":"Detalhes da venda",`<div class="form-grid">
    <div class="auto-status" style="grid-column:1/-1"><b>Data:</b> ${date} &nbsp; · &nbsp; <b>Pagamento:</b> ${payment}${customer?` &nbsp; · &nbsp; <b>Cliente:</b> ${customer}`:""}</div>
    <div style="grid-column:1/-1"><div class="panel-title" style="margin-bottom:8px">Itens da venda</div>${list}</div>
    <div class="auto-status" style="grid-column:1/-1">
      <div style="display:flex;justify-content:space-between"><span>Total</span><b>${money(total)}</b></div>
      <div style="display:flex;justify-content:space-between"><span>Custo</span><span>${money(cost)}</span></div>
      <div style="display:flex;justify-content:space-between"><span>Lucro</span><b class="${profit<0?"negative":"positive"}">${money(profit)}</b></div>
      ${cancelled?`<div class="negative" style="margin-top:8px;font-weight:700">❌ Esta venda está cancelada.</div>`:""}
    </div>
    <div class="form-actions"><button type="button" class="secondary" onclick="closeModal()">Fechar</button>${!cancelled?`<button type="button" class="secondary" onclick="downloadSalePdf('${gid}')">📄 PDF A4</button><button type="button" class="secondary" onclick="downloadCompactSalePdf('${gid}')">🧾 PDF compacto</button><button type="button" class="secondary" onclick="printSaleReceipt('${gid}')">🖨️ Imprimir A4</button><button type="button" class="primary" onclick="printCompactSaleReceipt('${gid}')">🧾 Imprimir compacto</button>`:""}</div>
  </div>`);
}

function renderSales(){
  const el=document.getElementById("salesList");
  const q=(document.getElementById("salesSearch")?.value||"").toLowerCase();
  const mo=document.getElementById("salesMonth")?.value||"";
  const all=[...db.sales].sort((a,b)=>b.date.localeCompare(a.date));
  const groups=new Map();
  all.forEach(s=>{
    const key=saleGroupKey(s);
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(s);
  });
  const groupsArr=[...groups.values()].filter(rows=>{
    const matchesDate=rows.some(s=>!mo||s.date.startsWith(mo));
    const matchesSearch=rows.some(s=>{
      const name=String(s.productName||db.products.find(x=>x.id===s.productId)?.name||"").toLowerCase();
      return !q||name.includes(q);
    });
    return matchesDate&&matchesSearch;
  }).sort((a,b)=>b[0].date.localeCompare(a[0].date));

  const validRows=all.filter(validSale);
  const shownValid=validRows.filter(s=>(!mo||s.date.startsWith(mo))&&(!q||String(s.productName||db.products.find(x=>x.id===s.productId)?.name||"").toLowerCase().includes(q)));
  const summary=document.getElementById("salesSummary");
  if(summary){
    const total=shownValid.reduce((a,s)=>a+Number(s.qty||0)*Number(s.price||0),0);
    summary.innerHTML=`<div><span>Vendas exibidas</span><b>${shownValid.length}</b></div><div><span>Total</span><b>${money(total)}</b></div>`;
  }

  el.innerHTML=groupsArr.length?groupsArr.map(rows=>{
    const gid=saleGroupKey(rows[0]);
    const cancelledGroup=rows.every(s=>!validSale(s));
    const total=rows.reduce((a,s)=>a+Number(s.qty||0)*Number(s.price||0),0);
    const lucro=rows.reduce((a,s)=>a+Number(s.qty||0)*(Number(s.price||0)-Number(s.cost||0)),0);
    const items=rows.map(s=>`${esc(s.productName||"Produto")} — ${s.qty} un. · ${money(s.price)}/un.`).join("<br>");
    const payment=esc(rows[0].payment||"Não informado");
    return `<div class="item ${cancelledGroup?"v136-cancelled-item":""}">
      <div>
        <div class="item-title">${rows.length>1?"Venda com "+rows.length+" itens":esc(rows[0].productName||"Produto")}</div>
        <div class="item-sub">${dateBR(rows[0].date)} · ${payment}${rows[0].customerName?` · 👤 ${esc(rows[0].customerName)}`:""}</div>
        <div class="item-sub" style="margin-top:5px">${items}</div>
      </div>
      <div>
        <div class="item-value">${money(total)}</div>
        <div class="item-sub ${lucro<0?"negative":"positive"}">Lucro ${money(lucro)}</div>
        <div class="item-actions">
          <button class="mini" onclick="viewSaleDetailsV137('${gid}')">Ver detalhes</button>
          ${cancelledGroup
            ? `<span class="item-sub negative" style="font-weight:700">❌ Venda cancelada</span>`
            : `${isAdmin()?`<button class="mini" onclick="cancelSaleV136('${gid}')">Cancelar venda</button>`:""}`
          }
        </div>
      </div>
    </div>`;
  }).join(""):`<div class="empty">Nenhuma venda encontrada.</div>`;
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
  const sales=db.sales.filter(s=>s.date===date&&validSale(s));
  const expenses=db.expenses.filter(x=>x.date===date);
  const total=sales.reduce((a,s)=>a+Number(s.qty||0)*Number(s.price||0),0);
  const cost=sales.reduce((a,s)=>a+Number(s.qty||0)*Number(s.cost||0),0);
  const expenseTotal=expenses.reduce((a,x)=>a+Number(x.value||0),0);
  const profit=total-cost;
  const net=profit-expenseTotal;
  const items=sales.reduce((a,s)=>a+Number(s.qty||0),0);
  const payments={};
  sales.forEach(s=>{const k=s.payment||"Não informado";payments[k]=(payments[k]||0)+Number(s.qty||0)*Number(s.price||0);});
  const summary=document.getElementById("closingSummary");
  summary.innerHTML=`
    <div class="closing-card"><span>Faturamento</span><b>${money(total)}</b></div>
    <div class="closing-card"><span>Custo dos produtos</span><b>${money(cost)}</b></div>
    <div class="closing-card"><span>Gastos do dia</span><b>${money(expenseTotal)}</b></div>
    <div class="closing-card"><span>Lucro líquido</span><b class="${net<0?"negative":"positive"}">${money(net)}</b></div>
    <div class="closing-card"><span>Itens vendidos</span><b>${items}</b></div>
    <div class="closing-card"><span>Nº de vendas</span><b>${sales.length}</b></div>`;
  const pe=document.getElementById("closingPayments");
  const order=["Pix","Dinheiro","Cartão","Outro","Não informado"];
  const entries=[...order.filter(k=>payments[k]!==undefined).map(k=>[k,payments[k]]),...Object.entries(payments).filter(([k])=>!order.includes(k))];
  pe.innerHTML=entries.length?entries.map(([k,v])=>`<div class="payment-row"><span>${esc(k)}</span><strong>${money(v)}</strong></div>`).join(""):`<div class="empty">Nenhuma venda neste dia.</div>`;
  document.getElementById("closingFooter").innerHTML=sales.length?`<span>Ticket médio</span><b>${money(total/sales.length)}</b>`:`<span>Selecione uma data para consultar o fechamento.</span>`;
}

function printDailyClosing(){
  const input=document.getElementById("closingDate");
  const date=input?.value||new Date().toISOString().slice(0,10);
  const sales=db.sales.filter(s=>s.date===date&&validSale(s));
  const expenses=db.expenses.filter(x=>x.date===date);
  const total=sales.reduce((a,s)=>a+Number(s.qty||0)*Number(s.price||0),0);
  const cost=sales.reduce((a,s)=>a+Number(s.qty||0)*Number(s.cost||0),0);
  const expenseTotal=expenses.reduce((a,x)=>a+Number(x.value||0),0);
  const net=total-cost-expenseTotal;
  const items=sales.reduce((a,s)=>a+Number(s.qty||0),0);
  const payments={};
  sales.forEach(s=>{const k=s.payment||"Não informado";payments[k]=(payments[k]||0)+Number(s.qty||0)*Number(s.price||0);});
  const groups=new Map();
  sales.forEach(s=>{const k=saleGroupKey(s);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(s);});
  const order=["Pix","Dinheiro","Cartão","Outro","Não informado"];
  const paymentHtml=[...order.filter(k=>payments[k]!==undefined).map(k=>[k,payments[k]]),...Object.entries(payments).filter(([k])=>!order.includes(k))].map(([k,v])=>`<div class="print-line"><span>${esc(k)}</span><b>${money(v)}</b></div>`).join("")||'<div class="print-muted">Nenhuma venda</div>';
  const salesHtml=[...groups.values()].map((rows,i)=>{const t=rows.reduce((a,s)=>a+Number(s.qty||0)*Number(s.price||0),0);const desc=rows.map(s=>`${esc(s.productName||"Produto")} (${s.qty}x)`).join(", ");return `<div class="print-sale"><div><b>Venda ${i+1}</b> · ${esc(rows[0].payment||"Não informado")}</div><div>${desc}</div><strong>${money(t)}</strong></div>`}).join("")||'<div class="print-muted">Nenhuma venda registrada.</div>';
  const html=`<div class="print-doc"><h1>Minha Loja</h1><h2>Fechamento do dia</h2><p>${dateBR(date)}</p><div class="print-summary"><div><span>Faturamento</span><b>${money(total)}</b></div><div><span>Custo produtos</span><b>${money(cost)}</b></div><div><span>Gastos do dia</span><b>${money(expenseTotal)}</b></div><div><span>Lucro líquido</span><b>${money(net)}</b></div><div><span>Itens vendidos</span><b>${items}</b></div><div><span>Nº de vendas</span><b>${sales.length}</b></div></div><h3>Formas de pagamento</h3>${paymentHtml}<h3>Vendas do dia</h3>${salesHtml}<footer>Impresso em ${new Date().toLocaleString("pt-BR")}</footer></div>`;
  openPrintWindow(html,"Fechamento do dia");
}

function downloadDailyClosingPdf(){
  const input=document.getElementById("closingDate");
  const date=input?.value||new Date().toISOString().slice(0,10);
  const sales=db.sales.filter(s=>s.date===date&&validSale(s));
  const expenses=db.expenses.filter(x=>x.date===date);
  const total=sales.reduce((a,s)=>a+Number(s.qty||0)*Number(s.price||0),0);
  const cost=sales.reduce((a,s)=>a+Number(s.qty||0)*Number(s.cost||0),0);
  const expenseTotal=expenses.reduce((a,x)=>a+Number(x.value||0),0);
  const net=total-cost-expenseTotal;
  const items=sales.reduce((a,s)=>a+Number(s.qty||0),0);
  const payments={}; sales.forEach(s=>{const k=s.payment||"Nao informado";payments[k]=(payments[k]||0)+Number(s.qty||0)*Number(s.price||0);});
  const groups=new Map(); sales.forEach(s=>{const k=saleGroupKey(s);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(s);});
  const lines=["MINHA LOJA","FECHAMENTO DO DIA",dateBR(date),"","RESUMO","Faturamento: "+money(total),"Custo dos produtos: "+money(cost),"Gastos do dia: "+money(expenseTotal),"Lucro liquido: "+money(net),"Itens vendidos: "+items,"Numero de vendas: "+sales.length,"","FORMAS DE PAGAMENTO"];
  Object.entries(payments).forEach(([k,v])=>lines.push(k+": "+money(v)));
  lines.push("","VENDAS DO DIA");
  [...groups.values()].forEach((rows,i)=>{const t=rows.reduce((a,s)=>a+Number(s.qty||0)*Number(s.price||0),0); lines.push("Venda "+(i+1)+" - "+(rows[0].payment||"Nao informado")+" - "+money(t)); rows.forEach(s=>lines.push("  "+(s.qty||0)+"x "+(s.productName||"Produto")+" - "+money(Number(s.qty||0)*Number(s.price||0))));});
  lines.push("","Gerado em "+new Date().toLocaleString("pt-BR"));
  downloadSimplePdf(lines,"fechamento-"+date+".pdf");
}

function saleReceiptData(groupId){
  const rows=db.sales.filter(s=>saleGroupKey(s)===String(groupId)&&validSale(s));
  if(!rows.length)return null;
  const total=rows.reduce((a,s)=>a+Number(s.qty||0)*Number(s.price||0),0);
  return {rows,total,customer:esc(rows[0].customerName||"")};
}
function receiptHtml(data,compact=false){
  const {rows,total,customer}=data;
  const items=rows.map(s=>`<div class="receipt-item"><div><b>${esc(s.productName||"Produto")}</b><small>${s.qty} x ${money(s.price)}</small></div><strong>${money(Number(s.qty||0)*Number(s.price||0))}</strong></div>`).join("");
  return `<div class="print-doc receipt ${compact?'receipt-compact':''}><h1>Minha Loja</h1><h2>Comprovante do pedido</h2><p>${dateBR(rows[0].date)}</p>${customer?`<p><b>Cliente:</b> ${customer}</p>`:""}<div class="receipt-items">${items}</div><div class="receipt-total"><span>Total</span><b>${money(total)}</b></div><div class="print-line"><span>Pagamento</span><b>${esc(rows[0].payment||"Não informado")}</b></div><p class="print-muted">Obrigado pela preferência!</p><footer>Este documento é um comprovante do pedido e não substitui nota fiscal eletrônica.</footer></div>`;
}
function printSaleReceipt(groupId){
  const data=saleReceiptData(groupId);
  if(!data){alert("Venda não encontrada ou cancelada.");return;}
  openPrintWindow(receiptHtml(data,false),"Comprovante do pedido",false);
}
function printCompactSaleReceipt(groupId){
  const data=saleReceiptData(groupId);
  if(!data){alert("Venda não encontrada ou cancelada.");return;}
  openPrintWindow(receiptHtml(data,true),"Comprovante compacto",true);
}

function downloadSalePdf(groupId){
  const rows=db.sales.filter(s=>saleGroupKey(s)===String(groupId)&&validSale(s));
  if(!rows.length){alert("Venda nao encontrada ou cancelada.");return;}
  const total=rows.reduce((a,s)=>a+Number(s.qty||0)*Number(s.price||0),0);
  const customer=rows[0].customerName||"";
  const lines=["MINHA LOJA","COMPROVANTE DO PEDIDO",dateBR(rows[0].date),""];
  if(customer) lines.push("Cliente: "+customer,"");
  lines.push("ITENS");
  rows.forEach(s=>lines.push((s.qty||0)+"x "+(s.productName||"Produto")+"  "+money(Number(s.qty||0)*Number(s.price||0))));
  lines.push("","TOTAL: "+money(total),"Pagamento: "+(rows[0].payment||"Nao informado"),"","Obrigado pela preferencia!","","Este documento e um comprovante do pedido e nao substitui nota fiscal eletronica.");
  downloadSimplePdf(lines,"pedido-"+String(groupId).slice(0,8)+".pdf");
}

function downloadCompactSalePdf(groupId){
  const data=saleReceiptData(groupId);
  if(!data){alert("Venda nao encontrada ou cancelada.");return;}
  const {rows,total,customer}=data;
  const lines=["MINHA LOJA","COMPROVANTE DO PEDIDO",dateBR(rows[0].date)];
  if(customer)lines.push("Cliente: "+customer);
  lines.push("------------------------------");
  rows.forEach(s=>lines.push((s.qty||0)+"x "+(s.productName||"Produto"),"   "+money(Number(s.qty||0)*Number(s.price||0))));
  lines.push("------------------------------","TOTAL: "+money(total),"Pagamento: "+(rows[0].payment||"Nao informado"),"","Obrigado pela preferencia!","","Comprovante de pedido - nao substitui nota fiscal.");
  downloadSimplePdf(lines,"pedido-compacto-"+String(groupId).slice(0,8)+".pdf",{width:226.77,height:566.93,fontSize:9,leading:13,left:18,top:540,maxChars:34});
}

function downloadSimplePdf(lines,filename,opts={}){
  const clean=v=>String(v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^\x20-\x7E$]/g,"");
  const escPdf=v=>clean(v).replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)");
  const maxChars=opts.maxChars||82;
  const wrapped=[]; lines.forEach(line=>{let t=clean(line); if(!t){wrapped.push("");return;} while(t.length>maxChars){wrapped.push(t.slice(0,maxChars));t=t.slice(maxChars);} wrapped.push(t);});
  const perPage=opts.perPage||Math.max(1,Math.floor(((opts.height||842)-50)/(opts.leading||16))),pages=[]; for(let i=0;i<wrapped.length;i+=perPage)pages.push(wrapped.slice(i,i+perPage)); if(!pages.length)pages.push([""]);
  const objs=[]; const add=x=>{objs.push(x);return objs.length;}; const font=add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"); const pageIds=[];
  pages.forEach(pg=>{let stream=`BT\n/F1 ${opts.fontSize||11} Tf\n${opts.left||48} ${opts.top||800} Td\n`;pg.forEach((line,i)=>{if(i)stream+=`0 -${opts.leading||16} Td\n`;stream+="("+escPdf(line)+") Tj\n";});stream+="ET";const sid=add("<< /Length "+stream.length+" >>\nstream\n"+stream+"\nendstream");const pid=add("<< /Type /Page /Parent PAGES /MediaBox [0 0 ${(opts.width||595)} ${(opts.height||842)}] /Resources << /Font << /F1 "+font+" 0 R >> >> /Contents "+sid+" 0 R >>");pageIds.push(pid);});
  const pagesObj=add("<< /Type /Pages /Kids ["+pageIds.map(id=>id+" 0 R").join(" ")+"] /Count "+pageIds.length+" >>"); const catalog=add("<< /Type /Catalog /Pages "+pagesObj+" 0 R >>"); pageIds.forEach(id=>objs[id-1]=objs[id-1].replace("PAGES",pagesObj+" 0 R"));
  let pdf="%PDF-1.4\n",offsets=[0];objs.forEach((o,i)=>{offsets[i+1]=pdf.length;pdf+=(i+1)+" 0 obj\n"+o+"\nendobj\n";});const xref=pdf.length;pdf+="xref\n0 "+(objs.length+1)+"\n0000000000 65535 f \n";for(let i=1;i<=objs.length;i++)pdf+=String(offsets[i]).padStart(10,"0")+" 00000 n \n";pdf+="trailer\n<< /Size "+(objs.length+1)+" /Root "+catalog+" 0 R >>\nstartxref\n"+xref+"\n%%EOF";
  const blob=new Blob([pdf],{type:"application/pdf"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=filename; a.rel="noopener"; a.style.display="none"; document.body.appendChild(a); try{a.click();}catch(e){window.open(url,"_blank");} setTimeout(()=>{a.remove();URL.revokeObjectURL(url);},3000);
}
function openPrintWindow(content,title,compact=false){
  const area=document.createElement("div");
  area.id="__minhaLojaPrintArea";
  area.innerHTML=content;
  const style=document.createElement("style");
  style.id="__minhaLojaPrintStyle";
  style.textContent=`@media print{body>*:not(#__minhaLojaPrintArea){display:none!important}#__minhaLojaPrintArea{display:block!important;position:static!important;width:${compact?'72mm':'100%'}!important;max-width:${compact?'72mm':'none'}!important;background:#fff!important;color:#111!important;padding:${compact?'4mm':'20px'}!important;margin:0!important;box-shadow:none!important;border-radius:0!important;font-size:${compact?'11px':'inherit'}!important} @page{size:${compact?'80mm auto':'auto'};margin:${compact?'0':'10mm'}} ${compact?' .receipt-compact{width:72mm!important;max-width:72mm!important}.receipt-compact h1{font-size:18px!important;margin:0 0 4px!important}.receipt-compact h2{font-size:13px!important;margin:0 0 5px!important}.receipt-compact p{margin:3px 0!important}.receipt-compact .receipt-item{padding:5px 0!important}.receipt-compact .receipt-item small{display:block!important}.receipt-compact footer{font-size:8px!important;margin-top:8px!important}.receipt-compact .print-muted{font-size:10px!important}':''}} @media screen{#__minhaLojaPrintArea{position:fixed;z-index:999999;inset:12px;background:#fff;overflow:auto;padding:24px;box-shadow:0 4px 30px rgba(0,0,0,.25);border-radius:12px}#__minhaLojaPrintArea:before{content:'Pré-visualização de impressão';display:block;font-weight:800;margin-bottom:15px}}`;
  document.head.appendChild(style); document.body.appendChild(area);
  setTimeout(()=>{ window.print(); setTimeout(()=>{area.remove();style.remove();},700); },80);
}
function renderReports(){
  const cats={};db.expenses.forEach(x=>cats[x.category||"Sem categoria"]=(cats[x.category||"Sem categoria"]||0)+Number(x.value||0));
  const vals=Object.entries(cats).sort((a,b)=>b[1]-a[1]);const max=vals[0]?.[1]||1;
  document.getElementById("expenseCategories").innerHTML=vals.length?vals.map(([k,v])=>`<div class="report-row"><div style="display:flex;justify-content:space-between"><span>${esc(k)}</span><b>${money(v)}</b></div><div class="bar"><i style="width:${Math.round(v/max*100)}%"></i></div></div>`).join(""):`<div class="empty">Nenhum gasto cadastrado.</div>`;
  const top={};db.sales.filter(validSale).forEach(s=>top[s.productId]=(top[s.productId]||0)+Number(s.qty||0));const tp=Object.entries(top).sort((a,b)=>b[1]-a[1]).slice(0,5);
  document.getElementById("topProducts").innerHTML=tp.length?tp.map(([id,q],i)=>{const p=db.products.find(x=>x.id===id);return `<div class="report-row"><div style="display:flex;justify-content:space-between"><span>${i+1}. ${esc(p?.name||"Produto")}</span><b>${q} un.</b></div></div>`}).join(""):`<div class="empty">Nenhuma venda cadastrada.</div>`;
  const pays={};db.sales.filter(validSale).forEach(s=>{const k=s.payment||"Não informado";pays[k]=(pays[k]||0)+s.qty*s.price});
  const pv=Object.entries(pays).sort((a,b)=>b[1]-a[1]);
  document.getElementById("paymentSummary").innerHTML=pv.length?pv.map(([k,v])=>`<div class="report-row"><div style="display:flex;justify-content:space-between"><span>${esc(k)}</span><b>${money(v)}</b></div></div>`).join(""):`<div class="empty">Nenhuma venda cadastrada.</div>`;

}
function renderAll(){renderYears();renderDashboard();renderSales();renderStock();renderExpenses();renderReports();renderToday();renderClosing();renderUsers();}

function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function openModal(title,html,onSubmit){document.getElementById("modalTitle").textContent=title;const f=document.getElementById("modalForm");f.innerHTML=html;f.onsubmit=async e=>{e.preventDefault();try{const ok=await onSubmit(new FormData(f));if(ok!==false){closeModal();}}catch(err){console.error(err);alert("Não foi possível salvar. Veja o console para detalhes.");}};document.getElementById("modal").classList.remove("hidden");}
function closeModal(){document.getElementById("modal").classList.add("hidden");}
function openSaleForm(){
  const available=db.products.filter(p=>stockCurrent(p)>0);
  if(!db.products.length){alert("Cadastre um produto primeiro.");return;}
  if(!available.length){alert("Não há produtos com estoque disponível para venda.");return;}
  const selected={};
  let searchTerm="";
  const renderRows=()=>{
    const filtered=available.filter(p=>String(p.name||"").toLocaleLowerCase("pt-BR").includes(searchTerm));
    return filtered.map(p=>{
    const stock=stockCurrent(p), price=Number(p.salePrice||0);
    return `<div class="sale-stock-item" data-product-id="${p.id}">
      <label class="sale-check-wrap">
        <input type="checkbox" class="sale-check" data-id="${p.id}" ${Number(selected[p.id]||0)>0?"checked":""}>
        <span class="sale-stock-info"><b>${esc(p.name)}</b><small>Estoque disponível: ${stock} · ${money(price)}</small></span>
      </label>
      <div class="sale-qty-control">
        <button type="button" class="mini sale-minus" data-id="${p.id}" ${Number(selected[p.id]||0)<=0?"disabled":""}>−</button>
        <span class="sale-qty-display" data-id="${p.id}">${Number(selected[p.id]||0)}</span>
        <button type="button" class="mini sale-plus" data-id="${p.id}" ${Number(selected[p.id]||0)>=stock?"disabled":""}>+</button>
      </div>
      <strong class="sale-item-total" data-id="${p.id}">${money(0)}</strong>
    </div>`;
    }).join("") || `<div class="sale-search-empty">Nenhum produto encontrado.</div>`;
  };
  openModal("Registrar venda",`<div class="form-grid">
    <div class="field"><label>Data</label><input name="date" type="date" value="${new Date().toISOString().slice(0,10)}" required></div>
    <div class="field"><label>Forma de pagamento</label><select name="payment" class="select"><option>Pix</option><option>Dinheiro</option><option>Cartão</option><option>Outro</option></select></div>
    <div class="field" style="grid-column:1/-1"><label style="font-weight:800">👤 Cliente <small style="font-weight:400">(opcional)</small></label><input name="customerName" placeholder="Digite o nome do cliente" autocomplete="name" style="font-size:16px"></div>
    <div style="grid-column:1/-1">
      <div class="panel-title" style="margin-bottom:8px">Produtos disponíveis em estoque</div>
      <div class="field" style="margin-bottom:10px">
        <label for="saleProductSearch">Pesquisar produto</label>
        <input id="saleProductSearch" type="search" placeholder="🔎 Digite o nome do produto..." autocomplete="off">
      </div>
      <div class="sale-stock-list" id="saleStockList">${renderRows()}</div>
      <div id="saleGrandTotal" class="auto-status" style="margin-top:12px">Total da venda: <b>${money(0)}</b></div>
    </div>
    <div class="form-actions"><button type="button" class="secondary" onclick="closeModal()">Cancelar</button><button class="primary">Finalizar venda</button></div>
  </div>`,fd=>{
    const items=[];
    Object.keys(selected).forEach(id=>{
      const qty=Number(selected[id]||0); if(qty<1)return;
      const p=db.products.find(x=>x.id===id); if(!p)return;
      const stock=stockCurrent(p); if(qty>stock)throw new Error("Estoque insuficiente para "+p.name);
      items.push({p,qty,price:Number(p.salePrice||0)});
    });
    if(!items.length){alert("Marque pelo menos um produto e escolha a quantidade.");return false;}
    const groupId=uid(),date=fd.get("date"),payment=fd.get("payment"),customerName=String(fd.get("customerName")||"").trim();
    items.forEach(x=>db.sales.push({id:uid(),saleGroupId:groupId,date,productId:x.p.id,productName:x.p.name,qty:x.qty,price:x.price,cost:Number(x.p.cost||0),payment,customerName}));
    return save();
  });
  const totalEl=document.getElementById("saleGrandTotal");
  const bindRows=()=>{
    const list=document.getElementById("saleStockList");
    if(!list)return;
    list.querySelectorAll(".sale-check").forEach(el=>el.onchange=()=>{
      const id=el.dataset.id;
      selected[id]=el.checked?1:0;
      refresh();
    });
    list.querySelectorAll(".sale-minus").forEach(el=>el.onclick=()=>{
      const id=el.dataset.id;
      selected[id]=Math.max(0,Number(selected[id]||0)-1);
      refresh();
    });
    list.querySelectorAll(".sale-plus").forEach(el=>el.onclick=()=>{
      const id=el.dataset.id,p=available.find(x=>x.id===id);
      if(!p)return;
      selected[id]=Math.min(stockCurrent(p),Number(selected[id]||0)+1);
      refresh();
    });
  };
  const refresh=()=>{
    let total=0;
    available.forEach(p=>{
      const id=String(p.id), q=Number(selected[id]||0), price=Number(p.salePrice||0);
      total+=q*price;
      const row=document.querySelector(`.sale-stock-item[data-product-id="${CSS.escape(id)}"]`);
      if(!row)return;
      row.querySelector('.sale-qty-display').textContent=q;
      row.querySelector('.sale-item-total').textContent=money(q*price);
      row.querySelector('.sale-minus').disabled=q<=0;
      row.querySelector('.sale-plus').disabled=q>=stockCurrent(p);
      row.querySelector('.sale-check').checked=q>0;
    });
    totalEl.innerHTML=`Total da venda: <b>${money(total)}</b>`;
    const list=document.getElementById("saleStockList");
    if(list){
      list.querySelectorAll(".sale-stock-item").forEach(row=>{
        const id=row.dataset.productId, p=available.find(x=>String(x.id)===String(id));
        if(!p)return;
        const q=Number(selected[id]||0), stock=stockCurrent(p);
        const cb=row.querySelector(".sale-check"), qty=row.querySelector(".sale-qty-display"), minus=row.querySelector(".sale-minus"), plus=row.querySelector(".sale-plus"), it=row.querySelector(".sale-item-total");
        if(cb)cb.checked=q>0; if(qty)qty.textContent=q; if(minus)minus.disabled=q<=0; if(plus)plus.disabled=q>=stock; if(it)it.textContent=money(q*Number(p.salePrice||0));
      });
    }
  };
  const search=document.getElementById("saleProductSearch");
  if(search)search.addEventListener("input",()=>{
    searchTerm=String(search.value||"").trim().toLocaleLowerCase("pt-BR");
    const list=document.getElementById("saleStockList");
    if(list){list.innerHTML=renderRows();bindRows();}
  });
  bindRows();

  refresh();
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
async function hashPassword(password){const data=new TextEncoder().encode(String(password));const hash=await crypto.subtle.digest("SHA-256",data);return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,"0")).join("");}
function isAdmin(){return currentUser?.role==="admin";}
function currentUserRecord(){return currentUser?db.users.find(x=>x.id===currentUser.id):null;}
function renderUsers(){
  const me=document.getElementById("currentUserInfo");
  const add=document.getElementById("addUserBtn");
  const el=document.getElementById("usersList");
  if(me) me.innerHTML=currentUser?`Conectado como <b>${esc(currentUser.name||currentUser.username)}</b> · ${isAdmin()?"Administrador":"Usuário"}`:"";
  if(!el)return;
  if(add) add.style.display=isAdmin()?"":"none";
  if(isAdmin()){
    el.innerHTML=db.users.map(u=>`<div class="item"><div><div class="item-title">${esc(u.name||u.username)} ${u.id==='admin'?'<span class="small-note">👑 Administrador principal</span>':''}</div><div class="item-sub">@${esc(u.username)} · ${u.role==='admin'?'Administrador':'Usuário'}</div></div><div class="item-actions"><button class="mini" onclick="editUser('${u.id}')">Editar</button>${u.id!=='admin'?`<button class="mini" onclick="deleteUser('${u.id}')">Excluir</button>`:''}</div></div>`).join('');
  }else{
    const u=currentUserRecord();
    el.innerHTML=u?`<div class="item"><div><div class="item-title">Minha conta</div><div class="item-sub">@${esc(u.username)} · Você pode alterar apenas seus próprios dados.</div></div><div class="item-actions"><button class="mini" onclick="editMyUser()">Editar meus dados</button></div></div>`:'<div class="empty">Faça login para acessar sua conta.</div>';
  }
}
function openUserForm(id){
  if(!isAdmin()){alert('Você só pode alterar os dados da sua própria conta.');return;}
  const u=db.users.find(x=>x.id===id)||{id:'',username:'',name:'',role:'user'};
  openModal(id?'Editar usuário':'Novo usuário',`<div class="form-grid"><div class="field"><label>Nome</label><input name="name" value="${esc(u.name||'')}" required></div><div class="field"><label>Usuário</label><input name="username" value="${esc(u.username||'')}" required autocomplete="off"></div><div class="field"><label>Perfil</label><input value="${u.id==='admin'?'Administrador principal':'Usuário'}" disabled><input type="hidden" name="role" value="user"></div><div class="field"><label>${id?'Nova senha (deixe em branco para manter)':'Senha'}</label><input name="password" type="password" minlength="4" ${id?'':'required'} autocomplete="new-password"></div><div class="form-actions"><button type="button" class="secondary" onclick="closeModal()">Cancelar</button><button class="primary">Salvar usuário</button></div></div>`,async fd=>{
    const username=fd.get('username').trim().toLowerCase(),name=fd.get('name').trim(),password=fd.get('password');
    if(!/^[a-z0-9._-]{3,30}$/.test(username)){alert('Use um usuário com pelo menos 3 caracteres, sem espaços.');return false;}
    if(db.users.some(x=>x.username===username&&x.id!==u.id)){alert('Esse usuário já existe.');return false;}
    if(!id&&!password){alert('Informe uma senha.');return false;}
    const obj={id:u.id||uid(),username,name,role:u.id==='admin'?'admin':'user',passwordHash:u.passwordHash||''};
    if(password)obj.passwordHash=await hashPassword(password);
    if(id){const i=db.users.findIndex(x=>x.id===id);db.users[i]=obj;}else db.users.push(obj);
    if(currentUser?.id===id){currentUser={id:obj.id,username:obj.username,name:obj.name,role:obj.role};try{sessionStorage.setItem('minha_loja_login_session',JSON.stringify(currentUser));}catch(e){}}
    return save();
  });
}
function editUser(id){if(!isAdmin()){alert('Acesso permitido somente ao administrador.');return;}openUserForm(id)}
function editMyUser(){if(!currentUser){return}openMyUserForm(currentUser.id)}
function openMyUserForm(id){
  const u=db.users.find(x=>x.id===id); if(!u||!currentUser||currentUser.id!==id){alert('Você só pode alterar seus próprios dados.');return;}
  openModal('Minha conta',`<div class="form-grid"><div class="field"><label>Nome</label><input name="name" value="${esc(u.name||'')}" required></div><div class="field"><label>Usuário</label><input name="username" value="${esc(u.username||'')}" required autocomplete="off"></div><div class="field"><label>Perfil</label><input value="${u.role==='admin'?'Administrador principal':'Usuário'}" disabled></div><div class="field"><label>Nova senha (deixe em branco para manter)</label><input name="password" type="password" minlength="4" autocomplete="new-password"></div><div class="form-actions"><button type="button" class="secondary" onclick="closeModal()">Cancelar</button><button class="primary">Salvar meus dados</button></div></div>`,async fd=>{
    const username=fd.get('username').trim().toLowerCase(),name=fd.get('name').trim(),password=fd.get('password');
    if(!/^[a-z0-9._-]{3,30}$/.test(username)){alert('Use um usuário com pelo menos 3 caracteres, sem espaços.');return false;}
    if(db.users.some(x=>x.username===username&&x.id!==u.id)){alert('Esse usuário já existe.');return false;}
    const obj={...u,username,name}; if(password)obj.passwordHash=await hashPassword(password);
    const i=db.users.findIndex(x=>x.id===id); db.users[i]=obj;
    currentUser={id:obj.id,username:obj.username,name:obj.name,role:obj.role};
    try{sessionStorage.setItem('minha_loja_login_session',JSON.stringify(currentUser));if(localStorage.getItem('minha_loja_login_remember')==='1')localStorage.setItem('minha_loja_login_session',JSON.stringify(currentUser));}catch(e){}
    return save();
  });
}
function deleteUser(id){if(!isAdmin()||id==='admin'){if(id==='admin')alert('O administrador principal não pode ser excluído nem transformado em usuário.');return;}const u=db.users.find(x=>x.id===id);if(u&&confirm(`Excluir o usuário "${u.username}"?`)){db.users=db.users.filter(x=>x.id!==id);save();}}
function logout(){try{sessionStorage.removeItem("minha_loja_login_session");localStorage.removeItem("minha_loja_login_session");localStorage.removeItem("minha_loja_login_remember");}catch(e){} location.reload();}

function deleteProduct(id){if(db.sales.some(x=>x.productId===id)){alert("Este produto possui vendas registradas. Exclua as vendas primeiro ou mantenha o produto cadastrado.");return}if(confirm("Excluir este produto?")){db.products=db.products.filter(x=>x.id!==id);save()}}
function backupPayload(){
  return {app:"Minha Loja",version:"V13.8",createdAt:new Date().toISOString(),data:{products:db.products||[],sales:db.sales||[],expenses:db.expenses||[],users:db.users||[]}};
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
  return {products:d.products,sales:d.sales,expenses:d.expenses,users:Array.isArray(d.users)&&d.users.length?d.users:[{id:"admin",username:"admin",name:"Administrador",role:"admin",passwordHash:"03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4"}]};
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
function getAutoCfg(){try{return Object.assign({enabled:false,interval:20,cloudEnabled:false,supabaseUrl:"",supabaseAnonKey:"",cloudProvider:"supabase",googleClientId:"",googleFolderName:"Minha Loja - Backups",syncEnabled:false,syncCode:"",syncUpdatedAt:""},JSON.parse(localStorage.getItem(AUTO_CFG_KEY)||"{}"));}catch(e){return {enabled:false,interval:20,cloudEnabled:false,supabaseUrl:"",supabaseAnonKey:"",cloudProvider:"supabase",googleClientId:"",googleFolderName:"Minha Loja - Backups",syncEnabled:false,syncCode:"",syncUpdatedAt:""}}}
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
async function uploadCloudBackup(showAlert=true){const c=getAutoCfg(),url=normalizeUrl(c.supabaseUrl),key=String(c.supabaseAnonKey||"").trim();if(!url||!key){if(showAlert)alert("Preencha a URL do Supabase e a chave pública anon.");return false}try{const r=await fetch(url+"/rest/v1/app_backups",{method:"POST",headers:{"Content-Type":"application/json","apikey":key,"Prefer":"return=minimal"},body:JSON.stringify({backup:backupPayload(),created_at:new Date().toISOString()})});if(!r.ok)throw new Error(await r.text());try{localStorage.setItem("minha_loja_cloud_last_backup",new Date().toISOString())}catch(e){}renderAutoBackupSettings();if(showAlert)alert("Backup salvo na nuvem com sucesso!");return true}catch(e){console.error(e);if(showAlert)alert("Não foi possível salvar na nuvem. Confira a URL, a chave anon e as políticas da tabela app_backups.");return false}}
async function testCloud(){
  const c=getAutoCfg(),url=normalizeUrl(c.supabaseUrl),key=String(c.supabaseAnonKey||"").trim();
  if(!url||!key){
    alert("Preencha a URL do Supabase e a chave pública.");
    return;
  }
  try{
    const r=await fetch(url+"/rest/v1/app_backups?select=id&limit=1",{
      headers:{apikey:key,Accept:"application/json"}
    });
    const body=await r.text();
    if(!r.ok){
      alert("Supabase respondeu HTTP "+r.status+"\\n\\n"+body);
      return;
    }
    alert("Conexão OK!\\n\\nHTTP "+r.status);
  }catch(e){
    console.error(e);
    alert("Erro de rede/CORS:\\n\\n"+(e.message||e));
  }
}
let googleAccessToken=null;
let googleTokenClient=null;
const GDRIVE_SCOPE="https://www.googleapis.com/auth/drive.file";
function renderGoogleDriveStatus(msg){const el=document.getElementById("googleDriveStatus");if(!el)return;const c=getAutoCfg();el.innerHTML=msg|| (googleAccessToken?"<b>Google Drive conectado.</b>":(c.googleClientId?"Client ID configurado. Toque em Conectar Google Drive.":"Configure o Client ID OAuth do Google."));}
function initGoogleTokenClient(){const c=getAutoCfg();if(!c.googleClientId){alert("Informe o Client ID OAuth do Google primeiro.");return false}if(!window.google||!google.accounts||!google.accounts.oauth2){alert("A biblioteca do Google ainda está carregando. Aguarde alguns segundos e tente novamente.");return false}googleTokenClient=google.accounts.oauth2.initTokenClient({client_id:c.googleClientId,scope:GDRIVE_SCOPE,callback:(resp)=>{if(resp.error){renderGoogleDriveStatus("Falha na autorização do Google.");return}googleAccessToken=resp.access_token;renderGoogleDriveStatus("<b>Google Drive conectado.</b>");}});return true}
function connectGoogleDrive(){if(!initGoogleTokenClient())return;googleTokenClient.requestAccessToken({prompt:"consent"});}
async function ensureGoogleToken(){if(googleAccessToken)return true;if(!initGoogleTokenClient())return false;return new Promise(resolve=>{const old=googleTokenClient.callback;googleTokenClient.callback=(resp)=>{if(resp.error){resolve(false);return}googleAccessToken=resp.access_token;resolve(true)};googleTokenClient.requestAccessToken({prompt:""})})}
async function driveFindOrCreateFolder(){const c=getAutoCfg();const name=(c.googleFolderName||"Minha Loja - Backups").trim();const q=`name='${name.replace(/'/g,"\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;let r=await fetch("https://www.googleapis.com/drive/v3/files?spaces=drive&q="+encodeURIComponent(q)+"&fields=files(id,name)&pageSize=10",{headers:{Authorization:"Bearer "+googleAccessToken}});if(!r.ok)throw new Error(await r.text());let d=await r.json();if(d.files&&d.files[0])return d.files[0].id;r=await fetch("https://www.googleapis.com/drive/v3/files",{method:"POST",headers:{Authorization:"Bearer "+googleAccessToken,"Content-Type":"application/json"},body:JSON.stringify({name,mimeType:"application/vnd.google-apps.folder"})});if(!r.ok)throw new Error(await r.text());d=await r.json();return d.id}
async function uploadGoogleDriveBackup(showAlert=true){if(!(await ensureGoogleToken())){if(showAlert)alert("Não foi possível conectar ao Google Drive.");return false}try{const folderId=await driveFindOrCreateFolder();const payload=JSON.stringify(backupPayload(),null,2);const fileName=`backup-minha-loja-${new Date().toISOString().replace(/[:.]/g,"-")}.json`;const metadata={name:fileName,parents:[folderId],mimeType:"application/json"};
// Cria primeiro os metadados e depois envia o conteúdo. Isso evita problemas de multipart em alguns navegadores móveis.
let r=await fetch("https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink",{method:"POST",headers:{Authorization:"Bearer "+googleAccessToken,"Content-Type":"application/json"},body:JSON.stringify(metadata)});if(!r.ok)throw new Error("Criação do arquivo: "+await r.text());let d=await r.json();
// Envia o JSON do backup para o arquivo recém-criado.
r=await fetch("https://www.googleapis.com/upload/drive/v3/files/"+encodeURIComponent(d.id)+"?uploadType=media",{method:"PATCH",headers:{Authorization:"Bearer "+googleAccessToken,"Content-Type":"application/json"},body:payload});if(!r.ok)throw new Error("Envio do conteúdo: "+await r.text());
try{localStorage.setItem("minha_loja_cloud_last_backup",new Date().toISOString())}catch(e){}renderAutoBackupSettings();renderGoogleDriveStatus(`<b>Backup enviado ao Google Drive.</b><br>${d.name||fileName}`);if(showAlert)alert("Backup salvo no Google Drive com sucesso!");return true}catch(e){console.error("Google Drive backup error:",e);const detail=(e&&e.message)?e.message:String(e);renderGoogleDriveStatus("Falha no Google Drive.<br><small>"+detail.replace(/</g,"&lt;").replace(/>/g,"&gt;")+"</small>");if(showAlert)alert("Não foi possível salvar no Google Drive.\n\n"+detail);return false}}

/* V13.8 — sincronização online entre dispositivos usando a tabela app_backups já existente */
let v138PushTimer=null;
let v138ApplyingCloud=false;
function getSyncCode(){const c=getAutoCfg();return String(c.syncCode||'').trim().toUpperCase();}
function setSyncConfig(patch){const c=getAutoCfg();Object.assign(c,patch);setAutoCfg(c);renderV138SyncStatus();return c;}
function makeSyncCode(){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s='';
  try{const a=new Uint32Array(12);crypto.getRandomValues(a);for(let i=0;i<a.length;i++)s+=chars[a[i]%chars.length];}
  catch(e){for(let i=0;i<12;i++)s+=chars[Math.floor(Math.random()*chars.length)];}
  return s.slice(0,4)+'-'+s.slice(4,8)+'-'+s.slice(8,12);
}
function syncPayloadV138(){
  const c=getAutoCfg();
  return {app:'Minha Loja',version:'V13.8',syncCode:String(c.syncCode||'').toUpperCase(),updatedAt:new Date().toISOString(),data:{products:db.products||[],sales:db.sales||[],expenses:db.expenses||[],users:db.users||[]}};
}
function renderV138SyncStatus(msg){
  const el=document.getElementById('cloudSyncStatusV138'); if(!el)return;
  const c=getAutoCfg(), code=String(c.syncCode||'');
  let local='';try{local=localStorage.getItem('minha_loja_local_changed_at')||''}catch(e){}
  el.innerHTML=msg || (code?`<b>Código da loja:</b> ${esc(code)}<br><b>Sincronização automática:</b> ${c.syncEnabled?'Ativada':'Desativada'}${local?`<br>Última alteração neste aparelho: <b>${new Date(local).toLocaleString('pt-BR')}</b>`:''}`:'Gere ou informe o código da loja para começar.');
}
function scheduleV138CloudPush(){
  const c=getAutoCfg();
  if(!c.syncEnabled||!c.supabaseUrl||!c.supabaseAnonKey||!c.syncCode||v138ApplyingCloud)return;
  clearTimeout(v138PushTimer);
  v138PushTimer=setTimeout(()=>pushCloudV138(false),1800);
}
async function pushCloudV138(showAlert=true){
  const c=getAutoCfg(),url=normalizeUrl(c.supabaseUrl),key=String(c.supabaseAnonKey||'').trim(),code=String(c.syncCode||'').trim().toUpperCase();
  if(!url||!key){if(showAlert)alert('Configure a URL do Supabase e a chave pública anon em Backup na nuvem.');return false;}
  if(!code){if(showAlert)alert('Informe ou gere o código da loja antes de sincronizar.');return false;}
  try{
    const payload=syncPayloadV138();
    const r=await fetch(url+'/rest/v1/app_backups',{method:'POST',headers:{'Content-Type':'application/json','apikey':key,'Prefer':'return=minimal'},body:JSON.stringify({backup:payload,created_at:payload.updatedAt})});
    if(!r.ok)throw new Error(await r.text());
    setSyncConfig({syncUpdatedAt:payload.updatedAt});
    try{localStorage.setItem('minha_loja_cloud_sync_at',payload.updatedAt)}catch(e){}
    renderV138SyncStatus(`<b>☁️ Dados enviados para a nuvem.</b><br>${new Date(payload.updatedAt).toLocaleString('pt-BR')}`);
    if(showAlert)alert('Dados enviados para a nuvem com sucesso!');
    return true;
  }catch(e){console.error(e);renderV138SyncStatus('Falha ao enviar para a nuvem. Confira URL, chave anon e políticas da tabela app_backups.');if(showAlert)alert('Não foi possível sincronizar.\n\n'+(e.message||e));return false;}
}
async function fetchCloudV138(){
  const c=getAutoCfg(),url=normalizeUrl(c.supabaseUrl),key=String(c.supabaseAnonKey||'').trim(),code=String(c.syncCode||'').trim().toUpperCase();
  if(!url||!key)throw new Error('Configure a URL e a chave pública anon.');
  if(!code)throw new Error('Informe o código da loja.');
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),20000);
  try{
    // Filtra no próprio Supabase para não baixar dezenas de backups grandes.
    const q=url+'/rest/v1/app_backups?select=backup,created_at&backup->>syncCode=eq.'+encodeURIComponent(code)+'&order=created_at.desc&limit=1';
    const r=await fetch(q,{headers:{apikey:key,Accept:'application/json'},signal:controller.signal,cache:'no-store'});
    if(!r.ok)throw new Error('Supabase HTTP '+r.status+': '+(await r.text()));
    const rows=await r.json();
    const match=rows?.[0]?.backup;
    if(!match||!match.data)throw new Error('Nenhum dado encontrado para esse código da loja. Primeiro envie os dados do aparelho que possui a loja correta.');
    return match;
  }catch(e){
    if(e?.name==='AbortError')throw new Error('O download demorou mais de 20 segundos. Verifique a conexão com a internet e tente novamente.');
    throw e;
  }finally{clearTimeout(timer);}
}
function localChangedAt(){try{return localStorage.getItem('minha_loja_local_changed_at')||''}catch(e){return ''}}
async function pullCloudV138(showAlert=true,fromLogin=false){
  try{
    const cloud=await fetchCloudV138();
    const lt=Date.parse(localChangedAt())||0, ct=Date.parse(cloud.updatedAt)||0;
    if(!fromLogin && lt && ct && lt>ct){
      const ok=confirm('Este aparelho tem alterações mais recentes que a nuvem.\n\nDeseja substituir os dados deste aparelho pelos dados da nuvem?');
      if(!ok)return false;
    }else if(!fromLogin && lt===ct){
      if(showAlert)alert('Este aparelho já está atualizado.');return true;
    }else if(fromLogin && lt && ct && lt>ct){
      const ok=confirm('A nuvem está mais antiga que os dados deste aparelho.\n\nDeseja manter os dados deste aparelho e enviá-los para a nuvem?');
      if(ok){return await pushCloudV138(showAlert);}
      return false;
    }
    v138ApplyingCloud=true;
    const d=cloud.data;
    if(!Array.isArray(d.products)||!Array.isArray(d.sales)||!Array.isArray(d.expenses))throw new Error('Dados da nuvem inválidos.');
    const safeUsers=Array.isArray(d.users)&&d.users.length?d.users:db.users;
    createSafetyBackup();
    db={products:d.products,sales:d.sales,expenses:d.expenses,users:safeUsers};
    try{localStorage.setItem(KEY,JSON.stringify(db));localStorage.setItem('minha_loja_local_changed_at',cloud.updatedAt||new Date().toISOString());localStorage.setItem('minha_loja_cloud_sync_at',cloud.updatedAt||'')}catch(e){}
    setSyncConfig({syncUpdatedAt:cloud.updatedAt||''});
    renderAll();
    v138ApplyingCloud=false;
    renderV138SyncStatus(`<b>☁️ Dados baixados da nuvem.</b><br>${cloud.updatedAt?new Date(cloud.updatedAt).toLocaleString('pt-BR'):''}`);
    if(showAlert)alert('Dados da nuvem carregados neste aparelho com sucesso!');
    return true;
  }catch(e){v138ApplyingCloud=false;console.error(e);renderV138SyncStatus('Falha ao baixar dados. '+(e.message||''));if(showAlert)alert('Não foi possível baixar os dados da nuvem.\n\n'+(e.message||e));return false;}
}
function openCloudSetupV138(){
  const c=getAutoCfg();
  const box=document.createElement('div');box.id='v138SetupOverlay';box.className='modal';
  box.innerHTML=`<div class="modal-box"><div class="modal-head"><h2>🌐 Conectar minha loja</h2><button class="close" type="button" id="v138SetupClose">×</button></div><div style="padding:4px 0 10px"><p class="muted">Use a mesma URL, chave pública anon e código da loja usados no outro aparelho.</p><div class="cloud-fields"><input id="v138SetupUrl" type="text" placeholder="URL do projeto Supabase" value="${esc(c.supabaseUrl||'')}"><input id="v138SetupKey" type="text" placeholder="Chave pública anon" value="${esc(c.supabaseAnonKey||'')}"><input id="v138SetupCode" type="text" placeholder="Código da loja (ex.: ABCD-EFGH-IJKL)" value="${esc(c.syncCode||'')}"></div><button class="primary" type="button" id="v138SetupPull" style="width:100%;margin-top:14px">⬇️ Baixar minha loja da nuvem</button><p class="small-note">Depois do download, o aparelho terá os mesmos produtos, vendas, gastos e usuários da loja.</p></div></div>`;
  document.body.appendChild(box);box.classList.remove('hidden');
  const close=()=>box.remove();document.getElementById('v138SetupClose').onclick=close;
  document.getElementById('v138SetupPull').onclick=async()=>{
    const btn=document.getElementById('v138SetupPull');
    const url=document.getElementById('v138SetupUrl').value.trim(),key=document.getElementById('v138SetupKey').value.trim(),code=document.getElementById('v138SetupCode').value.trim().toUpperCase();
    if(!url||!key||!code){alert('Preencha os três campos.');return;}
    if(btn){btn.disabled=true;btn.textContent='⏳ Baixando dados...';btn.style.opacity='.65';}
    setSyncConfig({supabaseUrl:url,supabaseAnonKey:key,syncCode:code});
    const ok=await pullCloudV138(true,true);
    if(ok){close();location.reload();}
    else if(btn){btn.disabled=false;btn.textContent='⬇️ Baixar minha loja da nuvem';btn.style.opacity='1';}
  };
}
window.openCloudSetupV138=openCloudSetupV138;
// V14.3: garante que o acesso pela tela de login funcione mesmo se o usuário tocar antes da inicialização completa do app.
if(window.__openCloudWhenReady){window.__openCloudWhenReady=false;setTimeout(()=>openCloudSetupV138(),0);}
const loginCloudButton=document.getElementById('loginCloudButton');
if(loginCloudButton){loginCloudButton.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();openCloudSetupV138();});loginCloudButton.disabled=false;loginCloudButton.style.pointerEvents='auto';loginCloudButton.style.position='relative';loginCloudButton.style.zIndex='2';}

function wireV138Sync(){
  const codeEl=document.getElementById('syncStoreCode'),enEl=document.getElementById('cloudSyncEnabledV138');
  const c=getAutoCfg(); if(codeEl)codeEl.value=c.syncCode||''; if(enEl)enEl.checked=!!c.syncEnabled;
  codeEl?.addEventListener('change',()=>setSyncConfig({syncCode:codeEl.value.trim().toUpperCase()}));
  enEl?.addEventListener('change',()=>{setSyncConfig({syncEnabled:enEl.checked});if(enEl.checked)scheduleV138CloudPush();});
  document.getElementById('generateSyncCodeBtn')?.addEventListener('click',()=>{if(!isAdmin()){alert('Somente o administrador pode gerar o código da loja.');return;}const code=makeSyncCode();if(codeEl)codeEl.value=code;setSyncConfig({syncCode:code});alert('Código da loja gerado:\n\n'+code+'\n\nUse esse mesmo código nos outros aparelhos.');});
  document.getElementById('copySyncCodeBtn')?.addEventListener('click',async()=>{const code=getSyncCode();if(!code){alert('Gere ou informe o código primeiro.');return;}try{await navigator.clipboard.writeText(code);alert('Código copiado.');}catch(e){alert('Código da loja: '+code);}});
  document.getElementById('pushCloudBtnV138')?.addEventListener('click',()=>pushCloudV138(true));
  document.getElementById('pullCloudBtnV138')?.addEventListener('click',()=>pullCloudV138(true,false));
  renderV138SyncStatus();
}

function wireAutoBackup(){
 ["autoBackupEnabled","autoBackupInterval","cloudBackupEnabled","supabaseUrl","supabaseAnonKey","cloudProvider","googleClientId","googleFolderName"].forEach(id=>document.getElementById(id)?.addEventListener("change",()=>{const c=getAutoCfg(),el=document.getElementById(id);if(id==="autoBackupEnabled")c.enabled=el.checked;if(id==="autoBackupInterval")c.interval=Number(el.value);if(id==="cloudBackupEnabled")c.cloudEnabled=el.checked;if(id==="supabaseUrl")c.supabaseUrl=el.value.trim();if(id==="supabaseAnonKey")c.supabaseAnonKey=el.value.trim();if(id==="cloudProvider")c.cloudProvider=el.value;if(id==="googleClientId")c.googleClientId=el.value.trim();if(id==="googleFolderName")c.googleFolderName=el.value.trim()||"Minha Loja - Backups";setAutoCfg(c);renderAutoBackupSettings();scheduleAutoBackup()}));
 document.getElementById("cloudTestBtn")?.addEventListener("click",testCloud);document.getElementById("cloudSyncBtn")?.addEventListener("click",()=>uploadCloudBackup(true));document.getElementById("googleConnectBtn")?.addEventListener("click",connectGoogleDrive);document.getElementById("googleSyncBtn")?.addEventListener("click",()=>uploadGoogleDriveBackup(true));renderAutoBackupSettings();lastBackupFingerprint=dataFingerprint();scheduleAutoBackup();
}


document.getElementById("backupBtn").onclick=downloadBackup;
document.getElementById("exportBtn").onclick=downloadBackup;
document.getElementById("importInput").onchange=e=>{const f=e.target.files[0];if(f)restoreBackupFile(f);e.target.value=""};
document.getElementById("clearBtn").onclick=()=>{if(!isAdmin()){alert("Somente o administrador pode apagar todos os dados.");return;}if(confirm("Apagar TODOS os produtos, vendas e gastos? Esta ação não pode ser desfeita.")){createSafetyBackup();db={products:[],sales:[],expenses:[],users:db.users||[]};save();alert("Dados apagados. Um backup de segurança dos dados anteriores foi mantido neste navegador.");}};
renderBackupStatus();
wireAutoBackup();
wireV138Sync();
window.addEventListener("resize",()=>renderDashboard());
renderAll();
["salesSearch","salesMonth","stockSearch","stockStatus","expenseSearch","expenseMonth"].forEach(id=>document.getElementById(id)?.addEventListener("input",()=>{renderSales();renderStock();renderExpenses();}));
document.getElementById("closingDate")?.addEventListener("change",renderClosing);

// V13.2 — acesso e usuários
document.getElementById("addUserBtn")?.addEventListener("click",()=>openUserForm());
document.getElementById("logoutBtn")?.addEventListener("click",logout);
window.onMinhaLojaLogin=function(user){currentUser=user;renderUsers();setTimeout(()=>{const c=getAutoCfg();if(c.syncEnabled&&c.syncCode&&c.supabaseUrl&&c.supabaseAnonKey)pullCloudV138(false,true);},700);};
try{if(!currentUser){const x=sessionStorage.getItem("minha_loja_login_session");if(x)currentUser=JSON.parse(x);}}catch(e){}


/* V13.6 — Cancelamento de venda / devolução automática de estoque */
window.cancelSaleV136=function(groupId){
  if(!isAdmin()){alert("Somente o administrador pode cancelar vendas.");return;}
  const gid=String(groupId);
  const rows=db.sales.filter(s=>saleGroupKey(s)===gid);
  if(!rows.length){alert("Venda não encontrada.");return;}
  if(rows.every(s=>!validSale(s))){alert("Essa venda já está cancelada.");return;}
  const total=rows.reduce((a,s)=>a+Number(s.qty||0)*Number(s.price||0),0);
  if(!confirm(`Cancelar esta venda de ${money(total)}?\n\nOs produtos serão devolvidos ao estoque.`))return;
  rows.forEach(s=>{
    if(!validSale(s)){
      return;
    }
    s.status="cancelled";
    s.cancelled=true;
    s.cancelledAt=new Date().toISOString();
  });
  save();
};
