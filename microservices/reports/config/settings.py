import os
from pathlib import Path

import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent


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
  if 'DATABASE_URL' not in os.environ and 'REPORTS_DATABASE_URL' in os.environ:
    os.environ['DATABASE_URL'] = os.environ['REPORTS_DATABASE_URL']

_load_root_env()

SECRET_KEY = os.environ.get(
  'DJANGO_SECRET_KEY',
  'django-insecure-reports-$z1)dtd7okx8zru&oxlyv*xszahjc@higmk=nqk(z-3b9&zxa-',
)
DEBUG = os.environ.get('DJANGO_DEBUG', 'True') == 'True'
ALLOWED_HOSTS = [
  h.strip()
  for h in os.environ.get('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')
  if h.strip()
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
  'reports',
]

CORS_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
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

_database_url = os.environ.get('DATABASE_URL')
if _database_url:
  DATABASES = {
    'default': dj_database_url.config(
      default=_database_url, conn_max_age=600, conn_health_checks=True,
    )
  }
else:
  DATABASES = {
    'default': {
      'ENGINE': 'django.db.backends.sqlite3',
      'NAME': BASE_DIR / 'db.sqlite3',
    }
  }

JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'dev-jwt-secret-change-in-production')
RABBITMQ_URL = os.environ.get('RABBITMQ_URL', 'amqp://guest:guest@rabbitmq:5672/')

REST_FRAMEWORK = {
  'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.AllowAny'],
}

LOGGING = {
  'version': 1,
  'disable_existing_loggers': False,
  'formatters': {'simple': {'format': '[%(asctime)s] %(levelname)s %(name)s: %(message)s'}},
  'handlers': {'console': {'class': 'logging.StreamHandler', 'formatter': 'simple'}},
  'root': {'handlers': ['console'], 'level': 'INFO'},
}

LANGUAGE_CODE = 'es-co'
TIME_ZONE = 'America/Bogota'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
