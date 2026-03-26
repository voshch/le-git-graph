FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY pyproject.toml /app/pyproject.toml
COPY server.py /app/server.py

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -e .

CMD ["server"]
