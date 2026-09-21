FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

EXPOSE 8000

RUN chmod +x /app/start.sh

# start.sh applies migrations, then execs uvicorn. ${PORT} is read there:
# Render (and most PaaS) inject the port to bind, defaulting to 8000 locally.
# Single worker on purpose — each worker costs ~200 MB of imports, which would
# blow the 512 MB free tier.
CMD ["/app/start.sh"]
