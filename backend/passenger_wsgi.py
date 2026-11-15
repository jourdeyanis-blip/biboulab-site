# Point d'entrée pour O2switch (cPanel › « Setup Python App », serveur Passenger).
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "biboulab_admin.settings")

from django.core.wsgi import get_wsgi_application  # noqa: E402

application = get_wsgi_application()
