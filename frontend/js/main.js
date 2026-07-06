const $ = (s,c=document) => c.querySelector(s);
const $$ = (s,c=document) => [...c.querySelectorAll(s)];

async function api(path, opts={}) {
  const res = await fetch(path, { headers:{'Content-Type':'application/json'}, ...opts, body: opts.body ? JSON.stringify(opts.body) : undefined });
  if (!res.ok) { const e = await res.json().catch(()=>({error:'Помилка'})); throw new Error(e.error||'Помилка'); }
  return res.json();
}
function showToast(msg, type='') { const t=$('#toast'); t.textContent=msg; t.className=`toast show ${type}`; clearTimeout(t._t); t._t=setTimeout(()=>t.className='toast',3500); }
function showMsg(el, msg, type='') { if(!el)return; el.textContent=msg; el.className=`form-msg show ${type}`; clearTimeout(el._t); el._t=setTimeout(()=>el.className='form-msg',5000); }

// ── Hero parallax ──────────────────────────────────────
const heroPhoto = document.getElementById('heroPhoto');
let ticking = false;
function onScroll() {
  if (!ticking) {
    requestAnimationFrame(() => {
      if (heroPhoto && window.scrollY < window.innerHeight) {
        // Subtle downward drift as user scrolls — creates depth
        const shift = window.scrollY * 0.28;
        heroPhoto.style.transform = `scale(1.08) translateY(${shift}px)`;
      }
      ticking = false;
    });
    ticking = true;
  }
}
window.addEventListener('scroll', onScroll, { passive: true });

// Nav scroll + burger
const nav=$('#nav'), burger=$('#burger'), links=$('#navLinks');
window.addEventListener('scroll', ()=>{ nav.classList.toggle('scrolled',window.scrollY>60); updateActive(); });
burger.addEventListener('click', ()=>{ burger.classList.toggle('open'); links.classList.toggle('open'); document.body.style.overflow=links.classList.contains('open')?'hidden':''; });
links.addEventListener('click', e=>{ if(e.target.tagName==='A'){burger.classList.remove('open');links.classList.remove('open');document.body.style.overflow='';} });
function updateActive(){
  const y=window.scrollY+120;
  $$('section[id]').forEach(s=>{ const l=$(`.nav__link[href="#${s.id}"]`); if(!l)return; l.classList.toggle('active',y>=s.offsetTop&&y<s.offsetTop+s.offsetHeight); });
}

// Reveal
const obs=new IntersectionObserver((entries)=>{ entries.forEach((e,i)=>{ if(e.isIntersecting){setTimeout(()=>e.target.classList.add('visible'),i*80);obs.unobserve(e.target);} }); },{threshold:0.1});
$$('.reveal').forEach(el=>obs.observe(el));

// Settings
async function loadSettings(){
  try {
    const s=await api('/api/settings');
    if(s.about_text){const e=$('#aboutText');if(e)e.textContent=s.about_text;}
    if(s.address){const e=$('#cAddr');if(e)e.textContent=s.address;}
    if(s.hours_weekday){const e=$('#cWd');if(e)e.textContent=s.hours_weekday;}
    if(s.hours_weekend){const e=$('#cWe');if(e)e.textContent=s.hours_weekend;}
    if(s.phone){const e=$('#cPh');if(e){e.textContent=s.phone;e.href=`tel:${s.phone.replace(/\s/g,'')}`; }}
    if(s.instagram){const e=$('#cIg'),f=$('#footerIg');if(e){e.textContent=`@${s.instagram.replace(/.*\//,'')}`;e.href=s.instagram;}if(f)f.href=s.instagram;}
    if(s.wifi_password){const e=$('#cWifi');if(e)e.textContent=s.wifi_password;}
  } catch{}
}

// Featured
const EMOJI={Еспресо:'☕',Альтернатива:'🌿',Сигнатури:'✨',Чай:'🍵','Їжа':'🥐',Десерти:'🍰'};
async function loadFeatured(){
  const g=$('#featuredGrid'); if(!g)return;
  try {
    const items=await api('/api/menu/featured');
    g.innerHTML=items.map(i=>`<div class="featured-card">
      ${i.image_url?`<div class="fc-img"><img src="${i.image_url}" alt="${i.name}" loading="lazy"/></div>`:`<span class="fc-emoji">${EMOJI[i.category_name]||'☕'}</span>`}
      <div class="fc-cat">${i.category_name}</div>
      <div class="fc-name">${i.name}</div>
      <div class="fc-desc">${i.description||''}</div>
      <div class="fc-price">${i.price} <span>грн</span></div>
    </div>`).join('');
  } catch { g.innerHTML=''; }
}

// Menu
async function loadMenu(){
  const tabs=$('#menuTabs'), content=$('#menuContent'); if(!tabs||!content)return;
  try {
    const data=await api('/api/menu'); if(!data.length)return;
    tabs.innerHTML=data.map((c,i)=>`<button class="menu__tab ${i===0?'active':''}" data-cat="${c.id}">${c.icon} ${c.name}</button>`).join('');
    content.innerHTML=data.map((c,i)=>`<div class="menu__panel ${i===0?'active':''}" id="panel-${c.id}"><div class="menu__items">${
      c.items.map(item=>`<div class="menu-item">
        ${item.image_url?`<div class="mi-thumb"><img src="${item.image_url}" alt="${item.name}" loading="lazy"/></div>`:''}
        <div class="mi-info"><div class="mi-name">${item.name}</div>${item.description?`<div class="mi-desc">${item.description}</div>`:''}</div>
        <div class="mi-dot"></div><div class="mi-price">${item.price} грн</div>
      </div>`).join('')
    }</div></div>`).join('');
    tabs.addEventListener('click', e=>{ const b=e.target.closest('.menu__tab'); if(!b)return; $$('.menu__tab').forEach(t=>t.classList.remove('active')); $$('.menu__panel').forEach(p=>p.classList.remove('active')); b.classList.add('active'); $(`#panel-${b.dataset.cat}`).classList.add('active'); });
  } catch { content.innerHTML='<p style="color:var(--muted);text-align:center">Не вдалося завантажити меню</p>'; }
}

// Gallery
const G_CLS=['gallery__item--large','','','gallery__item--wide',''];
async function loadGallery(){
  const g=$('#galleryGrid'); if(!g)return;
  try {
    const photos=await api('/api/gallery'); if(!photos.length)return;
    g.innerHTML=photos.map((p,i)=>`<div class="gallery__item ${G_CLS[i]||''} reveal"><img src="${p.image_url}" alt="${p.title||'Liberty'}" loading="lazy"/><div class="g-overlay"><span class="g-title">${p.title||''}</span></div></div>`).join('');
    $$('.reveal',g).forEach(el=>obs.observe(el));
  } catch{}
}

// Reservation form
const resForm=$('#resForm');
if(resForm){
  resForm.querySelector('[name="date"]').min=new Date().toISOString().split('T')[0];
  let g=2;
  $('#gu').addEventListener('click',()=>{ if(g<20){g++;$('#gv').textContent=g;$('#gi').value=g;} });
  $('#gd').addEventListener('click',()=>{ if(g>1){g--;$('#gv').textContent=g;$('#gi').value=g;} });
  resForm.addEventListener('submit',async e=>{
    e.preventDefault();
    const btn=resForm.querySelector('button[type=submit]'); btn.disabled=true; btn.textContent='Відправляємо...';
    try { const r=await api('/api/reservation',{method:'POST',body:Object.fromEntries(new FormData(resForm))}); showMsg($('#resMsg'),r.message,'ok'); showToast('✓ Бронювання відправлено!','ok'); resForm.reset(); g=2;$('#gv').textContent=2;$('#gi').value=2; }
    catch(err){ showMsg($('#resMsg'),err.message,'err'); }
    finally{ btn.disabled=false; btn.textContent='Забронювати столик'; }
  });
}

// Contact form
const conForm=$('#contactForm');
if(conForm){
  conForm.addEventListener('submit',async e=>{
    e.preventDefault();
    const btn=conForm.querySelector('button[type=submit]'); btn.disabled=true; btn.textContent='Відправляємо...';
    try { const r=await api('/api/contact',{method:'POST',body:Object.fromEntries(new FormData(conForm))}); showMsg($('#contactMsg'),r.message,'ok'); showToast('✓ Повідомлення надіслано!','ok'); conForm.reset(); }
    catch(err){ showMsg($('#contactMsg'),err.message,'err'); }
    finally{ btn.disabled=false; btn.textContent='Надіслати'; }
  });
}

Promise.allSettled([loadSettings(),loadFeatured(),loadMenu(),loadGallery()]);
