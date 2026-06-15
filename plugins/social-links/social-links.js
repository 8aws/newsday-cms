// ── Newsday Plugin: Redes sociales ───────────────────────────
ND.registerPlugin({
  id: 'social-links',
  name: 'Redes sociales',
  version: '1.0.0',

  components: [{
    type: 'social-links',
    ic: '📱',
    lb: 'Redes sociales',
    hint: 'Iconos y enlaces a perfiles de redes sociales',

    defaultData() {
      return {
        links: [
          { platform:'twitter',   url:'', label:'Twitter / X' },
          { platform:'instagram', url:'', label:'Instagram' },
          { platform:'linkedin',  url:'', label:'LinkedIn' },
        ],
        size: 'md',
        layout: 'row',
        style: 'filled',
        color: '#5068e8',
      };
    },

    renderFields(d, si, ci) {
      const PLATFORMS = ['twitter','instagram','linkedin','facebook','youtube','tiktok','github','pinterest','whatsapp','email','web'];
      const links = (d.links||[]).map((lk, ki) => `
        <div class="pb-card-item" style="flex-direction:row;align-items:center;gap:8px;flex-wrap:wrap">
          <select class="pb-mini-sel" onchange="_ndSetSL(${si},${ci},${ki},'platform',this.value)">
            ${PLATFORMS.map(p=>`<option value="${p}" ${lk.platform===p?'selected':''}>${p}</option>`).join('')}
          </select>
          <input class="sinp" style="flex:1;min-width:150px;font-size:11px" placeholder="URL o email…"
                 value="${_ndEH(lk.url||'')}" oninput="_ndSetSL(${si},${ci},${ki},'url',this.value)">
          <button class="btn btn-red btn-sm" onclick="_ndRemoveSL(${si},${ci},${ki})">✕</button>
        </div>`).join('');

      return `
        <div class="pb-field-row">
          <span class="pb-field-lbl">Tamaño</span>
          <select class="pb-mini-sel" onchange="pbSetCmpField(${si},${ci},'size',this.value)">
            ${[['sm','Pequeño'],['md','Medio'],['lg','Grande']].map(([v,l])=>`<option value="${v}" ${d.size===v?'selected':''}>${l}</option>`).join('')}
          </select>
          <span class="pb-field-lbl" style="margin-left:8px">Disposición</span>
          <select class="pb-mini-sel" onchange="pbSetCmpField(${si},${ci},'layout',this.value)">
            <option value="row" ${d.layout==='row'?'selected':''}>Fila</option>
            <option value="grid" ${d.layout==='grid'?'selected':''}>Cuadrícula</option>
          </select>
          <span class="pb-field-lbl" style="margin-left:8px">Estilo</span>
          <select class="pb-mini-sel" onchange="pbSetCmpField(${si},${ci},'style',this.value)">
            <option value="filled"  ${d.style==='filled'?'selected':''}>Relleno</option>
            <option value="outline" ${d.style==='outline'?'selected':''}>Contorno</option>
            <option value="ghost"   ${d.style==='ghost'?'selected':''}>Sin fondo</option>
          </select>
        </div>
        <div class="pb-field-row">
          <span class="pb-field-lbl">Color</span>
          <input type="color" class="pb-color-inp" value="${d.color||'#5068e8'}"
                 oninput="pbSetCmpField(${si},${ci},'color',this.value)">
        </div>
        <div class="pb-card-list">${links}</div>
        <button class="btn btn-ghost btn-sm" style="margin-top:6px"
                onclick="_ndAddSL(${si},${ci})">＋ Añadir red</button>`;
    },

    renderHTML(d) {
      const sz    = {sm:'32px', md:'44px', lg:'56px'}[d.size||'md'];
      const fs    = {sm:'16px', md:'22px', lg:'28px'}[d.size||'md'];
      const color = d.color || '#5068e8';
      const style = d.style || 'filled';

      // SVG icons por plataforma (paths simplificados)
      const icons = {
        twitter:   '<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>',
        instagram: '<path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>',
        linkedin:  '<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>',
        facebook:  '<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>',
        youtube:   '<path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>',
        tiktok:    '<path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>',
        github:    '<path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>',
        pinterest: '<path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>',
        whatsapp:  '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>',
        email:     '<path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>',
        web:       '<path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>',
      };

      const links = (d.links||[]).filter(l=>l.url).map(lk => {
        const icon   = icons[lk.platform] || icons.web;
        const href   = lk.platform === 'email' ? `mailto:${_ndEH(lk.url)}` : _ndEH(lk.url);
        const label  = _ndEH(lk.label || lk.platform);
        const viewBox = (lk.platform==='email' || lk.platform==='web') ? '0 0 24 24' : '0 0 24 24';
        return `<a class="nd-sl-link nd-sl-${style}" href="${href}" target="${lk.platform==='email'?'_self':'_blank'}"
                   rel="noopener noreferrer" aria-label="${label}" title="${label}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="currentColor">${icon}</svg>
        </a>`;
      }).join('');

      return `<div class="nd-social-links nd-sl-layout-${d.layout||'row'}" style="--sl-size:${sz};--sl-fs:${fs};--sl-color:${color}">${links}</div>`;
    },

    css: `
.nd-social-links{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.nd-sl-layout-row{flex-direction:row;justify-content:center}
.nd-sl-layout-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(var(--sl-size,44px),auto))}
.nd-sl-link{width:var(--sl-size,44px);height:var(--sl-size,44px);border-radius:50%;
            display:flex;align-items:center;justify-content:center;transition:transform .15s,opacity .15s;text-decoration:none}
.nd-sl-link svg{width:var(--sl-fs,22px);height:var(--sl-fs,22px)}
.nd-sl-link:hover{transform:translateY(-3px);opacity:.85}
.nd-sl-filled{background:var(--sl-color,#5068e8);color:#fff}
.nd-sl-outline{border:2px solid var(--sl-color,#5068e8);color:var(--sl-color,#5068e8)}
.nd-sl-ghost{color:var(--sl-color,#5068e8)}
.nd-sl-ghost:hover{background:rgba(0,0,0,.06)}
`
  }]
});

function _ndEH(s){return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');}
function _ndSetSL(si,ci,ki,f,v){const c=PB.sections[si]?.components?.[ci];if(!c)return;c.data.links=c.data.links||[];if(!c.data.links[ki])c.data.links[ki]={};c.data.links[ki][f]=v;PB.dirty=true;pbSchedulePreview();}
function _ndAddSL(si,ci){const c=PB.sections[si]?.components?.[ci];if(!c)return;c.data.links=c.data.links||[];c.data.links.push({platform:'web',url:'',label:''});PB.dirty=true;_pbRefreshCmp(si,ci);}
function _ndRemoveSL(si,ci,ki){const c=PB.sections[si]?.components?.[ci];if(!c)return;c.data.links.splice(ki,1);PB.dirty=true;_pbRefreshCmp(si,ci);}
