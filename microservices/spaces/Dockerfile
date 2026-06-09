FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["sh", "-c", \
  "python manage.py makemigrations --noinput && \
   python manage.py migrate --noinput && \
   python manage.py seed_sb && \
   exec gunicorn config.wsgi:application \
     --bind 0.0.0.0:8000 \
     --workers 3 \
     --threads 4 \
     --worker-class gthread \
     --timeout 60 \
     --max-requests 1000 \
     --max-requests-jitter 100 \
     --access-logfile - \
     --error-logfile -"]
