"""En-têtes de sécurité et durée maximale de session."""
import time

from django.conf import settings
from django.contrib.auth import logout


def csp(nonce: str = "") -> str:
    scripts = "'self'" + (f" 'nonce-{nonce}'" if nonce else "")
    return (
        f"default-src 'none'; script-src {scripts}; style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; "
        "form-action 'self'; frame-ancestors 'none'; base-uri 'none'"
    )


class SecuriteMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Session trop ancienne (au-delà de 8 h après la connexion) : on déconnecte.
        if request.user.is_authenticated:
            debut = request.session.get("debut", 0)
            if time.time() - debut > settings.SESSION_DUREE_MAX:
                logout(request)

        response = self.get_response(request)
        response.setdefault("Content-Security-Policy", csp())
        response["Cache-Control"] = "no-store, max-age=0"
        response["X-Robots-Tag"] = "noindex, nofollow, noarchive"
        response["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()"
        response["Cross-Origin-Resource-Policy"] = "same-origin"
        return response
