"""
One place that turns the FIREBASE_CREDENTIALS_JSON setting into a usable
firebase-admin messaging module.

Why this exists as its own module: the setting is named `..._JSON`, which
invites pasting the service-account JSON *content* into an environment
variable — the only thing you can put in one on most managed hosts, Render
included. But `credentials.Certificate()` treats a plain string as a *file
path* and calls open() on it, so the natural reading of the name produced a
FileNotFoundError that the caller's broad `except` swallowed. Push looked
configured and silently delivered nothing.

So: accept both forms, and make the three outcomes distinguishable to whoever
reads the logs — not configured, misconfigured, or working.
"""
import json
import logging

from django.conf import settings

logger = logging.getLogger(__name__)


class CredentialState:
    """Why messaging is unavailable — recorded on each delivery row so a
    misconfiguration never again looks identical to 'not set up yet'."""

    OK = 'ok'
    NOT_CONFIGURED = 'not_configured'
    BAD_CREDENTIAL = 'bad_credential'
    LIBRARY_MISSING = 'library_missing'


#: Human-readable reason per state, short enough for a delivery row.
REASONS = {
    CredentialState.NOT_CONFIGURED: 'Push is not configured on this server (FIREBASE_CREDENTIALS_JSON is empty).',
    CredentialState.BAD_CREDENTIAL: 'Firebase credential is set but invalid — see server logs.',
    CredentialState.LIBRARY_MISSING: 'firebase-admin is not installed on this server.',
}


def _build_certificate(raw):
    """Turn the setting's value into a firebase_admin Certificate.

    Accepts either the JSON content itself or a path to a file holding it,
    so neither an env var nor a mounted secret file is the "wrong" choice.
    """
    from firebase_admin import credentials

    value = raw.strip()
    # A service-account key is a JSON object; anything starting with '{' is
    # the content, not a path. Checking the shape beats guessing from the
    # setting's name.
    if value.startswith('{'):
        return credentials.Certificate(json.loads(value))
    return credentials.Certificate(value)


def get_messaging():
    """Return ``(messaging_module, state)``.

    ``messaging_module`` is None unless state is OK. Never raises — callers
    record the state against every delivery instead of blowing up a request.
    """
    try:
        import firebase_admin
        from firebase_admin import messaging
    except ImportError:
        logger.error('firebase-admin is not installed; cannot send push notifications.')
        return None, CredentialState.LIBRARY_MISSING

    raw = getattr(settings, 'FIREBASE_CREDENTIALS_JSON', '') or ''
    if not raw.strip():
        logger.info('FIREBASE_CREDENTIALS_JSON is empty; skipping push send.')
        return None, CredentialState.NOT_CONFIGURED

    if not firebase_admin._apps:
        try:
            firebase_admin.initialize_app(_build_certificate(raw))
        except json.JSONDecodeError:
            logger.exception(
                'FIREBASE_CREDENTIALS_JSON looks like JSON but could not be parsed. '
                'Paste the whole service-account key, or give a path to the file.'
            )
            return None, CredentialState.BAD_CREDENTIAL
        except FileNotFoundError:
            logger.exception(
                'FIREBASE_CREDENTIALS_JSON was read as a file path and no such file exists. '
                'Either point it at a real file, or paste the JSON content itself.'
            )
            return None, CredentialState.BAD_CREDENTIAL
        except Exception:
            logger.exception('Failed to initialise firebase-admin from FIREBASE_CREDENTIALS_JSON.')
            return None, CredentialState.BAD_CREDENTIAL

    return messaging, CredentialState.OK
