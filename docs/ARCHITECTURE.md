# Architektur

## Schichten

1. **UI-Schicht**: Dashboard, Dokumente, Faelle, KI, Einstellungen.
2. **Analyse-Schicht**: regelbasierte Extraktion fuer Dokumenttyp, Organisation, Personen, Fristen, Betraege, Risiko und Antwortkanal.
3. **Fall-Schicht**: automatische Fallbildung aus Organisation + Dokumenttyp.
4. **Gedächtnis-Schicht MVP**: lokale Dokumente, Timeline, Aufgaben und Entwuerfe im WebView-Speicher.
5. **Optionale Proxy-Schicht**: lokaler KI-Proxy und OCR-Proxy fuer spaetere echte Analyse.

## Warum Capacitor

Die bisherigen Projektentscheidungen legen fest: kein Flutter. Capacitor ist deshalb passend, weil die Web-App schnell als Android APK gebaut werden kann und spaeter native Plugins fuer SQLite, Filesystem, Kamera und Notifications angeschlossen werden koennen.

## Datenmodell MVP

```js
document = {
  id, title, text, source, createdAt, caseId,
  analysis: { type, emails, amounts, organisations, persons, deadlines, risk, channel, summary, nextAction }
}
case = { id, title, status, risk, summary, createdAt }
task = { id, title, description, dueDate, risk, status, source, caseId, documentId }
timelineEvent = { id, date, title, context, caseId, documentId }
```

## Ausbaustufe Produktion

- Capacitor SQLite fuer strukturierte Daten
- Filesystem API fuer Originaldokumente
- lokaler Vektorindex pro Fall/Person/Organisation
- Local Notifications fuer Fristen
- optionaler Server-Sync nur nach Nutzerfreigabe
