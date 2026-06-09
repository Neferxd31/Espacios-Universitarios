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
    if 'DATABASE_URL' not in os.environ and 'USERS_DATABASE_URL' in os.environ:
        os.environ['DATABASE_URL'] = os.environ['USERS_DATABASE_URL']

_load_root_env()

SECRET_KEY = os.environ.get(
    'DJANGO_SECRET_KEY',
    'django-insecure-$z1)dtd7okx8zru&oxlyv*xszahjc@higmk=nqk(z-3b9&zxa-',
)

# En Railway DEBUG=False por defecto. En local sigue True.
_RAILWAY_PUBLIC = os.environ.get('RAILWAY_PUBLIC_DOMAIN', '').strip()
DEBUG = os.environ.get('DJANGO_DEBUG', 'False' if _RAILWAY_PUBLIC else 'True') == 'True'

ALLOWED_HOSTS = [
    h.strip()
    for h in os.environ.get('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')
    if h.strip()
]
# Railway expone el servicio por un subdominio dinámico — lo añadimos solo
# si la variable está presente para no relajar seguridad en local.
if _RAILWAY_PUBLIC:
    ALLOWED_HOSTS.append(_RAILWAY_PUBLIC)
    ALLOWED_HOSTS.extend(['.railway.app', '.up.railway.app', '.railway.internal'])

# Railway termina TLS en su proxy — sin esto Django piensa que es HTTP
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# CSRF: los POST a admin/ desde el dominio público requieren listarlo aquí
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
    'users',
]

# ---------------------------------------------------------------------------
# CORS — permite peticiones desde el frontend Next.js en desarrollo
# ---------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
]
# Frontend en producción se pasa por env var (lista separada por coma)
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
            conn_max_age=1800,  # reusa conexiones 30 min — clave con Railway proxy
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
# JWT
# ---------------------------------------------------------------------------
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'dev-jwt-secret-change-in-production')
JWT_ACCESS_TOKEN_EXPIRE_HOURS = int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRE_HOURS', '1'))
JWT_REFRESH_TOKEN_EXPIRE_DAYS = int(os.environ.get('JWT_REFRESH_TOKEN_EXPIRE_DAYS', '7'))

# ---------------------------------------------------------------------------
# URLs de otros servicios (para comunicación interna)
# ---------------------------------------------------------------------------
SPACES_SERVICE_URL = os.environ.get('SPACES_SERVICE_URL', 'http://spaces:8000')

# ---------------------------------------------------------------------------
# RabbitMQ — para publicar PasswordResetRequested (HU-4)
# ---------------------------------------------------------------------------
RABBITMQ_URL = os.environ.get('RABBITMQ_URL', '')

# ---------------------------------------------------------------------------
# URL pública del frontend (para incluir en links de correo)
# ---------------------------------------------------------------------------
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
# I18n / Timezone
# ---------------------------------------------------------------------------
LANGUAGE_CODE = 'es-co'
TIME_ZONE = 'America/Bogota'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
