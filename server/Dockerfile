FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-deu \
    tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

COPY ki_proxy.py .
COPY communication_engine.py .
COPY ocr_server.py .

ENV PORT=8080
ENV OCR_PORT=8080
ENV OPENROUTER_API_KEY=""
ENV OPENROUTER_MODEL="openai/gpt-4o-mini"

EXPOSE 8080

# Startet beide Server in einem Container über gunicorn mit threads
# ki_proxy auf :8080, ocr auf :8081 - oder wir fahren einen kombinierten
CMD python3 -c "
import threading, os
from ki_proxy import app as ki_app
from ocr_server import app as ocr_app

def run_ki():
    ki_app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)), threaded=True)

def run_ocr():
    ocr_app.run(host='0.0.0.0', port=int(os.environ.get('OCR_PORT', 8081)), threaded=True)

t1 = threading.Thread(target=run_ki, daemon=True)
t2 = threading.Thread(target=run_ocr, daemon=True)
t1.start()
t2.start()
t1.join()
t2.join()
"
