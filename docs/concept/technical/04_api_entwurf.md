# API-Entwurf

## Dokumente

### POST /documents/upload

Lädt ein Dokument hoch.

Request:

- file
- optional case_id
- optional person_id
- optional organization_id

Response:

```json
{
  "document_id": "doc_123",
  "status": "processing"
}
```

### GET /documents/{id}

Gibt Dokumentdaten zurück.

### POST /documents/{id}/analyze

Startet oder wiederholt die KI-Analyse.

### GET /documents/{id}/analysis

Gibt strukturierte Analyse zurück.

## Fälle

### GET /cases

Liste aller Fälle.

### POST /cases

Erstellt einen Fall.

### GET /cases/{id}

Details eines Falles.

### POST /cases/{id}/chat

Frage an den Fallkontext.

Request:

```json
{
  "question": "Welche Fristen laufen?"
}
```

## Personen

### GET /persons

Liste aller Personen.

### GET /persons/{id}

Personenprofil mit Dokumenten, Fällen, Aufgaben und Fristen.

### POST /persons/{id}/chat

Frage an den Personenkontext.

## Organisationen

### GET /organizations

Liste aller Organisationen.

### GET /organizations/{id}

Organisationsprofil.

## Fristen

### GET /deadlines

Filter:

- status
- due_before
- case_id
- person_id
- organization_id

### POST /deadlines/{id}/confirm

Bestätigt eine erkannte Frist.

### POST /deadlines/{id}/dismiss

Verwirft eine erkannte Frist.

## Aufgaben

### GET /tasks

Liste offener Aufgaben.

### POST /tasks

Aufgabe erstellen.

### PATCH /tasks/{id}

Aufgabe aktualisieren.

### POST /tasks/{id}/complete

Aufgabe abschließen.

## KI

### POST /ai/analyze-document

Analysiert ein Dokument.

### POST /ai/generate-answer

Generiert Antwortschreiben.

### POST /ai/summarize-case

Erstellt Fallzusammenfassung.

### POST /ai/extract-deadlines

Extrahiert Fristen.

## Suche

### GET /search

Kombinierte Suche über Volltext, Metadaten und Vektorindex.

### POST /rag/query

Semantische Frage an den lokalen Wissensspeicher.
