# Datenschutz- und Sicherheitskonzept

## Grundsatz

DocPilot verarbeitet hochsensible persönliche Dokumente. Datenschutz, lokale Speicherung und Transparenz sind deshalb zentrale Produktbestandteile.

## Lokale Speicherung

Empfohlen:

- Originaldokumente lokal speichern
- SQLite lokal speichern
- Vektordatenbank lokal speichern
- optional verschlüsseltes Datenverzeichnis
- keine Cloud-Pflicht

## Datenarten

DocPilot kann folgende sensible Daten enthalten:

- Namen
- Adressen
- Geburtsdaten
- Kundennummern
- Aktenzeichen
- Gesundheitsdaten
- Finanzdaten
- Sozialdaten
- Versicherungsdaten
- rechtliche Dokumente

## Sicherheitsmaßnahmen

Empfohlene Maßnahmen:

- lokale Verschlüsselung des Datenordners
- Passwort- oder Geräteauthentifizierung
- verschlüsselte Backups
- klare Export- und Löschfunktion
- Protokollierung kritischer Aktionen
- keine ungefragte Cloud-Synchronisation
- Nutzerfreigabe vor externer KI-Verarbeitung

## KI-Transparenz

Jede KI-Antwort sollte anzeigen:

- auf welchen Dokumenten sie basiert
- welche Stellen verwendet wurden
- ob eine Frist sicher oder unsicher erkannt wurde
- ob menschliche Prüfung erforderlich ist

## Rechtlicher Hinweis

DocPilot sollte keine Rechtsberatung behaupten. Bei rechtlich kritischen Themen sollte das System formulieren:

> Dies ist eine automatische Dokumentenanalyse und ersetzt keine rechtliche Beratung. Bei Fristen, Widersprüchen, Gerichts- oder Vollstreckungssachen sollte die Angabe geprüft oder professionelle Beratung eingeholt werden.

## Datenkontrolle

Nutzer sollten jederzeit können:

- Dokument löschen
- Fall löschen
- Person löschen
- Vektorindex neu aufbauen
- Daten exportieren
- Backup erstellen
- alle lokalen Daten entfernen
