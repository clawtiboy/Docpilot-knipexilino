// DocPilot Communication Engine - Frontend Patch
// Einbinden nach app1.js und vor/mit app2.js: <script src="communication_engine.js"></script>

(function(){
  const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

  const HIGH_RISK_TYPES = [
    'widerspruch','kündigung','kuendigung','mahnbescheid','gericht','klage',
    'frist','bescheid','anhörung','anhoerung','vollstreckung','inkasso',
    'sperre','sanktion','ablehnung','rückforderung','rueckforderung'
  ];

  const EMAIL_POSITIVE = [
    'per e-mail','per email','per mail','antwort per e-mail','antwort per email',
    'kontaktieren sie uns per e-mail','kontakt per e-mail','email:'
  ];

  const EMAIL_NEGATIVE = [
    'schriftlich','postalisch','per post','eigenhändig','eigenhaendig',
    'unterschrieben','original unterschrift','nur schriftlich','formgerecht',
    'online-portal','kontaktformular','beA','de-mail'
  ];

  window.DocPilotCommunication = {
    extractEmails(text){
      const matches = String(text || '').match(EMAIL_RE) || [];
      return [...new Set(matches.map(e => e.trim().toLowerCase()))];
    },

    analyzeLocally({text='', documentType='', organization='', hasDeadline=false, risk=''}){
      const lower = String(text || '').toLowerCase();
      const foundEmails = this.extractEmails(text);
      const typeLower = String(documentType || '').toLowerCase();
      const riskLower = String(risk || '').toLowerCase();

      const highRiskHit = HIGH_RISK_TYPES.some(w => lower.includes(w) || typeLower.includes(w));
      const positiveHit = EMAIL_POSITIVE.some(w => lower.includes(w));
      const negativeHit = EMAIL_NEGATIVE.some(w => lower.includes(w));
      const evidenceRequired = Boolean(hasDeadline || highRiskHit || ['hoch','kritisch','high','critical'].includes(riskLower));

      let emailSuitability = 'uncertain';
      let recommendedChannel = 'unclear';
      let reason = 'Keine eindeutigen Hinweise im Dokument gefunden.';
      let riskLevel = evidenceRequired ? 'high' : 'medium';
      let confidence = 0.55;

      if (evidenceRequired) {
        recommendedChannel = foundEmails.length ? 'both' : 'brief';
        emailSuitability = foundEmails.length ? 'uncertain' : 'no';
        reason = 'Frist, Widerspruch, Bescheid oder Nachweisbedarf erkannt. Brief ist beweissicherer; E-Mail höchstens zusätzlich als Vorabkopie.';
        confidence = 0.78;
      } else if (negativeHit) {
        recommendedChannel = 'brief';
        emailSuitability = 'no';
        reason = 'Das Dokument enthält Hinweise auf schriftliche, postalische oder formgebundene Kommunikation.';
        riskLevel = 'high';
        confidence = 0.82;
      } else if (foundEmails.length && positiveHit) {
        recommendedChannel = 'email';
        emailSuitability = 'yes';
        reason = 'Im Dokument wurde eine E-Mail-Adresse und ein Hinweis auf E-Mail-Kommunikation gefunden.';
        riskLevel = 'low';
        confidence = 0.86;
      } else if (foundEmails.length) {
        recommendedChannel = 'both';
        emailSuitability = 'uncertain';
        reason = 'Eine E-Mail-Adresse wurde gefunden, aber die Zulässigkeit für rechtssensible Antworten ist nicht eindeutig.';
        riskLevel = 'medium';
        confidence = 0.66;
      }

      return {
        organization,
        found_emails: foundEmails,
        email_suitability: emailSuitability,
        recommended_channel: recommendedChannel,
        reason,
        risk_level: riskLevel,
        evidence_required: evidenceRequired,
        confidence,
        source_basis: 'local_document_analysis'
      };
    },

    async analyzeWithProxy(payload){
      const base = localStorage.getItem('ki_url') || localStorage.getItem('KI_URL') || 'http://localhost:8765';
      const local = this.analyzeLocally(payload || {});
      try {
        const res = await fetch(base.replace(/\/$/, '') + '/communication/analyze', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(payload || {})
        });
        if (!res.ok) throw new Error('communication proxy unavailable');
        const remote = await res.json();
        return Object.assign({}, local, remote, {fallback_used:false});
      } catch (err) {
        return Object.assign({}, local, {fallback_used:true});
      }
    },

    renderCard(assessment){
      const a = assessment || {};
      const color = a.recommended_channel === 'email' ? '#00FF88' :
                    a.recommended_channel === 'brief' ? '#FF3B3B' :
                    a.recommended_channel === 'both' ? '#FFD166' : '#8A8FA3';
      const label = {
        email: 'E-Mail geeignet',
        brief: 'Brief empfohlen',
        both: 'E-Mail + Brief empfohlen',
        portal: 'Portal empfohlen',
        unclear: 'Unklar - Nutzer prüfen'
      }[a.recommended_channel || 'unclear'];
      const emails = (a.found_emails || []).join(', ') || 'Keine E-Mail gefunden';
      return `
        <div class="card comm-card" style="border:1px solid ${color}; box-shadow:0 0 24px ${color}22;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
            <span style="width:10px;height:10px;border-radius:50%;background:${color};box-shadow:0 0 12px ${color};display:inline-block"></span>
            <strong>Kommunikations-Check</strong>
          </div>
          <div style="font-size:1.05rem;font-weight:700;color:${color};margin-bottom:6px;">${label}</div>
          <div><b>Gefundene E-Mail:</b> ${this.escapeHtml(emails)}</div>
          <div><b>Nachweis nötig:</b> ${a.evidence_required ? 'Ja' : 'Nein/unklar'}</div>
          <div><b>Begründung:</b> ${this.escapeHtml(a.reason || '')}</div>
          <div style="opacity:.75;margin-top:6px;">Vertrauen: ${Math.round((a.confidence || 0) * 100)}%</div>
          <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
            <button onclick="DocPilotCommunication.prepareEmailDraft()">E-Mail-Entwurf</button>
            <button onclick="DocPilotCommunication.prepareLetterDraft()">Brief/PDF</button>
            <button onclick="DocPilotCommunication.markUserReviewed()">Geprüft</button>
          </div>
        </div>`;
    },

    escapeHtml(s){
      return String(s || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
    },

    prepareEmailDraft(){ alert('E-Mail-Entwurf vorbereiten: Nutzer muss vor Versand bestätigen.'); },
    prepareLetterDraft(){ alert('Brief/PDF vorbereiten: empfohlen bei Fristen, Widerspruch, Kündigung oder Nachweisbedarf.'); },
    markUserReviewed(){ alert('Kommunikationsvorschlag als vom Nutzer geprüft markiert.'); }
  };
})();
