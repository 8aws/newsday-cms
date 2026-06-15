// ── Newsday Plugin: Formulario de contacto ───────────────────
ND.registerPlugin({
  id: 'contact-form',
  name: 'Formulario de contacto',
  version: '1.0.0',

  components: [{
    type: 'contact-form',
    ic: '📋',
    lb: 'Contacto',
    hint: 'Formulario con campos configurables (mailto / Formspree)',

    defaultData() {
      return {
        action: '',          // mailto:email o URL de Formspree
        method: 'mailto',    // 'mailto' | 'formspree'
        submitLabel: 'Enviar mensaje',
        successMsg: '¡Mensaje enviado! Nos pondremos en contacto pronto.',
        accentColor: '#5068e8',
        fields: [
          { id:'name',    label:'Nombre',  type:'text',     required:true,  placeholder:'Tu nombre' },
          { id:'email',   label:'Email',   type:'email',    required:true,  placeholder:'tu@email.com' },
          { id:'subject', label:'Asunto',  type:'text',     required:false, placeholder:'Asunto del mensaje' },
          { id:'message', label:'Mensaje', type:'textarea', required:true,  placeholder:'Escribe tu mensaje aquí…' },
        ],
      };
    },

    renderFields(d, si, ci) {
      const fields = (d.fields||[]).map((f, fi) => `
        <div class="pb-card-item" style="padding:8px">
          <div style="display:flex;gap:6px">
            <input class="sinp" style="flex:1;font-size:11px" placeholder="ID (sin espacios)…"
                   value="${_ndEH(f.id||'')}" oninput="_ndSetCF(${si},${ci},${fi},'id',this.value)">
            <input class="sinp" style="flex:1;font-size:11px" placeholder="Etiqueta…"
                   value="${_ndEH(f.label||'')}" oninput="_ndSetCF(${si},${ci},${fi},'label',this.value)">
            <select class="pb-mini-sel" onchange="_ndSetCF(${si},${ci},${fi},'type',this.value)">
              ${['text','email','tel','textarea','select'].map(t=>`<option value="${t}" ${f.type===t?'selected':''}>${t}</option>`).join('')}
            </select>
          </div>
          <div style="display:flex;gap:6px;margin-top:4px;align-items:center">
            <input class="sinp" style="flex:1;font-size:11px" placeholder="Placeholder…"
                   value="${_ndEH(f.placeholder||'')}" oninput="_ndSetCF(${si},${ci},${fi},'placeholder',this.value)">
            <label style="font-size:11px;display:flex;align-items:center;gap:4px;cursor:pointer;white-space:nowrap">
              <input type="checkbox" ${f.required?'checked':''} onchange="_ndSetCF(${si},${ci},${fi},'required',this.checked)">
              Requerido
            </label>
            <button class="btn btn-red btn-sm" onclick="_ndRemoveCF(${si},${ci},${fi})">✕</button>
          </div>
        </div>`).join('');

      return `
        <div class="pb-field-row">
          <span class="pb-field-lbl">Método de envío</span>
          <select class="pb-mini-sel" onchange="pbSetCmpField(${si},${ci},'method',this.value)">
            <option value="mailto" ${d.method==='mailto'?'selected':''}>mailto (email)</option>
            <option value="formspree" ${d.method==='formspree'?'selected':''}>Formspree</option>
          </select>
        </div>
        <div class="pb-field-row">
          <span class="pb-field-lbl">${d.method==='formspree'?'URL Formspree':'Email destino'}</span>
          <input class="sinp" style="flex:1" placeholder="${d.method==='formspree'?'https://formspree.io/f/xxxx':'tu@email.com'}"
                 value="${_ndEH(d.action||'')}" oninput="pbSetCmpField(${si},${ci},'action',this.value)">
        </div>
        <div class="pb-field-row">
          <span class="pb-field-lbl">Texto botón</span>
          <input class="sinp" style="flex:1" value="${_ndEH(d.submitLabel||'Enviar')}"
                 oninput="pbSetCmpField(${si},${ci},'submitLabel',this.value)">
          <span class="pb-field-lbl" style="margin-left:8px">Color</span>
          <input type="color" class="pb-color-inp" value="${d.accentColor||'#5068e8'}"
                 oninput="pbSetCmpField(${si},${ci},'accentColor',this.value)">
        </div>
        <div style="font-size:11px;font-weight:600;color:#64748b;margin:8px 0 4px">Campos del formulario</div>
        <div class="pb-card-list">${fields}</div>
        <button class="btn btn-ghost btn-sm" style="margin-top:6px"
                onclick="_ndAddCF(${si},${ci})">＋ Añadir campo</button>`;
    },

    renderHTML(d) {
      const accent = d.accentColor || '#5068e8';
      let action, method, enctype;

      if (d.method === 'formspree' && d.action) {
        action  = _ndEH(d.action);
        method  = 'POST';
        enctype = '';
      } else {
        const email = d.action ? d.action.replace(/^mailto:/,'') : '';
        action  = `mailto:${_ndEH(email)}`;
        method  = 'POST';
        enctype = 'enctype="text/plain"';
      }

      const fieldHTML = (d.fields||[]).map(f => {
        const req  = f.required ? ' required' : '';
        const ph   = f.placeholder ? ` placeholder="${_ndEH(f.placeholder)}"` : '';
        let input;
        if (f.type === 'textarea') {
          input = `<textarea id="cf-${_ndEH(f.id)}" name="${_ndEH(f.id)}"${ph} rows="5"${req}></textarea>`;
        } else {
          input = `<input type="${_ndEH(f.type||'text')}" id="cf-${_ndEH(f.id)}" name="${_ndEH(f.id)}"${ph}${req}>`;
        }
        return `<div class="nd-cf-field">
          <label for="cf-${_ndEH(f.id)}">${_ndEH(f.label||f.id)}${f.required?' <span aria-hidden="true">*</span>':''}</label>
          ${input}
        </div>`;
      }).join('');

      return `<form class="nd-contact-form" action="${action}" method="${method}" ${enctype} style="--cf-accent:${accent}">
        ${fieldHTML}
        <button type="submit" class="nd-cf-submit">${_ndEH(d.submitLabel||'Enviar')}</button>
      </form>`;
    },

    css: `
.nd-contact-form{display:flex;flex-direction:column;gap:16px;max-width:640px;margin:0 auto}
.nd-cf-field{display:flex;flex-direction:column;gap:6px}
.nd-cf-field label{font-size:.9rem;font-weight:600;color:#334155}
.nd-cf-field label span{color:#dc2626;margin-left:2px}
.nd-cf-field input,.nd-cf-field textarea{padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:8px;
  font-size:.95rem;font-family:inherit;transition:border-color .15s;outline:none}
.nd-cf-field input:focus,.nd-cf-field textarea:focus{border-color:var(--cf-accent,#5068e8)}
.nd-cf-field textarea{resize:vertical;min-height:120px}
.nd-cf-submit{align-self:flex-start;padding:12px 32px;background:var(--cf-accent,#5068e8);
              color:#fff;border:none;border-radius:50px;font-size:1rem;font-weight:700;
              cursor:pointer;transition:opacity .15s,transform .15s}
.nd-cf-submit:hover{opacity:.88;transform:translateY(-1px)}
`
  }]
});

function _ndEH(s){return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');}
function _ndSetCF(si,ci,fi,f,v){const c=PB.sections[si]?.components?.[ci];if(!c)return;c.data.fields=c.data.fields||[];if(!c.data.fields[fi])c.data.fields[fi]={};c.data.fields[fi][f]=v;PB.dirty=true;pbSchedulePreview();}
function _ndAddCF(si,ci){const c=PB.sections[si]?.components?.[ci];if(!c)return;c.data.fields=c.data.fields||[];const n=c.data.fields.length;c.data.fields.push({id:'field'+n,label:'Campo '+(n+1),type:'text',required:false,placeholder:''});PB.dirty=true;_pbRefreshCmp(si,ci);}
function _ndRemoveCF(si,ci,fi){const c=PB.sections[si]?.components?.[ci];if(!c)return;c.data.fields.splice(fi,1);PB.dirty=true;_pbRefreshCmp(si,ci);}
