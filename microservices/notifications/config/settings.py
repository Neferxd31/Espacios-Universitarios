import os
from pathlib import Path

import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent

# ---------------------------------------------------------------------------
# Cargar variables del .env raiz si DATABASE_URL no está en el entorno
# ---------------------------------------------------------------------------
def _load_root_env():
  env_path = BASE_DIR.parent.parent / '.env'
  if not env_path.exists():
    return
  with open(env_path) as f:
    for line in f:
      line = line.strip()
      if not line or line.startswith('#') or '=' not in line:
        continue
      key, value = line.split('=', 1)
      key, value = key.strip(), value.strip()
      if key not in os.environ:
        os.environ[key] = value
  if 'DATABASE_URL' not in os.environ and 'NOTIFICATIONS_DATABASE_URL' in os.environ:
    os.environ['DATABASE_URL'] = os.environ['NOTIFICATIONS_DATABASE_URL']

_load_root_env()

SECRET_KEY = os.environ.get(
  'DJANGO_SECRET_KEY',
  'django-insecure-notif-$z1)dtd7okx8zru&oxlyv*xszahjc@higmk=nqk(z-3b9&zxa-',
)

_RAILWAY_PUBLIC = os.environ.get('RAILWAY_PUBLIC_DOMAIN', '').strip()
DEBUG = os.environ.get('DJANGO_DEBUG', 'False' if _RAILWAY_PUBLIC else 'True') == 'True'

ALLOWED_HOSTS = [
  h.strip()
  for h in os.environ.get('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')
  if h.strip()
]
if _RAILWAY_PUBLIC:
  ALLOWED_HOSTS.append(_RAILWAY_PUBLIC)
  ALLOWED_HOSTS.extend(['.railway.app', '.up.railway.app', '.railway.internal'])

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

CSRF_TRUSTED_ORIGINS = []
if _RAILWAY_PUBLIC:
  CSRF_TRUSTED_ORIGINS.append(f'https://{_RAILWAY_PUBLIC}')
CSRF_TRUSTED_ORIGINS += [
  o.strip()
  for o in os.environ.get('CSRF_TRUSTED_ORIGINS', '').split(',')
  if o.strip()
]

INSTALLED_APPS = [
  'django.contrib.admin',
  'django.contrib.auth',
  'django.contrib.contenttypes',
  'django.contrib.sessions',
  'django.contrib.messages',
  'django.contrib.staticfiles',
  'corsheaders',
  'rest_framework',
  'notifications',
]

CORS_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]
CORS_ALLOWED_ORIGINS += [
  o.strip()
  for o in os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',')
  if o.strip()
]
CORS_ALLOW_CREDENTIALS = True

MIDDLEWARE = [
  'django.middleware.security.SecurityMiddleware',
  'corsheaders.middleware.CorsMiddleware',
  'django.contrib.sessions.middleware.SessionMiddleware',
  'django.middleware.common.CommonMiddleware',
  'django.middleware.csrf.CsrfViewMiddleware',
  'django.contrib.auth.middleware.AuthenticationMiddleware',
  'django.contrib.messages.middleware.MessageMiddleware',
  'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
  {
    'BACKEND': 'django.template.backends.django.DjangoTemplates',
    'DIRS': [],
    'APP_DIRS': True,
    'OPTIONS': {
      'context_processors': [
        'django.template.context_processors.request',
        'django.contrib.auth.context_processors.auth',
        'django.contrib.messages.context_processors.messages',
      ],
    },
  },
]

WSGI_APPLICATION = 'config.wsgi.application'

# ---------------------------------------------------------------------------
# Base de datos — PostgreSQL via DATABASE_URL (Railway) o SQLite como fallback
# ---------------------------------------------------------------------------
_database_url = os.environ.get('DATABASE_URL')

if _database_url:
  DATABASES = {
    'default': dj_database_url.config(
      default=_database_url,
      conn_max_age=1800,
      conn_health_checks=True,
    )
  }
else:
  DATABASES = {
    'default': {
      'ENGINE': 'django.db.backends.sqlite3',
      'NAME': BASE_DIR / 'db.sqlite3',
    }
  }

# ---------------------------------------------------------------------------
# JWT (para validar tokens cuando los endpoints lo requieran)
# ---------------------------------------------------------------------------
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'dev-jwt-secret-change-in-production')

# ---------------------------------------------------------------------------
# RabbitMQ — consumer de eventos
# ---------------------------------------------------------------------------
RABBITMQ_URL = os.environ.get('RABBITMQ_URL', 'amqp://guest:guest@rabbitmq:5672/')

# ---------------------------------------------------------------------------
# Email (stub por ahora — log a consola y guarda en BD).
# Cuando se tenga SMTP real, basta con cambiar EMAIL_BACKEND.
# ---------------------------------------------------------------------------
EMAIL_BACKEND = os.environ.get(
  'EMAIL_BACKEND',
  'django.core.mail.backends.console.EmailBackend',
)
EMAIL_HOST = os.environ.get('EMAIL_HOST', '')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True') == 'True'
DEFAULT_FROM_EMAIL = os.environ.get(
  'DEFAULT_FROM_EMAIL',
  'Espacios UFPS <no-reply@ufps.edu.co>',
)

# Tiempo antes del inicio de la reserva en que se envía el recordatorio (horas)
REMINDER_HOURS_BEFORE = int(os.environ.get('REMINDER_HOURS_BEFORE', '1'))

# Base URL pública del frontend (para links en correos)
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

# ---------------------------------------------------------------------------
# DRF
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
  'DEFAULT_PERMISSION_CLASSES': [
    'rest_framework.permissions.AllowAny',
  ],
}

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
LOGGING = {
  'version': 1,
  'disable_existing_loggers': False,
  'formatters': {
    'simple': {'format': '[%(asctime)s] %(levelname)s %(name)s: %(message)s'},
  },
  'handlers': {
    'console': {'class': 'logging.StreamHandler', 'formatter': 'simple'},
  },
  'root': {'handlers': ['console'], 'level': 'INFO'},
}

# ---------------------------------------------------------------------------
# I18n / Timezone
# ---------------------------------------------------------------------------
LANGUAGE_CODE = 'es-co'
TIME_ZONE = 'America/Bogota'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
