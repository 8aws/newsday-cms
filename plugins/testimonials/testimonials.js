// ── Newsday Plugin: Testimonios ──────────────────────────────
ND.registerPlugin({
  id: 'testimonials',
  name: 'Testimonios',
  version: '1.0.0',

  components: [{
    type: 'testimonials',
    ic: '💬',
    lb: 'Testimonios',
    hint: 'Citas y opiniones de clientes en tarjetas',

    defaultData() {
      return {
        items: [
          { quote: 'Un servicio excepcional que superó todas nuestras expectativas.', author: 'María García', role: 'CEO, Empresa S.L.', avatar: '', rating: 5 },
          { quote: 'Profesionales de primer nivel. Los recomiendo sin reservas.', author: 'Carlos Martín', role: 'Director de Marketing', avatar: '', rating: 5 },
          { quote: 'La mejor inversión que hemos realizado este año.', author: 'Ana Rodríguez', role: 'Fundadora, Startup XYZ', avatar: '', rating: 5 },
        ],
        cols: '3',
        layout: 'card',
        showRating: true,
        accentColor: '#5068e8',
      };
    },

    renderFields(d, si, ci) {
      const items = (d.items||[]).map((item, ki) => `
        <div class="pb-card-item">
          <div style="font-size:11px;font-weight:600;color:#64748b;margin-bottom:6px">Testimonio ${ki+1}</div>
          <textarea class="pb-textarea" rows="3" placeholder="Texto del testimonio…"
                    oninput="_ndSetTm(${si},${ci},${ki},'quote',this.value)">${_ndEH(item.quote||'')}</textarea>
          <div style="display:flex;gap:6px;margin-top:4px">
            <input class="sinp" style="flex:1;font-size:11px" placeholder="Nombre…"
                   value="${_ndEH(item.author||'')}"
                   oninput="_ndSetTm(${si},${ci},${ki},'author',this.value)">
            <input class="sinp" style="flex:1;font-size:11px" placeholder="Cargo / empresa…"
                   value="${_ndEH(item.role||'')}"
                   oninput="_ndSetTm(${si},${ci},${ki},'role',this.value)">
          </div>
          <div style="display:flex;gap:6px;margin-top:4px;align-items:center">
            <input class="sinp" style="flex:1;font-size:11px" placeholder="URL avatar (opcional)…"
                   value="${_ndEH(item.avatar||'')}"
                   oninput="_ndSetTm(${si},${ci},${ki},'avatar',this.value)">
            <select class="pb-mini-sel" onchange="_ndSetTm(${si},${ci},${ki},'rating',+this.value)"
                    title="Valoración">
              ${[5,4,3,2,1,0].map(n=>`<option value="${n}" ${item.rating==n?'selected':''}>${n===0?'Sin ★':'★'.repeat(n)}</option>`).join('')}
            </select>
          </div>
          <div style="display:flex;gap:4px;margin-top:4px">
            <button class="btn btn-ghost btn-sm" onclick="_ndMoveTm(${si},${ci},${ki},-1)">↑</button>
            <button class="btn btn-ghost btn-sm" onclick="_ndMoveTm(${si},${ci},${ki},1)">↓</button>
            <button class="btn btn-red btn-sm"   onclick="_ndRemoveTm(${si},${ci},${ki})">✕</button>
          </div>
        </div>`).join('');

      return `
        <div class="pb-field-row">
          <span class="pb-field-lbl">Columnas</span>
          <select class="pb-mini-sel" onchange="pbSetCmpField(${si},${ci},'cols',this.value)">
            ${[['1','1'],['2','2'],['3','3']].map(([v,l])=>`<option value="${v}" ${d.cols==v?'selected':''}>${l}</option>`).join('')}
          </select>
          <span class="pb-field-lbl" style="margin-left:8px">Estilo</span>
          <select class="pb-mini-sel" onchange="pbSetCmpField(${si},${ci},'layout',this.value)">
            ${[['card','Tarjeta'],['minimal','Minimalista'],['quote','Cita grande']].map(([v,l])=>
              `<option value="${v}" ${d.layout===v?'selected':''}>${l}</option>`).join('')}
          </select>
          <label style="font-size:12px;display:flex;align-items:center;gap:5px;margin-left:10px;cursor:pointer">
            <input type="checkbox" ${d.showRating!==false?'checked':''} onchange="pbSetCmpField(${si},${ci},'showRating',this.checked)">★ Valoración
          </label>
        </div>
        <div class="pb-field-row">
          <span class="pb-field-lbl">Color acento</span>
          <input type="color" class="pb-color-inp" value="${d.accentColor||'#5068e8'}"
                 oninput="pbSetCmpField(${si},${ci},'accentColor',this.value)">
        </div>
        <div class="pb-card-list">${items}</div>
        <button class="btn btn-ghost btn-sm" style="margin-top:6px"
                onclick="_ndAddTm(${si},${ci})">＋ Añadir testimonio</button>`;
    },

    renderHTML(d) {
      const cols   = parseInt(d.cols||'3',10);
      const accent = d.accentColor || '#5068e8';
      const layout = d.layout || 'card';

      const items = (d.items||[]).map(item => {
        const stars = d.showRating && item.rating > 0
          ? `<div class="nd-tm-stars">${'★'.repeat(item.rating)}${'☆'.repeat(5-item.rating)}</div>` : '';
        const avatar = item.avatar
          ? `<img class="nd-tm-avatar" src="${_ndEH(item.avatar)}" alt="${_ndEH(item.author||'')}">` : '';
        const quote = `<blockquote class="nd-tm-quote">"${_ndEH(item.quote||'')}"</blockquote>`;
        const author = `<div class="nd-tm-author"><strong>${_ndEH(item.author||'')}</strong>${item.role?`<span>${_ndEH(item.role)}</span>`:''}</div>`;

        if (layout === 'quote') {
          return `<div class="nd-tm-item nd-tm-quote-style">${stars}${quote}${avatar}${author}</div>`;
        }
        return `<div class="nd-tm-item">${stars}${quote}<div class="nd-tm-meta">${avatar}${author}</div></div>`;
      }).join('');

      return `<div class="nd-testimonials" style="--tm-cols:${cols};--tm-accent:${accent}">${items}</div>`;
    },

    css: `
.nd-testimonials{display:grid;grid-template-columns:repeat(var(--tm-cols,3),1fr);gap:24px}
.nd-tm-item{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;
            display:flex;flex-direction:column;gap:12px}
.nd-tm-stars{color:var(--tm-accent,#5068e8);font-size:1.1rem;letter-spacing:2px}
.nd-tm-quote{margin:0;font-size:1rem;line-height:1.65;color:#334155;font-style:italic;flex:1}
.nd-tm-meta{display:flex;align-items:center;gap:12px;margin-top:auto}
.nd-tm-avatar{width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0}
.nd-tm-author{display:flex;flex-direction:column;gap:2px}
.nd-tm-author strong{font-size:.9rem;color:#0f172a;font-style:normal}
.nd-tm-author span{font-size:.8rem;color:#64748b;font-style:normal}
/* Quote style */
.nd-tm-quote-style{text-align:center;background:none;border:none;padding:32px 24px}
.nd-tm-quote-style .nd-tm-quote{font-size:1.2rem;color:#1e293b}
.nd-tm-quote-style .nd-tm-meta{justify-content:center}
@media(max-width:640px){.nd-testimonials{grid-template-columns:1fr}}
`
  }]
});

function _ndEH(s){return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');}
function _ndSetTm(si,ci,ki,f,v){const c=PB.sections[si]?.components?.[ci];if(!c)return;c.data.items=c.data.items||[];if(!c.data.items[ki])c.data.items[ki]={};c.data.items[ki][f]=v;PB.dirty=true;pbSchedulePreview();}
function _ndAddTm(si,ci){const c=PB.sections[si]?.components?.[ci];if(!c)return;c.data.items=c.data.items||[];c.data.items.push({quote:'Nuevo testimonio.',author:'Nombre',role:'',avatar:'',rating:5});PB.dirty=true;_pbRefreshCmp(si,ci);pbSchedulePreview();}
function _ndRemoveTm(si,ci,ki){const c=PB.sections[si]?.components?.[ci];if(!c)return;c.data.items.splice(ki,1);PB.dirty=true;_pbRefreshCmp(si,ci);pbSchedulePreview();}
function _ndMoveTm(si,ci,ki,dir){const it=PB.sections[si]?.components?.[ci]?.data?.items;if(!it)return;const j=ki+dir;if(j<0||j>=it.length)return;[it[ki],it[j]]=[it[j],it[ki]];PB.dirty=true;_pbRefreshCmp(si,ci);pbSchedulePreview();}
