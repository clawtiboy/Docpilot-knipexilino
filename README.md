# DocPilot / Knipexilino

DocPilot / Knipexilino ist ein persoenlicher KI-Dokumenten-Assistent, Fallmanager und lokales Dokumenten-Gedaechtnis. Das Projekt ist als GitHub-faehiges Capacitor/Vite-Repository vorbereitet, damit daraus direkt eine Android Debug APK gebaut werden kann.

## Ziel

Die App soll unstrukturierte Post in eine strukturierte Fallakte verwandeln:

- Dokumente erfassen per Text, Datei oder Foto/OCR
- Organisationen, Personen, Fristen, Betraege und Risiken erkennen
- Faelle automatisch erzeugen
- Aufgaben und Timeline aufbauen
- Antwortvorschlaege generieren
- Kommunikationskanal pruefen: E-Mail moeglich, Brief empfohlen, Brief zwingend oder unklar
- alles lokal nutzbar, KI/OCR optional ueber lokale Proxy-Server

## Tech-Stack

- Frontend: Vite + Vanilla JavaScript
- Mobile Shell: Capacitor Android
- Speicher MVP: LocalStorage im WebView
- Optionaler KI-Proxy: Python Flask + OpenRouter
- Optionaler OCR-Proxy: Python Flask + Tesseract
- Build-Automation: GitHub Actions

## Schnellstart lokal

```bash
npm install
npm run dev
```

Dann die angezeigte lokale URL im Browser oeffnen.

## Android APK lokal bauen

```bash
npm install
npm run build
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
```

APK-Pfad danach:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Android APK mit GitHub Actions bauen

1. Dieses Projekt in ein GitHub-Repository pushen.
2. Im Tab `Actions` den Workflow `Build Android Debug APK` starten oder auf `main/master` pushen.
3. Die fertige Debug-APK als Artifact herunterladen.

## Optional: KI-Proxy starten

```bash
cd server
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example ../.env
# OPENROUTER_API_KEY in ../.env eintragen
python ki_proxy.py
```

Standard-URL: `http://127.0.0.1:8787`

Die App laeuft auch ohne KI-Key mit regelbasierter Offline-Analyse.

## Optional: OCR-Proxy starten

Systemabhaengigkeit:

```bash
sudo apt install tesseract-ocr tesseract-ocr-deu
```

Server:

```bash
cd server
source .venv/bin/activate
python ocr_server.py
```

Standard-URL: `http://127.0.0.1:8766`

## Repo-Struktur

```text
.
├── src/                       # App-Code
├── server/                    # optionale KI/OCR-Proxies
├── docs/                      # Projektanalyse und Konzeptpaket
├── database/                  # SQLite-Schema aus Konzeptpaket
├── prompts/                   # Analyse-, Fristen-, Antwort-Prompts
├── .github/workflows/         # APK Build Workflow
├── capacitor.config.json
├── package.json
└── index.html
```

## Aktueller Funktionsstand

Der aktuelle Stand ist ein lauffaehiger MVP-Prototyp: Dashboard, Dokumente, Faelle, KI-Tab, Einstellungen, Matrix-/Brief-Visualisierung, lokale Analyse, Fristen, Aufgaben, Timeline, Antwortentwurf, Vorlesen/Diktat soweit vom Browser unterstuetzt, Export/Import.

## Naechste sinnvolle Ausbaustufen

1. Native SQLite-Speicherung via Capacitor-Plugin
2. echter lokaler Vektorspeicher / RAG-Index
3. Push-/Local-Notifications fuer Fristen
4. PDF-Text-Extraktion und On-Device OCR
5. sichere Dokumentdatei-Ablage im Android-Dateisystem
6. E-Mail-/Briefversand-Workflow mit finaler Nutzerfreigabe
