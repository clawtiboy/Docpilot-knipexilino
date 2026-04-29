# Technische Architektur

## Zielarchitektur

DocPilot besteht aus mehreren Schichten:

1. UI-Schicht
2. Upload- und Datei-Schicht
3. OCR-Schicht
4. KI-Analyse-Schicht
5. Datenmodell-Schicht
6. RAG- und Vektor-Schicht
7. Aufgaben- und Benachrichtigungsschicht
8. Dokumentengenerierung

## Komponenten

### Frontend

Mögliche Varianten:

- Web-App mit React / Next.js
- Desktop-App mit Tauri oder Electron
- Mobile App später mit React Native oder Flutter

### Backend

Mögliche Varianten:

- Python FastAPI
- Node.js / NestJS
- lokaler Service innerhalb einer Desktop-App

Für den MVP ist Python FastAPI besonders sinnvoll, weil OCR, Embeddings und KI-Pipelines in Python gut integrierbar sind.

### Lokale Datenbank

- SQLite für strukturierte Daten
- FTS5 für Volltextsuche
- optionale sqlite-vss oder sqlite-vec Erweiterung

### Dateispeicher

Originaldateien sollten im lokalen Dateisystem gespeichert werden:

```text
data/
├── documents/
│   ├── originals/
│   ├── previews/
│   └── ocr/
├── vectorstore/
├── exports/
└── backups/
```

### Vektorspeicher

Mögliche Optionen:

- ChromaDB
- FAISS
- LanceDB
- Qdrant local
- sqlite-vec

Für einen lokalen MVP sind ChromaDB, LanceDB oder sqlite-vec naheliegend.

## Datenfluss

```text
Upload
  → Datei speichern
  → OCR ausführen
  → Text bereinigen
  → KI-Analyse
  → Entitäten extrahieren
  → Fristen extrahieren
  → Fall/Person zuordnen
  → Chunks erzeugen
  → Embeddings erstellen
  → Vektorspeicher aktualisieren
  → Aufgaben/Fristen speichern
  → Analyse im UI anzeigen
```

## Verarbeitungsschichten

### Synchrone Verarbeitung

Direkt nach Upload:

- Datei speichern
- OCR starten
- erste Analyse erzeugen
- Nutzerfeedback anzeigen

### Asynchrone Verarbeitung

Im Hintergrund oder als Job:

- Embeddings berechnen
- Vektorindex aktualisieren
- Fallzusammenfassung aktualisieren
- Chronologie neu berechnen
- Duplikate erkennen

## Modulübersicht

```text
modules/
├── ingestion/
│   ├── upload_service.py
│   ├── file_storage.py
│   └── image_preprocessing.py
├── ocr/
│   ├── ocr_service.py
│   └── text_cleanup.py
├── ai/
│   ├── document_analyzer.py
│   ├── deadline_extractor.py
│   ├── entity_extractor.py
│   ├── answer_generator.py
│   └── case_summarizer.py
├── rag/
│   ├── chunker.py
│   ├── embedding_service.py
│   ├── vector_store.py
│   └── retriever.py
├── cases/
│   ├── case_service.py
│   └── timeline_service.py
├── tasks/
│   ├── task_service.py
│   └── reminder_service.py
└── documents/
    ├── document_service.py
    └── document_exporter.py
```
