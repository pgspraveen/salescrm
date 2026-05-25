# settings.py = main configuration file for entire Django project
# Django reads this file on startup to configure database, email, security etc.

from pathlib import Path
import os
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent   # project root folder path

SECRET_KEY = 'django-insecure-salescrm-key-change-in-production'

DEBUG = True       # True = show detailed errors (development only, False in production)

ALLOWED_HOSTS = ['*']   # * = accept requests from any domain (restrict in production)

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',          # built-in user authentication system
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',               # Django REST Framework = tools to build APIs
    'corsheaders',                  # CORS = allows React (port 5173) to call Django (port 8000)
    'crm',                          # our custom app
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',    # MUST be first to handle CORS headers
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'salescrm.urls'      # main urls.py location

TEMPLATES = [{
    'BACKEND': 'django.template.backends.django.DjangoTemplates',
    'DIRS': [],
    'APP_DIRS': True,
    'OPTIONS': {'context_processors': [
        'django.template.context_processors.debug',
        'django.template.context_processors.request',
        'django.contrib.auth.context_processors.auth',
        'django.contrib.messages.context_processors.messages',
    ]},
}]

WSGI_APPLICATION = 'salescrm.wsgi.application'

# SQL SERVER DATABASE
# ENGINE = which database driver to use
# mssql = Microsoft SQL Server via pyodbc
DATABASES = {
    'default': {
        'ENGINE':   'mssql',
        'NAME':     'SalesPulseCRM',        # database name
        'USER':     'sa',                    # SQL Server username
        'PASSWORD': 'Sales@123',             # SQL Server password
        'HOST':     'PGSPRAVEEN\\SQLEXPRESS',
        'PORT':     '',
        'OPTIONS': {
            'driver':       'ODBC Driver 18 for SQL Server',
            'extra_params': 'TrustServerCertificate=yes;Encrypt=no;',
        },
    }
}

# JWT SETTINGS
# JWT = JSON Web Token, used to authenticate API requests
# DEFAULT_AUTHENTICATION_CLASSES = how Django verifies who is making the request
# DEFAULT_PERMISSION_CLASSES = who is allowed to access endpoints by default
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
}

# ACCESS_TOKEN_LIFETIME = token expires after 24 hours, user must login again
# REFRESH_TOKEN_LIFETIME = refresh token valid for 7 days
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME':  timedelta(hours=24),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
}

# CORS = Cross-Origin Resource Sharing
# Without this, browser blocks React from calling Django API
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",    # Vite dev server port
]

# EMAIL = Gmail SMTP configuration
# SMTP = protocol used to send emails
# TLS = encrypted connection to Gmail server
EMAIL_BACKEND       = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST          = 'smtp.gmail.com'
EMAIL_PORT          = 587
EMAIL_USE_TLS       = True
EMAIL_HOST_USER     = 'gunasaipraveenpemmada@gmail.com'
EMAIL_HOST_PASSWORD = 'thhk lyfd mamw nfqc'    # Gmail App Password (not regular password)

STATIC_URL = '/static/'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'   # auto-increment primary key type

