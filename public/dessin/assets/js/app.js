/* ATELIER - app */
const $ = s => document.querySelector(s);
const masonry = $('#masonry');
const albumsTrack = $('#albumsTrack');
const searchInput = $('#search');
const countEl = $('#count');
const lightbox = $('#lightbox');
const lbImg = $('#lbImg'), lbTitle = $('#lbTitle'), lbKicker = $('#lbKicker'), lbMeta=$('#lbMeta'), lbDesc=$('#lbDesc');
let activeFilter = 'all';
let activeSearch = '';
let currentIndex = 0;
let filtered = [...DRAWINGS];

// Build masonry
function renderGrid(){
  const q = activeSearch.toLowerCase().trim();
  filtered = DRAWINGS.filter(d=>{
    const matchFilter = activeFilter==='all' || d.album===activeFilter;
    const matchSearch = !q || `${d.title} ${d.technique} ${d.album} ${d.desc}`.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });
  masonry.innerHTML = filtered.map((d,i)=>`
    <article class="card reveal" data-index="${i}" data-id="${d.id}" tabindex="0" aria-label="${d.title}">
      <div class="card__img">
        <img loading="lazy" src="${d.thumb}" alt="${d.title}" />
        <span class="card__badge">${d.album} • ${d.annee}</span>
      </div>
      <div class="card__body">
        <h3 class="card__title">${d.title}</h3>
        <div class="card__meta">${d.technique} — ${d.format}</div>
        <p class="card__desc">${d.desc}</p>
      </div>
    </article>
  `).join('');
  countEl.textContent = `${filtered.length} œuvre${filtered.length>1?'s':''} ${activeFilter!=='all'?'dans « '+activeFilter+' »':''} ${q?'pour « '+q+' »':''}`;
  // reveal + click
  document.querySelectorAll('.card').forEach(c=>{
    c.addEventListener('click', ()=> openLightbox(parseInt(c.dataset.index)));
    c.addEventListener('keydown', e=>{ if(e.key==='Enter') openLightbox(parseInt(c.dataset.index))});
  });
  observe();
}

// Albums
function renderAlbums(){
  albumsTrack.innerHTML = ALBUMS.map(a=>`
    <div class="album" data-album="${a.id}">
      <div class="album__cover">
        <img src="${a.cover}" alt="${a.name}" loading="lazy">
        <div class="album__overlay">
          <h3>${a.name}</h3>
          <p>${a.desc}</p>
        </div>
      </div>
      <div class="album__foot"><span><b>${a.count}</b> dessins</span><span class="album__arrow">→</span></div>
    </div>
  `).join('');
  albumsTrack.querySelectorAll('.album').forEach(el=>{
    el.addEventListener('click', ()=>{
      activeFilter = el.dataset.album;
      updateFiltersUI();
      document.querySelector('#oeuvres').scrollIntoView({behavior:'smooth'});
      renderGrid();
    });
  });
}

function updateFiltersUI(){
  document.querySelectorAll('.filter[data-filter]').forEach(b=>{
    b.classList.toggle('active', b.dataset.filter===activeFilter);
  });
}

// Filters events
document.querySelectorAll('.filter[data-filter]').forEach(b=>{
  b.addEventListener('click', ()=>{
    activeFilter = b.dataset.filter;
    updateFiltersUI();
    renderGrid();
  });
});
searchInput.addEventListener('input', e=>{
  activeSearch = e.target.value;
  renderGrid();
});

// Lightbox
function openLightbox(idx){
  currentIndex = idx;
  const d = filtered[idx];
  if(!d) return;
  lbImg.src = d.image;
  lbImg.alt = d.title;
  lbTitle.textContent = d.title;
  lbKicker.textContent = `${d.album} • ${d.annee} • ${d.id}`;
  lbMeta.innerHTML = `${d.technique}<br>${d.format}`;
  lbDesc.textContent = d.desc;
  lightbox.classList.add('open');
  document.body.style.overflow='hidden';
  lightbox.setAttribute('aria-hidden','false');
}
function closeLightbox(){
  lightbox.classList.remove('open');
  document.body.style.overflow='';
  lightbox.setAttribute('aria-hidden','true');
}
function nav(dir){
  currentIndex = (currentIndex + dir + filtered.length) % filtered.length;
  openLightbox(currentIndex);
}
$('#lbClose').addEventListener('click', closeLightbox);
$('#lbBackdrop').addEventListener('click', closeLightbox);
$('#lbPrev').addEventListener('click', ()=>nav(-1));
$('#lbNext').addEventListener('click', ()=>nav(1));
$('#lbPrev2').addEventListener('click', ()=>nav(-1));
$('#lbNext2').addEventListener('click', ()=>nav(1));
document.addEventListener('keydown', e=>{
  if(!lightbox.classList.contains('open')) return;
  if(e.key==='Escape') closeLightbox();
  if(e.key==='ArrowLeft') nav(-1);
  if(e.key==='ArrowRight') nav(1);
});
// swipe
let sx=0;
lightbox.addEventListener('touchstart', e=> sx=e.touches[0].clientX, {passive:true});
lightbox.addEventListener('touchend', e=>{
  const dx = e.changedTouches[0].clientX - sx;
  if(Math.abs(dx)>50) nav(dx<0?1:-1);
});

// Nav active on scroll
const sections = ['oeuvres','albums','studio','contact'];
const navLinks = document.querySelectorAll('.nav__links a');
window.addEventListener('scroll', ()=>{
  const y = window.scrollY + 120;
  let cur = sections[0];
  sections.forEach(id=>{
    const el=document.getElementById(id);
    if(el && el.offsetTop <= y) cur=id;
  });
  navLinks.forEach(a=> a.classList.toggle('active', a.getAttribute('href')==='#'+cur));
}, {passive:true});

// reveal observer
function observe(){
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{ if(e.isIntersecting) e.target.classList.add('in')});
  }, {threshold:.12});
  document.querySelectorAll('.reveal:not(.in)').forEach(el=> io.observe(el));
}

// burger
$('#burger').addEventListener('click', ()=>{
  $('#navLinks').classList.toggle('open');
});
$('#navLinks').addEventListener('click', e=>{ if(e.target.tagName==='A') $('#navLinks').classList.remove('open')});

// init
document.getElementById('year').textContent = new Date().getFullYear();
renderAlbums();
renderGrid();
observe();

// Smooth wheel for albums track (horizontal)
albumsTrack.addEventListener('wheel', e=>{
  if(Math.abs(e.deltaX) < Math.abs(e.deltaY)){
    e.preventDefault();
    albumsTrack.scrollLeft += e.deltaY;
  }
}, {passive:false});

// tiny parallax for hero frame
window.addEventListener('scroll', ()=>{
  const f = document.querySelector('.hero__frame');
  if(!f) return;
  const r = window.scrollY * 0.06;
  f.style.transform = `rotate(.6deg) translateY(${r*0.2}px)`;
}, {passive:true});
