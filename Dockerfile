FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-deu \
    tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

COPY server/combined_server.py .
COPY server/communication_engine.py .

EXPOSE 8080

CMD gunicorn --bind 0.0.0.0:8080 --workers 2 --threads 4 --timeout 120 combined_server:app
