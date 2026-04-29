#!/usr/bin/env python3
"""Optionaler OCR-Server fuer lokale Tests.
Voraussetzung: tesseract + deutsche Sprachdaten installiert.
Ubuntu/Debian: sudo apt install tesseract-ocr tesseract-ocr-deu
"""
import base64
import io
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image, ImageOps, ImageEnhance, ImageFilter
import pytesseract
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)
CORS(app)
PORT = int(os.getenv("OCR_PORT", "8766"))


def preprocess(image: Image.Image) -> Image.Image:
    image = image.convert("L")
    image = ImageOps.autocontrast(image)
    image = ImageEnhance.Contrast(image).enhance(1.8)
    image = image.filter(ImageFilter.SHARPEN)
    return image


@app.get("/health")
def health():
    return jsonify({"ok": True, "engine": "tesseract"})


@app.post("/ocr")
def ocr():
    payload = request.get_json(force=True, silent=True) or {}
    data = payload.get("image", "")
    if "," in data:
        data = data.split(",", 1)[1]
    if not data:
        return jsonify({"error": "image required"}), 400
    raw = base64.b64decode(data)
    image = preprocess(Image.open(io.BytesIO(raw)))
    text = pytesseract.image_to_string(image, lang="deu+eng")
    return jsonify({"text": text, "chars": len(text)})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=PORT)
