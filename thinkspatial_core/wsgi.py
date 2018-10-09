"""
WSGI config for ThinkSpatial!

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/1.11/howto/deployment/wsgi/
"""

import os
import sys
from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "thinkspatial_core.settings")
sys.path.append(os.path.dirname(os.path.abspath(__file__)) + '/..')

application = get_wsgi_application()
