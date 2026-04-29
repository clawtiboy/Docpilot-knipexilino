/* DocPilot / Knipexilino Integrated App V3
   Static-first app shell with local persistence, rule-based document analysis,
   OCR/KI proxy hooks, speech, timeline, linking and response-channel checks. */

const STORAGE_KEY = "docpilot.knipexilino.v3";
const SETTINGS_KEY = "docpilot.knipexilino.v3.settings";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const today = new Date(2026, 3, 30); // fixed to current project date for stable demo behavior

const lexicon = {
  organizations: [
    { match: ["jobcenter", "arge", "sgb ii", "bürgergeld", "buergergeld"], name: "Jobcenter", category: "Behoerde", defaultEmail: "kontakt@jobcenter.example", defaultStatus: "brief" },
    { match: ["aok"], name: "AOK", category: "Krankenkasse", defaultEmail: "service@aok.example", defaultStatus: "mixed" },
    { match: ["ikk"], name: "IKK", category: "Krankenkasse", defaultEmail: "info@ikk.example", defaultStatus: "mixed" },
    { match: ["finanzamt", "steuernummer", "steuerbescheid"], name: "Finanzamt", category: "Behoerde", defaultEmail: "poststelle@finanzamt.example", defaultStatus: "brief" },
    { match: ["telekom"], name: "Telekom", category: "Unternehmen", defaultEmail: "kundenservice@telekom.example", defaultStatus: "email" },
    { match: ["deutsche rentenversicherung", "drv", "rentenversicherung"], name: "DRV", category: "Behoerde", defaultEmail: "kontakt@drv.example", defaultStatus: "brief" },
    { match: ["stadtwerke"], name: "Stadtwerke", category: "Unternehmen", defaultEmail: "service@stadtwerke.example", defaultStatus: "email" },
    { match: ["krankenkasse"], name: "Krankenkasse", category: "Krankenkasse", defaultEmail: "service@krankenkasse.example", defaultStatus: "mixed" }
  ],
  formalKeywords: ["widerspruch", "klage", "kündigung", "kuendigung", "rechtsbehelfsbelehrung", "bescheid", "frist", "vollstreckung", "mahnung", "anhörung", "anhoerung", "nachweis", "nachreichung"],
  criticalKeywords: ["vollstreckung", "gericht", "widerspruch", "rechtsbehelfsbelehrung", "frist", "sperre", "kürzung", "kuerzung", "mahnung", "letzte zahlungsaufforderung", "inkasso"],
  amountPattern: /\b\d{1,3}(?:\.\d{3})*(?:,\d{2})?\s?(?:€|eur)\b/gi,
  emailPattern: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi,
  datePattern: /\b(?:bis\s+zum\s+|zum\s+|am\s+)?(\d{1,2})\.(\d{1,2})\.(\d{2,4})\b/gi
};

const seed = {
  documents: [
    {
      id: "doc_jobcenter",
      title: "Jobcenter Bescheid",
      organizationId: "org_jobcenter",
      caseId: "case_jobcenter",
      type: "Bescheid",
      risk: "critical",
      deadline: "02.05.2026",
      summary: "Leistungskuerzung moeglich. Widerspruchsfrist laeuft in 2 Tagen.",
      entities: ["Jobcenter", "Aktenzeichen JC-4821", "Widerspruch", "SGB II"],
      tasks: ["Widerspruch pruefen", "Briefentwurf erzeugen", "Nachweise sichern"],
      channel: "brief",
      text: "Jobcenter Musterstadt. Aktenzeichen JC-4821. Gegen diesen Bescheid kann innerhalb eines Monats Widerspruch eingelegt werden. Bitte beachten Sie die Frist bis zum 02.05.2026. Kontakt: kontakt@jobcenter.example"
    },
    {
      id: "doc_aok",
      title: "AOK Rechnung",
      organizationId: "org_aok",
      caseId: "case_aok",
      type: "Rechnung",
      risk: "warning",
      deadline: "05.05.2026",
      summary: "Offene Zahlung. Betrag und Leistungszeitraum sollten geprueft werden.",
      entities: ["AOK", "Betrag 184,20 EUR", "Zahlungsziel", "Versichertennummer"],
      tasks: ["Betrag pruefen", "Rueckfrage vorbereiten"],
      channel: "mixed",
      text: "AOK Rechnung. Bitte begleichen Sie den offenen Betrag von 184,20 EUR bis zum 05.05.2026 oder kontaktieren Sie uns unter service@aok.example bei Rueckfragen."
    },
    {
      id: "doc_ikk",
      title: "IKK Nachforderung",
      organizationId: "org_ikk",
      caseId: "case_ikk",
      type: "Nachforderung",
      risk: "open",
      deadline: "12.05.2026",
      summary: "Unterlagen fehlen. Antwort moeglich, aber Kontaktweg muss geprueft werden.",
      entities: ["IKK", "Nachweise", "Mitwirkung", "E-Mail unklar"],
      tasks: ["Unterlagen suchen", "Antwortkanal pruefen"],
      channel: "mixed",
      text: "IKK Nachforderung. Bitte reichen Sie fehlende Unterlagen bis zum 12.05.2026 ein. Nutzen Sie hierzu die im Schreiben genannten Kontaktwege."
    },
    {
      id: "doc_telekom",
      title: "Telekom Vertragsinfo",
      organizationId: "org_telekom",
      caseId: "case_contracts",
      type: "Information",
      risk: "done",
      deadline: "keine",
      summary: "Vertragsaenderung ohne unmittelbaren Handlungsdruck.",
      entities: ["Telekom", "Vertrag", "Tarif"],
      tasks: ["Archivieren"],
      channel: "email",
      text: "Telekom Vertragsinformation. Dies ist eine Information zu Ihrem Vertrag. Fuer Rueckfragen nutzen Sie bitte kundenservice@telekom.example."
    },
    {
      id: "doc_finanzamt",
      title: "Finanzamt Erinnerung",
      organizationId: "org_finanzamt",
      caseId: "case_finance",
      type: "Erinnerung",
      risk: "critical",
      deadline: "03.05.2026",
      summary: "Nachreichung erforderlich. Frist sehr kurz, Nachweis sichern.",
      entities: ["Finanzamt", "Steuernummer", "Frist", "Nachreichung"],
      tasks: ["Unterlagen einreichen", "Versandnachweis sichern"],
      channel: "brief",
      text: "Finanzamt Erinnerung. Bitte reichen Sie die fehlenden Unterlagen bis zum 03.05.2026 nach. Steuernummer 12/345/67890."
    }
  ],
  organizations: [
    { id: "org_jobcenter", name: "Jobcenter", category: "Behoerde", email: "kontakt@jobcenter.example", status: "brief", reason: "Fristgebundene Widersprueche sollten beweissicher per Brief erfolgen. E-Mail nur als Vorabkopie.", confidence: 0.78, documents: 18 },
    { id: "org_aok", name: "AOK", category: "Krankenkasse", email: "service@aok.example", status: "mixed", reason: "Einfache Rueckfragen per E-Mail moeglich. Bei Fristen und Nachweisen ist Brief oder Portal sicherer.", confidence: 0.72, documents: 24 },
    { id: "org_ikk", name: "IKK", category: "Krankenkasse", email: "info@ikk.example", status: "mixed", reason: "Kontaktadresse vorhanden, aber Dokument fordert keinen klaren E-Mail-Antwortweg. Nutzer pruefen lassen.", confidence: 0.61, documents: 9 },
    { id: "org_finanzamt", name: "Finanzamt", category: "Behoerde", email: "poststelle@finanzamt.example", status: "brief", reason: "Frist- und Steuerunterlagen sollten ueber offiziellen Kanal oder postalisch nachweisbar eingereicht werden.", confidence: 0.81, documents: 11 },
    { id: "org_telekom", name: "Telekom", category: "Unternehmen", email: "kundenservice@telekom.example", status: "email", reason: "Normale Vertrags- und Serviceanfragen koennen per E-Mail oder Portal bearbeitet werden.", confidence: 0.88, documents: 7 }
  ],
  cases: [
    { id: "case_jobcenter", title: "Jobcenter Leistung 2026", subtitle: "Bescheid, Widerspruch, Nachweise", risk: "high", organizationIds: ["org_jobcenter"], documentIds: ["doc_jobcenter"], ai: "Naechste Aktion: Widerspruch vorbereiten und Versandnachweis sichern.", timeline: [["21.03.2026", "Antrag gestellt und als Fall angelegt."], ["14.04.2026", "Bescheid erkannt, Frist extrahiert."], ["Heute", "Risiko hoch: Widerspruchsfrist in 2 Tagen."]] },
    { id: "case_aok", title: "AOK Rechnung", subtitle: "Rechnung, Rueckfrage, Zahlungsziel", risk: "medium", organizationIds: ["org_aok"], documentIds: ["doc_aok"], ai: "Naechste Aktion: Betrag pruefen und sachliche Rueckfrage erstellen.", timeline: [["02.04.2026", "Rechnung eingegangen."], ["Heute", "Betrag und Zahlungsziel als offene Aufgabe erkannt."]] },
    { id: "case_ikk", title: "IKK Unterlagen", subtitle: "Nachforderung und Mitwirkung", risk: "medium", organizationIds: ["org_ikk"], documentIds: ["doc_ikk"], ai: "Naechste Aktion: fehlende Unterlagen suchen und Antwortweg pruefen.", timeline: [["18.04.2026", "Nachforderung eingegangen."], ["Heute", "Unterlagenliste erzeugt und Aufgabe erstellt."]] },
    { id: "case_finance", title: "Finanzamt Nachreichung", subtitle: "Steuerunterlagen und Frist", risk: "high", organizationIds: ["org_finanzamt"], documentIds: ["doc_finanzamt"], ai: "Naechste Aktion: Unterlagen sofort zusammenstellen und nachweisbar versenden.", timeline: [["12.04.2026", "Erinnerung eingegangen."], ["Heute", "Frist als kritisch markiert."]] },
    { id: "case_contracts", title: "Vertraege und Services", subtitle: "Telekom und laufende Vertraege", risk: "low", organizationIds: ["org_telekom"], documentIds: ["doc_telekom"], ai: "Kein akuter Handlungsbedarf.", timeline: [["09.04.2026", "Vertragsinfo erkannt."], ["Heute", "Als Information archiviert."]] }
  ],
  memory: []
};

let state = loadStore();
let settings = loadSettings();
let activeView = "dashboard";
let selectedCase = state.cases[0]?.id || "";
let activeFilter = "all";
let matrixEnabled = true;
let rainEnabled = true;
let reducedMotion = false;
let matrixFrame = null;
let rainTimer = null;

function uid(prefix) { return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`; }
function clone(obj) { return JSON.parse(JSON.stringify(obj)); }
function esc(value = "") { return String(value).replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c])); }
function norm(value = "") { return String(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
function saveStore() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function saveSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return clone(seed);
    const parsed = JSON.parse(raw);
    return { documents: [], organizations: [], cases: [], memory: [], ...parsed };
  } catch { return clone(seed); }
}
function loadSettings() {
  try { return { aiProxyUrl: "https://docpilot-knipexilino-production.up.railway.app", ocrServerUrl: "https://docpilot-knipexilino-production.up.railway.app", analysisMode: "hybrid", ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") }; }
  catch { return { aiProxyUrl: "https://docpilot-knipexilino-production.up.railway.app", ocrServerUrl: "https://docpilot-knipexilino-production.up.railway.app", analysisMode: "hybrid" }; }
}

function dateFromGerman(value) {
  const match = String(value || "").match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
  if (!match) return null;
  const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
  return new Date(year, Number(match[2]) - 1, Number(match[1]));
}
function daysUntil(value) {
  const date = dateFromGerman(value);
  if (!date) return null;
  return Math.ceil((date - today) / 86400000);
}
function riskText(risk) { return ({ critical: "kritisch", warning: "offen", open: "offen", done: "erledigt", high: "hoch", medium: "mittel", low: "niedrig" })[risk] || risk; }
function riskRank(risk) { return ({ critical: 1, warning: 2, open: 3, done: 4, high: 1, medium: 2, low: 3 })[risk] || 5; }
function channelText(status) { return ({ email: "E-Mail geeignet", mixed: "E-Mail moeglich / Brief empfohlen", brief: "Brief empfohlen", unknown: "unklar" })[status] || "unklar"; }
function channelClass(status) { return status === "email" ? "ok" : status === "mixed" ? "warn" : status === "brief" ? "bad" : "warn"; }
function getDoc(id) { return state.documents.find(doc => doc.id === id); }
function getOrg(id) { return state.organizations.find(org => org.id === id); }
function getCase(id) { return state.cases.find(item => item.id === id); }

function findOrganization(text, title = "") {
  const n = norm(`${title} ${text}`);
  return lexicon.organizations.find(org => org.match.some(term => n.includes(norm(term)))) || null;
}
function extractEmails(text) { return [...new Set(String(text).match(lexicon.emailPattern) || [])]; }
function extractAmounts(text) { return [...new Set(String(text).match(lexicon.amountPattern) || [])]; }
function extractDeadline(text) {
  const dates = [];
  String(text).replace(lexicon.datePattern, (_, d, m, y) => {
    const year = y.length === 2 ? `20${y}` : y;
    dates.push(`${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}.${year}`);
    return _;
  });
  if (dates.length) return dates.sort((a, b) => (dateFromGerman(a) || 0) - (dateFromGerman(b) || 0))[0];
  if (/innerhalb eines monats|innerhalb von einem monat/i.test(norm(text))) return "30 Tage nach Zugang";
  if (/innerhalb von zwei wochen|innerhalb zwei wochen/i.test(norm(text))) return "14 Tage nach Zugang";
  return "keine";
}
function classifyType(text, title = "") {
  const n = norm(`${title} ${text}`);
  if (n.includes("widerspruch") || n.includes("rechtsbehelfsbelehrung") || n.includes("bescheid")) return "Bescheid";
  if (n.includes("rechnung") || n.includes("betrag") || n.includes("zahlungsziel")) return "Rechnung";
  if (n.includes("mahnung") || n.includes("inkasso")) return "Mahnung";
  if (n.includes("nachforderung") || n.includes("unterlagen") || n.includes("nachreichen")) return "Nachforderung";
  if (n.includes("kündigung") || n.includes("kuendigung")) return "Kuendigung";
  return "Information";
}
function analyzeRisk(text, type, deadline) {
  const n = norm(text);
  const hasCritical = lexicon.criticalKeywords.some(k => n.includes(norm(k)));
  const days = daysUntil(deadline);
  if (hasCritical && (days === null || days <= 10)) return "critical";
  if (days !== null && days <= 5) return "critical";
  if (hasCritical || ["Bescheid", "Mahnung", "Nachforderung"].includes(type)) return "warning";
  if (type === "Information") return "done";
  return "open";
}
function summarize(text, type, orgName, deadline, amounts) {
  const parts = [];
  parts.push(`${type} von ${orgName || "unbekannter Organisation"}`);
  if (deadline && deadline !== "keine") parts.push(`Frist: ${deadline}`);
  if (amounts.length) parts.push(`Betrag: ${amounts[0]}`);
  if (/widerspruch/i.test(norm(text))) parts.push("Widerspruch/Rechtsmittel pruefen");
  if (/unterlagen|nachreichen|nachforderung/i.test(norm(text))) parts.push("Unterlagen nachreichen");
  return `${parts.join(". ")}.`;
}
function buildTasks(text, type, risk, channel) {
  const n = norm(text);
  const tasks = [];
  if (risk === "critical") tasks.push("Frist sofort pruefen");
  if (n.includes("widerspruch") || type === "Bescheid") tasks.push("Widerspruch vorbereiten");
  if (n.includes("unterlagen") || n.includes("nachreichen")) tasks.push("Unterlagen zusammenstellen");
  if (n.includes("rechnung") || n.includes("betrag")) tasks.push("Betrag und Leistungszeitraum pruefen");
  if (channel === "brief") tasks.push("Versandnachweis sichern");
  if (!tasks.length) tasks.push("Dokument archivieren");
  return [...new Set(tasks)];
}
function analyzeChannel({ text, type, emails, org }) {
  const n = norm(text);
  const formal = lexicon.formalKeywords.some(k => n.includes(norm(k))) || ["Bescheid", "Mahnung", "Kuendigung", "Nachforderung"].includes(type);
  if (formal && (n.includes("widerspruch") || n.includes("rechtsbehelfsbelehrung") || n.includes("frist") || n.includes("nachweis"))) {
    return { status: "brief", reason: "Fristgebundene oder beweisrelevante Erklaerung erkannt. Brief, Portal oder qualifizierter offizieller Kanal ist sicherer; E-Mail nur als Vorabkopie.", confidence: 0.82 };
  }
  if (emails.length && /rechnung|service|rueckfrage|kontakt/i.test(n)) {
    return { status: "mixed", reason: "E-Mail-Adresse wurde gefunden. Fuer einfache Rueckfragen geeignet, bei Streit oder Frist zusaetzlich nachweisbar senden.", confidence: 0.74 };
  }
  if (emails.length && org?.category === "Unternehmen") return { status: "email", reason: "Unternehmens-/Servicekontakt erkannt. E-Mail ist fuer normale Rueckfragen geeignet.", confidence: 0.84 };
  if (org?.defaultStatus) return { status: org.defaultStatus, reason: "Bewertung aus bekannter Organisationsart abgeleitet. Vor Versand final pruefen.", confidence: 0.62 };
  return { status: "unknown", reason: "Kein eindeutiger Antwortweg erkannt. Nutzer sollte Briefkopf, Portalhinweis oder Website pruefen.", confidence: 0.45 };
}
function getOrCreateOrg(found, email) {
  const name = found?.name || "Unbekannte Organisation";
  const existing = state.organizations.find(org => norm(org.name) === norm(name));
  if (existing) {
    if (email && !existing.email) existing.email = email;
    existing.documents = Number(existing.documents || 0) + 1;
    return existing;
  }
  const org = {
    id: uid("org"), name, category: found?.category || "Unklar", email: email || found?.defaultEmail || "",
    status: found?.defaultStatus || "unknown", reason: "Neu erkannt; Antwortweg noch nicht vollstaendig geprueft.", confidence: 0.5, documents: 1
  };
  state.organizations.unshift(org);
  return org;
}
function getOrCreateCase(org, type, risk) {
  const title = `${org.name} ${type}`;
  let item = state.cases.find(c => c.title === title || (c.organizationIds || []).includes(org.id) && c.title.includes(type));
  if (item) return item;
  item = {
    id: uid("case"), title, subtitle: `${type}, automatisch angelegt`, risk: risk === "critical" ? "high" : risk === "warning" ? "medium" : "low",
    organizationIds: [org.id], documentIds: [], ai: "Automatisch angelegter Fall. Naechste Aktion wird nach Dokumentanalyse bestimmt.", timeline: []
  };
  state.cases.unshift(item);
  return item;
}
function analyzeDocument(title, text) {
  const found = findOrganization(text, title);
  const emails = extractEmails(text);
  const amounts = extractAmounts(text);
  const type = classifyType(text, title);
  const org = getOrCreateOrg(found, emails[0] || "");
  const deadline = extractDeadline(text);
  const risk = analyzeRisk(text, type, deadline);
  const channel = analyzeChannel({ text, type, emails, org });
  org.status = channel.status;
  org.reason = channel.reason;
  org.confidence = channel.confidence;
  const caseItem = getOrCreateCase(org, type, risk);
  const summary = summarize(text, type, org.name, deadline, amounts);
  const tasks = buildTasks(text, type, risk, channel.status);
  return {
    title: title || `${org.name} ${type}`,
    organizationId: org.id,
    caseId: caseItem.id,
    type,
    risk,
    deadline,
    summary,
    entities: [...new Set([org.name, ...emails, ...amounts, ...(deadline !== "keine" ? [`Frist ${deadline}`] : [])])],
    tasks,
    channel: channel.status,
    channelReason: channel.reason,
    text
  };
}
function addDocument(title, text, source = "manual") {
  const analyzed = analyzeDocument(title, text);
  const doc = { id: uid("doc"), createdAt: new Date().toISOString(), source, ...analyzed };
  state.documents.unshift(doc);
  const c = getCase(doc.caseId);
  if (c && !c.documentIds.includes(doc.id)) {
    c.documentIds.unshift(doc.id);
    c.timeline.unshift(["Heute", `${doc.type} analysiert: ${doc.summary}`]);
    c.ai = doc.risk === "critical" ? `Kritisch: ${doc.tasks[0]}. ${channelText(doc.channel)}.` : `Naechste Aktion: ${doc.tasks[0]}.`;
    c.risk = doc.risk === "critical" ? "high" : doc.risk === "warning" ? "medium" : c.risk;
  }
  state.memory.unshift({ id: uid("mem"), docId: doc.id, caseId: doc.caseId, organizationId: doc.organizationId, text: doc.text.slice(0, 1200), summary: doc.summary, createdAt: doc.createdAt });
  saveStore();
  renderAll();
  showToast("Dokument analysiert und verknuepft.");
  return doc;
}
function runAllChannelChecks() {
  state.documents.forEach(doc => {
    const org = getOrg(doc.organizationId);
    const result = analyzeChannel({ text: doc.text, type: doc.type, emails: extractEmails(doc.text), org });
    doc.channel = result.status;
    doc.channelReason = result.reason;
    if (org) { org.status = result.status; org.reason = result.reason; org.confidence = result.confidence; }
  });
  saveStore(); renderAll(); showToast("Antwortwege neu bewertet.");
}

function renderMetrics() {
  $("#metricDocs").textContent = state.documents.length;
  $("#metricCases").textContent = state.cases.length;
  $("#metricOrgs").textContent = state.organizations.length;
  $("#metricTasks").textContent = state.documents.reduce((sum, doc) => sum + (doc.tasks?.length || 0), 0);
}
function renderTasks() {
  const taskList = $("#taskList"); if (!taskList) return;
  const tasks = state.documents.flatMap(doc => (doc.tasks || []).map(task => ({ task, doc }))).sort((a, b) => riskRank(a.doc.risk) - riskRank(b.doc.risk));
  taskList.innerHTML = tasks.slice(0, 8).map(({ task, doc }) => `
    <button class="task-item ${doc.risk}" data-open-doc="${doc.id}">
      <span>${esc(task)}</span><small>${esc(doc.title)} · ${esc(doc.deadline || "keine Frist")}</small>
    </button>`).join("");
}
function renderDocuments(filter = activeFilter) {
  const grid = $("#documentGrid"); if (!grid) return;
  const docs = state.documents.filter(doc => filter === "all" || doc.risk === filter || (filter === "open" && ["open", "warning"].includes(doc.risk)));
  grid.innerHTML = docs.map(doc => {
    const org = getOrg(doc.organizationId);
    return `<article class="doc-card glass ${doc.risk}" data-open-doc="${doc.id}">
      <div class="doc-top"><span>${esc(doc.type)}</span><b>${riskText(doc.risk)}</b></div>
      <h3>${esc(doc.title)}</h3>
      <p>${esc(doc.summary)}</p>
      <div class="doc-meta"><span>${esc(org?.name || "Unbekannt")}</span><span>${esc(doc.deadline || "keine Frist")}</span></div>
      <div class="entity-row">${(doc.entities || []).slice(0, 4).map(e => `<i>${esc(e)}</i>`).join("")}</div>
      <div class="channel ${channelClass(doc.channel)}">${channelText(doc.channel)}</div>
    </article>`;
  }).join("") || `<article class="panel glass"><h3>Keine Dokumente in diesem Filter.</h3><p>Nutze Scan / OCR oder Text erfassen.</p></article>`;
}
function renderCases() {
  const list = $("#caseList"); const detail = $("#caseDetail"); if (!list || !detail) return;
  if (!selectedCase && state.cases[0]) selectedCase = state.cases[0].id;
  list.innerHTML = state.cases.map(c => `<button class="case-item ${selectedCase === c.id ? "active" : ""}" data-case="${c.id}">
    <b>${esc(c.title)}</b><small>${esc(c.subtitle || "")}</small><span>${riskText(c.risk)}</span>
  </button>`).join("");
  const c = getCase(selectedCase) || state.cases[0];
  if (!c) { detail.innerHTML = "<h2>Keine Faelle</h2>"; return; }
  const docs = (c.documentIds || []).map(getDoc).filter(Boolean);
  const orgs = (c.organizationIds || []).map(getOrg).filter(Boolean);
  detail.innerHTML = `<div class="case-hero"><p class="eyebrow">Fallakte</p><h2>${esc(c.title)}</h2><p>${esc(c.ai || "")}</p></div>
    <div class="case-pills">${orgs.map(o => `<span>${esc(o.name)}</span>`).join("")}<span>Risiko: ${riskText(c.risk)}</span><span>${docs.length} Dokumente</span></div>
    <h3>Timeline</h3><div class="timeline">${(c.timeline || []).map(t => `<article><b>${esc(t[0])}</b><p>${esc(t[1])}</p></article>`).join("")}</div>
    <h3>Dokumente</h3><div class="mini-docs">${docs.map(d => `<button data-open-doc="${d.id}">${esc(d.title)}<small>${esc(d.summary)}</small></button>`).join("") || "<p>Noch keine Dokumente.</p>"}</div>`;
}
function renderOrganizations() {
  const grid = $("#orgGrid"); if (!grid) return;
  grid.innerHTML = state.organizations.map(org => `<article class="org-card glass ${channelClass(org.status)}">
    <div><p class="eyebrow">${esc(org.category)}</p><h3>${esc(org.name)}</h3></div>
    <p>${esc(org.reason)}</p>
    <div class="doc-meta"><span>${esc(org.email || "keine E-Mail")}</span><span>${Math.round((org.confidence || 0) * 100)}%</span></div>
    <div class="channel ${channelClass(org.status)}">${channelText(org.status)}</div>
  </article>`).join("");
}
function renderChatIntro() {
  const log = $("#chatLog"); if (!log || log.dataset.ready) return;
  log.dataset.ready = "1";
  addMessage("ai", "Ich bin bereit. Ich kann Fristen priorisieren, Antwortwege bewerten, Dokumente zusammenfassen und Antwortentwuerfe schreiben.");
}
function renderSettings() {
  const ai = $("#aiProxyUrl"), ocr = $("#ocrServerUrl"), mode = $("#analysisMode");
  if (ai) ai.value = settings.aiProxyUrl;
  if (ocr) ocr.value = settings.ocrServerUrl;
  if (mode) mode.value = settings.analysisMode;
  const m = $("#toggleMatrix"), r = $("#toggleRain"), red = $("#toggleReduced");
  if (m) m.checked = matrixEnabled;
  if (r) r.checked = rainEnabled;
  if (red) red.checked = reducedMotion;
}
function renderAll() { renderMetrics(); renderTasks(); renderDocuments(); renderCases(); renderOrganizations(); renderSettings(); renderChatIntro(); }

function openDocument(docId) {
  const doc = getDoc(docId); if (!doc) return;
  const org = getOrg(doc.organizationId); const c = getCase(doc.caseId);
  $("#docDialogContent").innerHTML = `<button class="dialog-close" id="closeDialog">×</button>
    <p class="eyebrow">${esc(doc.type)} · ${esc(org?.name || "Unbekannt")}</p>
    <h2>${esc(doc.title)}</h2>
    <div class="dialog-grid">
      <section><h3>KI Analyse</h3><p>${esc(doc.summary)}</p><ul>${(doc.tasks || []).map(t => `<li>${esc(t)}</li>`).join("")}</ul></section>
      <section><h3>Antwortweg</h3><div class="channel ${channelClass(doc.channel)}">${channelText(doc.channel)}</div><p>${esc(doc.channelReason || org?.reason || "")}</p></section>
    </div>
    <div class="dialog-grid">
      <section><h3>Entitaeten</h3><div class="entity-row">${(doc.entities || []).map(e => `<i>${esc(e)}</i>`).join("")}</div></section>
      <section><h3>Fallakte</h3><p>${esc(c?.title || "Nicht verknuepft")}</p><p>Frist: ${esc(doc.deadline || "keine")}</p></section>
    </div>
    <h3>Textauszug</h3><pre>${esc(doc.text)}</pre>
    <div class="dialog-actions"><button class="primary-btn" id="replyFromDoc">Antwort generieren</button><button class="ghost-btn" id="speakDoc">Vorlesen</button><button class="ghost-btn" id="copyDoc">Analyse kopieren</button></div>`;
  $("#docDialog").showModal();
  $("#closeDialog").onclick = () => $("#docDialog").close();
  $("#replyFromDoc").onclick = () => { $("#docDialog").close(); setView("assistant"); sendAiPrompt(`Erstelle Antwortentwurf zu: ${doc.title}`); };
  $("#speakDoc").onclick = () => speak(doc.summary + ". " + doc.text);
  $("#copyDoc").onclick = () => copyText(`${doc.title}\n${doc.summary}\n${channelText(doc.channel)}\n${doc.text}`);
}
function addMessage(kind, text) {
  const log = $("#chatLog"); if (!log) return;
  const div = document.createElement("div"); div.className = `msg ${kind}`; div.textContent = text; log.appendChild(div); log.scrollTop = log.scrollHeight;
}
function aiReply(input) {
  const q = norm(input);
  const critical = state.documents.filter(d => d.risk === "critical");
  if (q.includes("frist") || q.includes("kritisch") || q.includes("heute")) {
    if (!critical.length) return "Aktuell gibt es keine kritisch markierten Fristen. Offene Aufgaben bleiben sichtbar im Dashboard.";
    return `Kritisch: ${critical.map(d => `${d.title} (${d.deadline})`).join(", ")}. Empfehlung: zuerst beweissicheren Versand vorbereiten.`;
  }
  if (q.includes("antwortweg") || q.includes("email") || q.includes("e-mail") || q.includes("brief")) {
    return state.organizations.map(o => `${o.name}: ${channelText(o.status)} - ${o.reason}`).join("\n");
  }
  if (q.includes("antwort") || q.includes("widerspruch") || q.includes("schreiben")) {
    const doc = critical[0] || state.documents[0]; const org = getOrg(doc.organizationId);
    return `Entwurf:\n\nSehr geehrte Damen und Herren,\n\nhiermit nehme ich Bezug auf Ihr Schreiben "${doc.title}". Bitte bestaetigen Sie den Eingang dieses Schreibens und teilen Sie mir mit, welche Unterlagen oder naechsten Schritte erforderlich sind.\n\n${doc.type === "Bescheid" ? "Vorsorglich bitte ich um erneute Pruefung des Bescheids und um Akteneinsicht beziehungsweise nachvollziehbare Begruendung." : "Bitte pruefen Sie den Vorgang und senden Sie mir eine schriftliche Rueckmeldung."}\n\nMit freundlichen Gruessen\n\n[Name]\n\nHinweis: Fuer ${org?.name || "diese Organisation"} ist aktuell bewertet: ${channelText(doc.channel)}.`;
  }
  const first = state.documents[0];
  return `Ich habe ${state.documents.length} Dokumente, ${state.cases.length} Faelle und ${state.organizations.length} Organisationen geladen. Naechster sinnvoller Schritt: ${first?.tasks?.[0] || "Dokument importieren"}.`;
}
async function sendAiPrompt(prompt) {
  addMessage("user", prompt);
  addMessage("ai", "Analysiere lokal...");
  setTimeout(() => {
    const messages = $$("#chatLog .msg.ai");
    messages[messages.length - 1].textContent = aiReply(prompt);
  }, 250);
}
function setView(view) {
  activeView = view;
  $$(".view").forEach(v => v.classList.toggle("active-view", v.id === view));
  $$(".nav-item").forEach(item => item.classList.toggle("active", item.dataset.view === view));
  const titles = { dashboard: "Dashboard", documents: "Dokumente", cases: "Faelle", organizations: "Organisationen", assistant: "KI-Agent", settings: "System" };
  $("#screenTitle").textContent = titles[view] || "DocPilot";
  if (view === "assistant") renderChatIntro();
}

function manualDocDialog() {
  $("#docDialogContent").innerHTML = `<button class="dialog-close" id="closeDialog">×</button><p class="eyebrow">Neues Dokument</p><h2>Text erfassen</h2>
    <label>Titel<input id="manualTitle" class="dialog-input" placeholder="z.B. Jobcenter Bescheid" /></label>
    <label>Dokumenttext<textarea id="manualText" class="dialog-textarea" placeholder="Text aus Brief, OCR oder PDF hier einfuegen..."></textarea></label>
    <div class="dialog-actions"><button class="primary-btn" id="saveManualDoc">Analysieren und speichern</button><button class="ghost-btn" id="dictateBtn">Diktieren</button></div>`;
  $("#docDialog").showModal();
  $("#closeDialog").onclick = () => $("#docDialog").close();
  $("#saveManualDoc").onclick = () => {
    const text = $("#manualText").value.trim(); if (!text) return showToast("Bitte Text einfuegen.");
    const doc = addDocument($("#manualTitle").value.trim() || "Neues Dokument", text, "manual");
    $("#docDialog").close(); openDocument(doc.id);
  };
  $("#dictateBtn").onclick = startDictation;
}
async function processFile(file) {
  if (!file) return;
  showToast("Datei wird verarbeitet...");
  if (file.type === "text/plain" || file.name.endsWith(".txt")) {
    const text = await file.text(); const doc = addDocument(file.name.replace(/\.txt$/i, ""), text, "text-file"); openDocument(doc.id); return;
  }
  try {
    const dataUrl = await toDataUrl(file);
    const response = await fetch(`${settings.ocrServerUrl.replace(/\/$/, "")}/ocr`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: dataUrl, filename: file.name }) });
    if (!response.ok) throw new Error("OCR server offline");
    const data = await response.json();
    const text = data.text || data.result || "";
    if (!text.trim()) throw new Error("Kein OCR Text");
    const doc = addDocument(file.name, text, "ocr"); openDocument(doc.id);
  } catch (err) {
    const fallback = `OCR-Import vorbereitet fuer ${file.name}. Der OCR-Server ist nicht erreichbar. Bitte OCR-Server starten oder Text manuell einfuegen. Beispiel: Jobcenter Bescheid mit Frist bis zum 02.05.2026 und E-Mail kontakt@jobcenter.example.`;
    const doc = addDocument(file.name, fallback, "ocr-fallback"); openDocument(doc.id);
    showToast("OCR-Server nicht erreichbar. Fallback-Dokument angelegt.");
  }
}
function toDataUrl(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); }); }
function speak(text) {
  if (!window.speechSynthesis) return showToast("Vorlesen wird von diesem Browser nicht unterstuetzt.");
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text); utter.lang = "de-DE"; utter.rate = 0.95; window.speechSynthesis.speak(utter);
}
function startDictation() {
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Rec) return showToast("Diktat wird von diesem Browser nicht unterstuetzt.");
  const rec = new Rec(); rec.lang = "de-DE"; rec.continuous = true; rec.interimResults = true;
  rec.onresult = event => { const text = Array.from(event.results).map(r => r[0].transcript).join(" "); const area = $("#manualText"); if (area) area.value = text; };
  rec.start(); showToast("Diktat gestartet.");
}
function copyText(text) { navigator.clipboard?.writeText(text); showToast("Kopiert."); }
function exportData() {
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), state, settings }, null, 2)], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "docpilot-export.json"; a.click(); URL.revokeObjectURL(a.href);
}
async function importData(file) {
  try { const parsed = JSON.parse(await file.text()); state = parsed.state || parsed; settings = parsed.settings || settings; saveStore(); saveSettings(); renderAll(); showToast("Daten importiert."); }
  catch { showToast("Import fehlgeschlagen."); }
}
async function testPipeline() {
  const checks = [];
  for (const [name, url] of [["KI", settings.aiProxyUrl], ["OCR", settings.ocrServerUrl]]) {
    try { const r = await fetch(`${url.replace(/\/$/, "")}/health`, { method: "GET" }); checks.push(`${name}: ${r.ok ? "online" : "antwortet fehlerhaft"}`); }
    catch { checks.push(`${name}: offline`); }
  }
  showToast(checks.join(" · "));
}
function showToast(text) { const t = $("#toast"); if (!t) return; t.textContent = text; t.classList.add("show"); clearTimeout(t._timer); t._timer = setTimeout(() => t.classList.remove("show"), 3000); }

function bootSequence(force = false) {
  const bootScreen = $("#bootScreen"), bootStatus = $("#bootStatus"), bootBar = $("#bootBar"), bootWords = $("#bootWords");
  if (!bootScreen) return; if (force) bootScreen.classList.remove("hidden");
  const statuses = ["Initialisiere lokales Dokumenten-Gedaechtnis...", "Lade Organisationen: AOK, Jobcenter, IKK, Finanzamt...", "Extrahiere Fristen, Risiken und Aktenzeichen...", "Pruefe Antwortwege: E-Mail, Brief, Portal...", "Aktiviere KI-Fallmanager...", "Command Center bereit."];
  const words = ["AOK", "Jobcenter", "IKK", "Finanzamt", "Mahnung", "Bescheid", "Frist", "Widerspruch", "Rechnung", "Nachweise"];
  let step = 0;
  const tick = () => {
    if (!bootBar || !bootStatus || !bootWords) return;
    bootStatus.textContent = statuses[Math.min(step, statuses.length - 1)]; bootBar.style.width = `${Math.min(100, (step + 1) / statuses.length * 100)}%`;
    bootWords.innerHTML = words.slice(0, Math.min(words.length, step + 4)).map(w => `<span>${w}</span>`).join("");
    step++;
    if (step <= statuses.length) setTimeout(tick, 420); else setTimeout(() => bootScreen.classList.add("hidden"), 550);
  };
  tick();
}

const canvas = $("#matrixCanvas"); const ctx = canvas?.getContext("2d"); let columns = []; const matrixTokens = "AOK Jobcenter IKK Finanzamt Bescheid Mahnung Frist Antrag Widerspruch SGBII §56 DRV AOK".split(" ");
function resizeCanvas() { if (!canvas) return; canvas.width = innerWidth * devicePixelRatio; canvas.height = innerHeight * devicePixelRatio; const count = Math.floor(canvas.width / 28); columns = Array.from({ length: count }, () => Math.random() * canvas.height); }
function drawMatrix() {
  if (!ctx || !canvas) return;
  if (!matrixEnabled || reducedMotion) { matrixFrame = requestAnimationFrame(drawMatrix); return; }
  ctx.fillStyle = "rgba(5,5,16,.12)"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = "rgba(0,255,136,.34)"; ctx.font = `${14 * devicePixelRatio}px monospace`;
  columns.forEach((y, i) => { const text = matrixTokens[Math.floor(Math.random() * matrixTokens.length)]; ctx.fillText(text, i * 28, y); columns[i] = y > canvas.height + 40 ? 0 : y + 22; });
  matrixFrame = requestAnimationFrame(drawMatrix);
}
function spawnRainToken() {
  if (!rainEnabled || reducedMotion) return;
  const wrap = $("#documentRain"); if (!wrap) return;
  const docs = state.documents.length ? state.documents : seed.documents;
  const doc = docs[Math.floor(Math.random() * docs.length)];
  const token = document.createElement("span"); token.className = `rain-token ${doc.risk}`; token.textContent = Math.random() > 0.45 ? (getOrg(doc.organizationId)?.name || "Brief") : doc.type;
  token.style.left = `${Math.random() * 100}%`; token.style.animationDuration = `${5 + Math.random() * 6}s`; token.style.fontSize = `${12 + Math.random() * 18}px`;
  wrap.appendChild(token); setTimeout(() => token.remove(), 12000);
}
function applyAnimationState() { document.body.classList.toggle("no-matrix", !matrixEnabled); document.body.classList.toggle("no-rain", !rainEnabled); document.body.classList.toggle("reduced", reducedMotion); }

function bindEvents() {
  document.addEventListener("click", ev => {
    const viewBtn = ev.target.closest("[data-view]"); if (viewBtn) setView(viewBtn.dataset.view);
    const jump = ev.target.closest("[data-view-jump]"); if (jump) setView(jump.dataset.viewJump);
    const docBtn = ev.target.closest("[data-open-doc]"); if (docBtn) openDocument(docBtn.dataset.openDoc);
    const caseBtn = ev.target.closest("[data-case]"); if (caseBtn) { selectedCase = caseBtn.dataset.case; renderCases(); }
    const aiBtn = ev.target.closest("[data-ai]"); if (aiBtn) { setView("assistant"); sendAiPrompt(aiBtn.dataset.ai); }
  });
  $$("[data-filter]").forEach(btn => btn.addEventListener("click", () => { activeFilter = btn.dataset.filter; $$("[data-filter]").forEach(b => b.classList.toggle("active", b === btn)); renderDocuments(activeFilter); }));
  $("#quickScanBtn")?.addEventListener("click", () => $("#ocrFileInput")?.click());
  $("#manualDocBtn")?.addEventListener("click", manualDocDialog);
  $("#quickReplyBtn")?.addEventListener("click", () => { setView("assistant"); sendAiPrompt("Erstelle Antwortentwurf fuer das kritischste Dokument."); });
  $("#ocrFileInput")?.addEventListener("change", e => processFile(e.target.files[0]));
  $("#chatForm")?.addEventListener("submit", ev => { ev.preventDefault(); const input = $("#chatInput"); const value = input.value.trim(); if (value) sendAiPrompt(value); input.value = ""; });
  $("#runChannelCheckBtn")?.addEventListener("click", runAllChannelChecks);
  $("#testPipelineBtn")?.addEventListener("click", testPipeline);
  $("#exportDataBtn")?.addEventListener("click", exportData);
  $("#importDataBtn")?.addEventListener("click", () => $("#importJsonInput")?.click());
  $("#importJsonInput")?.addEventListener("change", e => importData(e.target.files[0]));
  $("#resetDemoBtn")?.addEventListener("click", () => { state = clone(seed); saveStore(); renderAll(); showToast("Demo-Daten zurueckgesetzt."); });
  $("#aiProxyUrl")?.addEventListener("change", e => { settings.aiProxyUrl = e.target.value; saveSettings(); });
  $("#ocrServerUrl")?.addEventListener("change", e => { settings.ocrServerUrl = e.target.value; saveSettings(); });
  $("#analysisMode")?.addEventListener("change", e => { settings.analysisMode = e.target.value; saveSettings(); });
  $("#toggleMatrix")?.addEventListener("change", e => { matrixEnabled = e.target.checked; applyAnimationState(); });
  $("#toggleRain")?.addEventListener("change", e => { rainEnabled = e.target.checked; applyAnimationState(); });
  $("#toggleReduced")?.addEventListener("change", e => { reducedMotion = e.target.checked; applyAnimationState(); });
  $("#rebootBtn")?.addEventListener("click", () => bootSequence(true));
  addEventListener("resize", resizeCanvas);
}

function init() {
  bindEvents(); renderAll(); resizeCanvas(); drawMatrix(); rainTimer = setInterval(spawnRainToken, 650); applyAnimationState(); bootSequence(false);
}

document.addEventListener("DOMContentLoaded", init);
