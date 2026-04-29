#!/usr/bin/env python3
"""Optionaler KI-Proxy fuer DocPilot / Knipexilino.
Laeuft lokal und nutzt OpenRouter, wenn OPENROUTER_API_KEY gesetzt ist.
Ohne Key antwortet er mit einem regelbasierten Fallback, damit die App testbar bleibt.
"""
import os
import json
import re
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import requests

load_dotenv()
app = Flask(__name__)
CORS(app)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")
PORT = int(os.getenv("PORT", "8787"))

SYSTEM_PROMPT = """Du bist DocPilot/Knipexilino, ein deutschsprachiger KI-Dokumenten-Assistent.
Extrahiere Dokumenttyp, Personen, Organisationen, Fristen, Betraege, Aktenzeichen, Risiko,
Handlungsbedarf, Antwortkanal und Antwortvorschlag. Gib moeglichst JSON zurueck.
Bei rechtlich relevanten Fristen nie behaupten, eine normale E-Mail sei sicher ausreichend.
"""


def fallback_analysis(text: str) -> dict:
    organisations = [x for x in ["Jobcenter", "AOK", "IKK", "Finanzamt", "DRV", "Krankenkasse", "Gericht", "Stadtwerke"] if re.search(rf"\b{x}\b", text, re.I)]
    emails = sorted(set(re.findall(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", text, re.I)))
    dates = sorted(set(re.findall(r"\b\d{1,2}\.\d{1,2}\.\d{2,4}\b", text)))
    amounts = sorted(set(re.findall(r"\b\d{1,3}(?:\.\d{3})*(?:,\d{2})?\s?(?:EUR|€)\b", text, re.I)))
    doc_type = "Bescheid" if re.search("bescheid", text, re.I) else "Mahnung" if re.search("mahnung", text, re.I) else "Rechnung" if re.search("rechnung", text, re.I) else "Schreiben"
    risk = "kritisch" if re.search("vollstreckung|gericht|kuendigung|kündigung|letzte mahnung", text, re.I) else "hoch" if dates or re.search("frist|widerspruch|mahnung", text, re.I) else "mittel"
    return {
        "document_type": doc_type,
        "summary": f"{doc_type} erkannt. Organisationen: {', '.join(organisations) or 'unbekannt'}. Fristen: {', '.join(dates) or 'keine eindeutige Frist'}. Risiko: {risk}.",
        "organisations": organisations,
        "emails": emails,
        "deadlines": dates,
        "amounts": amounts,
        "risk": risk,
        "next_action": "Frist pruefen, Fall zuordnen und Antwortentwurf kontrollieren.",
        "channel_check": {
            "recommendation": "E-Mail plus Brief" if emails and risk in ["hoch", "kritisch"] else "E-Mail moeglich" if emails else "Brief empfohlen",
            "reason": "Bei Fristen/Widerspruch normale E-Mail nur als Vorabkopie nutzen."
        }
    }


@app.get("/health")
def health():
    return jsonify({"ok": True, "model": MODEL, "openrouter": bool(OPENROUTER_API_KEY)})


@app.post("/analyze")
def analyze():
    payload = request.get_json(force=True, silent=True) or {}
    text = payload.get("text", "")
    if not text.strip():
        return jsonify({"error": "text required"}), 400
    if not OPENROUTER_API_KEY:
        return jsonify(fallback_analysis(text))

    response = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"},
        json={
            "model": MODEL,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": text[:16000]},
            ],
            "temperature": 0.2,
        },
        timeout=60,
    )
    response.raise_for_status()
    content = response.json()["choices"][0]["message"]["content"]
    try:
        return jsonify(json.loads(content))
    except Exception:
        return jsonify({"raw": content})


@app.post("/reply")
def reply():
    payload = request.get_json(force=True, silent=True) or {}
    context = payload.get("context", "")
    if not OPENROUTER_API_KEY:
        return jsonify({"reply": "Sehr geehrte Damen und Herren,\n\nich nehme Bezug auf Ihr Schreiben. Bitte bestaetigen Sie den Eingang und pruefen Sie den Sachverhalt erneut.\n\nMit freundlichen Gruessen\n[Name]"})
    response = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"},
        json={"model": MODEL, "messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": f"Erstelle einen deutschen Antwortentwurf:\n{context}"}], "temperature": 0.25},
        timeout=60,
    )
    response.raise_for_status()
    return jsonify({"reply": response.json()["choices"][0]["message"]["content"]})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=PORT)
