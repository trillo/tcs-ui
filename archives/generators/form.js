class FormGenerator {
  constructor() {
    this.metadata = null;
    this.container = null;
    this.values = {};
    this.errors = {};
    this.touched = {};
    this.eventListeners = [];
    this.autosaveTimer = null;
    this.currentStep = 0; // for wizard
  }

  /** Render form from metadata */
  render(metadata, container) {
    this.metadata = JSON.parse(JSON.stringify(metadata)); // shallow clone safety
    this.container = container;

    try {
      this._normalizeMetadata();
      this._injectCSS();
      container.innerHTML = this._generateHTML();
      this._initAll(container);

      return {
        success: true,
        namespace: metadata.cssNamespace,
        componentName: metadata.componentName
      };
    } catch (error) {
      console.error('Error rendering form:', error);
      container.innerHTML = `<div class="error">Error: ${error.message}</div>`;
      return { success: false, error: error.message };
    }
  }

  destroy() {
    // Remove listeners
    this.eventListeners.forEach(({ element, event, handler }) => element.removeEventListener(event, handler));
    this.eventListeners = [];

    // Clear container
    if (this.container) this.container.innerHTML = '';

    // Reset state
    this.metadata = null;
    this.container = null;
    this.values = {};
    this.errors = {};
    this.touched = {};
    this.autosaveTimer = null;
    this.currentStep = 0;
  }

  // === Setup ===
  _normalizeMetadata() {
    const md = this.metadata;
    md.cssNamespace = md.cssNamespace || 'tai-form';
    md.behavior = Object.assign({
      rememberState: true,
      autosave: false,
      autosaveDebounceMs: 600,
      showRequiredAsterisk: true,
      validateOn: 'blur', // 'change' | 'submit'
      steps: false
    }, md.behavior || {});

    // Seed values
    this.values = Object.assign({}, md.defaults || {});

    // If local state, hydrate
    if (md.behavior.rememberState) this._loadState();
  }

  _injectCSS() {
    const ns = this.metadata.cssNamespace;
    const existing = document.getElementById(`${ns}-styles`);
    if (existing) existing.remove();

    const style = document.createElement('style');
    style.id = `${ns}-styles`;
    style.textContent = this._generateCSS();
    document.head.appendChild(style);
  }

  _generateCSS() {
    const ns = this.metadata.cssNamespace;
    const c = this.metadata.colors || {
      background: '#ffffff', text: '#212121', textSecondary: '#757575',
      accent: '#1976d2', hover: '#f5f5f5', border: '#e0e0e0', error: '#d32f2f', success: '#2e7d32'
    };

    return `
/* === FORM GENERATOR STYLES === */
.${ns}-wrap{background:${c.background};color:${c.text};}
.${ns}-form{display:flex;flex-direction:column;gap:16px}
.${ns}-header{border-bottom:1px solid ${c.border};padding:12px 0;margin-bottom:8px}
.${ns}-title{font-size:1.25rem;font-weight:600}
.${ns}-subtitle{font-size:.9rem;color:${c.textSecondary}}
.${ns}-desc{font-size:.9rem;color:${c.textSecondary};margin-top:4px}

.${ns}-grid{display:grid;gap:12px}
.${ns}-row{display:grid;gap:12px}
.${ns}-col{display:flex;flex-direction:column;gap:6px}
.${ns}-label{font-weight:600;font-size:.9rem}
.${ns}-required{color:${c.accent};margin-left:4px}
.${ns}-help{font-size:.8rem;color:${c.textSecondary}}
.${ns}-error{font-size:.8rem;color:${c.error}}

.${ns}-input, .${ns}-textarea, .${ns}-select, .${ns}-file{width:100%;padding:10px;border:1px solid ${c.border};border-radius:8px;background:#fff;color:${c.text};font-size:.95rem}
.${ns}-input:focus, .${ns}-textarea:focus, .${ns}-select:focus{outline:none;border-color:${c.accent};box-shadow:0 0 0 3px rgba(25,118,210,.12)}
.${ns}-switch{position:relative;width:44px;height:24px;background:${c.border};border-radius:999px;cursor:pointer}
.${ns}-switch-handle{position:absolute;top:2px;left:2px;width:20px;height:20px;border-radius:50%;background:#fff;transition:transform .2s}
.${ns}-switch.on{background:${c.accent}}
.${ns}-switch.on .${ns}-switch-handle{transform:translateX(20px)}
.${ns}-chips{display:flex;flex-wrap:wrap;gap:6px}
.${ns}-chip{padding:6px 10px;border:1px solid ${c.border};border-radius:999px;background:${c.hover}}
.${ns}-rating{display:flex;gap:4px}
.${ns}-rating button{background:none;border:none;font-size:20px;cursor:pointer}
.${ns}-group{padding:12px;border:1px dashed ${c.border};border-radius:12px}
.${ns}-section{padding:12px;border:1px solid ${c.border};border-radius:12px}
.${ns}-section-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.${ns}-section-title{font-weight:600}
.${ns}-section-toggle{background:none;border:none;cursor:pointer;color:${c.accent}}
.${ns}-hidden{display:none !important}

.${ns}-actions{display:flex;gap:8px;justify-content:flex-end;padding-top:8px;border-top:1px solid ${c.border}}
.${ns}-btn{padding:10px 14px;border-radius:10px;border:1px solid ${c.border};cursor:pointer;background:#fff}
.${ns}-btn.primary{background:${c.accent};border-color:${c.accent};color:#fff}
.${ns}-btn.ghost{background:transparent}
.${ns}-btn:disabled{opacity:.6;cursor:not-allowed}

.${ns}-stepper{display:flex;gap:8px;margin-bottom:4px}
.${ns}-step{padding:6px 10px;border:1px solid ${c.border};border-radius:999px}
.${ns}-step.active{border-color:${c.accent};color:${c.accent}}
`;
  }

  _generateHTML() {
    const ns = this.metadata.cssNamespace;
    const f = this.metadata.form;

    const header = `
      <div class="${ns}-header">
        ${f.title ? `<div class="${ns}-title">${f.title}</div>` : ''}
        ${f.subtitle ? `<div class="${ns}-subtitle">${f.subtitle}</div>` : ''}
        ${f.description ? `<div class="${ns}-desc">${f.description}</div>` : ''}
      </div>`;

    const stepper = this.metadata.behavior.steps ? this._renderStepper() : '';
    const body = this._renderSections();
    const actions = this._renderActions();

    return `
      <div class="${ns}-wrap">
        <form class="${ns}-form" id="${ns}-form" novalidate>
          ${header}
          ${stepper}
          ${body}
          ${actions}
        </form>
      </div>
    `;
  }

  _renderStepper() {
    const ns = this.metadata.cssNamespace;
    const sections = this.metadata.form.sections || [];
    return `
      <div class="${ns}-stepper">
        ${sections.map((s, i) => `<div class="${ns}-step ${i===this.currentStep?'active':''}" data-step="${i}">${s.stepLabel||`Step ${i+1}`}</div>`).join('')}
      </div>`;
  }

  _renderSections() {
    const ns = this.metadata.cssNamespace;
    const sections = this.metadata.form.sections || [];
    return sections.map((section, idx) => {
      const hiddenByStep = this.metadata.behavior.steps && idx !== this.currentStep;
      const collapsed = section.collapsible && section.collapsed;

      return `
        <section class="${ns}-section ${hiddenByStep?'${ns}-hidden':''}" data-section-index="${idx}">
          <div class="${ns}-section-header">
            <div class="${ns}-section-title">${section.title||''}</div>
            ${section.collapsible ? `<button class="${ns}-section-toggle" data-action="toggle-section" data-section-index="${idx}">${collapsed?'Expand':'Collapse'}</button>` : ''}
          </div>
          <div class="${ns}-grid" style="grid-template-columns: repeat(${section.columns||1}, 1fr);">
            ${section.fields.map(f => this._renderField(f)).join('')}
          </div>
        </section>
      `;
    }).join('');
  }

  _renderField(field) {
    const ns = this.metadata.cssNamespace;
    const id = `${ns}-${field.id}`;
    const label = field.label || '';
    const help = field.help || '';
    const required = field.validation?.required;
    const requiredMark = (this.metadata.behavior.showRequiredAsterisk && required) ? `<span class="${ns}-required">*</span>` : '';

    const wrapStart = `<div class="${ns}-col" data-field-id="${field.id}" ${field.hidden?`style=\"display:none\"`:''}>`;
    const wrapEnd = `</div>`;

    const commonLabel = label ? `<label for="${id}" class="${ns}-label">${label}${requiredMark}</label>` : '';
    const helpText = help ? `<div class="${ns}-help">${help}</div>` : '';
    const errorText = `<div class="${ns}-error" data-error-for="${field.id}"></div>`;

    const val = this._getValue(field.id, field.default);

    const attrs = (extra = {}) => {
      const base = Object.assign({ id, name: field.id, placeholder: field.placeholder || '' }, extra);
      if (field.readonly) base.readOnly = true;
      if (field.disabled) base.disabled = true;
      if (field.validation?.min !== undefined) base.min = field.validation.min;
      if (field.validation?.max !== undefined) base.max = field.validation.max;
      if (field.validation?.step !== undefined) base.step = field.validation.step;
      if (field.validation?.pattern) base.pattern = field.validation.pattern;
      return Object.entries(base).map(([k,v]) => v===true?`${k}`:`${k}="${String(v)}"`).join(' ');
    };

    const renderOptions = (opts=[]) => opts.map(o => `<option value="${o.value}">${o.label}</option>`).join('');

    let control = '';
    switch ((field.type||'text').toLowerCase()) {
      case 'text':
      case 'email':
      case 'password':
      case 'number':
      case 'url':
      case 'tel':
      case 'date':
      case 'time':
      case 'datetime-local':
      case 'color':
        control = `<input class="${ns}-input" type="${field.type}" value="${val ?? ''}" ${attrs()}>`;
        break;
      case 'textarea':
        control = `<textarea class="${ns}-textarea" ${attrs({ rows: field.rows || 4 })}>${val ?? ''}</textarea>`;
        break;
      case 'select':
        control = `<select class="${ns}-select" ${attrs({ multiple: field.multiple?true:undefined })}>${renderOptions(field.options||[])}</select>`;
        break;
      case 'radio-group':
        control = `<div role="radiogroup">${(field.options||[]).map(o=>`
          <label><input type="radio" name="${field.id}" value="${o.value}" ${val==o.value?'checked':''}> ${o.label}</label>`).join('<br>')}</div>`;
        break;
      case 'checkbox':
        control = `<input type="checkbox" ${attrs({ checked: val?true:undefined })}>`;
        break;
      case 'checkbox-group':
        control = `<div>${(field.options||[]).map(o=>`
          <label><input type="checkbox" name="${field.id}" value="${o.value}"> ${o.label}</label>`).join('<br>')}</div>`;
        break;
      case 'switch':
        control = `<div class="${ns}-switch ${val?'on':''}" data-switch-for="${field.id}"><div class="${ns}-switch-handle"></div></div>`;
        control += `<input type="hidden" ${attrs({ value: val? '1':'0' })}>`;
        break;
      case 'range':
        control = `<input class="${ns}-input" type="range" ${attrs({ value: val ?? (field.validation?.min||0) })}>`;
        break;
      case 'file':
        control = `<input class="${ns}-file" type="file" ${attrs({ multiple: field.multiple?true:undefined, accept: field.accept||undefined })}>`;
        break;
      case 'rating':
        control = `<div class="${ns}-rating" data-rating-for="${field.id}">`+
          Array.from({length: field.max||5}).map((_,i)=>`<button type="button" data-rate="${i+1}">${(val||0)>=i+1?'★':'☆'}</button>`).join('')+
          `</div><input type="hidden" ${attrs({ value: val||0 })}>`;
        break;
      case 'tags':
        control = `<div class="${ns}-chips" data-tags-for="${field.id}">`+
          (Array.isArray(val)?val:[]).map(t=>`<span class="${ns}-chip">${t}</span>`).join('')+
          `</div><input class="${ns}-input" type="text" ${attrs({ placeholder: field.placeholder||'Type and press Enter' })}>`;
        break;
      case 'richtext':
        control = `<div contenteditable="true" class="${ns}-textarea" ${attrs({ id: id+"-rt", name: undefined })}>${val||''}</div><input type="hidden" ${attrs({ value: val||'' })}>`;
        break;
      case 'code':
        control = `<textarea class="${ns}-textarea" ${attrs({ rows: field.rows||10 })}>${val||''}</textarea>`;
        break;
      case 'group':
        control = `<div class="${ns}-group">${(field.fields||[]).map(f=>this._renderField(f)).join('')}</div>`;
        break;
      case 'array':
        control = this._renderArrayField(field, val);
        break;
      default:
        control = `<input class="${ns}-input" type="text" value="${val ?? ''}" ${attrs()}>`;
    }

    return `
      ${wrapStart}
        ${commonLabel}
        ${control}
        ${helpText}
        ${errorText}
      ${wrapEnd}
    `;
  }

  _renderArrayField(field, val) {
    const ns = this.metadata.cssNamespace;
    const items = Array.isArray(val) ? val : (field.minItems ? Array.from({length: field.minItems}).map(()=>null) : []);
    const itemHTML = (itemVal, idx) => `
      <div class="${ns}-group" data-array-item-index="${idx}">
        ${(field.item?.fields||[]).map(f=>this._renderField({...f, id: `${field.id}[${idx}].${f.id}`})).join('')}
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px">
          <button class="${ns}-btn ghost" data-action="array-remove" data-array-id="${field.id}" data-index="${idx}">Remove</button>
        </div>
      </div>`;

    return `
      <div class="${ns}-array" data-array-id="${field.id}">
        <div class="${ns}-array-items">
          ${items.map((v,i)=>itemHTML(v,i)).join('')}
        </div>
        <button class="${ns}-btn" data-action="array-add" data-array-id="${field.id}">${field.addLabel||'Add item'}</button>
      </div>
    `;
  }

  _renderActions() {
    const ns = this.metadata.cssNamespace;
    const a = this.metadata.actions || {};
    const btn = (b, extra='') => `<button class="${ns}-btn ${b.variant||''}" type="${b.htmlType||'button'}" data-action="${b.action||'custom'}" ${extra}>${b.icon?`<i class="${b.icon}"></i> `:''}${b.label}</button>`;

    const actions = [];
    if (a.primary) actions.push(btn({...a.primary, action:'submit', htmlType:'submit', variant:'primary'}));
    if (a.secondary) actions.push(btn(a.secondary));
    (a.extra||[]).forEach(x => actions.push(btn(x)));

    return `<div class="${ns}-actions">${actions.join('')}</div>`;
  }

  // === Init & Events ===
  _initAll(container) {
    const ns = this.metadata.cssNamespace;

    // Delegated events
    this._on(container, 'click', (e)=>this._handleClick(e));
    this._on(container, 'input', (e)=>this._handleInput(e));
    this._on(container, 'change', (e)=>this._handleChange(e));
    this._on(container, 'blur', (e)=>this._handleBlur(e), true);

    // Submit
    const form = container.querySelector(`#${ns}-form`);
    this._on(form, 'submit', (e)=>this._handleSubmit(e));

    // Stepper
    if (this.metadata.behavior.steps) {
      this._on(container, 'click', (e)=>{
        const stepEl = e.target.closest(`[data-step]`);
        if (!stepEl) return;
        this.currentStep = parseInt(stepEl.dataset.step,10)||0;
        this._rerenderBody();
      });
    }

    // Initial computed logic & validations
    this._applyVisibility();
    this._validateAll(false);
  }

  _on(element, event, handler, capture=false){
    element.addEventListener(event, handler, capture);
    this.eventListeners.push({ element, event, handler });
  }

  _handleClick(e){
    const ns = this.metadata.cssNamespace;
    const target = e.target;

    const toggleSec = target.closest(`[data-action="toggle-section"]`);
    if (toggleSec){
      const idx = parseInt(toggleSec.dataset.sectionIndex,10); if (isNaN(idx)) return;
      const sectionEl = this.container.querySelector(`section[data-section-index="${idx}"] .${ns}-grid`);
      if (!sectionEl) return;
      const hidden = sectionEl.classList.toggle(`${ns}-hidden`);
      toggleSec.textContent = hidden ? 'Expand' : 'Collapse';
      return;
    }

    const ratingBtn = target.closest(`[data-rate]`);
    if (ratingBtn){
      const rate = parseInt(ratingBtn.dataset.rate,10)||0;
      const wrap = ratingBtn.closest(`[data-rating-for]`);
      const id = wrap?.dataset.ratingFor; if (!id) return;
      this._setValue(id, rate, true);
      // update stars
      wrap.querySelectorAll('button').forEach((b,i)=> b.textContent = (i < rate)?'★':'☆');
      return;
    }

    const sw = target.closest(`[data-switch-for]`);
    if (sw){
      sw.classList.toggle('on');
      const id = sw.dataset.switchFor;
      const hiddenInput = sw.parentElement.querySelector(`input[type="hidden"][name="${id}"]`);
      const val = sw.classList.contains('on');
      if (hiddenInput) hiddenInput.value = val?'1':'0';
      this._setValue(id, val, true);
      return;
    }

    const addBtn = target.closest('[data-action="array-add"]');
    if (addBtn){
      const arrayId = addBtn.dataset.arrayId;
      const arrayWrap = this.container.querySelector(`[data-array-id="${arrayId}"] .${ns}-array-items`);
      const idx = arrayWrap.children.length;
      const field = this._findField(arrayId);
      if (!field) return;
      arrayWrap.insertAdjacentHTML('beforeend', this._renderArrayField(field, []).match(/<div class="[^>]*array-items">([\s\S]*)<\/div>/)[1]);
      return;
    }

    const rmBtn = target.closest('[data-action="array-remove"]');
    if (rmBtn){
      const item = rmBtn.closest('[data-array-item-index]');
      if (item) item.remove();
      return;
    }
  }

  _handleInput(e){
    const el = e.target;
    if (!el.name) return;

    let value = el.value;
    if (el.type === 'checkbox' && !el.closest('[data-array-id]')) value = el.checked;

    this._setValue(el.name, value, this.metadata.behavior.validateOn==='change');
  }

  _handleChange(e){
    const el = e.target;
    if (!el.name) return;

    // Multi-select and checkbox-group aggregation
    if (el.tagName === 'SELECT' && el.multiple){
      const value = Array.from(el.selectedOptions).map(o=>o.value);
      this._setValue(el.name, value, true);
    }

    if (el.type === 'file'){
      this._setValue(el.name, el.files ? Array.from(el.files) : [], false);
    }

    this._applyVisibility();
  }

  _handleBlur(e){
    const el = e.target;
    if (!el.name) return;
    this.touched[el.name] = true;
    if (this.metadata.behavior.validateOn === 'blur'){
      this._validateField(el.name);
    }
  }

  async _handleSubmit(e){
    e.preventDefault();
    const valid = this._validateAll(true);
    if (!valid) return;

    const payload = this.getValues();
    const onSubmit = this.metadata.events?.onSubmit;
    const ns = this.metadata.jsNamespace;

    try {
      if (typeof window !== 'undefined' && ns && onSubmit && typeof window?.[ns]?.[onSubmit] === 'function'){
        await window[ns][onSubmit](payload, this);
      } else if (this.metadata.actions?.primary?.api?.url){
        const api = this.metadata.actions.primary.api;
        const res = await fetch(api.url, {
          method: api.method||'POST',
          headers: Object.assign({ 'Content-Type': 'application/json' }, api.headers||{}),
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      } else {
        console.log('Form submitted:', payload);
        alert('Form submitted!');
      }
    } catch (err) {
      console.error(err);
      alert('Submission failed: ' + err.message);
    }
  }

  // === Validation & Visibility ===
  _validateAll(show){
    const fields = this._allFields();
    let ok = true;
    fields.forEach(f => {
      const r = this._validateField(f.id, show);
      if (!r) ok = false;
    });
    return ok;
  }

  _validateField(fieldId, show){
    const f = this._findField(fieldId);
    if (!f) return true;

    const val = this._getValue(fieldId);
    const v = f.validation || {};
    let err = '';

    if (v.required && (val === undefined || val === null || val === '' || (Array.isArray(val)&&val.length===0))) {
      err = v.messages?.required || 'This field is required.';
    }
    if (!err && v.minLength && String(val||'').length < v.minLength) err = v.messages?.minLength || `Minimum length is ${v.minLength}.`;
    if (!err && v.maxLength && String(val||'').length > v.maxLength) err = v.messages?.maxLength || `Maximum length is ${v.maxLength}.`;
    if (!err && v.min !== undefined && Number(val) < v.min) err = v.messages?.min || `Minimum is ${v.min}.`;
    if (!err && v.max !== undefined && Number(val) > v.max) err = v.messages?.max || `Maximum is ${v.max}.`;
    if (!err && v.pattern && val){
      const rx = new RegExp(v.pattern);
      if (!rx.test(String(val))) err = v.messages?.pattern || 'Invalid format.';
    }

    // custom validator: window[ns][name](value, values) -> error string | ''
    if (!err && v.custom){
      const ns = this.metadata.jsNamespace; const name = v.custom;
      const fn = ns && typeof window?.[ns]?.[name] === 'function' ? window[ns][name] : null;
      if (fn){
        const out = fn(val, this.getValues());
        if (typeof out === 'string' && out) err = out;
      }
    }

    this.errors[fieldId] = err;
    if (show || this.touched[fieldId]) this._displayError(fieldId, err);
    return !err;
  }

  _displayError(fieldId, msg){
    const el = this.container.querySelector(`[data-error-for="${CSS.escape(fieldId)}"]`);
    if (el) el.textContent = msg||'';
  }

  _applyVisibility(){
    const fields = this._allFields();
    fields.forEach(f => {
      const visible = this._evalVisibility(f.visibleIf);
      const wrap = this.container.querySelector(`[data-field-id="${CSS.escape(f.id)}"]`);
      if (!wrap) return;
      wrap.style.display = visible ? '' : 'none';
    });
  }

  _evalVisibility(expr){
    if (!expr) return true;
    try {
      const vals = this.getValues();
      // very small safe eval subset
      // expr example: "values.country === 'US' && values.state"
      // eslint-disable-next-line no-new-func
      const fn = new Function('values', `return (${expr});`);
      return !!fn(vals);
    } catch { return true; }
  }

  // === Values & State ===
  _getValue(id, fallback){
    const v = this.values[id];
    return v !== undefined ? v : fallback;
  }

  _setValue(id, value, validate){
    this.values[id] = value;
    if (validate) this._validateField(id, true);
    this._persistState();

    // Fire onChange
    const ns = this.metadata.jsNamespace;
    const cb = this.metadata.events?.onChange;
    if (ns && cb && typeof window?.[ns]?.[cb] === 'function'){
      window[ns][cb](id, value, this.getValues(), this);
    }

    // Autosave
    if (this.metadata.behavior.autosave) {
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = setTimeout(()=>{
        const fn = this.metadata.events?.onAutosave;
        if (ns && fn && typeof window?.[ns]?.[fn] === 'function'){
          window[ns][fn](this.getValues(), this);
        }
      }, this.metadata.behavior.autosaveDebounceMs||600);
    }
  }

  _persistState(){
    if (!this.metadata.behavior.rememberState) return;
    const key = this._lsKey();
    try { localStorage.setItem(key, JSON.stringify(this.values)); } catch {}
  }

  _loadState(){
    const key = this._lsKey();
    try { const raw = localStorage.getItem(key); if (raw) this.values = Object.assign({}, this.values, JSON.parse(raw)); } catch {}
  }

  _lsKey(){ return `${this.metadata.cssNamespace}-${this.metadata.form?.id||'form'}-values`; }

  // === Public API ===
  getValues(){ return JSON.parse(JSON.stringify(this.values)); }
  setValues(values){ Object.entries(values||{}).forEach(([k,v])=>this._setValue(k,v,false)); this._validateAll(false); this._applyVisibility(); }
  reset(){ this.values = {}; this.errors = {}; this.touched={}; this._persistState(); this._rerenderBody(); }
  goToStep(i){ if (this.metadata.behavior.steps){ this.currentStep = Math.max(0, Math.min(i, (this.metadata.form.sections||[]).length-1)); this._rerenderBody(); } }

  // === Utilities ===
  _findField(id){
    const all = this._allFields();
    return all.find(f=>f.id===id);
  }

  _allFields(){
    const sections = this.metadata.form?.sections || [];
    const res = [];
    const dig = (arr)=> arr.forEach(f=>{
      if (f.type === 'group') dig(f.fields||[]);
      else if (f.type === 'array') dig(f.item?.fields||[]);
      else res.push(f);
    });
    sections.forEach(s=>dig(s.fields||[]));
    return res;
  }

  _rerenderBody(){
    const ns = this.metadata.cssNamespace;
    const form = this.container.querySelector(`#${ns}-form`);
    if (!form) return;
    const oldActions = form.querySelector(`.${ns}-actions`);
    const header = form.querySelector(`.${ns}-header`).outerHTML;
    form.innerHTML = header + (this.metadata.behavior.steps?this._renderStepper():'') + this._renderSections() + (oldActions?oldActions.outerHTML:'');
    this.eventListeners = this.eventListeners.filter(l => {
      // keep only those not attached to old nodes; simplest approach is to clear and re-add init
      return false;
    });
    this._initAll(this.container);
  }
}
