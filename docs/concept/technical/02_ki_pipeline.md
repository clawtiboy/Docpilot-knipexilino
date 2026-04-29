# KI-Pipeline

## Pipeline-Schritte

### 1. Upload

Ein Dokument wird hochgeladen oder fotografiert.

Metadaten:

- Dateiname
- Dateityp
- Dateigröße
- Upload-Zeitpunkt
- optional: Quelle

### 2. Preprocessing

Bei Bildern:

- Rotation korrigieren
- Ränder erkennen
- Kontrast verbessern
- Bild entzerren
- Rauschen reduzieren

Bei PDFs:

- Seiten extrahieren
- prüfen, ob Textlayer existiert
- falls kein Textlayer: OCR durchführen

### 3. OCR

OCR liefert:

- Rohtext
- Text pro Seite
- optional Bounding Boxes
- Konfidenzwerte

### 4. Textbereinigung

Bereinigung:

- Zeilenumbrüche normalisieren
- Silbentrennung entfernen
- offensichtliche OCR-Fehler markieren
- leere Seiten ignorieren
- Kopf-/Fußzeilen optional erkennen

### 5. Dokumentklassifikation

Mögliche Klassen:

- Rechnung
- Mahnung
- Bescheid
- Vertrag
- Kündigung
- Arztbrief
- Befund
- Antrag
- Aufforderung zur Mitwirkung
- Versicherungsschreiben
- Gerichtsschreiben
- Sonstiges

### 6. Entitätsextraktion

Zu extrahierende Entitäten:

- Personen
- Organisationen
- Adressen
- E-Mail-Adressen
- Telefonnummern
- Datumsangaben
- Beträge
- IBANs
- Aktenzeichen
- Kundennummern
- Rechnungsnummern
- Vertragsnummern

### 7. Fristenerkennung

Die KI erkennt explizite und relative Fristen.

Beispiele:

- explizit: „bis 15.05.2026“
- relativ: „innerhalb von 14 Tagen nach Zugang“
- wiederkehrend: „monatlich zum 3. Werktag“
- Termin: „am 12.06.2026 um 10:30 Uhr“

Relative Fristen müssen mit einem Referenzdatum berechnet werden:

- Dokumentdatum
- Eingangsdatum
- Upload-Datum
- manuell bestätigtes Zugangdatum

### 8. Risiko- und Prioritätsbewertung

Risiko-Level:

- niedrig
- mittel
- hoch
- kritisch

Kriterien:

- harte Frist vorhanden
- Zahlungsforderung vorhanden
- Mahnung / Inkasso / Vollstreckung erwähnt
- Leistungskürzung erwähnt
- Kündigung erwähnt
- Gerichtstermin erwähnt
- Widerspruchsfrist erwähnt

### 9. Fallzuordnung

Das System schlägt vor:

- bestehender Fall
- neue Fallanlage
- nur Personen-/Organisationsordner

Signale:

- gleiche Organisation
- gleiche Aktenzeichen
- ähnliche Themen
- gleiche Person
- semantische Ähnlichkeit mit bestehenden Dokumenten

### 10. Chunking und Embeddings

Das Dokument wird in Chunks zerlegt.

Chunk-Metadaten:

- document_id
- page_number
- case_id
- person_id
- organization_id
- document_type
- date
- source_file

### 11. Speicherung

Gespeichert werden:

- Originaldatei
- OCR-Text
- Analyse-JSON
- strukturierte Felder
- Fristen
- Aufgaben
- Chunks
- Embeddings

### 12. Ausgabe an Nutzer

Die UI zeigt:

- Zusammenfassung
- erkannte Felder
- Fristen
- Aufgaben
- Risiko
- empfohlene nächste Schritte
- Zuordnungsvorschläge
