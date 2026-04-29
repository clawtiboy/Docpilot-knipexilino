# DocPilot Communication Engine - Flask Blueprint/Standalone Helpers
# In ki_proxy.py importieren oder Inhalte direkt übernehmen.

import re
from datetime import datetime

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")

HIGH_RISK_TERMS = [
    'widerspruch','kuendigung','kündigung','mahnbescheid','gericht','klage',
    'frist','bescheid','anhoerung','anhörung','vollstreckung','inkasso',
    'sanktion','ablehnung','rueckforderung','rückforderung'
]

EMAIL_POSITIVE_TERMS = [
    'per e-mail','per email','per mail','antwort per e-mail','antwort per email',
    'kontaktieren sie uns per e-mail','kontakt per e-mail','email:'
]

EMAIL_NEGATIVE_TERMS = [
    'schriftlich','postalisch','per post','eigenhaendig','eigenhändig',
    'unterschrieben','original unterschrift','nur schriftlich','formgerecht',
    'online-portal','kontaktformular','de-mail'
]

def extract_emails(text: str):
    return sorted(set(x.lower() for x in EMAIL_RE.findall(text or '')))

def analyze_communication(payload: dict):
    text = payload.get('text') or ''
    document_type = (payload.get('document_type') or payload.get('dokument_typ') or '').lower()
    organization = payload.get('organization') or payload.get('organisation') or ''
    has_deadline = bool(payload.get('has_deadline') or payload.get('frist_vorhanden'))
    risk = (payload.get('risk') or payload.get('risiko') or '').lower()

    lower = text.lower()
    emails = extract_emails(text)
    high_risk_hit = any(t in lower or t in document_type for t in HIGH_RISK_TERMS)
    positive_hit = any(t in lower for t in EMAIL_POSITIVE_TERMS)
    negative_hit = any(t in lower for t in EMAIL_NEGATIVE_TERMS)
    evidence_required = bool(has_deadline or high_risk_hit or risk in ['hoch','kritisch','high','critical'])

    result = {
        'organization': organization,
        'found_emails': emails,
        'email_suitability': 'uncertain',
        'recommended_channel': 'unclear',
        'reason': 'Keine eindeutigen Hinweise im Dokument gefunden.',
        'risk_level': 'high' if evidence_required else 'medium',
        'evidence_required': evidence_required,
        'confidence': 0.55,
        'source_basis': 'document_text',
        'checked_at': datetime.utcnow().isoformat() + 'Z'
    }

    if evidence_required:
        result.update({
            'recommended_channel': 'both' if emails else 'brief',
            'email_suitability': 'uncertain' if emails else 'no',
            'reason': 'Frist, Widerspruch, Bescheid oder Nachweisbedarf erkannt. Brief ist beweissicherer; E-Mail höchstens zusätzlich als Vorabkopie.',
            'confidence': 0.78
        })
    elif negative_hit:
        result.update({
            'recommended_channel': 'brief',
            'email_suitability': 'no',
            'reason': 'Das Dokument enthält Hinweise auf schriftliche, postalische oder formgebundene Kommunikation.',
            'risk_level': 'high',
            'confidence': 0.82
        })
    elif emails and positive_hit:
        result.update({
            'recommended_channel': 'email',
            'email_suitability': 'yes',
            'reason': 'Im Dokument wurde eine E-Mail-Adresse und ein Hinweis auf E-Mail-Kommunikation gefunden.',
            'risk_level': 'low',
            'confidence': 0.86
        })
    elif emails:
        result.update({
            'recommended_channel': 'both',
            'email_suitability': 'uncertain',
            'reason': 'Eine E-Mail-Adresse wurde gefunden, aber die Zulässigkeit für rechtssensible Antworten ist nicht eindeutig.',
            'risk_level': 'medium',
            'confidence': 0.66
        })

    return result

# Flask Integration:
# from flask import request, jsonify
# @app.route('/communication/analyze', methods=['POST'])
# def communication_analyze_route():
#     return jsonify(analyze_communication(request.get_json(force=True) or {}))
