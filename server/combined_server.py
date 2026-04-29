#!/usr/bin/env python3
"""Combined DocPilot Server für Railway/Cloud-Deployment.
Vereint KI-Proxy und OCR-Proxy in einer Flask-App auf einem Port.
"""
import os
import json
import re
import base64
import tempfile
import subprocess
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import requests
from communication_engine import analyze_communication

load_dotenv()

app = Flask(__name__)
CORS(app)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")
PORT = int(os.getenv("PORT", "8080"))

SYSTEM_PROMPT = """Du bist DocPilot/Knipexilino, ein deutschsprachiger KI-Dokumenten-Assistent.
Extrahiere Dokumenttyp, Personen, Organisationen, Fristen, Betraege, Aktenzeichen, Risiko,
Handlungsbedarf, Antwortkanal und Antwortvorschlag. Gib moeglichst JSON zurueck.
Bei rechtlich relevanten Fristen nie behaupten, eine normale E-Mail sei sicher ausreichend."""

# ---- Regelbasierte Fallbacks ----
def fallback_analysis(text: str) -> dict:
    organisations = [x for x in ["Jobcenter", "AOK", "IKK", "Finanzamt", "DRV", "Krankenkasse", "Gericht", "Stadtwerke"] if re.search(rf"\b{x}\b", text, re.I)]
    persons = [x for x in re.findall(r'(?<!\S)[A-ZÄÖÜ][a-zäöü]+(?:\s+[A-ZÄÖÜ][a-zäöü]+)+', text) if len(x.split()) >= 2]
    deadlines = []
    for m in re.finditer(r'(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s*-\s*(\d{1,2})\.(\d{1,2})\.(\d{4}))?', text):
        d = {"date": f"{m.group(1)}.{m.group(2)}.{m.group(3)}", "label": "Frist"}
        if m.group(4): d["range"] = f"{m.group(1)}.{m.group(2)}.{m.group(3)} - {m.group(4)}.{m.group(5)}.{m.group(6)}"
        deadlines.append(d)
    amounts = [{"value": m.group(0), "currency": "EUR"} for m in re.finditer(r'\d+[.,]\d{2}\s*€|\d+\s*Euro', text)]
    risk = "niedrig"
    if any(kw in text.lower() for kw in ["widerspruch", "frist", "mahnung", "kündigung", "klage", "vollstreckung"]):
        risk = "hoch" if any(kw in text.lower() for kw in ["widerspruch", "klage", "vollstreckung"]) else "mittel"
    doc_type = "Sonstiges"
    for dt, pat in [["Mahnung", r"mahnung|zahlungsaufforderung"],
                     ["Bescheid", r"bescheid|bewilligung|ablehnung|widerspruchs"],
                     ["Rechnung", r"rechnung|betrag|zahlbar"],
                     ["Kündigung", r"kündigung|gekündigt"]]:
        if re.search(pat, text, re.I): doc_type = dt; break
    return {
        "type": doc_type, "summary": text[:120] + ("..." if len(text) > 120 else ""),
        "organisations": organisations, "persons": persons,
        "deadlines": deadlines, "amounts": amounts, "risk": risk,
        "reference_number": "", "channel": analyze_communication({"text": text, "document_type": doc_type, "organization": organisations[0] if organisations else "", "risk": risk}),
        "action_required": risk in ("hoch", "mittel"),
        "action_deadline": deadlines[0]["date"] if deadlines else "",
        "suggested_response": f"Sehr geehrte Damen und Herren,\n\nhiermit..."
    }

def fallback_reply(text: str, instruction: str) -> str:
    return f"Sehr geehrte Damen und Herren,\n\nbezugnehmend auf Ihr Schreiben vom ...\n\nMit freundlichen Grüßen"

# ---- KI-Routen ----
@app.route("/status")
def status():
    return jsonify({"ok": True, "model": MODEL, "openrouter": bool(OPENROUTER_API_KEY)})

@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json() or {}
    text = data.get("text", "")
    title = data.get("title", "")
    if not text:
        return jsonify({"error": "text erforderlich"}), 400
    if not OPENROUTER_API_KEY:
        return jsonify(fallback_analysis(text))
    try:
        resp = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"},
            json={"model": MODEL, "messages": [
                {"role": "system", "content": SYSTEM_PROMPT + "\nAntworte NUR mit JSON."},
                {"role": "user", "content": f"Dokument: {title}\n\n{text}"}
            ]}, timeout=15)
        result = resp.json()
        content = result["choices"][0]["message"]["content"]
        try:
            parsed = json.loads(content.strip().removeprefix("```json").removesuffix("```").strip())
            return jsonify(parsed)
        except: return jsonify(fallback_analysis(text))
    except: return jsonify(fallback_analysis(text))

@app.route("/reply", methods=["POST"])
def reply():
    data = request.get_json() or {}
    text = data.get("text", "")
    instruction = data.get("instruction", "")
    if not OPENROUTER_API_KEY:
        return jsonify({"reply": fallback_reply(text, instruction)})
    try:
        resp = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"},
            json={"model": MODEL, "messages": [
                {"role": "system", "content": "Schreibe einen professionellen Antwortentwurf auf Deutsch."},
                {"role": "user", "content": f"Bezug: {text}\nAnweisung: {instruction}\n\nAntwortentwurf:"}
            ]}, timeout=30)
        return jsonify({"reply": resp.json()["choices"][0]["message"]["content"]})
    except: return jsonify({"reply": fallback_reply(text, instruction)})

@app.route("/communication/analyze", methods=["POST"])
def communication_analyze():
    data = request.get_json() or {}
    result = analyze_communication(data)
    return jsonify(result)

# ---- OCR-Route ----
@app.route("/ocr", methods=["POST"])
def ocr():
    data = request.get_json() or {}
    image_b64 = data.get("image", "")
    if not image_b64:
        return jsonify({"error": "image (base64) erforderlich"}), 400
    try:
        img_data = base64.b64decode(image_b64)
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
            f.write(img_data)
            tmp = f.name
        result = subprocess.run(
            ["tesseract", tmp, "stdout", "-l", "deu+eng", "--psm", "3"],
            capture_output=True, text=True, timeout=30
        )
        os.unlink(tmp)
        text = result.stdout.strip()
        if not text:
            return jsonify({"text": "", "error": "Kein Text erkannt"})
        return jsonify({"text": text, "confidence": None})
    except FileNotFoundError:
        return jsonify({"error": "Tesseract nicht installiert", "text": ""}), 500
    except Exception as e:
        return jsonify({"error": str(e), "text": ""}), 500

@app.route("/health")
def health():
    return jsonify({"status": "ok"})

# Alle anderen Routen -> 404 (kein Frontend)
@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "API endpoint not found"}), 404

if __name__ == "__main__":
    print(f"DocPilot Combined Server startet auf Port {PORT}")
    print(f"OpenRouter: {'JA' if OPENROUTER_API_KEY else 'NEIN (Fallback)'}")
    print(f"Endpoints: /status, /health, /analyze, /reply, /communication/analyze, /ocr")
    app.run(host="0.0.0.0", port=PORT, threaded=True)
