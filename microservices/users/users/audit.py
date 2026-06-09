"""
Helper para registrar eventos de auditoría en el MS reports.
Es fire-and-forget: si reports está caído, no rompe el flujo del usuario.
"""

from __future__ import annotations

import json
import logging
import os
import threading
import urllib.error
import urllib.request

logger = logging.getLogger(__name__)


def _reports_base() -> str:
    return os.environ.get('REPORTS_SERVICE_URL', 'http://reports:8000').rstrip('/')


def _post_audit(payload: dict) -> None:
    url = f'{_reports_base()}/api/v1/audit/'
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=data,
        headers={'Content-Type': 'application/json', 'Accept': 'application/json'},
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=3.0) as resp:
            resp.read()
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as exc:
        logger.warning('No se pudo registrar audit log: %s', exc)


def record_audit(
    *,
    user_id: str | None,
    user_label: str,
    action: str,
    resource: str,
    resource_id: str = '',
    ip_address: str | None = None,
    metadata: dict | None = None,
) -> None:
    """
    Registra un evento en /api/v1/audit/ del MS reports.
    Lo hace en un thread separado para no bloquear la respuesta HTTP.
    """
    payload = {
        'user_id': user_id,
        'user_label': user_label,
        'action': action,
        'resource': resource,
        'resource_id': resource_id,
        'metadata': metadata or {},
    }
    if ip_address:
        payload['ip_address'] = ip_address

    threading.Thread(target=_post_audit, args=(payload,), daemon=True).start()
