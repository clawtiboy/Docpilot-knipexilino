# DocPilot / Knipexilino

**DocPilot / Knipexilino** ist ein persönlicher KI-Dokumenten-Assistent und Fall-Manager für private, behördliche, medizinische und geschäftliche Unterlagen.

Der Nutzer fotografiert oder lädt Briefe, Rechnungen, Bescheide, Verträge, Arztunterlagen oder sonstige Dokumente hoch. Die KI erkennt automatisch Inhalt, Personen, Organisationen, Fristen, Beträge, Aktenzeichen, Risiken und Handlungsbedarf. Anschließend werden Dokumente automatisch Personen, Organisationen und Fällen zugeordnet.

Das zentrale Produktversprechen:

> Aus chaotischer Post wird eine intelligente, durchsuchbare Fallakte mit Fristen, Aufgaben, Verlauf und Antwortvorschlägen.

## Kernidee

DocPilot ist nicht nur eine Dokumentenablage. Das System baut ein lokales KI-Gedächtnis für Dokumente, Personen, Organisationen und Fälle auf. Jede Person, Organisation und jeder Fall kann einen eigenen Ordner mit Vektorspeicher erhalten. Dadurch kann die KI später kontextbezogen antworten, Zusammenfassungen erzeugen und Schreiben erstellen.

## Wichtigste Funktionen

- Dokument-Upload per Foto, PDF, JPEG oder Scan
- OCR-Texterkennung
- KI-Analyse und Zusammenfassung
- Named Entity Recognition für Personen, Organisationen, Daten, Beträge und Aktenzeichen
- automatische Fristenerkennung
- automatische Aufgaben-Erstellung
- Personen-, Organisations- und Fallordner
- lokales RAG-System mit Vektorspeicher
- Chat mit Dokumenten und Fällen
- Antwortschreiben und Dokumentengenerierung
- Fristen- und Aufgaben-Benachrichtigungen
- SQLite als lokale strukturierte Datenbank
- lokale Dateispeicherung für Originaldokumente

## Empfohlener MVP

Der MVP sollte sich auf diese Funktionen konzentrieren:

1. Dokument hochladen
2. OCR ausführen
3. KI-Zusammenfassung erstellen
4. Fristen extrahieren
5. Personen, Organisationen und Fälle erkennen
6. Aufgaben generieren
7. Dokument lokal speichern
8. einfache Vektorsuche ermöglichen
9. Antwortvorschlag generieren

## Ordnerstruktur dieses Pakets

```text
docpilot_knipexilino/
├── README.md
├── docs/
│   ├── 01_produktkonzept.md
│   ├── 02_funktionen.md
│   ├── 03_beispiel_workflows.md
│   ├── 04_ui_ux_konzept.md
│   └── 05_datenschutz_sicherheit.md
├── technical/
│   ├── 01_architektur.md
│   ├── 02_ki_pipeline.md
│   ├── 03_rag_vektorspeicher.md
│   ├── 04_api_entwurf.md
│   └── 05_technologie_stack.md
├── database/
│   ├── sqlite_schema.sql
│   └── extraction_schema.json
├── prompts/
│   ├── analyse_prompt.md
│   ├── fristen_prompt.md
│   ├── antwort_prompt.md
│   └── fall_zusammenfassung_prompt.md
├── examples/
│   ├── beispiel_jobcenter.md
│   ├── beispiel_rechnung_mahnung.md
│   └── beispiel_krankenkasse.md
└── planning/
    ├── roadmap.md
    ├── backlog_user_stories.md
    └── mvp_checkliste.md
```
