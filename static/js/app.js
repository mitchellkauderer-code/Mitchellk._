/* ─── Tab switching ─────────────────────────────────────────────────────────── */

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

/* ─── Photo slot initialization ─────────────────────────────────────────────── */

function initPhotoSlot(slotEl) {
  const fileInput = slotEl.querySelector('.file-input');
  const preview   = slotEl.querySelector('.thumb-preview');
  const photoRef  = slotEl.querySelector('.photo-ref');

  // Create "Annoteren" button + editor container as siblings after slotEl
  const annotBtn = document.createElement('button');
  annotBtn.type = 'button';
  annotBtn.className = 'btn-annotate';
  annotBtn.innerHTML = '&#9998; Annoteren';
  annotBtn.style.display = 'none';

  const editorEl = document.createElement('div');
  editorEl.className = 'annot-editor-container';
  editorEl.style.display = 'none';

  slotEl.after(annotBtn);
  annotBtn.after(editorEl);

  // Store references for restorePhotoSlot to access
  slotEl._annotateBtn   = annotBtn;
  slotEl._annotEditorEl = editorEl;

  // Clicking anywhere on the slot triggers the file picker
  slotEl.addEventListener('click', e => {
    if (e.target === fileInput) return;
    fileInput.click();
  });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res  = await fetch('/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (json.error) { alert('Upload mislukt: ' + json.error); return; }
      photoRef.value = json.filename;
      preview.innerHTML = `<img src="${json.url}" alt="preview">`;
      slotEl.classList.add('has-image');
      annotBtn.style.display = '';
    } catch (err) {
      alert('Upload mislukt: ' + err.message);
    }
  });

  annotBtn.addEventListener('click', () => {
    new PhotoAnnotator({
      containerEl: editorEl,
      imageUrl:    `/uploads/${photoRef.value}`,
      onSave: (filename, url) => {
        photoRef.value = filename;
        preview.innerHTML = `<img src="${url}" alt="preview">`;
        slotEl.classList.add('has-image');
      },
      color: '#FF6600',
      tools: ['arrow', 'line', 'box', 'rect'],
    }).open();
  });
}

// Init all static photo slots on page load
document.querySelectorAll('.photo-slot').forEach(initPhotoSlot);

/* ─── Dynamic: photo+text rows (Sectie 5) ───────────────────────────────────── */

function addPhotoRow(containerId, templateId) {
  const container = document.getElementById(containerId);
  const template  = document.getElementById(templateId);
  const clone = template.cloneNode(true);
  clone.removeAttribute('id');
  clone.style.display = '';
  // Re-wire remove button
  clone.querySelector('.btn-remove-row').addEventListener('click', () => clone.remove());
  // Init the cloned photo slot
  initPhotoSlot(clone.querySelector('.photo-slot'));
  container.appendChild(clone);
}

/* ─── Dynamic: aanwezigen (Sectie 1) ────────────────────────────────────────── */

function addAanwezige() {
  const container = document.getElementById('container-aanwezigen');
  const div = document.createElement('div');
  div.className = 'dynamic-row aanwezige-row';
  div.innerHTML = `
    <div class="form-row" style="margin-bottom:0">
      <div class="form-group">
        <label>Naam</label>
        <input type="text" class="aanwezige-naam" placeholder="Naam">
      </div>
      <div class="form-group">
        <label>Telefoonnummer</label>
        <input type="text" class="aanwezige-tel" placeholder="Telefoonnummer">
      </div>
    </div>
    <button type="button" class="btn-remove-row" onclick="this.closest('.dynamic-row').remove()">✕</button>
  `;
  container.appendChild(div);
}

/* ─── Dynamic: strenglijsten rows (Sectie 7) ────────────────────────────────── */

function recalcStrengIDs() {
  const rows = document.querySelectorAll('#container-strenglijsten tr');
  const counts = {};
  rows.forEach(tr => {
    const dp  = tr.querySelector('.streng-dp')?.value.trim()  || '';
    const stp = tr.querySelector('.streng-stp')?.value.trim() || '';
    const key = `${dp}|${stp}`;
    counts[key] = (counts[key] || 0) + 1;
    const idField = tr.querySelector('.streng-id');
    if (idField) {
      idField.value = (dp || stp) ? `${dp}-${stp}-${counts[key]}` : '';
    }
  });
}

function _strengNavInputs(tr) {
  return Array.from(tr.querySelectorAll('input:not([tabindex="-1"])'));
}

function _strengNavKey(e) {
  const tbody   = document.getElementById('container-strenglijsten');
  const rows    = Array.from(tbody.querySelectorAll('tr'));
  const rowEl   = e.target.closest('tr');
  const rowIdx  = rows.indexOf(rowEl);
  const cols    = _strengNavInputs(rowEl);
  const colIdx  = cols.indexOf(e.target);

  if (e.key === 'Tab') {
    e.preventDefault();
    if (e.shiftKey) {
      if (colIdx > 0) {
        cols[colIdx - 1].focus();
      } else if (rowIdx > 0) {
        const prev = _strengNavInputs(rows[rowIdx - 1]);
        prev[prev.length - 1].focus();
      }
    } else {
      if (colIdx < cols.length - 1) {
        cols[colIdx + 1].focus();
      } else if (rowIdx < rows.length - 1) {
        _strengNavInputs(rows[rowIdx + 1])[0].focus();
      } else {
        addStrengRij();
        const newRows = Array.from(tbody.querySelectorAll('tr'));
        _strengNavInputs(newRows[newRows.length - 1])[0].focus();
      }
    }
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (rowIdx < rows.length - 1) {
      _strengNavInputs(rows[rowIdx + 1])[colIdx]?.focus();
    } else {
      addStrengRij();
      const newRows = Array.from(tbody.querySelectorAll('tr'));
      _strengNavInputs(newRows[newRows.length - 1])[colIdx]?.focus();
    }
  } else if (e.key === 'ArrowRight') {
    if (colIdx < cols.length - 1) { e.preventDefault(); cols[colIdx + 1].focus(); }
  } else if (e.key === 'ArrowLeft') {
    if (colIdx > 0) { e.preventDefault(); cols[colIdx - 1].focus(); }
  } else if (e.key === 'ArrowUp') {
    if (rowIdx > 0) { e.preventDefault(); _strengNavInputs(rows[rowIdx - 1])[colIdx]?.focus(); }
  } else if (e.key === 'ArrowDown') {
    if (rowIdx < rows.length - 1) { e.preventDefault(); _strengNavInputs(rows[rowIdx + 1])[colIdx]?.focus(); }
  }
}

function addStrengRij() {
  const tbody = document.getElementById('container-strenglijsten');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="text" class="streng-adres" placeholder="Adres"></td>
    <td><input type="text" class="streng-hnr" placeholder="Hnr"></td>
    <td><input type="text" class="streng-lengte" placeholder="m"></td>
    <td><input type="text" class="streng-invoer" placeholder="Invoer"></td>
    <td><input type="text" class="streng-stp" placeholder="St.p"></td>
    <td><input type="text" class="streng-dp" placeholder="DP"></td>
    <td><input type="text" class="streng-id streng-id-auto" readonly tabindex="-1"></td>
    <td class="td-remove"><button type="button" class="btn-remove-streng" title="Verwijderen">✕</button></td>
  `;
  tr.querySelector('.btn-remove-streng').addEventListener('click', () => { tr.remove(); recalcStrengIDs(); });
  tr.querySelector('.streng-dp').addEventListener('input', recalcStrengIDs);
  tr.querySelector('.streng-stp').addEventListener('input', recalcStrengIDs);
  _strengNavInputs(tr).forEach(inp => inp.addEventListener('keydown', _strengNavKey));
  // Pre-fill DP with current ODP nummer
  const odp = (document.getElementById('cover-odp')?.value || '').trim();
  if (odp) tr.querySelector('.streng-dp').value = odp;
  tbody.appendChild(tr);
  recalcStrengIDs();
}

// Add 5 default rows on load
(function initStrenglijsten() {
  for (let i = 0; i < 5; i++) addStrengRij();
})();

/* ─── Collect form data ──────────────────────────────────────────────────────── */

function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function photoRef(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

function collectFormData() {
  // Etage woningen
  const wpe = {};
  document.querySelectorAll('.etage-input').forEach(el => {
    const etage = el.getAttribute('data-etage');
    wpe[etage] = el.value;
  });

  // Aanwezigen
  const aanwezigen = [];
  document.querySelectorAll('#container-aanwezigen .dynamic-row').forEach(row => {
    aanwezigen.push({
      naam:     row.querySelector('.aanwezige-naam')?.value.trim() || '',
      telefoon: row.querySelector('.aanwezige-tel')?.value.trim()  || '',
    });
  });

  // Sectie 5 buiten
  const buiten = [];
  document.querySelectorAll('#container-buiten .dynamic-row').forEach(row => {
    buiten.push({
      foto:  row.querySelector('.photo-ref')?.value || '',
      tekst: row.querySelector('.row-text')?.value.trim() || '',
    });
  });

  // Sectie 5 inpandig
  const inpandig = [];
  document.querySelectorAll('#container-inpandig .dynamic-row').forEach(row => {
    inpandig.push({
      foto:  row.querySelector('.photo-ref')?.value || '',
      tekst: row.querySelector('.row-text')?.value.trim() || '',
    });
  });

  // Strenglijsten
  const strenglijsten = [];
  document.querySelectorAll('#container-strenglijsten tr').forEach(tr => {
    strenglijsten.push({
      adres:     tr.querySelector('.streng-adres')?.value.trim()  || '',
      hnr:       tr.querySelector('.streng-hnr')?.value.trim()    || '',
      lengte:    tr.querySelector('.streng-lengte')?.value.trim() || '',
      invoer:    tr.querySelector('.streng-invoer')?.value.trim() || '',
      stp:       tr.querySelector('.streng-stp')?.value.trim()    || '',
      dp:        tr.querySelector('.streng-dp')?.value.trim()     || '',
      streng_id: tr.querySelector('.streng-id')?.value.trim()     || '',
    });
  });

  return {
    cover: {
      foto_vooraanzicht: photoRef('ref-cover-foto'),
      bag_pand_id:       val('cover-bag'),
      straat_huisnrs:    val('cover-straat'),
      postcode_plaats:   val('cover-postcode'),
      ap_gebied:         val('cover-ap'),
      odp_nummer:        val('cover-odp'),
      dp_gebied:         val('cover-dp-gebied'),
      datum_schouw:      val('cover-datum'),
    },
    s1: {
      datum_site_survey:       val('s1-datum-survey'),
      glasvezelvoorbereider:   val('s1-gvb'),
      tel_nr:                  val('s1-tel'),
      aantal_aansluitingen:    val('s1-aansluitingen'),
      aantal_verdiepingen:     val('s1-verdiepingen'),
      geschatte_hoogte:        val('s1-hoogte'),
      bewoners_afhankelijk:    val('s1-bewoners'),
      woningen_per_etage:      wpe,
      contact_vve_naam:        val('s1-vve'),
      contact_persoon_beheer:  val('s1-contact'),
      functie:                 val('s1-functie'),
      telefoon:                val('s1-telefoon'),
      mobiel:                  val('s1-mobiel'),
      emailadres:              val('s1-email'),
      meerdere_eigenaren:      val('s1-eigenaren'),
      gevestigd_te:            val('s1-gevestigd'),
      toegang_site_via:        val('s1-toegang'),
      aanwezigen:              aanwezigen,
      locatie_invoerpunt:      val('s1-invoerpunt'),
      aantal_invoergaten:      val('s1-invoergaten'),
      stijgpunt:               valAnders('s1-stijgpunt', 's1-stijgpunt-anders'),
      mantelbuis_toegankelijk: val('s1-mantelbuis'),
      bestaande_doorvoer:      val('s1-doorvoer'),
      locatie_gvap:            valAnders('s1-gvap', 's1-gvap-anders'),
      locatie_cai_aop:         valAnders('s1-cai', 's1-cai-anders'),
      locatie_isra:            valAnders('s1-isra', 's1-isra-anders'),
      locatie_meterkast:       valAnders('s1-meterkast', 's1-meterkast-anders'),
      volt_aanwezig:           val('s1-volt'),
      locatie_hoofdafsluiters: valAnders('s1-hoofdafsluiters', 's1-hoofdafsluiters-anders'),
      locatie_modem:           valAnders('s1-modem', 's1-modem-anders'),
      locatie_ftu:             valAnders('s1-ftu', 's1-ftu-anders'),
      brandwerende_afdichting: val('s1-brand'),
    },
    s2: {
      foto_kaart:    photoRef('ref-s2-foto'),
      tekst_locatie: val('s2-tekst'),
    },
    s3: {
      uitleg_beslisboom: val('s3-uitleg'),
    },
    s4: {
      foto_aanzicht: photoRef('ref-s4-foto'),
      caption:       valAnders('s4-caption', 's4-caption-anders'),
    },
    s5: { buiten, inpandig },
    s6: {
      schema: {
        floors:  [...schemaState.floors],
        columns: schemaState.columns,
        cells:   { ...schemaState.cells },
      },
    },
    s7: { strenglijsten },
    s8: {},
    s9: {},
  };
}

/* ─── Restore form data ──────────────────────────────────────────────────────── */

function setVal(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value || '';
}

function restorePhotoSlot(refId, slotId, filename) {
  if (!filename) return;
  const refEl  = document.getElementById(refId);
  const slotEl = document.getElementById(slotId);
  if (!refEl || !slotEl) return;
  refEl.value = filename;
  slotEl.querySelector('.thumb-preview').innerHTML =
    `<img src="/uploads/${filename}" alt="preview">`;
  slotEl.classList.add('has-image');
  if (slotEl._annotateBtn) slotEl._annotateBtn.style.display = '';
}

function restoreFormData(data) {
  const c = data.cover || {};
  setVal('cover-bag',      c.bag_pand_id);
  setVal('cover-straat',   c.straat_huisnrs);
  setVal('cover-postcode', c.postcode_plaats);
  setVal('cover-ap',       c.ap_gebied);
  setVal('cover-odp',      c.odp_nummer);
  setVal('cover-datum',    c.datum_schouw);
  _syncDpGebied();
  restorePhotoSlot('ref-cover-foto', 'slot-cover-foto', c.foto_vooraanzicht);

  const s1 = data.s1 || {};
  const _surveyEl = document.getElementById('s1-datum-survey');
  if (_surveyEl) delete _surveyEl.dataset.manualOverride;
  setVal('s1-datum-survey',  s1.datum_site_survey);
  setVal('s1-gvb',           s1.glasvezelvoorbereider);
  setVal('s1-tel',           s1.tel_nr);
  setVal('s1-aansluitingen', s1.aantal_aansluitingen);
  setVal('s1-verdiepingen',  s1.aantal_verdiepingen);
  setVal('s1-hoogte',        s1.geschatte_hoogte);
  setVal('s1-bewoners',      s1.bewoners_afhankelijk);
  setVal('s1-vve',           s1.contact_vve_naam);
  _syncEntityLabel();
  setVal('s1-contact',       s1.contact_persoon_beheer);
  setVal('s1-functie',       s1.functie);
  setVal('s1-telefoon',      s1.telefoon);
  setVal('s1-mobiel',        s1.mobiel);
  setVal('s1-email',         s1.emailadres);
  setVal('s1-eigenaren',     s1.meerdere_eigenaren);
  setVal('s1-gevestigd',     s1.gevestigd_te);
  setVal('s1-toegang',       s1.toegang_site_via);
  setVal('s1-invoerpunt',    s1.locatie_invoerpunt);
  setVal('s1-invoergaten',   s1.aantal_invoergaten);
  restoreAnders('s1-stijgpunt',        's1-stijgpunt-anders',        s1.stijgpunt);
  setVal('s1-mantelbuis',    s1.mantelbuis_toegankelijk);
  setVal('s1-doorvoer',      s1.bestaande_doorvoer);
  restoreAnders('s1-gvap',             's1-gvap-anders',             s1.locatie_gvap);
  restoreAnders('s1-cai',              's1-cai-anders',              s1.locatie_cai_aop);
  restoreAnders('s1-isra',             's1-isra-anders',             s1.locatie_isra);
  restoreAnders('s1-meterkast',        's1-meterkast-anders',        s1.locatie_meterkast);
  setVal('s1-volt',          s1.volt_aanwezig);
  restoreAnders('s1-hoofdafsluiters',  's1-hoofdafsluiters-anders',  s1.locatie_hoofdafsluiters);
  restoreAnders('s1-modem',            's1-modem-anders',            s1.locatie_modem);
  restoreAnders('s1-ftu',              's1-ftu-anders',              s1.locatie_ftu);
  setVal('s1-brand',         s1.brandwerende_afdichting);

  // Etage grid
  const wpe = s1.woningen_per_etage || {};
  document.querySelectorAll('.etage-input').forEach(el => {
    const etage = el.getAttribute('data-etage');
    el.value = wpe[etage] || '';
  });

  // Aanwezigen: clear + rebuild
  const aanwContainer = document.getElementById('container-aanwezigen');
  aanwContainer.innerHTML = '';
  (s1.aanwezigen || [{ naam: '', telefoon: '' }]).forEach(a => {
    const div = document.createElement('div');
    div.className = 'dynamic-row aanwezige-row';
    div.innerHTML = `
      <div class="form-row" style="margin-bottom:0">
        <div class="form-group">
          <label>Naam</label>
          <input type="text" class="aanwezige-naam" value="${esc(a.naam)}" placeholder="Naam">
        </div>
        <div class="form-group">
          <label>Telefoonnummer</label>
          <input type="text" class="aanwezige-tel" value="${esc(a.telefoon)}" placeholder="Telefoonnummer">
        </div>
      </div>
      <button type="button" class="btn-remove-row" onclick="this.closest('.dynamic-row').remove()">✕</button>
    `;
    aanwContainer.appendChild(div);
  });

  const s2 = data.s2 || {};
  setVal('s2-tekst', s2.tekst_locatie);
  restorePhotoSlot('ref-s2-foto', 'slot-s2-foto', s2.foto_kaart);

  const s3 = data.s3 || {};
  setVal('s3-uitleg', s3.uitleg_beslisboom);

  const s4 = data.s4 || {};
  restoreAnders('s4-caption', 's4-caption-anders', s4.caption);
  restorePhotoSlot('ref-s4-foto', 'slot-s4-foto', s4.foto_aanzicht);

  // Sectie 5
  const s5 = data.s5 || {};
  document.getElementById('container-buiten').innerHTML   = '';
  document.getElementById('container-inpandig').innerHTML = '';

  (s5.buiten || []).forEach(item => {
    addPhotoRow('container-buiten', 'tpl-photo-row');
    const rows = document.querySelectorAll('#container-buiten .dynamic-row');
    const last = rows[rows.length - 1];
    if (item.foto) {
      last.querySelector('.photo-ref').value = item.foto;
      last.querySelector('.thumb-preview').innerHTML = `<img src="/uploads/${item.foto}">`;
      const _slot = last.querySelector('.photo-slot');
      _slot.classList.add('has-image');
      if (_slot._annotateBtn) _slot._annotateBtn.style.display = '';
    }
    last.querySelector('.row-text').value = item.tekst || '';
  });

  (s5.inpandig || []).forEach(item => {
    addPhotoRow('container-inpandig', 'tpl-photo-row');
    const rows = document.querySelectorAll('#container-inpandig .dynamic-row');
    const last = rows[rows.length - 1];
    if (item.foto) {
      last.querySelector('.photo-ref').value = item.foto;
      last.querySelector('.thumb-preview').innerHTML = `<img src="/uploads/${item.foto}">`;
      const _slot = last.querySelector('.photo-slot');
      _slot.classList.add('has-image');
      if (_slot._annotateBtn) _slot._annotateBtn.style.display = '';
    }
    last.querySelector('.row-text').value = item.tekst || '';
  });

  const s6schema = (data.s6 || {}).schema;
  if (s6schema) {
    schemaState = {
      floors:  s6schema.floors  || ['KD','BG','1ste'],
      columns: s6schema.columns || 2,
      cells:   s6schema.cells   || {},
    };
    renderSchemaGrid();
  }

  // Strenglijsten: clear + rebuild
  const tbody = document.getElementById('container-strenglijsten');
  tbody.innerHTML = '';
  const strengen = (data.s7 || {}).strenglijsten || [];
  if (strengen.length === 0) {
    for (let i = 0; i < 5; i++) addStrengRij();
  } else {
    strengen.forEach(r => {
      addStrengRij();
      const rows = tbody.querySelectorAll('tr');
      const last = rows[rows.length - 1];
      last.querySelector('.streng-adres').value  = r.adres     || '';
      last.querySelector('.streng-hnr').value    = r.hnr       || '';
      last.querySelector('.streng-lengte').value = r.lengte    || '';
      last.querySelector('.streng-invoer').value = r.invoer    || '';
      last.querySelector('.streng-stp').value    = r.stp  || '';
      last.querySelector('.streng-dp').value     = r.dp   || '';
    });
    recalcStrengIDs();
  }
}

// Escape HTML for dynamic value injection
function esc(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;')
                    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ─── Sectie 6: Schema grid editor ──────────────────────────────────────────── */

const FLOOR_SEQUENCE = ['KD','BG','1ste','2e','3e','4e','5e','6e','7e','8e','9e','10e','11e','12e'];

let schemaState = {
  floors:  ['KD', 'BG', '1ste'],
  columns: 2,
  cells:   {},
};

let schemaAnnotatedImage = null; // set when user annotates the schema PNG

function renderSchemaGrid() {
  const editor = document.getElementById('schema-editor');
  if (!editor) return;

  // Render top-to-bottom: 1 extra empty row, then floors reversed
  const displayRows = ['', ...[...schemaState.floors].reverse()];
  const totalCols   = schemaState.columns + 1; // +1 always-empty extra col

  let html = '<div class="schema-grid">';
  for (const rowLabel of displayRows) {
    html += '<div class="schema-row">';
    html += `<div class="schema-label">${esc(rowLabel)}</div>`;
    for (let c = 0; c < totalCols; c++) {
      const isExtra = !rowLabel || c >= schemaState.columns;
      const key = `${rowLabel}-${c}`;
      const cellVal = isExtra ? '' : (schemaState.cells[key] || '');
      const extraAttr = isExtra ? ' data-extra="true"' : '';
      const hasVal    = cellVal ? ' has-value' : '';
      html += `<div class="schema-cell${hasVal}"${extraAttr} data-key="${esc(key)}" onclick="schemaCellClick(this,'${esc(key)}',${isExtra})">`;
      if (cellVal) {
        html += `<span class="cell-value">${esc(cellVal)}</span>`;
      } else if (!isExtra) {
        html += `<span class="cell-add">+</span>`;
      }
      html += '</div>';
    }
    html += '</div>';
  }
  html += '</div>';
  editor.innerHTML = html;
}

function schemaCellClick(el, key, isExtra) {
  if (isExtra) return;
  if (el.querySelector('input')) return;

  const current = schemaState.cells[key] || '';
  el.innerHTML = `<input class="cell-input" type="text" value="${esc(current)}" maxlength="10" placeholder="bijv. 107a">`;
  const inp = el.querySelector('input');
  inp.focus();
  inp.select();

  let committed = false;
  function commit() {
    if (committed) return;
    committed = true;
    const v = inp.value.trim();
    if (v) schemaState.cells[key] = v;
    else   delete schemaState.cells[key];
    clearSchemaAnnotation();
    renderSchemaGrid();
  }

  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter')  { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { committed = true; renderSchemaGrid(); }
  });
  inp.addEventListener('blur', commit);
}

function schemaAddFloor() {
  const top     = schemaState.floors[schemaState.floors.length - 1];
  const nextIdx = FLOOR_SEQUENCE.indexOf(top) + 1;
  if (nextIdx > 0 && nextIdx < FLOOR_SEQUENCE.length) {
    schemaState.floors.push(FLOOR_SEQUENCE[nextIdx]);
    clearSchemaAnnotation();
    renderSchemaGrid();
  }
}

function schemaRemoveFloor() {
  if (schemaState.floors.length <= 2) return; // min = KD + BG
  const top      = schemaState.floors[schemaState.floors.length - 1];
  const hasCells = Object.keys(schemaState.cells).some(k => k.startsWith(top + '-'));
  if (hasCells) { showMsg('error', '✗ Verwijder eerst alle woningnummers op de bovenste verdieping.'); return; }
  schemaState.floors.pop();
  clearSchemaAnnotation();
  renderSchemaGrid();
}

function schemaAddCol() {
  schemaState.columns++;
  clearSchemaAnnotation();
  renderSchemaGrid();
}

function schemaRemoveCol() {
  if (schemaState.columns <= 1) return;
  const c        = schemaState.columns - 1;
  const hasCells = Object.keys(schemaState.cells).some(k => k.endsWith(`-${c}`));
  if (hasCells) { showMsg('error', '✗ Verwijder eerst alle woningnummers in de rechterkolom.'); return; }
  schemaState.columns--;
  clearSchemaAnnotation();
  renderSchemaGrid();
}

// Initial render
renderSchemaGrid();

/* ─── Entity label sync ──────────────────────────────────────────────────────── */
function _syncEntityLabel() {
  const vveInput = document.getElementById('s1-vve');
  const label    = document.getElementById('entity-type-label');
  if (!label) return;
  label.textContent = (vveInput && vveInput.value.trim()) || 'VvE';
}
const _vveInput = document.getElementById('s1-vve');
if (_vveInput) _vveInput.addEventListener('input', _syncEntityLabel);

/* ─── Anders dropdown helper ─────────────────────────────────────────────────── */
function toggleAnders(selectEl, andersId) {
  const inp = document.getElementById(andersId);
  if (!inp) return;
  inp.style.display = selectEl.value === 'Anders' ? '' : 'none';
  if (selectEl.value !== 'Anders') inp.value = '';
}

// Read effective value: if dropdown is "Anders", return the free-text input
function valAnders(selectId, andersId) {
  const sel = document.getElementById(selectId);
  if (!sel) return '';
  if (sel.value === 'Anders') {
    const inp = document.getElementById(andersId);
    return inp ? inp.value.trim() : '';
  }
  return sel.value;
}

// Restore a dropdown+anders pair from a saved value
function restoreAnders(selectId, andersId, value) {
  const sel = document.getElementById(selectId);
  if (!sel || value === undefined || value === null) return;
  // Check if value matches one of the fixed options
  const fixed = Array.from(sel.options).map(o => o.value).filter(v => v && v !== 'Anders');
  if (fixed.includes(value)) {
    sel.value = value;
  } else if (value !== '') {
    sel.value = 'Anders';
    const inp = document.getElementById(andersId);
    if (inp) { inp.value = value; inp.style.display = ''; }
  }
}

/* ─── DP-gebied + ODP auto-fill ──────────────────────────────────────────────── */
function _syncDpGebied() {
  const ap  = (document.getElementById('cover-ap')?.value  || '').trim();
  const odp = (document.getElementById('cover-odp')?.value || '').trim();
  const dp  = document.getElementById('cover-dp-gebied');
  if (dp) dp.value = (ap && odp) ? `${ap}-ODP${odp}` : (ap ? ap : '');
}

function _syncOdpToStreng() {
  const odp = (document.getElementById('cover-odp')?.value || '').trim();
  document.querySelectorAll('#container-strenglijsten .streng-dp').forEach(inp => {
    inp.value = odp;
  });
  recalcStrengIDs();
}

document.getElementById('cover-ap')?.addEventListener('input',  _syncDpGebied);
document.getElementById('cover-odp')?.addEventListener('input', () => { _syncDpGebied(); _syncOdpToStreng(); });

/* ─── Datum schouw → Datum site survey sync ──────────────────────────────────── */
document.getElementById('cover-datum')?.addEventListener('change', e => {
  const survey = document.getElementById('s1-datum-survey');
  if (survey && !survey.dataset.manualOverride) survey.value = e.target.value;
});
document.getElementById('s1-datum-survey')?.addEventListener('change', e => {
  const cover = document.getElementById('cover-datum');
  if (cover && e.target.value !== cover.value) e.target.dataset.manualOverride = '1';
});

/* ─── Save / Load JSON ───────────────────────────────────────────────────────── */

function saveFormJSON() {
  const data = collectFormData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'plaatsingsdocument.json';
  a.click();
  URL.revokeObjectURL(url);
}

function loadFormJSON(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      restoreFormData(data);
      showMsg('success', '✓ Formulier geladen vanuit JSON');
    } catch {
      showMsg('error', '✗ Ongeldig JSON bestand');
    }
  };
  reader.readAsText(file);
  input.value = ''; // reset so same file can be loaded again
}

/* ─── Generate document ─────────────────────────────────────────────────────── */

async function generateDocument() {
  const btn = document.getElementById('btn-generate');
  btn.disabled = true;
  showMsg('loading', '⏳ Document wordt aangemaakt...');

  try {
    // Step 1: get schema image (annotated version if saved, otherwise generate fresh)
    let schemaFilename;
    if (schemaAnnotatedImage) {
      schemaFilename = schemaAnnotatedImage;
    } else {
      const schemaRes = await fetch('/generate-schema', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(schemaState),
      });
      if (!schemaRes.ok) {
        const j = await schemaRes.json().catch(() => ({}));
        throw new Error(j.error || `Schema HTTP ${schemaRes.status}`);
      }
      schemaFilename = (await schemaRes.json()).filename;
    }

    // Step 2: generate document with schema image filename attached
    const data = collectFormData();
    data.s6.schema_image = schemaFilename;

    const res = await fetch('/generate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || `HTTP ${res.status}`);
    }

    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'Plaatsingsdocument.docx';
    a.click();
    URL.revokeObjectURL(url);

    showMsg('success', '✓ Document succesvol gegenereerd!');
  } catch (err) {
    showMsg('error', '✗ Fout: ' + err.message);
  } finally {
    btn.disabled = false;
  }
}

/* ─── Photo Annotation Editor ───────────────────────────────────────────────────
   PhotoAnnotator — canvas-based annotation editor for photo slots.
   Used in Sectie 2, 4, 5 (orange #FF6600) and Sectie 6 schema (red #FF0000).
──────────────────────────────────────────────────────────────────────────────── */

let activeAnnotator = null;

function _distToSeg(px, py, x1, y1, x2, y2) {
  const dx = x2-x1, dy = y2-y1;
  const lenSq = dx*dx + dy*dy;
  if (lenSq === 0) return Math.hypot(px-x1, py-y1);
  const t = Math.max(0, Math.min(1, ((px-x1)*dx + (py-y1)*dy) / lenSq));
  return Math.hypot(px-(x1+t*dx), py-(y1+t*dy));
}

class PhotoAnnotator {
  constructor(opts) {
    this.containerEl = opts.containerEl;
    this.imageUrl    = opts.imageUrl;
    this.onSave      = opts.onSave  || null;
    this.color       = opts.color   || '#FF6600';
    this.tools       = opts.tools   || ['arrow','line','box','rect'];

    this.image       = null;
    this.imgNatW     = 0;
    this.imgNatH     = 0;

    this.annotations = [];
    this.selectedIdx = -1;
    this.activeTool  = this.tools[0];
    this.nextBoxNum  = 1;

    this.mouseState    = 'idle'; // 'drawing' | 'dragging' | 'resizing'
    this.drawStart     = null;
    this.drawCurrent   = null;
    this.dragOffset    = null;
    this.dragHandleIdx = -1;

    this.canvas       = null;
    this.ctx          = null;
    this._textInputEl = null;
    this._keyHandler  = null;
    this._undoStack   = [];
  }

  open() {
    if (activeAnnotator && activeAnnotator !== this) activeAnnotator.close();
    activeAnnotator = this;
    this._buildUI();
    this._loadImage();
  }

  close() {
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
    this._dismissTextInput();
    this.containerEl.style.display = 'none';
    this.containerEl.innerHTML = '';
    this.canvas = null;
    this.ctx    = null;
    if (activeAnnotator === this) activeAnnotator = null;
  }

  _buildUI() {
    this.containerEl.style.display = '';
    const isAlt = this.color !== '#FF6600';

    const toolLabels = {
      arrow:   '&#8594; Pijl',
      line:    '&#8213; Lijn',
      box:     '&#9635; Vakje+cijfer',
      rect:    '&#9633; Rechthoek',
      textbox: '&#9635; Tekstvakje',
    };
    const toolBtns = this.tools.map(t =>
      `<button class="annot-tool-btn${t === this.activeTool ? ' active' : ''}" data-tool="${t}">${toolLabels[t]}</button>`
    ).join('');

    this.containerEl.innerHTML = `
      <div class="annot-toolbar">
        ${toolBtns}
        <button class="annot-tool-btn annot-undo-btn" disabled>&#8617; Ongedaan</button>
        <button class="annot-tool-btn annot-clear-btn">Alles wissen</button>
        <button class="annot-action-btn annot-save-btn">Opslaan</button>
        <button class="annot-action-btn annot-close-btn">Sluiten</button>
      </div>
      <div class="annot-canvas-wrapper">
        <canvas class="annot-canvas"></canvas>
      </div>
    `;
    if (isAlt) this.containerEl.dataset.annotColor = 'alt';

    this.canvas = this.containerEl.querySelector('.annot-canvas');
    this.ctx    = this.canvas.getContext('2d');

    this.containerEl.querySelectorAll('.annot-tool-btn[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeTool = btn.dataset.tool;
        this.containerEl.querySelectorAll('.annot-tool-btn[data-tool]')
            .forEach(b => b.classList.toggle('active', b.dataset.tool === this.activeTool));
        this._dismissTextInput();
      });
    });

    this.containerEl.querySelector('.annot-undo-btn').addEventListener('click', () => this._undo());
    this.containerEl.querySelector('.annot-clear-btn').addEventListener('click', () => {
      this.annotations = [];
      this.selectedIdx = -1;
      this.nextBoxNum  = 1;
      this._undoStack  = [];
      this._dismissTextInput();
      this._redraw();
      this._updateUndoBtn();
    });
    this.containerEl.querySelector('.annot-save-btn').addEventListener('click', () => this._save());
    this.containerEl.querySelector('.annot-close-btn').addEventListener('click', () => this.close());

    this.canvas.addEventListener('mousedown', e => this._onMouseDown(e));
    this.canvas.addEventListener('mousemove', e => this._onMouseMove(e));
    this.canvas.addEventListener('mouseup',   e => this._onMouseUp(e));
    this.canvas.addEventListener('dblclick',  e => this._onDblClick(e));
    document.addEventListener('keydown', this._keyHandler = e => this._onKeyDown(e));

    // Touch support
    this.canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      const t = e.touches[0];
      this.canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: t.clientX, clientY: t.clientY }));
    }, { passive: false });
    this.canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      const t = e.touches[0];
      this.canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: t.clientX, clientY: t.clientY }));
    }, { passive: false });
    this.canvas.addEventListener('touchend', e => {
      e.preventDefault();
      const t = e.changedTouches[0];
      this.canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: t.clientX, clientY: t.clientY }));
    }, { passive: false });
  }

  _loadImage() {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this.image   = img;
      this.imgNatW = img.naturalWidth;
      this.imgNatH = img.naturalHeight;
      this._resizeCanvas();
      this._redraw();
      this.containerEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };
    img.src = this.imageUrl;
  }

  _resizeCanvas() {
    if (!this.image || !this.canvas) return;
    const wrapper = this.canvas.parentElement;
    const maxW = Math.max((wrapper.clientWidth || 800) - 4, 200);
    const maxH = 600;
    const aspect = this.imgNatH / this.imgNatW;
    let cw = maxW, ch = Math.round(cw * aspect);
    if (ch > maxH) { ch = maxH; cw = Math.round(ch / aspect); }
    this.canvas.width  = cw;
    this.canvas.height = ch;
    this.canvas.style.width  = cw + 'px';
    this.canvas.style.height = ch + 'px';
  }

  _redraw() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.image) ctx.drawImage(this.image, 0, 0, this.canvas.width, this.canvas.height);
    for (let i = 0; i < this.annotations.length; i++) {
      this._drawAnn(ctx, this.annotations[i], 1, i === this.selectedIdx);
    }
    if (this.drawCurrent) {
      ctx.globalAlpha = 0.65;
      this._drawAnn(ctx, this.drawCurrent, 1, false);
      ctx.globalAlpha = 1;
    }
  }

  _drawAnn(ctx, ann, scale, selected) {
    const SW = 3 * scale;
    const AL = 14 * scale;
    const AA = 0.42;
    ctx.save();
    ctx.lineCap = ctx.lineJoin = 'round';

    if (ann.type === 'arrow') {
      ctx.strokeStyle = this.color; ctx.fillStyle = this.color; ctx.lineWidth = SW;
      ctx.beginPath(); ctx.moveTo(ann.x1, ann.y1); ctx.lineTo(ann.x2, ann.y2); ctx.stroke();
      const angle = Math.atan2(ann.y2-ann.y1, ann.x2-ann.x1);
      ctx.beginPath();
      ctx.moveTo(ann.x2, ann.y2);
      ctx.lineTo(ann.x2 - AL*Math.cos(angle-AA), ann.y2 - AL*Math.sin(angle-AA));
      ctx.lineTo(ann.x2 - AL*Math.cos(angle+AA), ann.y2 - AL*Math.sin(angle+AA));
      ctx.closePath(); ctx.fill();
      if (selected) { this._handle(ctx, ann.x1, ann.y1, scale); this._handle(ctx, ann.x2, ann.y2, scale); }

    } else if (ann.type === 'line') {
      ctx.strokeStyle = this.color; ctx.lineWidth = SW;
      ctx.beginPath(); ctx.moveTo(ann.x1, ann.y1); ctx.lineTo(ann.x2, ann.y2); ctx.stroke();
      if (selected) { this._handle(ctx, ann.x1, ann.y1, scale); this._handle(ctx, ann.x2, ann.y2, scale); }

    } else if (ann.type === 'box') {
      ctx.fillStyle = 'white'; ctx.strokeStyle = this.color; ctx.lineWidth = SW;
      ctx.fillRect(ann.x, ann.y, ann.w, ann.h);
      ctx.strokeRect(ann.x, ann.y, ann.w, ann.h);
      ctx.fillStyle = 'black';
      ctx.font = `bold ${Math.round(16*scale)}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(ann.num), ann.x + ann.w/2, ann.y + ann.h/2);
      if (selected) this._rectHandles(ctx, ann, scale);

    } else if (ann.type === 'rect') {
      ctx.strokeStyle = this.color; ctx.lineWidth = SW;
      ctx.strokeRect(ann.x, ann.y, ann.w, ann.h);
      if (selected) this._rectHandles(ctx, ann, scale);

    } else if (ann.type === 'textbox') {
      ctx.fillStyle = 'white'; ctx.strokeStyle = '#000000'; ctx.lineWidth = SW;
      ctx.fillRect(ann.x, ann.y, ann.w, ann.h);
      ctx.strokeRect(ann.x, ann.y, ann.w, ann.h);
      if (ann.text) {
        ctx.fillStyle = 'black';
        ctx.font = `${Math.round(13*scale)}px sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        // Clip text to box
        ctx.save();
        ctx.rect(ann.x+2, ann.y+2, ann.w-4, ann.h-4);
        ctx.clip();
        ctx.fillText(ann.text, ann.x + ann.w/2, ann.y + ann.h/2);
        ctx.restore();
      }
      if (selected) this._rectHandles(ctx, ann, scale);
    }
    ctx.restore();
  }

  _handle(ctx, x, y, scale) {
    const hs = 7 * scale;
    ctx.save();
    ctx.fillStyle = 'white'; ctx.strokeStyle = this.color; ctx.lineWidth = 1.5 * scale;
    ctx.fillRect(x-hs/2, y-hs/2, hs, hs);
    ctx.strokeRect(x-hs/2, y-hs/2, hs, hs);
    ctx.restore();
  }

  _rectHandles(ctx, ann, scale) {
    for (const [cx, cy] of this._corners(ann)) this._handle(ctx, cx, cy, scale);
  }

  _corners(ann) {
    return [
      [ann.x,        ann.y       ],
      [ann.x + ann.w, ann.y      ],
      [ann.x,        ann.y + ann.h],
      [ann.x + ann.w, ann.y + ann.h],
    ];
  }

  _hitTest(x, y) {
    for (let i = this.annotations.length - 1; i >= 0; i--) {
      const a = this.annotations[i];
      if (a.type === 'arrow' || a.type === 'line') {
        if (_distToSeg(x, y, a.x1, a.y1, a.x2, a.y2) < 8) return i;
      } else {
        if (x >= a.x-5 && x <= a.x+a.w+5 && y >= a.y-5 && y <= a.y+a.h+5) return i;
      }
    }
    return -1;
  }

  _hitHandle(x, y, ann) {
    const HR = 10;
    if (ann.type === 'arrow' || ann.type === 'line') {
      if (Math.hypot(x-ann.x1, y-ann.y1) < HR) return 0;
      if (Math.hypot(x-ann.x2, y-ann.y2) < HR) return 1;
    } else {
      const c = this._corners(ann);
      for (let i = 0; i < c.length; i++) {
        if (Math.hypot(x-c[i][0], y-c[i][1]) < HR) return i;
      }
    }
    return -1;
  }

  _xy(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  _onMouseDown(e) {
    if (e.button !== 0) return;
    this._dismissTextInput();
    const {x, y} = this._xy(e);

    // Resize handle on selected annotation?
    if (this.selectedIdx >= 0) {
      const hIdx = this._hitHandle(x, y, this.annotations[this.selectedIdx]);
      if (hIdx >= 0) { this.mouseState = 'resizing'; this.dragHandleIdx = hIdx; return; }
    }

    // Hit existing annotation?
    const hitIdx = this._hitTest(x, y);
    if (hitIdx >= 0) {
      this.selectedIdx = hitIdx;
      const a = this.annotations[hitIdx];
      this.dragOffset = (a.type === 'arrow' || a.type === 'line')
        ? {dx: x-a.x1, dy: y-a.y1}
        : {dx: x-a.x,  dy: y-a.y};
      this.mouseState = 'dragging';
      this._redraw();
      return;
    }

    this.selectedIdx = -1;

    // Place box (click, not drag)
    if (this.activeTool === 'box') {
      this._pushUndo();
      const bw = 60, bh = 40;
      const ann = {type:'box', x:x-bw/2, y:y-bh/2, w:bw, h:bh, num:String(this.nextBoxNum++)};
      this.annotations.push(ann);
      this.selectedIdx = this.annotations.length - 1;
      this._redraw();
      this._showTextInput(ann, 'num');
      return;
    }
    // Place textbox (click, not drag)
    if (this.activeTool === 'textbox') {
      this._pushUndo();
      const tw = 120, th = 40;
      const ann = {type:'textbox', x:x-tw/2, y:y-th/2, w:tw, h:th, text:''};
      this.annotations.push(ann);
      this.selectedIdx = this.annotations.length - 1;
      this._redraw();
      this._showTextInput(ann, 'text');
      return;
    }

    // Start drawing
    this.mouseState  = 'drawing';
    this.drawStart   = {x, y};
    this.drawCurrent = this._makeDrawAnn(x, y, x, y);
  }

  _onMouseMove(e) {
    const {x, y} = this._xy(e);

    if (this.mouseState === 'idle') {
      if (this.selectedIdx >= 0) {
        const hIdx = this._hitHandle(x, y, this.annotations[this.selectedIdx]);
        if (hIdx >= 0) {
          const cursors = ['nwse-resize','nesw-resize','nesw-resize','nwse-resize'];
          this.canvas.style.cursor = cursors[hIdx] || 'nwse-resize';
          return;
        }
      }
      this.canvas.style.cursor = this._hitTest(x, y) >= 0 ? 'move' : 'crosshair';
      return;
    }

    if (this.mouseState === 'drawing') {
      this.drawCurrent = this._makeDrawAnn(this.drawStart.x, this.drawStart.y, x, y);
      this._redraw();
    } else if (this.mouseState === 'dragging') {
      const a = this.annotations[this.selectedIdx];
      if (a.type === 'arrow' || a.type === 'line') {
        const dx = a.x2-a.x1, dy = a.y2-a.y1;
        a.x1 = x - this.dragOffset.dx; a.y1 = y - this.dragOffset.dy;
        a.x2 = a.x1 + dx;              a.y2 = a.y1 + dy;
      } else {
        a.x = x - this.dragOffset.dx;
        a.y = y - this.dragOffset.dy;
      }
      this._redraw();
    } else if (this.mouseState === 'resizing') {
      this._applyResize(this.annotations[this.selectedIdx], this.dragHandleIdx, x, y);
      this._redraw();
    }
  }

  _onMouseUp(e) {
    if (this.mouseState === 'drawing') {
      const {x, y} = this._xy(e);
      const ann = this._makeDrawAnn(this.drawStart.x, this.drawStart.y, x, y);
      const valid = (ann.type === 'arrow' || ann.type === 'line')
        ? Math.hypot(ann.x2-ann.x1, ann.y2-ann.y1) > 8
        : (ann.w > 8 && ann.h > 8);
      if (valid) { this._pushUndo(); this.annotations.push(ann); this.selectedIdx = this.annotations.length - 1; }
      this.drawCurrent = null;
      this._redraw();
    }
    this.mouseState = 'idle'; this.dragOffset = null; this.dragHandleIdx = -1;
  }

  _onDblClick(e) {
    const {x, y} = this._xy(e);
    const hitIdx = this._hitTest(x, y);
    if (hitIdx < 0) return;
    const ann = this.annotations[hitIdx];
    if (ann.type === 'box')     this._showTextInput(ann, 'num');
    if (ann.type === 'textbox') this._showTextInput(ann, 'text');
  }

  _onKeyDown(e) {
    if (!this.canvas || this._textInputEl) return;
    if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
      e.preventDefault();
      this._undo();
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const ae = document.activeElement;
      if (!ae || ae === document.body || ae === this.canvas) {
        if (this.selectedIdx >= 0) {
          this._pushUndo();
          this.annotations.splice(this.selectedIdx, 1);
          this.selectedIdx = -1;
          this._redraw();
          e.preventDefault();
        }
      }
    }
  }

  _pushUndo() {
    this._undoStack.push(JSON.parse(JSON.stringify(this.annotations)));
    if (this._undoStack.length > 20) this._undoStack.shift();
    this._updateUndoBtn();
  }

  _undo() {
    if (this._undoStack.length === 0) return;
    this.annotations = this._undoStack.pop();
    this.selectedIdx = -1;
    this._redraw();
    this._updateUndoBtn();
  }

  _updateUndoBtn() {
    const btn = this.containerEl && this.containerEl.querySelector('.annot-undo-btn');
    if (btn) btn.disabled = this._undoStack.length === 0;
  }

  _makeDrawAnn(x1, y1, x2, y2) {
    const t = this.activeTool;
    if (t === 'arrow') return {type:'arrow', x1, y1, x2, y2};
    if (t === 'line')  return {type:'line',  x1, y1, x2, y2};
    const x = Math.min(x1,x2), y = Math.min(y1,y2);
    const w = Math.abs(x2-x1), h = Math.abs(y2-y1);
    return {type:'rect', x, y, w, h};
  }

  _applyResize(ann, hIdx, x, y) {
    if (ann.type === 'arrow' || ann.type === 'line') {
      if (hIdx === 0) { ann.x1 = x; ann.y1 = y; } else { ann.x2 = x; ann.y2 = y; }
    } else {
      const r = ann.x+ann.w, b = ann.y+ann.h;
      if (hIdx === 0) { ann.w = r-x; ann.h = b-y; ann.x = x; ann.y = y; }
      if (hIdx === 1) { ann.w = x-ann.x; ann.h = b-y; ann.y = y; }
      if (hIdx === 2) { ann.w = r-x; ann.h = y-ann.y; ann.x = x; }
      if (hIdx === 3) { ann.w = x-ann.x; ann.h = y-ann.y; }
      ann.w = Math.max(10, ann.w); ann.h = Math.max(10, ann.h);
    }
  }

  _showTextInput(ann, field) {
    this._dismissTextInput();
    const wrapper = this.canvas.parentElement;
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'annot-text-input';
    inp.value = ann[field] || '';
    inp.placeholder = field === 'num' ? '1' : 'Tekst...';
    inp.style.left     = ann.x + 'px';
    inp.style.top      = ann.y + 'px';
    inp.style.width    = ann.w + 'px';
    inp.style.height   = ann.h + 'px';
    inp.style.fontSize = (field === 'num' ? '16px' : '13px');
    inp.style.fontWeight = (field === 'num' ? 'bold' : 'normal');
    wrapper.appendChild(inp);
    inp.focus(); inp.select();
    this._textInputEl = inp;

    let done = false;
    const finalize = () => {
      if (done) return; done = true;
      const v = inp.value.trim();
      if (v) ann[field] = v;
      this._dismissTextInput();
      this._redraw();
    };
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); finalize(); }
    });
    inp.addEventListener('blur', finalize);
  }

  _dismissTextInput() {
    if (this._textInputEl) { this._textInputEl.remove(); this._textInputEl = null; }
  }

  async _save() {
    if (!this.image) { this.close(); return; }
    this._dismissTextInput();

    const sw = this.imgNatW, sh = this.imgNatH;
    const s  = sw / this.canvas.width;

    const sc = document.createElement('canvas');
    sc.width = sw; sc.height = sh;
    const sCtx = sc.getContext('2d');
    sCtx.drawImage(this.image, 0, 0);

    for (const ann of this.annotations) {
      this._drawAnn(sCtx, this._scaleAnn(ann, s), s, false);
    }

    const blob = await new Promise(res => sc.toBlob(res, 'image/png'));
    const fd = new FormData();
    fd.append('file', blob, 'annotated.png');

    try {
      const res  = await fetch('/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      if (this.onSave) this.onSave(json.filename, json.url);
      this.close();
    } catch (err) {
      alert('Opslaan mislukt: ' + err.message);
    }
  }

  _scaleAnn(ann, s) {
    if (ann.type === 'arrow' || ann.type === 'line') {
      return {...ann, x1:ann.x1*s, y1:ann.y1*s, x2:ann.x2*s, y2:ann.y2*s};
    }
    return {...ann, x:ann.x*s, y:ann.y*s, w:ann.w*s, h:ann.h*s};
  }
}

/* ─── Sectie 6: Schema annotator ─────────────────────────────────────────────── */

async function openSchemaAnnotator() {
  showMsg('loading', '⏳ Schema wordt voorbereid...');
  try {
    const res = await fetch('/generate-schema', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(schemaState),
    });
    if (!res.ok) throw new Error('Schema generatie mislukt');
    const { filename } = await res.json();

    document.getElementById('loading-msg').style.display = 'none';

    const editorEl = document.getElementById('schema-annot-editor');
    new PhotoAnnotator({
      containerEl: editorEl,
      imageUrl:    `/uploads/${filename}`,
      onSave: (savedFilename) => {
        schemaAnnotatedImage = savedFilename;
        _updateSchemaAnnotStatus();
      },
      color: '#FF0000',
      tools: ['arrow', 'line', 'box', 'rect', 'textbox'],
    }).open();
  } catch (err) {
    showMsg('error', '✗ ' + err.message);
  }
}

function clearSchemaAnnotation() {
  schemaAnnotatedImage = null;
  _updateSchemaAnnotStatus();
}

function _updateSchemaAnnotStatus() {
  const el = document.getElementById('schema-annot-status');
  if (!el) return;
  el.innerHTML = schemaAnnotatedImage
    ? `<span class="schema-annot-active">&#10003; Geannoteerde versie actief</span>
       <button type="button" class="btn-schema-annot-clear" onclick="clearSchemaAnnotation()">&#215; Wissen</button>`
    : '';
}

/* ─── Message helper ─────────────────────────────────────────────────────────── */

let msgTimer = null;

function showMsg(type, text) {
  ['success', 'error', 'loading'].forEach(t => {
    const el = document.getElementById(t + '-msg');
    if (el) el.style.display = 'none';
  });
  const el = document.getElementById(type + '-msg');
  if (!el) return;
  el.textContent = text;
  el.style.display = 'block';
  if (type !== 'loading') {
    clearTimeout(msgTimer);
    msgTimer = setTimeout(() => { el.style.display = 'none'; }, 5000);
  }
}
