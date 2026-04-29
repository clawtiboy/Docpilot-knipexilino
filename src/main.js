import './styles.css';

const STORAGE_KEY = 'docpilot.knipexilino.v1';
const ORG_KEYWORDS = ['Jobcenter','AOK','IKK','TK','Barmer','DAK','Finanzamt','DRV','Deutsche Rentenversicherung','Krankenkasse','Stadtwerke','Telekom','Vodafone','Gericht','Amtsgericht','Landgericht','Polizei','Bürgeramt','Ausländerbehörde','Vermieter','Bank','Sparkasse','Inkasso','Versicherung','Allianz','HUK','Debeka'];
const DOC_TYPES = [
  ['Mahnung', /mahnung|zahlungsaufforderung|letzte erinnerung/i],
  ['Bescheid', /bescheid|bewilligung|ablehnung|widerspruchsbelehrung/i],
  ['Rechnung', /rechnung|rechnungsnummer|betrag|zahlbar/i],
  ['Antrag', /antrag|beantragen|unterlagen nachreichen/i],
  ['Kündigung', /kündigung|gekündigt|kündigen/i],
  ['Arztbrief', /arztbrief|diagnose|befund|therapie|patient/i],
  ['Vertrag', /vertrag|vertragsnummer|laufzeit/i],
  ['Allgemeines Schreiben', /.*/]
];

const defaultState = () => ({
  documents: [],
  cases: [],
  persons: [],
  organisations: [],
  tasks: [],
  timeline: [],
  drafts: [],
  settings: {
    aiProxyUrl: 'https://docpilot-knipexilino-production.up.railway.app',
    ocrProxyUrl: 'https://docpilot-knipexilino-production.up.railway.app',
    voiceRate: 0.92,
    privacyMode: true
  },
  activeTab: 'dashboard',
  activeCaseId: null
});

let state = loadState();
let currentModal = null;
let letterTimer = null;

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return parsed && parsed.documents ? parsed : defaultState();
  } catch (_) { return defaultState(); }
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function uid(prefix='id') { return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`; }
function todayISO() { return new Date().toISOString().slice(0,10); }
function esc(value='') { return String(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch])); }
function fmtDate(value) { if (!value) return 'ohne Datum'; try { return new Intl.DateTimeFormat('de-DE').format(new Date(value)); } catch (_) { return value; } }
function daysUntil(date) { if (!date) return null; const today = new Date(); today.setHours(0,0,0,0); const d = new Date(date); d.setHours(0,0,0,0); return Math.ceil((d - today) / 86400000); }

function boot() {
  document.getElementById('app').innerHTML = shellTemplate();
  bindGlobalEvents();
  render();
  // Splash sofort ausblenden (100ms)
  setTimeout(() => {
    const s = document.querySelector('.splash');
    if(s) { s.classList.add('hide'); setTimeout(() => s.remove(), 500); }
  }, 100);
  try { initMatrix(); } catch(e) { console.warn('matrix skipped', e); }
  try { initLetterRain(); } catch(e) { console.warn('rain skipped', e); }
}

document.addEventListener('DOMContentLoaded', boot);

function shellTemplate() {
  return `
    <canvas class="background-canvas" id="matrixCanvas"></canvas>
    <div class="letter-layer" id="letterLayer"></div>
    <div class="splash">
      <div class="splash-card">
        <div class="logo-mark"><span>🤖</span></div>
        <h1>DocPilot</h1>
        <p>Knipexilino initialisiert dein Dokumenten-Gedächtnis.</p>
        <div class="boot-terms" id="bootTerms">AOK · Jobcenter · IKK · Finanzamt</div>
        <div class="progress"><div></div></div>
      </div>
    </div>
    <main class="app-shell">
      <header class="topbar">
        <div class="brand">
          <div class="brand-icon">📄</div>
          <div><h1>DocPilot Knipexilino</h1><p>KI-Fallmanager · lokal · GitHub-ready</p></div>
        </div>
        <div class="status-pill"><span class="dot"></span><span id="systemStatus">Offline-Kern aktiv</span></div>
      </header>
      <section id="screen-dashboard" class="screen active"></section>
      <section id="screen-documents" class="screen"></section>
      <section id="screen-cases" class="screen"></section>
      <section id="screen-ai" class="screen"></section>
      <section id="screen-settings" class="screen"></section>
    </main>
    <nav class="nav" id="bottomNav">
      ${navButton('dashboard','🏠','Dashboard')}
      ${navButton('documents','📄','Dokumente')}
      ${navButton('cases','🗂️','Fälle')}
      ${navButton('ai','🤖','KI')}
      ${navButton('settings','⚙️','Settings')}
    </nav>
    <input type="file" id="fileInput" class="file-input" accept="image/*,.txt,.md,.pdf" />
  `;
}
function navButton(id, icon, label) { return `<button data-tab="${id}" class="${state.activeTab===id?'active':''}"><span>${icon}</span>${label}</button>`; }

function bindGlobalEvents() {
  document.body.addEventListener('click', async (event) => {
    const target = event.target.closest('[data-action],[data-tab]');
    if (!target) return;
    if (target.dataset.tab) return switchTab(target.dataset.tab);
    const action = target.dataset.action;
    const id = target.dataset.id;
    if (action === 'new-doc') openDocumentModal();
    if (action === 'scan') document.getElementById('fileInput').click();
    if (action === 'seed') { seedDemo(); render(); }
    if (action === 'clear') confirmReset();
    if (action === 'export') exportData();
    if (action === 'import') importData();
    if (action === 'open-doc') openDocumentDetail(id);
    if (action === 'delete-doc') deleteDocument(id);
    if (action === 'reply-doc') openReply(id);
    if (action === 'speak-doc') speakDocument(id);
    if (action === 'create-task') createTaskFromDoc(id);
    if (action === 'open-case') { state.activeCaseId = id; switchTab('cases'); render(); }
    if (action === 'case-list') { state.activeCaseId = null; renderCases(); }
    if (action === 'chat-send') handleChat();
    if (action === 'draft-save') saveDraft(id);
    if (action === 'close-modal') closeModal();
    if (action === 'settings-save') saveSettings();
    if (action === 'dictate') startDictation(target.dataset.target);
    if (action === 'stop-speech') stopSpeech();
  });

  document.getElementById('fileInput').addEventListener('change', handleFileInput);
}

function switchTab(tab) {
  state.activeTab = tab;
  saveState();
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  document.getElementById(`screen-${tab}`).classList.add('active');
  document.querySelectorAll('.nav button').forEach(el => el.classList.toggle('active', el.dataset.tab === tab));
  render();
}

function render() {
  renderDashboard();
  renderDocuments();
  renderCases();
  renderAI();
  renderSettings();
  const critical = state.tasks.filter(t => t.status !== 'done' && (t.risk === 'kritisch' || t.risk === 'hoch')).length;
  document.getElementById('systemStatus').textContent = critical ? `${critical} kritische Aufgabe(n)` : 'Offline-Kern aktiv';
}

function renderDashboard() {
  const docs = state.documents;
  const openTasks = state.tasks.filter(t => t.status !== 'done');
  const criticalTasks = openTasks.filter(t => t.risk === 'kritisch' || t.risk === 'hoch');
  const upcoming = openTasks.filter(t => t.dueDate).sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0,4);
  const activeCases = state.cases.slice(0,4);
  document.getElementById('screen-dashboard').innerHTML = `
    <div class="hero">
      <div class="panel card-pad hero-main">
        <p class="chip">🤖 AI Command Center</p>
        <h2 class="hero-title">Chaos rein.<br><span class="gradient-text">Fallakte raus.</span></h2>
        <p class="hero-copy">Scanne Briefe, erkenne Fristen, verknüpfe Personen und Organisationen, erzeuge Timeline und Antwortvorschläge. Alles läuft lokal mit optionalem KI/OCR-Proxy.</p>
        <div class="quick-actions">
          <button class="btn primary" data-action="scan">📸 Dokument scannen</button>
          <button class="btn" data-action="new-doc">✍️ Text einfügen</button>
          <button class="btn ghost" data-action="seed">✨ Demo-Daten</button>
        </div>
      </div>
      <div class="panel card-pad">
        <div class="stat-grid">
          ${stat(docs.length,'Dokumente')}
          ${stat(state.cases.length,'Fälle')}
          ${stat(openTasks.length,'Offene Aufgaben')}
          ${stat(briefDocs.length,'✉️ Brief nötig')}
        </div>
      </div>
    </div>
    <div class="grid two">
      <div class="panel card-pad">
        <div class="section-title"><h2>🔴 Kritische Aufgaben</h2><span class="small muted">Fristen & Risiko</span></div>
        <div class="grid">${criticalTasks.length ? criticalTasks.slice(0,5).map(taskCard).join('') : empty('Keine kritischen Aufgaben erkannt.')}</div>
      </div>
      <div class="panel card-pad">
        <div class="section-title"><h2>⏱ Nächste Fristen</h2><span class="small muted">automatisch extrahiert</span></div>
        <div class="grid">${upcoming.length ? upcoming.map(taskCard).join('') : empty('Noch keine Fristen. Lade ein Dokument hoch.')}</div>
      </div>
    </div>
    <div class="grid two">
      <div class="panel card-pad">
        <div class="section-title"><h2>📂 Aktive Fälle</h2><button class="btn ghost" data-tab="cases">Alle Fälle</button></div>
        <div class="grid">${activeCases.length ? activeCases.map(caseCard).join('') : empty('Noch keine Fälle. Sie entstehen automatisch aus Dokumenten.')}</div>
      </div>
      <div class="panel card-pad">
        <div class="section-title"><h2>✉️ Brief nötig</h2><span class="small muted">Kommunikations-Check</span></div>
        <div class="grid">${briefDocs.length ? briefDocs.slice(0,3).map(d => `<div class="item risk-${esc(d.analysis.risk)}"><div class="item-header"><h3>${esc(d.title)}</h3><span class="risk-pill" style="color:var(--red)">✉️ Brief</span></div><p class="small muted">${esc(d.analysis.organisations.join(', '))} · ${esc(d.analysis.channel.reason.slice(0,80))}</p><button class="btn ghost small" data-action="open-doc" data-id="${d.id}">Details</button></div>`).join('') : empty('Keine Dokumente die Brief erfordern.')}</div>
      </div>
      <div class="panel card-pad">
        <div class="section-title"><h2>🧠 Letzte Timeline</h2><span class="small muted">Gedächtnis-Verlauf</span></div>
        <div class="timeline">${state.timeline.slice(-5).reverse().map(eventView).join('') || empty('Noch keine Ereignisse.')}</div>
      </div>
    </div>
  `;
}
function stat(value,label){return `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`}
function empty(text){return `<p class="muted">${esc(text)}</p>`}
function taskCard(t){const d=daysUntil(t.dueDate);const left=t.dueDate?`${d<0?'überfällig':d===0?'heute':`in ${d} Tag(en)`}`:'ohne Datum';return `<div class="item risk-${esc(t.risk)}"><div class="item-header"><h3>${esc(t.title)}</h3><span class="risk-pill">${esc(t.risk)}</span></div><p>${esc(t.description||'')}</p><div class="row"><span class="chip">📅 ${esc(left)}</span><span class="chip">${esc(t.source||'System')}</span></div></div>`}
function caseCard(c){const docs=state.documents.filter(d=>d.caseId===c.id).length;return `<button class="item" data-action="open-case" data-id="${c.id}" style="text-align:left"><div class="item-header"><h3>📁 ${esc(c.title)}</h3><span class="risk-pill risk-${esc(c.risk||'low')}">${esc(c.risk||'niedrig')}</span></div><p>${esc(c.summary||'Automatisch erzeugter Fall')}</p><div class="row"><span class="chip">${docs} Dokument(e)</span><span class="chip">${esc(c.status||'aktiv')}</span></div></button>`}
function eventView(e){return `<div class="event"><strong>${fmtDate(e.date)}</strong><p>${esc(e.title)}</p><span class="small muted">${esc(e.context||'System')}</span></div>`}

function renderDocuments() {
  document.getElementById('screen-documents').innerHTML = `
    <div class="section-title"><h2>📄 Dokumente</h2><div class="row"><button class="btn primary" data-action="scan">📸 Scan/Upload</button><button class="btn" data-action="new-doc">+ Manuell</button></div></div>
    <div class="grid">${state.documents.length ? state.documents.slice().reverse().map(documentCard).join('') : `<div class="panel card-pad">${empty('Noch keine Dokumente. Starte mit Scan/Upload oder Text einfügen.')}</div>`}</div>`;
}
function documentCard(doc){const ch=doc.comm||window.DocPilotCommunication?.analyzeLocally({text:doc.text,documentType:doc.analysis.type,organization:doc.analysis.organisations[0]||'',hasDeadline:doc.analysis.deadlines.length>0,risk:doc.analysis.risk})||{}; const chCol=ch.recommended_channel==='brief'?'#ff3b5f':ch.recommended_channel==='email'?'#00ff88':ch.recommended_channel==='both'?'#ffd166':'#9ca6c6'; const chLabel=ch.recommended_channel==='brief'?'✉️ Brief':ch.recommended_channel==='email'?'📧 E-Mail':ch.recommended_channel==='both'?'📧+✉️ Beides':'🤷 Unklar';return `<div class="panel card-pad risk-${esc(doc.analysis.risk)}"><div class="item-header"><div><h3>${esc(doc.title)}</h3><p>${esc(doc.analysis.summary)}</p></div><span class="risk-pill">${esc(doc.analysis.risk)}</span></div><div class="row"><span class="chip">${esc(doc.analysis.type)}</span><span class="chip">${esc(doc.analysis.organisations.join(', ')||'Org unbekannt')}</span><span class="chip">${doc.analysis.deadlines.length} Frist(en)</span><span class="chip" style="color:${chCol};border-color:color-mix(in srgb,${chCol} 45%,transparent)">${chLabel}</span></div><div class="row"><button class="btn" data-action="open-doc" data-id="${doc.id}">Details</button><button class="btn" data-action="reply-doc" data-id="${doc.id}">Antwort</button><button class="btn ghost" data-action="speak-doc" data-id="${doc.id}">🔊</button><button class="btn ghost" data-action="create-task" data-id="${doc.id}">Aufgabe</button><button class="btn danger" data-action="delete-doc" data-id="${doc.id}">Löschen</button></div></div>`}

function renderCases() {
  const screen = document.getElementById('screen-cases');
  if (state.activeCaseId) {
    const c = state.cases.find(x => x.id === state.activeCaseId);
    if (!c) { state.activeCaseId = null; return renderCases(); }
    const docs = state.documents.filter(d => d.caseId === c.id);
    const events = state.timeline.filter(e => e.caseId === c.id).sort((a,b)=>new Date(b.date)-new Date(a.date));
    const tasks = state.tasks.filter(t => t.caseId === c.id && t.status !== 'done');
    screen.innerHTML = `<div class="section-title"><h2>📁 ${esc(c.title)}</h2><button class="btn ghost" data-action="case-list">Zurück</button></div><div class="grid two"><div class="panel card-pad"><h2>⏱ Timeline</h2><div class="timeline">${events.map(eventView).join('')||empty('Noch keine Ereignisse.')}</div></div><div class="panel card-pad"><h2>⚠️ Aufgaben</h2><div class="grid">${tasks.map(taskCard).join('')||empty('Keine offenen Aufgaben.')}</div></div></div><div class="section-title"><h2>📄 Dokumente im Fall</h2></div><div class="grid">${docs.map(documentCard).join('')||empty('Keine Dokumente im Fall.')}</div>`;
    return;
  }
  screen.innerHTML = `<div class="section-title"><h2>🗂️ Fälle</h2><button class="btn primary" data-action="new-doc">Dokument erfassen</button></div><div class="grid two">${state.cases.length?state.cases.map(caseCard).join(''):`<div class="panel card-pad">${empty('Fälle werden automatisch aus Organisation + Dokumenttyp erzeugt.')}</div>`}</div>`;
}

function renderAI() {
  document.getElementById('screen-ai').innerHTML = `
    <div class="hero"><div class="panel card-pad hero-main"><p class="chip">🤖 Assistant First</p><h2 class="hero-title">Was soll ich<br><span class="gradient-text">erledigen?</span></h2><div class="quick-actions"><button class="btn" onclick="document.getElementById('chatInput').value='Welche Fristen sind offen?';">Fristen prüfen</button><button class="btn" onclick="document.getElementById('chatInput').value='Schreibe eine Antwort zum letzten Dokument.';">Antwort schreiben</button><button class="btn" onclick="document.getElementById('chatInput').value='Fasse alle aktiven Fälle zusammen.';">Fälle zusammenfassen</button></div></div><div class="panel card-pad"><h2>🧠 Lokales Gedächtnis</h2><p class="muted">${state.documents.length} Dokumente, ${state.timeline.length} Ereignisse, ${state.tasks.length} Aufgaben indexiert.</p></div></div>
    <div class="panel card-pad"><div id="chatLog" class="grid">${empty('Frag z. B.: Was ist beim Jobcenter offen? Welche Fristen laufen?')}</div><div class="row" style="margin-top:12px"><input id="chatInput" class="input" placeholder="Frage an DocPilot..." style="flex:1;min-width:220px"><button class="btn primary" data-action="chat-send">Senden</button></div></div>`;
}

function renderSettings() {
  document.getElementById('screen-settings').innerHTML = `<div class="section-title"><h2>⚙️ Einstellungen</h2></div><div class="grid two"><div class="panel card-pad"><div class="form"><div class="field"><label>KI-Proxy URL</label><input class="input" id="aiProxyUrl" value="${esc(state.settings.aiProxyUrl)}"></div><div class="field"><label>OCR-Proxy URL</label><input class="input" id="ocrProxyUrl" value="${esc(state.settings.ocrProxyUrl)}"></div><div class="field"><label>Vorlese-Geschwindigkeit</label><select class="select" id="voiceRate"><option value="0.75">Langsam</option><option value="0.92">Normal</option><option value="1.15">Schnell</option></select></div><button class="btn primary" data-action="settings-save">Speichern</button>
        <details style="margin-top:12px;opacity:.75"><summary style="cursor:pointer;font-size:.82rem;color:var(--muted)">🌐 Cloud-Server (Railway/Fly.io)</summary>
        <p class="small muted" style="margin-top:6px">Lass KI + OCR in der Cloud laufen statt lokal.<br>
        <b>1.</b> Server auf Railway deployen (siehe server/Dockerfile)<br>
        <b>2.</b> Railway-URL oben eintragen, z.B. https://docpilot.up.railway.app<br>
        <b>3.</b> Speichern → App nutzt Cloud-Server</p></details>
        </div></div><div class="panel card-pad"><h2>📦 Projekt-Aktionen</h2><div class="row"><button class="btn" data-action="export">Export JSON</button><button class="btn" data-action="import">Import JSON</button><button class="btn ghost" data-action="seed">Demo-Daten</button><button class="btn danger" data-action="clear">Reset</button><button class="btn ghost" data-action="stop-speech">Vorlesen stoppen</button></div><p class="muted small">Daten bleiben lokal im Browser/WebView. Für echte App-Datenbank später SQLite/Capacitor-Plugin integrieren.</p></div></div>`;
  setTimeout(()=>{const v=document.getElementById('voiceRate'); if(v) v.value=String(state.settings.voiceRate)},0);
}

function openDocumentModal(initialText='') {
  openModal('Dokument erfassen', `<div class="form"><div class="field"><label>Titel</label><input id="docTitle" class="input" placeholder="z. B. Jobcenter Bescheid" /></div><div class="field"><label>OCR/Text</label><textarea id="docText" class="textarea" placeholder="Brieftext hier einfügen...">${esc(initialText)}</textarea></div><div class="row"><button class="btn ghost" data-action="dictate" data-target="docText">🎤 Diktieren</button><button class="btn ghost" onclick="navigator.clipboard?.readText().then(t=>document.getElementById('docText').value=t)">📋 Zwischenablage</button><button class="btn primary" id="saveDocBtn">Analysieren & speichern</button></div></div>`);
  document.getElementById('saveDocBtn').addEventListener('click', () => {
    const title = document.getElementById('docTitle').value.trim() || 'Neues Dokument';
    const text = document.getElementById('docText').value.trim();
    if (!text) return alert('Bitte Text einfügen oder OCR ausführen.');
    addDocument({ title, text, source: 'manual' });
    closeModal();
    switchTab('documents');
  });
}

function addDocument({title,text,source='upload',fileName=''}) {
  const analysis = analyzeText(text, title || fileName);
  const caseId = getOrCreateCase(analysis, title);
  const doc = { id: uid('doc'), title, text, source, fileName, createdAt: new Date().toISOString(), caseId, analysis };
  state.documents.push(doc);
  try { doc.comm = window.DocPilotCommunication?.analyzeLocally({text, documentType: analysis.type, organization: analysis.organisations[0]||'', hasDeadline: analysis.deadlines.length>0, risk: analysis.risk}); } catch(e) {}
  analysis.organisations.forEach(name => getOrCreateOrg(name, analysis.emails));
  analysis.persons.forEach(name => getOrCreatePerson(name));
  addTimeline({ title: `Dokument erfasst: ${title}`, context: analysis.summary, caseId, documentId: doc.id });
  analysis.deadlines.forEach(date => state.tasks.push({ id: uid('task'), title: `Frist prüfen: ${title}`, description: `Erkannte Frist aus ${analysis.type}.`, dueDate: date, risk: analysis.risk, status: 'open', source: 'Fristen-Engine', caseId, documentId: doc.id }));
  if (analysis.risk === 'kritisch' || analysis.risk === 'hoch') state.tasks.push({ id: uid('task'), title: `Handlungsbedarf: ${title}`, description: analysis.nextAction, dueDate: analysis.deadlines[0] || todayISO(), risk: analysis.risk, status: 'open', source: 'Risiko-Engine', caseId, documentId: doc.id });
  saveState(); render();
}

function analyzeText(text, title='') {
  const input = `${title}\n${text}`;
  const type = DOC_TYPES.find(([,rx]) => rx.test(input))?.[0] || 'Allgemeines Schreiben';
  const emails = [...new Set(input.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig) || [])];
  const amounts = [...new Set(input.match(/\b\d{1,3}(?:\.\d{3})*(?:,\d{2})?\s?(?:€|EUR)\b/g) || [])];
  const organisations = [...new Set(ORG_KEYWORDS.filter(o => new RegExp(`\\b${escapeRx(o)}\\b`, 'i').test(input)))];
  const deadlines = extractDates(input);
  const persons = extractPersons(input).slice(0,6);
  const risk = computeRisk(input, type, deadlines);
  const channel = analyzeChannel(input, emails, risk, type);
  const summary = buildSummary(type, organisations, deadlines, amounts, risk);
  return { type, emails, amounts, organisations, persons, deadlines, risk, channel, summary, nextAction: nextAction(type, risk, channel) };
}
function escapeRx(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function extractDates(text){ const dates = new Set(); const rx=/\b(\d{1,2})\.(\d{1,2})\.(\d{2,4})\b/g; let m; while((m=rx.exec(text))){ let y=m[3].length===2?`20${m[3]}`:m[3]; dates.add(`${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`); } return [...dates]; }
function extractPersons(text){ const found = new Set(); const rx=/\b(?:Herr|Frau|Familie)\s+([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+){0,2})/g; let m; while((m=rx.exec(text))) found.add(m[1]); return [...found]; }
function computeRisk(text,type,deadlines){ if (/vollstreckung|gerichtstermin|fristablauf|strafbefehl|kündigung|widerspruch.*frist|letzte mahnung|überfällig/i.test(text)) return 'kritisch'; if (deadlines.length || /mahnung|bescheid|nachreichen|zahlung bis|einspruch/i.test(text)) return 'hoch'; if (/rechnung|antrag|rückmeldung|termin/i.test(text) || ['Rechnung','Antrag','Bescheid'].includes(type)) return 'mittel'; return 'niedrig'; }
function analyzeChannel(text,emails,risk,type){ if (/nur schriftlich|postalisch|per post|schriftform erforderlich/i.test(text)) return { recommendation:'Brief zwingend', confidence:.86, reason:'Das Dokument enthält Hinweise auf Schriftform oder postalischen Weg.' }; if (['kritisch','hoch'].includes(risk) || /widerspruch|kündigung|einspruch|antrag|frist/i.test(text)) return { recommendation: emails.length?'E-Mail plus Brief':'Brief empfohlen', confidence:.74, reason:'Fristgebundene oder beweisrelevante Erklärung; E-Mail höchstens als Vorabkopie nutzen.' }; if (emails.length) return { recommendation:'E-Mail möglich', confidence:.78, reason:'E-Mail-Adresse im Dokument gefunden und kein starker Schriftform-Hinweis erkannt.' }; return { recommendation:'Unklar prüfen', confidence:.48, reason:'Kein eindeutiger Kontaktkanal im Text.' }; }
function buildSummary(type,orgs,deadlines,amounts,risk){ return `${type} erkannt${orgs.length?` von ${orgs.join(', ')}`:''}. Risiko: ${risk}. ${deadlines.length?`Frist(en): ${deadlines.map(fmtDate).join(', ')}. `:''}${amounts.length?`Betrag/Beträge: ${amounts.join(', ')}. `:''}`; }
function nextAction(type,risk,channel){ if (risk==='kritisch') return `Sofort prüfen, Aufgabe anlegen und Antwortkanal beachten: ${channel.recommendation}.`; if (type==='Rechnung') return 'Betrag prüfen, Zahlung/Einwand dokumentieren und Frist überwachen.'; if (type==='Bescheid') return 'Bescheid prüfen, Widerspruchsfrist kontrollieren und Antwortentwurf erstellen.'; return 'Dokument zuordnen, Zusammenfassung prüfen und bei Bedarf antworten.'; }

function getOrCreateCase(analysis,title){ const org=analysis.organisations[0]||'Allgemein'; const caseTitle = `${org} · ${analysis.type}`; let c=state.cases.find(x=>x.title===caseTitle); if(!c){c={id:uid('case'),title:caseTitle,status:'aktiv',risk:analysis.risk,summary:`Automatisch erzeugt aus ${title||analysis.type}`,createdAt:new Date().toISOString()};state.cases.push(c)} if(['kritisch','hoch'].includes(analysis.risk)) c.risk=analysis.risk; return c.id; }
function getOrCreateOrg(name,emails=[]){ let o=state.organisations.find(x=>x.name.toLowerCase()===name.toLowerCase()); if(!o){o={id:uid('org'),name,emails:[...emails],createdAt:new Date().toISOString()};state.organisations.push(o)} else {o.emails=[...new Set([...(o.emails||[]),...emails])]} return o.id; }
function getOrCreatePerson(name){ let p=state.persons.find(x=>x.name.toLowerCase()===name.toLowerCase()); if(!p){p={id:uid('person'),name,createdAt:new Date().toISOString()};state.persons.push(p)} return p.id; }
function addTimeline({title,context='',caseId=null,documentId=null}){state.timeline.push({id:uid('event'),date:new Date().toISOString(),title,context,caseId,documentId})}

function openDocumentDetail(id){ const d=state.documents.find(x=>x.id===id); if(!d)return; const comm=window.DocPilotCommunication?.analyzeLocally({text:d.text,documentType:d.analysis.type,organization:d.analysis.organisations[0]||'',hasDeadline:d.analysis.deadlines.length>0,risk:d.analysis.risk})||{}; openModal(d.title, `<div class="grid two"><div class="panel card-pad"><h2>Original/Text</h2><p class="analysis-box">${esc(d.text)}</p></div><div class="panel card-pad"><h2>🤖 KI-Analyse</h2><p class="analysis-box">Typ: ${esc(d.analysis.type)}\nRisiko: ${esc(d.analysis.risk)}\nOrganisationen: ${esc(d.analysis.organisations.join(', ')||'unbekannt')}\nPersonen: ${esc(d.analysis.persons.join(', ')||'unbekannt')}\nFristen: ${esc(d.analysis.deadlines.map(fmtDate).join(', ')||'keine')}\nE-Mail: ${esc(d.analysis.emails.join(', ')||'keine')}\nAntwortkanal: ${esc(d.analysis.channel.recommendation)}\nGrund: ${esc(d.analysis.channel.reason)}\nNächster Schritt: ${esc(d.analysis.nextAction)}</p><div class="row"><button class="btn primary" data-action="reply-doc" data-id="${d.id}">Antwort generieren</button><button class="btn" data-action="speak-doc" data-id="${d.id}">Vorlesen</button></div></div><div class="panel card-pad"><h2>📮 Kommunikations-Check</h2><div style="font-size:.95rem;margin-bottom:8px"><span class="risk-pill" style="color:${comm.recommended_channel==='brief'?'#ff3b5f':comm.recommended_channel==='email'?'#00ff88':comm.recommended_channel==='both'?'#ffd166':'#9ca6c6'};border-color:${comm.recommended_channel==='brief'?'rgba(255,59,95,.4)':comm.recommended_channel==='email'?'rgba(0,255,136,.4)':comm.recommended_channel==='both'?'rgba(255,209,102,.4)':'rgba(156,166,198,.4)'};">${comm.recommended_channel==='brief'?'✉️ Brief empfohlen':comm.recommended_channel==='email'?'📧 E-Mail geeignet':comm.recommended_channel==='both'?'📧+✉️ Beides empfohlen':'🤷 Unklar'}</span></div><p>Gefundene E-Mail: ${comm.found_emails?.join(', ')||'keine'}<br>Nachweis nötig: ${comm.evidence_required?'Ja':'Nein/unklar'}<br>Begründung: ${comm.reason||'Keine automatische Bewertung'}<br><small class="muted">Vertrauen: ${Math.round((comm.confidence||0)*100)}%</small></p><div class="row"><button class="btn" onclick="DocPilotCommunication?.prepareEmailDraft()">📧 E-Mail-Entwurf</button><button class="btn" onclick="DocPilotCommunication?.prepareLetterDraft()">✉️ Brief/PDF</button><button class="btn ghost" onclick="DocPilotCommunication?.markUserReviewed()">✅ Geprüft</button></div></div></div>`); }
function deleteDocument(id){ state.documents=state.documents.filter(d=>d.id!==id); state.tasks=state.tasks.filter(t=>t.documentId!==id); state.timeline=state.timeline.filter(e=>e.documentId!==id); saveState(); render(); }
function createTaskFromDoc(id){ const d=state.documents.find(x=>x.id===id); if(!d)return; state.tasks.push({id:uid('task'),title:`Manuell prüfen: ${d.title}`,description:d.analysis.nextAction,dueDate:d.analysis.deadlines[0]||'',risk:d.analysis.risk,status:'open',source:'Nutzer',caseId:d.caseId,documentId:id}); saveState(); render(); }
function openReply(id){ const d=state.documents.find(x=>x.id===id); if(!d)return; const reply=generateReply(d); openModal(`Antwortentwurf · ${d.title}`, `<div class="form"><div class="field"><label>Antwortentwurf</label><textarea id="replyText" class="textarea" style="min-height:330px">${esc(reply)}</textarea></div><div class="row"><button class="btn" onclick="navigator.clipboard?.writeText(document.getElementById('replyText').value)">Kopieren</button><button class="btn" data-action="dictate" data-target="replyText">🎤 Ergänzen</button><button class="btn primary" data-action="draft-save" data-id="${d.id}">Als Entwurf speichern</button></div></div>`); }
function generateReply(doc){ const org=doc.analysis.organisations[0]||'Damen und Herren'; const subject=`Betreff: ${doc.analysis.type} / ${doc.title}`; const channel=`Hinweis: ${doc.analysis.channel.recommendation}. ${doc.analysis.channel.reason}`; return `Sehr geehrte Damen und Herren,\n\n${subject}\n\nich nehme Bezug auf Ihr Schreiben "${doc.title}". Bitte prüfen Sie den Sachverhalt erneut und bestätigen Sie mir den Eingang dieser Antwort schriftlich.\n\nErkannte Punkte:\n- Dokumenttyp: ${doc.analysis.type}\n- Frist: ${doc.analysis.deadlines.map(fmtDate).join(', ') || 'keine eindeutige Frist erkannt'}\n- Betrag: ${doc.analysis.amounts.join(', ') || 'kein Betrag erkannt'}\n\n${doc.analysis.risk==='kritisch'||doc.analysis.risk==='hoch'?'Zur Wahrung möglicher Fristen bitte ich um zeitnahe Bearbeitung.\n\n':''}Mit freundlichen Grüßen\n\n[Name]\n\n---\n${channel}\nOrganisation: ${org}`; }
function saveDraft(docId){ const text=document.getElementById('replyText')?.value || ''; state.drafts.push({id:uid('draft'),documentId:docId,text,createdAt:new Date().toISOString()}); saveState(); closeModal(); alert('Entwurf gespeichert.'); }

async function handleFileInput(e){ const file=e.target.files?.[0]; if(!file)return; try{ if(file.type.startsWith('text/')||/\.md$|\.txt$/i.test(file.name)){ const text=await file.text(); addDocument({title:file.name,text,source:'file',fileName:file.name}); switchTab('documents'); } else { const text=await tryOcr(file); if(text) addDocument({title:file.name,text,source:'ocr',fileName:file.name}); else { const ocrUrl=state.settings.ocrProxyUrl; openDocumentModal(`[OCR nicht erreichbar]\nDatei: ${file.name}\n\nPrüfe in den Einstellungen ob die OCR-URL korrekt ist: ${ocrUrl}\n\nCloud-Server müssen laufen (Railway Deploy) oder alternativ Text manuell einfügen:`); } switchTab('documents'); } } finally { e.target.value=''; } }
async function tryOcr(file){ const url=(state.settings.ocrProxyUrl||'').replace(/\/$/,''); if(!url) return ''; const dataUrl=await fileToDataUrl(file); try{ const res=await fetch(`${url}/ocr`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:dataUrl,filename:file.name})}); if(!res.ok) throw new Error(`OCR ${res.status}`); const data=await res.json(); return data.text || ''; } catch(err){ console.warn(err); return ''; } }
function fileToDataUrl(file){ return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)}); }

function speakDocument(id){ const d=state.documents.find(x=>x.id===id); if(d) speak(`${d.title}. ${d.analysis.summary}. ${d.text.slice(0,1200)}`); }
function speak(text){ if(!('speechSynthesis' in window)) return alert('Vorlesen wird in diesem Browser nicht unterstützt.'); speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text); u.lang='de-DE'; u.rate=Number(state.settings.voiceRate)||.92; const voice=speechSynthesis.getVoices().find(v=>/de/i.test(v.lang)); if(voice) u.voice=voice; speechSynthesis.speak(u); }
function stopSpeech(){ if('speechSynthesis' in window) speechSynthesis.cancel(); }
function startDictation(targetId){ const Ctor=window.SpeechRecognition||window.webkitSpeechRecognition; if(!Ctor) return alert('Diktat wird in diesem Browser/WebView nicht unterstützt.'); const rec=new Ctor(); rec.lang='de-DE'; rec.continuous=false; rec.interimResults=false; rec.onresult=e=>{const t=[...e.results].map(r=>r[0].transcript).join(' '); const el=document.getElementById(targetId); if(el) el.value = `${el.value} ${t}`.trim();}; rec.start(); }

function handleChat(){ const input=document.getElementById('chatInput'); const q=input.value.trim(); if(!q)return; const answer=answerQuestion(q); const log=document.getElementById('chatLog'); log.innerHTML += `<div class="item"><strong>Du</strong><p>${esc(q)}</p></div><div class="item"><strong>DocPilot</strong><p>${esc(answer)}</p></div>`; input.value=''; }
function answerQuestion(q){ const text=q.toLowerCase(); if(text.includes('frist')){ const open=state.tasks.filter(t=>t.status!=='done'&&t.dueDate).sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate)); return open.length?open.map(t=>`${t.title}: ${fmtDate(t.dueDate)} (${t.risk})`).join('\n'):'Keine offenen Fristen erkannt.'; } if(text.includes('jobcenter')||text.includes('aok')||text.includes('ikk')||text.includes('finanzamt')){ const docs=state.documents.filter(d=>d.text.toLowerCase().includes(text.match(/jobcenter|aok|ikk|finanzamt/)?.[0]||'')); return docs.length?docs.map(d=>`${d.title}: ${d.analysis.summary}`).join('\n'):'Dazu finde ich lokal noch keine Dokumente.'; } if(text.includes('fall')) return state.cases.map(c=>`${c.title}: ${c.summary} (${c.risk})`).join('\n')||'Noch keine Fälle.'; if(text.includes('antwort')){ const d=state.documents.at(-1); return d?generateReply(d):'Noch kein Dokument für einen Antwortentwurf vorhanden.'; } return `Ich habe ${state.documents.length} Dokumente, ${state.cases.length} Fälle und ${state.tasks.length} Aufgaben im lokalen Gedächtnis. Frag gezielt nach Organisation, Frist oder Fall.`; }

function saveSettings(){ state.settings.aiProxyUrl=document.getElementById('aiProxyUrl').value.trim(); state.settings.ocrProxyUrl=document.getElementById('ocrProxyUrl').value.trim(); state.settings.voiceRate=Number(document.getElementById('voiceRate').value); saveState(); alert('Einstellungen gespeichert.'); }
function exportData(){ const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`docpilot-export-${todayISO()}.json`; a.click(); URL.revokeObjectURL(a.href); }
function importData(){ const input=document.createElement('input'); input.type='file'; input.accept='application/json'; input.onchange=async()=>{const file=input.files[0]; if(!file)return; state=JSON.parse(await file.text()); saveState(); render();}; input.click(); }
function confirmReset(){ if(confirm('Alle lokalen DocPilot-Daten löschen?')){state=defaultState();saveState();render();} }
function seedDemo(){ if(state.documents.length) return; addDocument({title:'Jobcenter Bescheid Widerspruchsfrist',text:'Jobcenter Musterstadt\nBescheid vom 10.04.2026\nSehr geehrter Herr Max Mustermann, gegen diesen Bescheid kann innerhalb eines Monats Widerspruch eingelegt werden. Bitte reichen Sie Unterlagen bis zum 15.05.2026 nach. Kontakt: jobcenter@example.de',source:'demo'}); addDocument({title:'AOK Rechnung Mahnung',text:'AOK Krankenkasse\nMahnung Rechnung 148,90 EUR zahlbar bis 12.05.2026. Bitte nutzen Sie aok@example.de fuer Rueckfragen. Letzte Mahnung vor weiterer Pruefung.',source:'demo'}); }

function openModal(title, body){ closeModal(); const div=document.createElement('div'); div.className='modal-backdrop'; div.innerHTML=`<div class="modal"><div class="modal-head"><h2>${esc(title)}</h2><button class="btn icon-btn" data-action="close-modal">×</button></div><div class="modal-body">${body}</div></div>`; document.body.appendChild(div); currentModal=div; }
function closeModal(){ currentModal?.remove(); currentModal=null; }

function initMatrix(){ const canvas=document.getElementById('matrixCanvas'); const ctx=canvas.getContext('2d'); const words=['AOK','IKK','Jobcenter','Finanzamt','DRV','Bescheid','Mahnung','Frist','Antrag','Widerspruch','Aktenzeichen','Rechnung','Krankenkasse','§','BGB','SGB']; let drops=[]; function resize(){canvas.width=innerWidth;canvas.height=innerHeight;drops=Array(Math.ceil(canvas.width/18)).fill(0).map(()=>Math.random()*-80)} resize(); addEventListener('resize',resize); function draw(){ctx.fillStyle='rgba(5,5,16,.12)';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.font='14px Share Tech Mono, monospace';drops.forEach((y,i)=>{const word=words[(Math.random()*words.length)|0];ctx.fillStyle=Math.random()>.92?'rgba(0,240,255,.45)':'rgba(0,255,136,.23)';ctx.fillText(word,i*18,y*18);drops[i]=y*18>canvas.height&&Math.random()>.975?0:y+1});requestAnimationFrame(draw)} draw(); }
function initLetterRain(){ clearInterval(letterTimer); letterTimer=setInterval(()=>{ const layer=document.getElementById('letterLayer'); if(!layer)return; const source=[...state.organisations.map(o=>o.name),...state.tasks.map(t=>t.title.split(':')[0]),'AOK','Jobcenter','IKK','Finanzamt','Bescheid','Mahnung','Frist']; const token=document.createElement('div'); const risk=Math.random()>.78?'high':Math.random()>.48?'medium':'low'; token.className=`letter-token risk-${risk}`; token.textContent=source[(Math.random()*source.length)|0]||'Dokument'; token.style.left=`${Math.random()*92}vw`; token.style.setProperty('--fall-duration',`${9+Math.random()*9}s`); token.style.setProperty('--drift',`${-50+Math.random()*100}px`); token.style.setProperty('--rot',`${-18+Math.random()*36}deg`); layer.appendChild(token); setTimeout(()=>token.remove(),19000); },900); }

