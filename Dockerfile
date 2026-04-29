FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-deu \
    tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

COPY server/ki_proxy.py .
COPY server/communication_engine.py .
COPY server/ocr_server.py .

ENV PORT=8080
ENV OCR_PORT=8081

EXPOSE 8080 8081

CMD python3 -c "
import threading, os
from ki_proxy import app as ki_app
from ocr_server import app as ocr_app
PORT_KI = int(os.environ.get('PORT', 8080))
PORT_OCR = int(os.environ.get('OCR_PORT', 8081))

def run_ki():
    ki_app.run(host='0.0.0.0', port=PORT_KI, threaded=True)

def run_ocr():
    ocr_app.run(host='0.0.0.0', port=PORT_OCR, threaded=True)

t1 = threading.Thread(target=run_ki, daemon=True)
t2 = threading.Thread(target=run_ocr, daemon=True)
t1.start()
t2.start()
t1.join()
t2.join()
"
