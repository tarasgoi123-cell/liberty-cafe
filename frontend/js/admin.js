const $ = (s,c=document) => c.querySelector(s);
const $$ = (s,c=document) => [...c.querySelectorAll(s)];
const esc = s => String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
let menuData=[], cats=[];

function showToast(msg,type=''){const t=$('#toast');t.textContent=msg;t.className=`toast show ${type}`;clearTimeout(t._t);t._t=setTimeout(()=>t.className='toast',3500);}
function showMsg(el,msg,type=''){if(!el)return;el.textContent=msg;el.className=`form-msg show ${type}`;clearTimeout(el._t);el._t=setTimeout(()=>el.className='form-msg',5000);}
function busy(btn,b,lbl='Зберегти'){btn.disabled=b;btn.textContent=b?'Збереження...':lbl;}

async function api(path,opts={}){
  const tok=localStorage.getItem('liberty_token');
  const isForm=opts.body instanceof FormData;
  const res=await fetch(path,{...opts,headers:{...(tok?{Authorization:`Bearer ${tok}`}:{}),...(!isForm?{'Content-Type':'application/json'}:{})},body:opts.body?(isForm?opts.body:JSON.stringify(opts.body)):undefined});
  if(res.status===401){logout();throw new Error('auth');}
  if(!res.ok){const e=await res.json().catch(()=>({error:'Помилка'}));throw new Error(e.error||'Помилка');}
  return res.json();
}
async function uploadFile(file){const fd=new FormData();fd.append('image',file);const d=await api('/api/upload',{method:'POST',body:fd});return d.url;}

// Auth
function logout(){localStorage.removeItem('liberty_token');localStorage.removeItem('liberty_username');$('#adminLayout').style.display='none';$('#loginOverlay').style.display='flex';}
$('#logoutBtn').addEventListener('click',logout);
$('#loginForm').addEventListener('submit',async e=>{
  e.preventDefault();const btn=e.target.querySelector('button[type=submit]');busy(btn,true,'Увійти');
  try{const d=Object.fromEntries(new FormData(e.target));const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});const j=await r.json();if(!r.ok)throw new Error(j.error);localStorage.setItem('liberty_token',j.token);localStorage.setItem('liberty_username',j.username);initApp();}
  catch(err){showMsg($('#loginMsg'),err.message,'err');busy(btn,false,'Увійти');}
});

// Nav
const TITLES={dashboard:'Дашборд',menu:'Меню',gallery:'Галерея',reservations:'Бронювання',contacts:'Повідомлення',settings:'Налаштування'};
function navigate(pg){
  $$('.sb-item').forEach(i=>i.classList.toggle('active',i.dataset.page===pg));
  $$('.page').forEach(p=>p.classList.toggle('active',p.id===`page-${pg}`));
  $('#topTitle').textContent=TITLES[pg]||pg;
  $('#sidebar').classList.remove('open');
  loadPage(pg);
}
$$('.sb-item').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.page)));
$('#topBurger').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
$('#sbClose').addEventListener('click',()=>$('#sidebar').classList.remove('open'));
async function loadPage(pg){if(pg==='dashboard')return loadDash();if(pg==='menu')return loadMenu();if(pg==='gallery')return loadGal();if(pg==='reservations')return loadRes('');if(pg==='contacts')return loadCon('');if(pg==='settings')return loadSet();}

// Modal
function openModal(t,h){$('#modalTitle').textContent=t;$('#modalBody').innerHTML=h;$('#modalOverlay').classList.add('open');}
function closeModal(){$('#modalOverlay').classList.remove('open');$('#modalBody').innerHTML='';}
$('#modalClose').addEventListener('click',closeModal);
$('#modalOverlay').addEventListener('click',e=>{if(e.target===$('#modalOverlay'))closeModal();});

// Dashboard
async function loadDash(){
  try{const s=await api('/api/admin/stats');$('#stMenu').textContent=s.menuItems;$('#stRes').textContent=s.reservations;$('#stCon').textContent=s.contacts;$('#stTotal').textContent=s.totalOrders+s.totalReservations;const rb=$('#resBadge'),cb=$('#conBadge');rb.textContent=s.reservations;rb.classList.toggle('show',s.reservations>0);cb.textContent=s.contacts;cb.classList.toggle('show',s.contacts>0);}catch{}
}

// Menu admin
async function loadMenu(){
  const box=$('#menuAdmin');if(!box)return;box.innerHTML='<p style="color:var(--muted)">Завантаження...</p>';
  try{menuData=await api('/api/menu/admin/all');cats=menuData.map(c=>({id:c.id,name:c.name}));renderMenu();}
  catch(e){box.innerHTML=`<p style="color:var(--red)">${esc(e.message)}</p>`;}
}
function renderMenu(){
  const box=$('#menuAdmin');
  box.innerHTML=menuData.map(cat=>`<div class="mcat" id="mc-${cat.id}">
    <div class="mcat-hdr" onclick="toggleCat(${cat.id})">
      <span class="mcat-icon">${cat.icon}</span><span class="mcat-name">${esc(cat.name)}</span><span class="mcat-count">${cat.items.length} поз.</span>
      <div class="mcat-acts" onclick="event.stopPropagation()">
        <button class="btn btn-sm btn-outline" onclick="openEditCat(${cat.id})">✏️</button>
        <button class="btn btn-sm btn-danger" onclick="doDelCat(${cat.id})">🗑</button>
      </div><span class="mcat-chevron">▼</span>
    </div>
    <div class="mcat-body">${cat.items.map(i=>`<div class="mrow">
      ${i.image_url?`<div class="mrow-thumb"><img src="${esc(i.image_url)}" loading="lazy"/></div>`:''}
      <div class="mrow-info"><div class="mrow-name">${esc(i.name)}</div>${i.description?`<div class="mrow-desc">${esc(i.description)}</div>`:''}</div>
      <span class="${i.is_available?'avail-y':'avail-n'}">${i.is_available?'✓':'✗'}</span>
      ${i.is_featured?'<span style="font-size:.7rem;color:var(--gold)">⭐</span>':''}
      <div class="mrow-price">${i.price} грн</div>
      <button class="btn btn-sm btn-outline" onclick="openEditItem(${i.id},${cat.id})">✏️</button>
      <button class="btn btn-sm btn-danger" onclick="doDelItem(${i.id})">🗑</button>
    </div>`).join('')}
    <button class="mcat-add" onclick="openAddItem(${cat.id})">+ Додати до «${esc(cat.name)}»</button></div>
  </div>`).join('')+`<button class="btn btn-outline" style="align-self:flex-start" onclick="openAddCat()">+ Нова категорія</button>`;
}
function toggleCat(id){$(`#mc-${id}`)?.classList.toggle('collapsed');}

// Category CRUD
function catForm(c={}){return `
  <div class="form-row"><div class="form-group"><label class="form-label">Назва *</label><input id="cf-n" class="form-input" value="${esc(c.name||'')}"/></div><div class="form-group"><label class="form-label">EN</label><input id="cf-en" class="form-input" value="${esc(c.name_en||'')}"/></div></div>
  <div class="form-row"><div class="form-group"><label class="form-label">Іконка</label><input id="cf-i" class="form-input" value="${esc(c.icon||'☕')}" maxlength="4"/></div><div class="form-group"><label class="form-label">Порядок</label><input id="cf-s" class="form-input" type="number" value="${c.sort_order||0}"/></div></div>
  <div style="display:flex;gap:12px;margin-top:8px"><button id="cf-save" class="btn btn-gold btn-full">Зберегти</button><button class="btn btn-outline btn-full" onclick="closeModal()">Скасувати</button></div>
  <div class="form-msg" id="cf-msg"></div>`;}
function openAddCat(){openModal('Нова категорія',catForm());$('#cf-save').addEventListener('click',async()=>{const n=$('#cf-n').value.trim();if(!n){showMsg($('#cf-msg'),'Введіть назву','err');return;}busy($('#cf-save'),true);try{await api('/api/menu/categories',{method:'POST',body:{name:n,name_en:$('#cf-en').value||null,icon:$('#cf-i').value||'☕',sort_order:Number($('#cf-s').value)||0}});showToast('✓ Категорія додана','ok');closeModal();loadMenu();}catch(e){showMsg($('#cf-msg'),e.message,'err');busy($('#cf-save'),false);}});}
function openEditCat(id){const c=menuData.find(x=>x.id===id);if(!c)return;openModal('Редагувати категорію',catForm(c));$('#cf-save').addEventListener('click',async()=>{const n=$('#cf-n').value.trim();if(!n){showMsg($('#cf-msg'),'Введіть назву','err');return;}busy($('#cf-save'),true);try{await api(`/api/menu/categories/${id}`,{method:'PUT',body:{name:n,name_en:$('#cf-en').value||null,icon:$('#cf-i').value||'☕',sort_order:Number($('#cf-s').value)||0}});showToast('✓ Оновлено','ok');closeModal();loadMenu();}catch(e){showMsg($('#cf-msg'),e.message,'err');busy($('#cf-save'),false);}});}
async function doDelCat(id){if(!confirm('Видалити категорію?'))return;try{await api(`/api/menu/categories/${id}`,{method:'DELETE'});showToast('✓ Видалено','ok');loadMenu();}catch(e){showToast(e.message,'err');}}

// Item CRUD
function itemForm(it={},catId=null){const opts=cats.map(c=>`<option value="${c.id}" ${(it.category_id||catId)==c.id?'selected':''}>${esc(c.name)}</option>`).join('');return `
  <div class="form-row"><div class="form-group"><label class="form-label">Категорія *</label><select id="if-cat" class="form-input">${opts}</select></div><div class="form-group"><label class="form-label">Ціна (грн) *</label><input id="if-p" class="form-input" type="number" min="1" value="${it.price||''}"/></div></div>
  <div class="form-group"><label class="form-label">Назва UA *</label><input id="if-n" class="form-input" value="${esc(it.name||'')}"/></div>
  <div class="form-group"><label class="form-label">Назва EN</label><input id="if-en" class="form-input" value="${esc(it.name_en||'')}"/></div>
  <div class="form-group"><label class="form-label">Опис</label><textarea id="if-d" class="form-input" rows="2">${esc(it.description||'')}</textarea></div>
  <div class="form-group"><label class="form-label">Фото</label>
    <img id="if-prev" src="${esc(it.image_url||'')}" class="upload-preview ${it.image_url?'show':''}" />
    <label class="upload-zone"><input type="file" id="if-file" accept="image/*" style="display:none"/><div class="upload-zone-inner"><div class="uz-icon">📷</div><div class="uz-txt">Натисніть або перетягніть фото</div><div class="uz-sub">JPG PNG WEBP до 8МБ</div></div></label>
    <div class="form-msg" id="if-umsg"></div>
    <div style="display:flex;gap:8px;margin-top:8px"><input id="if-url" class="form-input" value="${esc(it.image_url||'')}" placeholder="або вставте URL"/><button type="button" id="if-urlok" class="btn btn-sm btn-outline">OK</button></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label class="form-label">Порядок</label><input id="if-s" class="form-input" type="number" value="${it.sort_order||0}"/></div>
    <div class="form-group"><label class="form-label" style="margin-bottom:12px">Статус</label>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:8px"><input type="checkbox" id="if-av" ${it.is_available!==0?'checked':''} style="width:16px;height:16px;accent-color:var(--gold)"/><span style="font-size:.85rem">В наявності</span></label>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="if-ft" ${it.is_featured?'checked':''} style="width:16px;height:16px;accent-color:var(--gold)"/><span style="font-size:.85rem">⭐ Хіт Liberty</span></label>
    </div>
  </div>
  <div style="display:flex;gap:12px;margin-top:8px"><button id="if-save" class="btn btn-gold btn-full">Зберегти</button><button class="btn btn-outline btn-full" onclick="closeModal()">Скасувати</button></div>
  <div class="form-msg" id="if-msg"></div>`;}

function initItemUpload(){
  const fi=$('#if-file'),prev=$('#if-prev'),ui=$('#if-url'),ok=$('#if-urlok'),um=$('#if-umsg');
  if(!fi)return;
  fi.addEventListener('change',async()=>{const f=fi.files[0];if(!f)return;showMsg(um,'Завантаження...','');try{const u=await uploadFile(f);ui.value=u;prev.src=u;prev.classList.add('show');showMsg(um,'✓ Завантажено','ok');}catch(e){showMsg(um,e.message,'err');}});
  ok.addEventListener('click',()=>{const u=ui.value.trim();if(u){prev.src=u;prev.classList.add('show');}});
  ui.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();ok.click();}});
  const lbl=fi.closest('label');
  if(lbl){lbl.addEventListener('dragover',e=>{e.preventDefault();lbl.classList.add('dragover');});lbl.addEventListener('dragleave',()=>lbl.classList.remove('dragover'));lbl.addEventListener('drop',async e=>{e.preventDefault();lbl.classList.remove('dragover');const f=e.dataTransfer.files[0];if(!f)return;showMsg(um,'Завантаження...','');try{const u=await uploadFile(f);ui.value=u;prev.src=u;prev.classList.add('show');showMsg(um,'✓ Завантажено','ok');}catch(er){showMsg(um,er.message,'err');}});}
}
function getItemData(){const n=$('#if-n').value.trim(),p=Number($('#if-p').value);if(!n)throw new Error('Введіть назву');if(!p)throw new Error('Введіть ціну');return{category_id:Number($('#if-cat').value),name:n,name_en:$('#if-en').value.trim()||null,description:$('#if-d').value.trim()||null,price:p,image_url:$('#if-url').value.trim()||null,sort_order:Number($('#if-s').value)||0,is_available:$('#if-av').checked?1:0,is_featured:$('#if-ft').checked?1:0};}

function openAddItem(catId){openModal('Нова позиція',itemForm({},catId));initItemUpload();$('#if-save').addEventListener('click',async()=>{let d;try{d=getItemData();}catch(e){showMsg($('#if-msg'),e.message,'err');return;}busy($('#if-save'),true);try{await api('/api/menu/items',{method:'POST',body:d});showToast('✓ Позиція додана','ok');closeModal();loadMenu();}catch(e){showMsg($('#if-msg'),e.message,'err');busy($('#if-save'),false);}});}
function openEditItem(iid,cid){const cat=menuData.find(c=>c.id===cid),it=cat?.items.find(i=>i.id===iid);if(!it)return;openModal('Редагувати позицію',itemForm(it));initItemUpload();$('#if-save').addEventListener('click',async()=>{let d;try{d=getItemData();}catch(e){showMsg($('#if-msg'),e.message,'err');return;}busy($('#if-save'),true);try{await api(`/api/menu/items/${iid}`,{method:'PUT',body:d});showToast('✓ Оновлено','ok');closeModal();loadMenu();}catch(e){showMsg($('#if-msg'),e.message,'err');busy($('#if-save'),false);}});}
async function doDelItem(id){if(!confirm('Видалити позицію?'))return;try{await api(`/api/menu/items/${id}`,{method:'DELETE'});showToast('✓ Видалено','ok');loadMenu();}catch(e){showToast(e.message,'err');}}
$('#addItemBtn').addEventListener('click',()=>openAddItem(cats[0]?.id));

// Gallery admin
async function loadGal(){
  const box=$('#galleryAdmin');if(!box)return;box.innerHTML='<p style="color:var(--muted)">Завантаження...</p>';
  try{const p=await api('/api/gallery/admin');if(!p.length){box.innerHTML='<p style="color:var(--muted)">Немає фото. Натисніть «+ Додати фото».</p>';return;}
  box.innerHTML=p.map(x=>`<div class="gcrd"><div class="gcrd-img"><img src="${esc(x.image_url)}" loading="lazy" onerror="this.style.display='none'"/></div><div class="gcrd-body"><div class="gcrd-title">${esc(x.title||'(без назви)')}</div><div class="gcrd-acts"><button class="btn btn-sm btn-outline" onclick="openEditGal(${x.id})">✏️</button><button class="btn btn-sm btn-danger" onclick="doDelGal(${x.id})">🗑</button></div></div></div>`).join('');}
  catch(e){box.innerHTML=`<p style="color:var(--red)">${esc(e.message)}</p>`;}
}
$('#addPhotoBtn')?.addEventListener('click',()=>openAddGal());

function galForm(g={}){return `
  <div class="form-group"><label class="form-label">Назва</label><input id="gf-t" class="form-input" value="${esc(g.title||'')}" placeholder="Інтер'єр, Атмосфера..."/></div>
  <div class="form-group"><label class="form-label">Фото</label>
    <img id="gf-prev" src="${esc(g.image_url||'')}" class="upload-preview ${g.image_url?'show':''}"/>
    <label class="upload-zone"><input type="file" id="gf-file" accept="image/*" style="display:none"/><div class="upload-zone-inner"><div class="uz-icon">📷</div><div class="uz-txt">Натисніть або перетягніть фото</div><div class="uz-sub">JPG PNG WEBP до 8МБ</div></div></label>
    <div class="form-msg" id="gf-umsg"></div>
    <div style="display:flex;gap:8px;margin-top:8px"><input id="gf-url" class="form-input" value="${esc(g.image_url||'')}" placeholder="або вставте URL (Unsplash...)"/><button type="button" id="gf-ok" class="btn btn-sm btn-outline">OK</button></div>
  </div>
  <div class="form-group"><label class="form-label">Порядок</label><input id="gf-s" class="form-input" type="number" value="${g.sort_order||0}"/></div>
  <div style="display:flex;gap:12px;margin-top:8px"><button id="gf-save" class="btn btn-gold btn-full">Зберегти</button><button class="btn btn-outline btn-full" onclick="closeModal()">Скасувати</button></div>
  <div class="form-msg" id="gf-msg"></div>`;}

function initGalUpload(){
  const fi=$('#gf-file'),prev=$('#gf-prev'),ui=$('#gf-url'),ok=$('#gf-ok'),um=$('#gf-umsg');if(!fi)return;
  fi.addEventListener('change',async()=>{const f=fi.files[0];if(!f)return;showMsg(um,'Завантаження...','');try{const u=await uploadFile(f);ui.value=u;prev.src=u;prev.classList.add('show');showMsg(um,'✓ Завантажено','ok');}catch(e){showMsg(um,e.message,'err');}});
  ok.addEventListener('click',()=>{const u=ui.value.trim();if(u){prev.src=u;prev.classList.add('show');}});
  ui.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();ok.click();}});
  const lbl=fi.closest('label');
  if(lbl){lbl.addEventListener('dragover',e=>{e.preventDefault();lbl.classList.add('dragover');});lbl.addEventListener('dragleave',()=>lbl.classList.remove('dragover'));lbl.addEventListener('drop',async e=>{e.preventDefault();lbl.classList.remove('dragover');const f=e.dataTransfer.files[0];if(!f)return;showMsg(um,'Завантаження...','');try{const u=await uploadFile(f);ui.value=u;prev.src=u;prev.classList.add('show');showMsg(um,'✓ Завантажено','ok');}catch(er){showMsg(um,er.message,'err');}});}
}
function openAddGal(){openModal('Додати фото',galForm());initGalUpload();$('#gf-save').addEventListener('click',async()=>{const u=$('#gf-url').value.trim();if(!u){showMsg($('#gf-msg'),'Додайте фото або URL','err');return;}busy($('#gf-save'),true);try{await api('/api/gallery',{method:'POST',body:{title:$('#gf-t').value.trim()||null,image_url:u,sort_order:Number($('#gf-s').value)||0}});showToast('✓ Фото додано','ok');closeModal();loadGal();}catch(e){showMsg($('#gf-msg'),e.message,'err');busy($('#gf-save'),false);}});}
function openEditGal(id){api('/api/gallery/admin').then(photos=>{const g=photos.find(x=>x.id===id);if(!g)return;openModal('Редагувати фото',galForm(g));initGalUpload();$('#gf-save').addEventListener('click',async()=>{const u=$('#gf-url').value.trim()||g.image_url;if(!u){showMsg($('#gf-msg'),'Потрібне зображення','err');return;}busy($('#gf-save'),true);try{await api(`/api/gallery/${id}`,{method:'PUT',body:{title:$('#gf-t').value.trim()||null,image_url:u,sort_order:Number($('#gf-s').value)||0}});showToast('✓ Оновлено','ok');closeModal();loadGal();}catch(e){showMsg($('#gf-msg'),e.message,'err');busy($('#gf-save'),false);}});});}
async function doDelGal(id){if(!confirm('Видалити фото?'))return;try{await api(`/api/gallery/${id}`,{method:'DELETE'});showToast('✓ Видалено','ok');loadGal();}catch(e){showToast(e.message,'err');}}

// Reservations
const RLBL={pending:'Очікує',confirmed:'Підтверджено',cancelled:'Скасовано'};
const RBDG={pending:'bpending',confirmed:'bconfirmed',cancelled:'bcancelled'};
async function loadRes(status){
  const box=$('#resTable');box.innerHTML='<p style="color:var(--muted);padding:20px">Завантаження...</p>';
  try{const {items}=await api(`/api/admin/reservations${status?`?status=${status}`:''}`);
  if(!items.length){box.innerHTML='<p style="color:var(--muted);padding:20px">Бронювань немає</p>';return;}
  box.innerHTML=`<table><thead><tr><th>#</th><th>Ім'я</th><th>Телефон</th><th>Дата</th><th>Час</th><th>Гостей</th><th>Коментар</th><th>Статус</th><th>Дії</th></tr></thead><tbody>${items.map(r=>`<tr><td>${r.id}</td><td>${esc(r.name)}</td><td><a href="tel:${esc(r.phone)}" style="color:var(--gold)">${esc(r.phone)}</a></td><td>${esc(r.date)}</td><td>${esc(r.time)}</td><td>${r.guests}</td><td style="max-width:140px;font-size:.78rem">${esc(r.comment||'—')}</td><td><span class="ftab ${RBDG[r.status]||''}" style="cursor:default;border-radius:100px;font-size:.7rem;padding:3px 10px">${RLBL[r.status]||r.status}</span></td><td><div style="display:flex;gap:6px"><button class="btn btn-sm btn-outline" onclick="setRes(${r.id},'confirmed')">✓</button><button class="btn btn-sm btn-danger" onclick="setRes(${r.id},'cancelled')">✗</button></div></td></tr>`).join('')}</tbody></table>`;}
  catch(e){box.innerHTML=`<p style="color:var(--red);padding:20px">${esc(e.message)}</p>`;}
}
async function setRes(id,status){try{await api(`/api/admin/reservations/${id}/status`,{method:'PATCH',body:{status}});showToast('✓ Статус оновлено','ok');const a=$('.ftab.active',$('#resTabs'));loadRes(a?.dataset.status||'');loadDash();}catch(e){showToast(e.message,'err');}}

$('#resTabs').addEventListener('click',e=>{const b=e.target.closest('.ftab');if(!b)return;$$('.ftab',$('#resTabs')).forEach(t=>t.classList.remove('active'));b.classList.add('active');loadRes(b.dataset.status);});

// Contacts
const CLBL={new:'Нове',read:'Прочитано'};const CBDG={new:'bnew',read:'bread'};
function fmtDate(s){if(!s)return'—';return new Date(s).toLocaleString('uk-UA',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});}
async function loadCon(status){
  const box=$('#conTable');box.innerHTML='<p style="color:var(--muted);padding:20px">Завантаження...</p>';
  try{const {items}=await api(`/api/admin/contacts${status?`?status=${status}`:''}`);
  if(!items.length){box.innerHTML='<p style="color:var(--muted);padding:20px">Повідомлень немає</p>';return;}
  box.innerHTML=`<table><thead><tr><th>#</th><th>Ім'я</th><th>Контакт</th><th>Повідомлення</th><th>Дата</th><th>Статус</th><th>Дії</th></tr></thead><tbody>${items.map(c=>`<tr><td>${c.id}</td><td>${esc(c.name)}</td><td style="font-size:.78rem">${esc(c.phone||c.email||'—')}</td><td style="max-width:200px;font-size:.78rem">${esc(c.message)}</td><td style="font-size:.75rem;white-space:nowrap">${fmtDate(c.created_at)}</td><td><span class="ftab ${CBDG[c.status]||''}" style="cursor:default;border-radius:100px;font-size:.7rem;padding:3px 10px">${CLBL[c.status]||c.status}</span></td><td><button class="btn btn-sm btn-outline" onclick="setCon(${c.id},'read')">✓ Прочитано</button></td></tr>`).join('')}</tbody></table>`;}
  catch(e){box.innerHTML=`<p style="color:var(--red);padding:20px">${esc(e.message)}</p>`;}
}
async function setCon(id,status){try{await api(`/api/admin/contacts/${id}/status`,{method:'PATCH',body:{status}});showToast('✓ Позначено','ok');const a=$('.ftab.active',$('#conTabs'));loadCon(a?.dataset.status||'');loadDash();}catch(e){showToast(e.message,'err');}}
$('#conTabs').addEventListener('click',e=>{const b=e.target.closest('.ftab');if(!b)return;$$('.ftab',$('#conTabs')).forEach(t=>t.classList.remove('active'));b.classList.add('active');loadCon(b.dataset.status);});

// Settings
async function loadSet(){try{const s=await api('/api/admin/settings');const f=$('#settingsForm');Object.entries(s).forEach(([k,v])=>{const e=f.elements[k];if(e)e.value=v;});}catch{}}
$('#settingsForm').addEventListener('submit',async e=>{e.preventDefault();const btn=e.target.querySelector('button[type=submit]');busy(btn,true,'Зберегти');try{await api('/api/admin/settings',{method:'PUT',body:Object.fromEntries(new FormData(e.target))});showToast('✓ Збережено','ok');showMsg($('#setMsg'),'Налаштування збережені','ok');}catch(er){showMsg($('#setMsg'),er.message,'err');}finally{busy(btn,false,'Зберегти');}});
$('#pwdForm').addEventListener('submit',async e=>{e.preventDefault();const btn=e.target.querySelector('button[type=submit]');busy(btn,true,'Змінити');try{await api('/api/auth/change-password',{method:'POST',body:Object.fromEntries(new FormData(e.target))});showToast('✓ Пароль змінено','ok');showMsg($('#pwdMsg'),'Пароль змінено','ok');e.target.reset();}catch(er){showMsg($('#pwdMsg'),er.message,'err');}finally{busy(btn,false,'Змінити пароль');}});

// Exports
window.navigate=navigate;window.closeModal=closeModal;window.toggleCat=toggleCat;
window.openAddCat=openAddCat;window.openEditCat=openEditCat;window.doDelCat=doDelCat;
window.openAddItem=openAddItem;window.openEditItem=openEditItem;window.doDelItem=doDelItem;
window.openEditGal=openEditGal;window.doDelGal=doDelGal;
window.setRes=setRes;window.setCon=setCon;

// Init
function initApp(){
  const tok=localStorage.getItem('liberty_token');
  if(!tok){$('#loginOverlay').style.display='flex';$('#adminLayout').style.display='none';return;}
  $('#loginOverlay').style.display='none';$('#adminLayout').style.display='flex';
  $('#topUser').textContent=localStorage.getItem('liberty_username')||'admin';
  navigate('dashboard');
}
initApp();
