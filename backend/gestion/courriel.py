"""Envoi d'e-mails par le programme sendmail du serveur (comme la fonction mail() de PHP chez O2switch)."""
import logging
import subprocess

from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend

log = logging.getLogger(__name__)


class SendmailBackend(BaseEmailBackend):
    def send_messages(self, email_messages):
        envoyes = 0
        for message in email_messages:
            if not message.recipients():
                continue
            try:
                subprocess.run(
                    [settings.SENDMAIL, "-t", "-i", "-f", message.from_email],
                    input=message.message().as_bytes(),
                    check=True, timeout=30, capture_output=True,
                )
                envoyes += 1
            except (OSError, subprocess.SubprocessError):
                log.exception("Envoi de l'e-mail impossible (sendmail)")
                if not self.fail_silently:
                    raise
        return envoyes
