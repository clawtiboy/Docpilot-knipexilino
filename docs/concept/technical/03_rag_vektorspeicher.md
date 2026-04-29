# RAG- und Vektorspeicher-Konzept

## Grundidee

DocPilot verwendet ein lokales RAG-System. RAG steht für Retrieval-Augmented Generation. Die KI generiert Antworten nicht nur aus allgemeinem Modellwissen, sondern ruft vorher relevante Dokumentstellen aus dem lokalen Dokumentengedächtnis ab.

## Speicherlogik

DocPilot kann mehrere logische Vektorräume nutzen:

1. globaler Dokumentenindex
2. Index pro Person
3. Index pro Organisation
4. Index pro Fall
5. optional: Index pro Dokumenttyp

Technisch kann das ein gemeinsamer Vektorindex mit Metadatenfiltern sein. Logisch wirkt es für den Nutzer wie getrennte Gedächtnisse.

## Beispiel

Nutzer fragt:

> Was ist der aktuelle Stand beim Jobcenter?

Retriever filtert:

- organization_id = Jobcenter
- active cases only
- documents from latest relevant period

Dann werden relevante Chunks abgerufen, sortiert und dem LLM mit Quellen übergeben.

## Chunking-Strategie

Empfehlung:

- Chunkgröße: 500 bis 1.000 Tokens
- Overlap: 80 bis 150 Tokens
- Dokumentstruktur respektieren
- Seitenzahlen erhalten
- Aktenzeichen und Metadaten immer speichern

## Retrieval-Strategie

Kombinierte Suche:

- semantische Vektorsuche
- Volltextsuche über SQLite FTS5
- strukturierte Filter
- Recency Boost
- Prioritäts-/Fristenboost

Beispiel-Ranking:

1. hohe semantische Ähnlichkeit
2. gleicher Fall
3. gleiche Organisation
4. aktuelles Dokument
5. enthält Frist oder Aktenzeichen

## Antwort mit Quellen

Jede Antwort sollte Quellen enthalten:

- Dokumenttitel
- Datum
- Seite
- relevante Textstelle

Beispiel:

> Laut Schreiben des Jobcenters vom 18.03.2026 müssen die Kontoauszüge bis zum 15.05.2026 eingereicht werden.

## Kontextarten

### Dokumentkontext

Antwort bezieht sich nur auf ein Dokument.

### Fallkontext

Antwort bezieht sich auf alle Dokumente eines Falles.

### Personenkontext

Antwort bezieht sich auf alle Dokumente einer Person.

### Globaler Kontext

Antwort bezieht sich auf alle Dokumente.

## Sicherheitsregel

Die KI darf keine Behauptungen ohne Dokumentenbasis als Fakt darstellen. Wenn keine passende Quelle gefunden wird, muss sie sagen:

> Dazu habe ich in den gespeicherten Dokumenten keine eindeutige Information gefunden.
