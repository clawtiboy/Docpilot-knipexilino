# Technologie-Stack

## MVP-Empfehlung

### Frontend

- React oder Next.js
- Tailwind CSS
- shadcn/ui optional
- PDF/Image Preview

### Backend

- Python
- FastAPI
- Pydantic
- SQLAlchemy oder SQLModel

### Datenbank

- SQLite
- FTS5 für Volltextsuche
- Alembic für Migrationen, falls SQLAlchemy genutzt wird

### OCR

Optionen:

- Tesseract OCR lokal
- PaddleOCR lokal
- EasyOCR lokal
- später optional Cloud-OCR

Für deutsche Dokumente sollte die OCR Deutsch gut unterstützen.

### Embeddings

Optionen lokal:

- sentence-transformers
- multilingual-e5
- bge-m3
- nomic-embed-text

Optionen API-basiert:

- OpenAI Embeddings
- andere Embedding-APIs

### Vektorspeicher

Optionen:

- ChromaDB
- LanceDB
- FAISS
- sqlite-vec
- Qdrant local

### LLM

Optionen lokal:

- Ollama
- llama.cpp
- lokale Modelle für sensible Daten

Optionen API-basiert:

- OpenAI API
- andere LLM-Provider

Empfehlung: Architektur so bauen, dass LLM-Provider austauschbar bleiben.

## Lokale Desktop-App

Für eine spätere Desktop-App:

- Tauri + React + lokaler Python-Service
- oder Electron + lokaler Backend-Prozess

## Mobile-Erweiterung

Später:

- React Native
- Flutter
- mobile Kamera-Scan-Funktion
- Synchronisation optional

## Wichtige technische Prinzipien

- provideragnostische KI-Schicht
- klare Trennung zwischen Originaldokument, OCR-Text, Analyse und Embeddings
- jede KI-Antwort mit Quellen
- Fristen nie ungeprüft endgültig setzen, sondern als Vorschlag mit Bestätigung
- strukturierte JSON-Ausgabe für KI-Analysen
- lokale Datenhoheit als Produktmerkmal
