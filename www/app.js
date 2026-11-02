'use strict';
const $=s=>document.querySelector(s);
const MES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const CATS0=['Vivienda','Servicios','Crédito','Junta','Transporte','Otros'];
const KEY='finanzaspro.v1';
const pad=n=>String(n).padStart(2,'0');
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const today=()=>iso(new Date());
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

let S=load();
function load(){
  try{const d=JSON.parse(localStorage.getItem(KEY));if(d&&d.gastos)return d}catch(e){}
  return {gastos:[],hist:[],cfg:{moneda:'S/',hora:'09:00',antes:true,mismoDia:true,diario:true,sonido:true,tema:'dark',pin:'',cats:CATS0.slice()}};
}
function save(){localStorage.setItem(KEY,JSON.stringify(S));scheduleAll()}
const money=n=>`${S.cfg.moneda} ${Number(n).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const estado=g=>g.pagado?'pagado':(g.venc<today()?'vencido':'pendiente');
const ECOL={pagado:'ok',pendiente:'warn',vencido:'bad'};
const pill=g=>`<span class="pill ${ECOL[estado(g)]}">${estado(g)}</span>`;
const fmtD=s=>{const [y,m,d]=s.split('-');return `${+d} ${MES[m-1].slice(0,3)} ${y}`};
const tot=l=>l.reduce((a,g)=>a+g.monto,0);

let view='inicio',Y=new Date().getFullYear(),M=new Date().getMonth(),filt={q:'',cat:'',est:''};

/* ---------- navegación ---------- */
const TABS=[['inicio','🏠','Inicio'],['meses','📅','Meses'],['calendario','🗓','Calendario'],['totales','📊','Totales'],['ajustes','⚙','Ajustes']];
function go(v){view=v;render()}
function render(){
  document.body.classList.toggle('light',S.cfg.tema==='light');
  $('#nav').innerHTML=TABS.map(t=>`<button class="${view===t[0]?'on':''}" onclick="go('${t[0]}')"><span>${t[1]}</span>${t[2]}</button>`).join('');
  $('#title').textContent=(TABS.find(t=>t[0]===view)||[,,'Finanzas Pro'])[2];
  $('#view').innerHTML=({inicio:vInicio,meses:vMeses,calendario:vCal,totales:vTot,ajustes:vAjustes})[view]();
}
const inMonth=(y,m)=>S.gastos.filter(g=>{const [a,b]=g.venc.split('-');return +a===y&&+b-1===m});
const inYear=y=>S.gastos.filter(g=>+g.venc.slice(0,4)===y);

function resumen(l){const p=tot(l.filter(g=>g.pagado));return{t:tot(l),p,pen:tot(l)-p,n:l.length,pct:l.length&&tot(l)?Math.round(p/tot(l)*100):0}}

function rowG(g){return `<div class="row" onclick="openForm('${g.id}')"><div><b>${esc(g.nombre)}</b> ${pill(g)}<div class="mut" style="font-size:12px">${esc(g.cat)} · vence ${fmtD(g.venc)}${g.pagado?' · pagado '+fmtD(g.fechaPago):''}</div></div><div style="text-align:right"><b>${money(g.monto)}</b><br>${g.pagado?`<button class="sec sm" onclick="event.stopPropagation();pay('${g.id}',false)">Revertir</button>`:`<button class="pri sm" onclick="event.stopPropagation();pay('${g.id}',true)">Pagar</button>`}</div></div>`}

function vInicio(){
  const l=inMonth(Y,M),r=resumen(l),t=today();
  const venc=S.gastos.filter(g=>!g.pagado&&g.venc<t).sort((a,b)=>a.venc.localeCompare(b.venc));
  const prox=S.gastos.filter(g=>!g.pagado&&g.venc>=t).sort((a,b)=>a.venc.localeCompare(b.venc)).slice(0,5);
  const ant=resumen(inMonth(M?Y:Y-1,M?M-1:11));
  const ya=resumen(inYear(Y));
  return `<div class="card"><div class="row" style="border:0"><button class="sec sm" onclick="mv(-1)">◀</button><b class="gold">${MES[M]} ${Y}</b><button class="sec sm" onclick="mv(1)">▶</button></div>
  <div class="grid"><div class="kpi"><small>Total del mes</small><b>${money(r.t)}</b></div><div class="kpi"><small>Obligaciones</small><b>${r.n}</b></div>
  <div class="kpi"><small>Pagado</small><b class="ok">${money(r.p)}</b></div><div class="kpi"><small>Pendiente</small><b class="warn">${money(r.pen)}</b></div></div>
  <div style="margin-top:10px" class="mut">${r.pct}% pagado · mes anterior ${money(ant.t)}</div><div class="prog"><i style="width:${r.pct}%"></i></div></div>
  ${venc.length?`<div class="card"><b class="bad">⚠ Pagos atrasados (${venc.length})</b>${venc.map(rowG).join('')}</div>`:''}
  <div class="card"><b>Próximos vencimientos</b>${prox.length?prox.map(rowG).join(''):'<p class="mut">Sin vencimientos próximos.</p>'}</div>
  <div class="card"><b>Resumen ${Y}</b><div class="mut">Total ${money(ya.t)} · Pagado ${money(ya.p)} · Pendiente ${money(ya.pen)}</div></div>`;
}
function mv(d){M+=d;if(M<0){M=11;Y--}if(M>11){M=0;Y++}render()}

function filtrar(l){return l.filter(g=>(!filt.q||g.nombre.toLowerCase().includes(filt.q.toLowerCase())||(g.notas||'').toLowerCase().includes(filt.q.toLowerCase()))&&(!filt.cat||g.cat===filt.cat)&&(!filt.est||estado(g)===filt.est)).sort((a,b)=>a.venc.localeCompare(b.venc))}
function vMeses(){
  const l=filtrar(inMonth(Y,M)),r=resumen(inMonth(Y,M));
  return `<div class="row" style="border:0"><button class="sec sm" onclick="Y--;render()">◀</button><b class="gold">Año ${Y}</b><button class="sec sm" onclick="Y++;render()">▶</button></div>
  <div class="tabs">${MES.map((m,i)=>`<button class="sec sm ${i===M?'on':''}" onclick="M=${i};render()">${m.slice(0,3)}</button>`).join('')}</div>
  <div class="card"><div class="grid"><div class="kpi"><small>Total</small><b>${money(r.t)}</b></div><div class="kpi"><small>Registros</small><b>${r.n}</b></div><div class="kpi"><small>Pagado</small><b class="ok">${money(r.p)}</b></div><div class="kpi"><small>Pendiente</small><b class="warn">${money(r.pen)}</b></div></div></div>
  <div class="card"><input placeholder="🔍 Buscar por nombre o nota" value="${esc(filt.q)}" oninput="filt.q=this.value;renderList()">
  <div class="grid"><select onchange="filt.cat=this.value;renderList()"><option value="">Todas las categorías</option>${S.cfg.cats.map(c=>`<option ${filt.cat===c?'selected':''}>${esc(c)}</option>`).join('')}</select>
  <select onchange="filt.est=this.value;renderList()"><option value="">Todos los estados</option>${['pendiente','pagado','vencido'].map(e=>`<option ${filt.est===e?'selected':''}>${e}</option>`).join('')}</select></div>
  <div id="list">${l.length?l.map(rowG).join(''):'<p class="mut">Sin registros.</p>'}</div></div>`;
}
function renderList(){const l=filtrar(inMonth(Y,M));$('#list').innerHTML=l.length?l.map(rowG).join(''):'<p class="mut">Sin registros.</p>'}

function vCal(){
  const first=new Date(Y,M,1).getDay(),days=new Date(Y,M+1,0).getDate(),l=inMonth(Y,M);
  let h=`<div class="row" style="border:0"><button class="sec sm" onclick="mv(-1)">◀</button><b class="gold">${MES[M]} ${Y}</b><button class="sec sm" onclick="mv(1)">▶</button></div><div class="card"><div class="cal">`+['D','L','M','M','J','V','S'].map(d=>`<div class="h">${d}</div>`).join('');
  for(let i=0;i<first;i++)h+='<div class="h"></div>';
  for(let d=1;d<=days;d++){const k=`${Y}-${pad(M+1)}-${pad(d)}`,g=l.filter(x=>x.venc===k);
    h+=`<div onclick="dayDetail('${k}')">${d}<br>${g.map(x=>`<span class="dot" style="background:var(--${ECOL[estado(x)]})"></span>`).join('')}</div>`}
  return h+`</div><p class="mut" style="font-size:12px"><span class="dot" style="background:var(--warn)"></span>pendiente <span class="dot" style="background:var(--ok)"></span>pagado <span class="dot" style="background:var(--bad)"></span>vencido</p></div><div id="dayd"></div>`;
}
function dayDetail(k){const l=S.gastos.filter(g=>g.venc===k);$('#dayd').innerHTML=`<div class="card"><b>${fmtD(k)}</b>${l.length?l.map(rowG).join(''):'<p class="mut">Sin pagos este día.</p>'}</div>`}

function vTot(){
  const mm=MES.map((_,i)=>tot(inMonth(Y,i))),mx=Math.max(...mm,1),yr=resumen(inYear(Y));
  const q=[0,1,2,3].map(i=>mm.slice(i*3,i*3+3).reduce((a,b)=>a+b,0));
  const con=mm.filter(x=>x>0).length,prom=con?yr.t/con:0;
  const hi=mm.indexOf(Math.max(...mm)),lo=con?mm.indexOf(Math.min(...mm.filter(x=>x>0))):-1;
  const cat={};inYear(Y).forEach(g=>cat[g.cat]=(cat[g.cat]||0)+g.monto);
  const venc=tot(inYear(Y).filter(g=>estado(g)==='vencido'));
  return `<div class="row" style="border:0"><button class="sec sm" onclick="Y--;render()">◀</button><b class="gold">Año ${Y}</b><button class="sec sm" onclick="Y++;render()">▶</button></div>
  <div class="card"><div class="grid"><div class="kpi"><small>Total anual</small><b>${money(yr.t)}</b></div><div class="kpi"><small>Promedio mensual</small><b>${money(prom)}</b></div>
  <div class="kpi"><small>Pagado</small><b class="ok">${money(yr.p)}</b></div><div class="kpi"><small>Pendiente</small><b class="warn">${money(yr.pen)}</b></div></div><div class="mut">De lo pendiente, vencido: <span class="bad">${money(venc)}</span> · Mayor: ${yr.t?MES[hi]:'-'} · Menor: ${lo>=0?MES[lo]:'-'}</div></div>
  <div class="card"><b>Gasto por mes</b><div class="bars" style="margin:12px 0 26px">${mm.map((v,i)=>`<div style="height:${v/mx*100}%" title="${money(v)}"><span>${MES[i][0]}</span></div>`).join('')}</div></div>
  <div class="card"><b>Trimestres</b>${q.map((v,i)=>`<div class="row"><span>T${i+1}</span><b>${money(v)}</b></div>`).join('')}</div>
  <div class="card"><b>Por categoría</b>${Object.entries(cat).sort((a,b)=>b[1]-a[1]).map(([c,v])=>`<div class="row"><span>${esc(c)}</span><span><b>${money(v)}</b> <span class="mut">${yr.t?Math.round(v/yr.t*100):0}%</span></span></div>`).join('')||'<p class="mut">Sin datos.</p>'}</div>`;
}

/* ---------- registro ---------- */
function openForm(id){
  const g=id?S.gastos.find(x=>x.id===id):{nombre:'',cat:S.cfg.cats[0],monto:'',venc:today(),freq:'unico',notas:'',recordar:true};
  $('#sheet').innerHTML=`<h3 class="gold" style="margin-top:0">${id?'Editar':'Nuevo'} gasto</h3>
  <label>Nombre</label><input id="f_n" value="${esc(g.nombre)}" placeholder="Alquiler, crédito, junta…">
  <div class="grid"><div><label>Monto (${esc(S.cfg.moneda)})</label><input id="f_m" type="number" step="0.01" inputmode="decimal" value="${g.monto}"></div>
  <div><label>Categoría</label><select id="f_c">${S.cfg.cats.map(c=>`<option ${g.cat===c?'selected':''}>${esc(c)}</option>`).join('')}</select></div></div>
  <div class="grid"><div><label>Vencimiento</label><input id="f_v" type="date" value="${g.venc}"></div>
  <div><label>Frecuencia</label><select id="f_f" ${id?'disabled':''}>${[['unico','Único'],['semanal','Semanal'],['mensual','Mensual'],['trimestral','Trimestral'],['anual','Anual']].map(f=>`<option value="${f[0]}" ${g.freq===f[0]?'selected':''}>${f[1]}</option>`).join('')}</select></div></div>
  ${id?'':`<label>Repeticiones a generar (si no es único)</label><input id="f_r" type="number" value="12" min="1" max="60">`}
  <label>Observaciones</label><textarea id="f_o" rows="2">${esc(g.notas||'')}</textarea>
  <label><input type="checkbox" id="f_rec" style="width:auto" ${g.recordar!==false?'checked':''}> Activar recordatorios</label>
  <div style="display:flex;gap:8px;margin-top:12px"><button class="pri" style="flex:1" onclick="saveForm('${id||''}')">Guardar</button>
  ${id?`<button class="sec" onclick="dup('${id}')">Duplicar</button><button class="sec bad" onclick="del('${id}')">Eliminar</button>`:''}<button class="sec" onclick="closeModal()">Cerrar</button></div>`;
  $('#modal').classList.add('on');
}
const closeModal=()=>$('#modal').classList.remove('on');
function addPeriod(dateStr,freq,i,dia0){
  const [y,m,d]=dateStr.split('-').map(Number);
  if(freq==='semanal'){const x=new Date(y,m-1,d+7*i);return iso(x)}
  const step=freq==='mensual'?1:freq==='trimestral'?3:12;
  const tm=m-1+step*i,yy=y+Math.floor(tm/12),mm=((tm%12)+12)%12,last=new Date(yy,mm+1,0).getDate();
  return `${yy}-${pad(mm+1)}-${pad(Math.min(dia0,last))}`; // día inexistente -> último día del mes
}
function saveForm(id){
  const nombre=$('#f_n').value.trim(),monto=parseFloat($('#f_m').value),venc=$('#f_v').value;
  if(!nombre||!(monto>=0)||isNaN(monto)||!venc){alert('Completa nombre, monto y vencimiento.');return}
  const base={nombre,cat:$('#f_c').value,monto,notas:$('#f_o').value,recordar:$('#f_rec').checked};
  if(id){const g=S.gastos.find(x=>x.id===id);const ch=[];
    if(g.monto!==monto)ch.push(`monto ${g.monto}→${monto}`);if(g.venc!==venc)ch.push(`venc ${g.venc}→${venc}`);
    Object.assign(g,base,{venc});log(id,'editado',ch.join(', '))}
  else{const freq=$('#f_f').value,n=freq==='unico'?1:Math.max(1,+$('#f_r').value||1),sid=uid(),dia=+venc.slice(8);
    for(let i=0;i<n;i++){const g={id:uid(),serie:freq==='unico'?null:sid,freq,...base,venc:addPeriod(venc,freq,i,dia),pagado:false,fechaPago:null,creado:today()};S.gastos.push(g);log(g.id,'creado',g.venc)}}
  save();closeModal();render();
}
function pay(id,v){const g=S.gastos.find(x=>x.id===id);g.pagado=v;g.fechaPago=v?today():null;log(id,v?'pagado':'revertido a pendiente','');save();render()}
function del(id){if(!confirm('¿Eliminar este gasto?'))return;S.gastos=S.gastos.filter(x=>x.id!==id);log(id,'eliminado','');save();closeModal();render()}
function dup(id){const g=S.gastos.find(x=>x.id===id);const n={...g,id:uid(),serie:null,freq:'unico',pagado:false,fechaPago:null,venc:addPeriod(g.venc,'mensual',1,+g.venc.slice(8)),creado:today()};S.gastos.push(n);save();closeModal();render()}
function log(id,accion,detalle){S.hist.push({id,accion,detalle,fecha:new Date().toISOString()});if(S.hist.length>500)S.hist.shift()}

/* ---------- ajustes ---------- */
function vAjustes(){const c=S.cfg;return `
<div class="card"><b>General</b><label>Moneda</label><select onchange="S.cfg.moneda=this.value;save();render()">${['S/','$','€'].map(m=>`<option ${c.moneda===m?'selected':''}>${m}</option>`).join('')}</select>
<label>Tema</label><select onchange="S.cfg.tema=this.value;save();render()"><option value="dark" ${c.tema==='dark'?'selected':''}>Oscuro</option><option value="light" ${c.tema==='light'?'selected':''}>Claro</option></select>
<label>Categorías (separadas por coma)</label><input value="${esc(c.cats.join(', '))}" onchange="S.cfg.cats=this.value.split(',').map(x=>x.trim()).filter(Boolean);save()"></div>
<div class="card"><b>Notificaciones</b>
<label>Hora de aviso</label><input type="time" value="${c.hora}" onchange="S.cfg.hora=this.value;save()">
${[['antes','Aviso 1 día antes'],['mismoDia','Aviso el día del vencimiento'],['diario','Aviso diario si está vencido'],['sonido','Sonido']].map(x=>`<label><input type="checkbox" style="width:auto" ${c[x[0]]?'checked':''} onchange="S.cfg.${x[0]}=this.checked;save()"> ${x[1]}</label><br>`).join('')}
<button class="sec" style="margin-top:10px" onclick="askPerm()">Conceder permiso de notificaciones</button>
<p class="mut" style="font-size:12px">Zona horaria del dispositivo: ${Intl.DateTimeFormat().resolvedOptions().timeZone}. Si el sistema limita la ejecución en segundo plano, un aviso podría retrasarse.</p></div>
<div class="card"><b>Seguridad</b><label>PIN (déjalo vacío para quitarlo)</label><input type="password" inputmode="numeric" maxlength="8" value="${esc(c.pin)}" onchange="S.cfg.pin=this.value;save()"></div>
<div class="card"><b>Exportar y respaldo</b><div style="display:flex;flex-wrap:wrap;gap:8px">
<button class="sec" onclick="exportCSV('mes')">Excel/CSV mes</button><button class="sec" onclick="exportCSV('anio')">Excel/CSV año</button>
<button class="sec" onclick="printRep()">PDF / Imprimir</button><button class="sec" onclick="backup()">Copia de seguridad</button>
<button class="sec" onclick="$('#rf').click()">Restaurar</button><input id="rf" type="file" accept=".json" hidden onchange="restore(this.files[0])"></div></div>
<div class="card"><b>Historial de cambios</b>${S.hist.slice(-15).reverse().map(h=>{const g=S.gastos.find(x=>x.id===h.id);return `<div class="row"><span>${esc(g?g.nombre:'(eliminado)')} · ${h.accion}</span><span class="mut" style="font-size:12px">${h.fecha.slice(0,10)}</span></div>`}).join('')||'<p class="mut">Sin cambios.</p>'}</div>
<div class="card"><b>Datos de ejemplo</b><p class="mut" style="font-size:12px">Carga los registros del documento (oct–dic 2026). Confirma los datos antes de usarlos de verdad.</p>
<button class="sec" onclick="seed()">Cargar ejemplo</button> <button class="sec bad" onclick="wipe()">Borrar todo</button></div>`}
function seed(){
  const d=[['2026-10-31','Sin concepto',120,'Otros'],['2026-11-02','Crédito',337,'Crédito'],['2026-11-03','Junta',200,'Junta'],['2026-11-05','Luz local',425,'Servicios'],['2026-11-10','Junta',200,'Junta'],['2026-11-15','Alquiler',233,'Vivienda'],['2026-11-17','Junta',200,'Junta'],['2026-11-24','Junta',200,'Junta'],['2026-12-01','Junta',200,'Junta'],['2026-12-02','Crédito',337,'Crédito']];
  d.forEach(x=>{const g={id:uid(),serie:null,freq:'unico',nombre:x[1],cat:x[3],monto:x[2],venc:x[0],notas:'',recordar:true,pagado:false,fechaPago:null,creado:today()};S.gastos.push(g)});
  Y=2026;M=10;save();render();
}
function wipe(){if(confirm('¿Borrar TODOS los gastos?')){S.gastos=[];S.hist=[];save();render()}}
function dl(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click()}
function exportCSV(w){const l=(w==='mes'?inMonth(Y,M):inYear(Y)).sort((a,b)=>a.venc.localeCompare(b.venc));
  const r=[['Nombre','Categoría','Monto','Vencimiento','Estado','Fecha de pago','Observaciones'],...l.map(g=>[g.nombre,g.cat,g.monto,g.venc,estado(g),g.fechaPago||'',g.notas||''])];
  dl(`finanzas-pro-${w==='mes'?Y+'-'+pad(M+1):Y}.csv`,'﻿'+r.map(x=>x.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(';')).join('\n'),'text/csv')}
function printRep(){const l=inYear(Y).sort((a,b)=>a.venc.localeCompare(b.venc)),r=resumen(l);
  $('#view').innerHTML=`<h2>Finanzas Pro – Reporte ${Y}</h2><p>Total ${money(r.t)} · Pagado ${money(r.p)} · Pendiente ${money(r.pen)}</p><div class="card">${l.map(g=>`<div class="row"><span>${fmtD(g.venc)} · ${esc(g.nombre)} (${esc(g.cat)}) · ${estado(g)}</span><b>${money(g.monto)}</b></div>`).join('')}</div>`;
  setTimeout(()=>{window.print();render()},300)}
function backup(){dl(`finanzas-pro-respaldo-${today()}.json`,JSON.stringify(S),'application/json')}
function restore(f){if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(!d.gastos)throw 0;S=d;save();render();alert('Restaurado')}catch(e){alert('Archivo inválido')}};r.readAsText(f)}

/* ---------- notificaciones ---------- */
const LN=()=>window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.LocalNotifications;
async function askPerm(){
  try{const ln=LN();
    if(ln){const r=await ln.requestPermissions();alert(r.display==='granted'?'Permiso concedido':'Permiso denegado. Actívalo en Ajustes del teléfono > Aplicaciones > Finanzas Pro > Notificaciones.')}
    else if('Notification' in window){const r=await Notification.requestPermission();alert(r==='granted'?'Permiso concedido':'Permiso denegado. Habilítalo en la configuración del navegador.')}
    else alert('Este dispositivo no admite notificaciones.');
  }catch(e){alert('No se pudo solicitar el permiso.')}
  scheduleAll();
}
function plan(){ // lista de avisos [fecha, título, cuerpo, clave]
  const [h,mi]=S.cfg.hora.split(':').map(Number),now=new Date(),out=[];
  const at=(ds,off)=>{const [y,m,d]=ds.split('-').map(Number);return new Date(y,m-1,d+off,h,mi,0)};
  S.gastos.filter(g=>!g.pagado&&g.recordar!==false).forEach(g=>{
    const em=money(g.monto);
    if(S.cfg.antes)out.push([at(g.venc,-1),'Finanzas Pro',`Mañana vence tu pago de ${g.nombre} por ${em}.`,g.id+'a']);
    if(S.cfg.mismoDia)out.push([at(g.venc,0),'Finanzas Pro',`Hoy vence tu pago de ${g.nombre} por ${em}.`,g.id+'b']);
    if(S.cfg.diario)for(let i=1;i<=14;i++)out.push([at(g.venc,i),'Finanzas Pro',`Tu pago de ${g.nombre} por ${em} sigue pendiente y está vencido.`,g.id+'c'+i]);
  });
  return out.filter(x=>x[0]>now).sort((a,b)=>a[0]-b[0]);
}
const hash=s=>{let x=0;for(const c of s)x=(x*31+c.charCodeAt(0))|0;return Math.abs(x)%2000000000};
let schedTimer;
function scheduleAll(){clearTimeout(schedTimer);schedTimer=setTimeout(async()=>{
  const ln=LN();if(!ln)return;
  try{const p=await ln.getPending();if(p.notifications.length)await ln.cancel({notifications:p.notifications});
    await ln.schedule({notifications:plan().slice(0,60).map(x=>({id:hash(x[3]),title:x[1],body:x[2],schedule:{at:x[0],allowWhileIdle:true},sound:S.cfg.sonido?undefined:null}))})}catch(e){}
},400)}
function webCheck(){ // avisos mientras la app web está abierta
  if(LN()||!('Notification' in window)||Notification.permission!=='granted')return;
  const sent=JSON.parse(localStorage.getItem('fp.sent')||'{}'),now=new Date();
  const [h,mi]=S.cfg.hora.split(':').map(Number);
  S.gastos.filter(g=>!g.pagado&&g.recordar!==false).forEach(g=>{
    const [y,m,d]=g.venc.split('-').map(Number),days=Math.round((new Date(now.getFullYear(),now.getMonth(),now.getDate())-new Date(y,m-1,d))/864e5);
    const key=g.id+'|'+today();if(sent[key]||now<new Date(now.getFullYear(),now.getMonth(),now.getDate(),h,mi))return;
    const em=money(g.monto);let msg=null;
    if(days===-1&&S.cfg.antes)msg=`Mañana vence tu pago de ${g.nombre} por ${em}.`;
    else if(days===0&&S.cfg.mismoDia)msg=`Hoy vence tu pago de ${g.nombre} por ${em}.`;
    else if(days>0&&S.cfg.diario)msg=`Tu pago de ${g.nombre} por ${em} sigue pendiente y está vencido.`;
    if(msg){sent[key]=1;new Notification('Finanzas Pro',{body:msg,icon:'icon-192.png',silent:!S.cfg.sonido})}
  });
  localStorage.setItem('fp.sent',JSON.stringify(sent));
}

/* ---------- arranque ---------- */
function pinGate(){
  if(!S.cfg.pin)return;
  const p=prompt('Ingresa tu PIN');if(p!==S.cfg.pin){document.body.innerHTML='<p style="padding:40px;color:#d4af37">PIN incorrecto. Recarga la app.</p>';throw 0}
}
window.addEventListener('load',()=>{
  setTimeout(()=>{pinGate();$('#splash').classList.add('hide')},1700);
  render();scheduleAll();webCheck();setInterval(webCheck,60000);
  if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});
});
