FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", \
  "python manage.py makemigrations --noinput && \
   python manage.py migrate --noinput && \
   exec gunicorn config.wsgi:application \
     --bind 0.0.0.0:${PORT} \
     --workers ${WEB_CONCURRENCY:-3} \
     --threads ${WEB_THREADS:-4} \
     --worker-class gthread \
     --timeout 60 \
     --max-requests 1000 \
     --max-requests-jitter 100 \
     --access-logfile - \
     --error-logfile -"]
