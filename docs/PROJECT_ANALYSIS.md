# Projektanalyse aus den bisherigen Unterhaltungen

Aus den bisherigen Projektinformationen wurde DocPilot / Knipexilino als persoenlicher KI-Dokumenten-Assistent und Fall-Manager konsolidiert.

## Produktkern

DocPilot verwaltet nicht nur Dokumente, sondern Kontext: Personen, Organisationen, Faelle, Fristen, Aufgaben, Timeline und Antwortvorschlaege. Die App soll aus chaotischer Post eine intelligente Fallakte machen.

## Umgesetzte Repo-Basis

- Capacitor/Vite-Projekt, kein Flutter
- modernes AI Command Center UI
- Dashboard, Dokumente, Faelle, KI, Einstellungen
- Matrix-/Brief-Regen mit Dokument-/Behoerdenbegriffen
- lokale Speicherung im Browser/WebView
- Regelbasierte Analyse fuer Offline-Nutzung
- optionale OCR- und KI-Proxy-Server
- Antwortkanal-Check: E-Mail, Brief empfohlen, Brief zwingend oder unklar
- Timeline, Aufgaben, Fristen, Risiko-Level
- Export/Import JSON
- GitHub Actions Workflow fuer Debug-APK

## Bewusste Architekturentscheidung

Fuer die erste lauffaehige APK ist die lokale WebView-Speicherung bewusst einfach gehalten. SQLite, echter lokaler Vektorspeicher und native Benachrichtigungen sind als naechste Ausbaustufe vorbereitet, aber nicht als harte Voraussetzung fuer den ersten GitHub-Build blockierend.
