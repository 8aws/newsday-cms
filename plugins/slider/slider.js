// ── Newsday Plugin: Slider / Carrusel ────────────────────────
ND.registerPlugin({
  id: 'slider',
  name: 'Slider / Carrusel',
  version: '1.0.0',

  components: [{
    type: 'slider',
    ic: '🎠',
    lb: 'Slider',
    hint: 'Carrusel de slides con scroll-snap CSS',

    defaultData() {
      return {
        slides: [
          { image:'', title:'Título del slide', subtitle:'Subtítulo o descripción breve', btnLabel:'', btnUrl:'' },
          { image:'', title:'Segundo slide', subtitle:'Otro mensaje impactante', btnLabel:'', btnUrl:'' },
        ],
        height: '420',
        overlay: true,
        overlayOpacity: '50',
        textAlign: 'center',
        showDots: true,
      };
    },

    renderFields(d, si, ci) {
      const slides = (d.slides||[]).map((sl, ki) => `
        <div class="pb-card-item">
          <div style="font-size:11px;font-weight:600;color:#64748b;margin-bottom:6px">Slide ${ki+1}</div>
          <div style="display:flex;gap:6px;margin-bottom:4px">
            <input class="sinp" style="flex:1;font-size:11px" placeholder="URL imagen…"
                   value="${_ndEH(sl.image||'')}"
                   oninput="_ndSetSlide(${si},${ci},${ki},'image',this.value)">
            <button class="btn btn-ghost btn-sm" style="flex-shrink:0"
                    onclick="pbPickCompImage(${si},${ci},'sl-img-${ki}')" title="Elegir de medios">🖼</button>
          </div>
          <input class="sinp" style="font-size:11px;margin-bottom:4px" placeholder="Título…"
                 value="${_ndEH(sl.title||'')}"
                 oninput="_ndSetSlide(${si},${ci},${ki},'title',this.value)">
          <input class="sinp" style="font-size:11px;margin-bottom:4px" placeholder="Subtítulo…"
                 value="${_ndEH(sl.subtitle||'')}"
                 oninput="_ndSetSlide(${si},${ci},${ki},'subtitle',this.value)">
          <div style="display:flex;gap:6px;margin-bottom:4px">
            <input class="sinp" style="flex:1;font-size:11px" placeholder="Texto botón (opcional)…"
                   value="${_ndEH(sl.btnLabel||'')}"
                   oninput="_ndSetSlide(${si},${ci},${ki},'btnLabel',this.value)">
            <input class="sinp" style="flex:1;font-size:11px" placeholder="URL botón…"
                   value="${_ndEH(sl.btnUrl||'')}"
                   oninput="_ndSetSlide(${si},${ci},${ki},'btnUrl',this.value)">
          </div>
          <div style="display:flex;gap:4px">
            <button class="btn btn-ghost btn-sm" onclick="_ndMoveSlide(${si},${ci},${ki},-1)">↑</button>
            <button class="btn btn-ghost btn-sm" onclick="_ndMoveSlide(${si},${ci},${ki},1)">↓</button>
            <button class="btn btn-red btn-sm"   onclick="_ndRemoveSlide(${si},${ci},${ki})">✕</button>
          </div>
        </div>`).join('');

      return `
        <div class="pb-field-row">
          <span class="pb-field-lbl">Alto (px)</span>
          <input class="sinp" style="width:70px" type="number" min="200" max="900" step="10"
                 value="${d.height||420}"
                 oninput="pbSetCmpField(${si},${ci},'height',this.value)">
          <span class="pb-field-lbl" style="margin-left:8px">Alineación</span>
          <select class="pb-mini-sel" onchange="pbSetCmpField(${si},${ci},'textAlign',this.value)">
            ${[['center','Centro'],['left','Izquierda'],['right','Derecha']].map(([v,l])=>
              `<option value="${v}" ${d.textAlign===v?'selected':''}>${l}</option>`).join('')}
          </select>
        </div>
        <div class="pb-field-row">
          <label style="font-size:12px;display:flex;align-items:center;gap:6px;cursor:pointer">
            <input type="checkbox" ${d.overlay?'checked':''} onchange="pbSetCmpField(${si},${ci},'overlay',this.checked)">
            Overlay oscuro
          </label>
          <input type="range" min="0" max="90" value="${d.overlayOpacity||50}" style="width:80px;margin-left:8px"
                 oninput="pbSetCmpField(${si},${ci},'overlayOpacity',this.value)">
          <label style="font-size:12px;display:flex;align-items:center;gap:6px;cursor:pointer;margin-left:12px">
            <input type="checkbox" ${d.showDots!==false?'checked':''} onchange="pbSetCmpField(${si},${ci},'showDots',this.checked)">
            Mostrar puntos
          </label>
        </div>
        <div class="pb-card-list">${slides}</div>
        <button class="btn btn-ghost btn-sm" style="margin-top:6px"
                onclick="_ndAddSlide(${si},${ci})">＋ Añadir slide</button>`;
    },

    renderHTML(d) {
      const slides  = (d.slides||[]);
      const h       = parseInt(d.height||'420',10);
      const ovOp    = parseInt(d.overlayOpacity||'50',10) / 100;
      const align   = d.textAlign || 'center';
      const uid     = 'sl' + Math.random().toString(36).slice(2,7);

      const items = slides.map((sl, idx) => {
        const bg  = sl.image ? `background-image:url('${_ndEH(sl.image)}');background-size:cover;background-position:center` : 'background:#1e293b';
        const ov  = d.overlay ? `<div class="nd-sl-overlay" style="background:rgba(0,0,0,${ovOp})"></div>` : '';
        const btn = sl.btnLabel && sl.btnUrl
          ? `<a class="nd-sl-btn" href="${_ndEH(sl.btnUrl)}">${_ndEH(sl.btnLabel)}</a>` : '';
        return `<div class="nd-sl-item" style="${bg}">
          ${ov}
          <div class="nd-sl-content" style="text-align:${align}">
            ${sl.title    ? `<h2 class="nd-sl-title">${_ndEH(sl.title)}</h2>`       : ''}
            ${sl.subtitle ? `<p  class="nd-sl-sub">${_ndEH(sl.subtitle)}</p>` : ''}
            ${btn}
          </div>
        </div>`;
      }).join('');

      const dots = d.showDots !== false ? `<div class="nd-sl-dots">
        ${slides.map((_,i) => `<span class="nd-sl-dot"></span>`).join('')}
      </div>` : '';

      return `<div class="nd-slider" id="${uid}" style="--sl-h:${h}px">
        <div class="nd-sl-track">${items}</div>
        ${dots}
        <button class="nd-sl-prev" onclick="_ndSlPrev('${uid}')" aria-label="Anterior">&#8249;</button>
        <button class="nd-sl-next" onclick="_ndSlNext('${uid}')" aria-label="Siguiente">&#8250;</button>
      </div>
      <script>
      (function(){
        function _ndSlPrev(id){var t=document.querySelector('#'+id+' .nd-sl-track');if(t)t.scrollBy({left:-t.offsetWidth,behavior:'smooth'});}
        function _ndSlNext(id){var t=document.querySelector('#'+id+' .nd-sl-track');if(t)t.scrollBy({left:t.offsetWidth,behavior:'smooth'});}
        window._ndSlPrev=_ndSlPrev; window._ndSlNext=_ndSlNext;
      })();
      <\/script>`;
    },

    css: `
.nd-slider{position:relative;overflow:hidden;border-radius:8px}
.nd-sl-track{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;
             -webkit-overflow-scrolling:touch}
.nd-sl-track::-webkit-scrollbar{display:none}
.nd-sl-item{flex:0 0 100%;scroll-snap-align:start;position:relative;
            height:var(--sl-h,420px);display:flex;align-items:center;justify-content:center}
.nd-sl-overlay{position:absolute;inset:0;pointer-events:none}
.nd-sl-content{position:relative;z-index:1;padding:32px;max-width:720px;width:100%}
.nd-sl-title{font-size:clamp(1.5rem,4vw,2.8rem);font-weight:800;color:#fff;margin:0 0 12px;line-height:1.15}
.nd-sl-sub{font-size:1.1rem;color:rgba(255,255,255,.85);margin:0 0 20px}
.nd-sl-btn{display:inline-block;padding:12px 28px;background:#fff;color:#0f172a;
           border-radius:50px;font-weight:700;text-decoration:none;font-size:.95rem;
           transition:transform .15s,box-shadow .15s}
.nd-sl-btn:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,.25)}
.nd-sl-prev,.nd-sl-next{position:absolute;top:50%;transform:translateY(-50%);
                         background:rgba(255,255,255,.15);border:none;color:#fff;
                         font-size:2rem;width:44px;height:44px;border-radius:50%;
                         cursor:pointer;display:flex;align-items:center;justify-content:center;
                         backdrop-filter:blur(4px);transition:background .15s;z-index:2}
.nd-sl-prev{left:12px} .nd-sl-next{right:12px}
.nd-sl-prev:hover,.nd-sl-next:hover{background:rgba(255,255,255,.3)}
.nd-sl-dots{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);
            display:flex;gap:6px;z-index:2}
.nd-sl-dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.5);display:block}
`
  }]
});

function _ndEH(s){return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');}
function _ndSetSlide(si,ci,ki,f,v){const c=PB.sections[si]?.components?.[ci];if(!c)return;c.data.slides=c.data.slides||[];if(!c.data.slides[ki])c.data.slides[ki]={};c.data.slides[ki][f]=v;PB.dirty=true;pbSchedulePreview();}
function _ndAddSlide(si,ci){const c=PB.sections[si]?.components?.[ci];if(!c)return;c.data.slides=c.data.slides||[];c.data.slides.push({image:'',title:'Nuevo slide',subtitle:'',btnLabel:'',btnUrl:''});PB.dirty=true;_pbRefreshCmp(si,ci);pbSchedulePreview();}
function _ndRemoveSlide(si,ci,ki){const c=PB.sections[si]?.components?.[ci];if(!c)return;c.data.slides.splice(ki,1);PB.dirty=true;_pbRefreshCmp(si,ci);pbSchedulePreview();}
function _ndMoveSlide(si,ci,ki,dir){const sl=PB.sections[si]?.components?.[ci]?.data?.slides;if(!sl)return;const j=ki+dir;if(j<0||j>=sl.length)return;[sl[ki],sl[j]]=[sl[j],sl[ki]];PB.dirty=true;_pbRefreshCmp(si,ci);pbSchedulePreview();}
