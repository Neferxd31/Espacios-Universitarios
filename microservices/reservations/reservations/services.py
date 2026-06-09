"""
HTTP clients to other microservices (users, spaces).
Uses stdlib only so no extra dependency for outbound calls.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request

from django.conf import settings


class UpstreamServiceError(Exception):
    """Raised when a peer service returns an error or is unreachable."""

    def __init__(self, message: str, status_code: int = 502):
        self.status_code = status_code
        super().__init__(message)


def _get_json(url: str, timeout: float = 15.0) -> tuple[dict, int]:
    req = urllib.request.Request(url, headers={'Accept': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode()
            data = json.loads(raw) if raw else {}
            return data, resp.status
    except urllib.error.HTTPError as e:
        raw = e.read().decode() if e.fp else ''
        try:
            data = json.loads(raw) if raw else {'detail': e.reason}
        except json.JSONDecodeError:
            data = {'detail': raw or str(e.reason)}
        return data, e.code
    except urllib.error.URLError as e:
        raise UpstreamServiceError(
            f'Cannot reach service: {e.reason}',
            status_code=503,
        ) from e


def fetch_user_by_university_code(university_code: str) -> dict:
    base = settings.USERS_SERVICE_URL.rstrip('/')
    qs = urllib.parse.urlencode({'university_code': university_code.strip()})
    url = f'{base}/api/v1/users/resolve/?{qs}'
    data, status = _get_json(url)
    if status == 404:
        raise UpstreamServiceError('User not found.', status_code=400)
    if status >= 400:
        detail = data.get('detail', str(data))
        raise UpstreamServiceError(
            f'Users service error: {detail}',
            status_code=502,
        )
    return data


def fetch_space_by_area_and_code(area_code: str, space_code: str) -> dict:
    base = settings.SPACES_SERVICE_URL.rstrip('/')
    qs = urllib.parse.urlencode(
        {'area_code': area_code.strip(), 'code': space_code.strip()}
    )
    url = f'{base}/api/v1/spaces/resolve/?{qs}'
    data, status = _get_json(url)
    if status == 404:
        raise UpstreamServiceError('Space not found.', status_code=400)
    if status >= 400:
        detail = data.get('detail', str(data))
        raise UpstreamServiceError(
            f'Spaces service error: {detail}',
            status_code=502,
        )
    return data


def fetch_user_by_id(user_id: str) -> dict | None:
    """
    Resuelve un usuario por su UUID llamando a users MS.
    Retorna None si no se puede resolver (sin lanzar excepción — el envío de
    correos no debe romper el flujo de reserva).
    """
    base = settings.USERS_SERVICE_URL.rstrip('/')
    url = f'{base}/api/v1/users/{user_id}/'
    try:
        data, status = _get_json(url, timeout=5.0)
        if status >= 400:
            return None
        return data
    except UpstreamServiceError:
        return None


def fetch_space_by_id(space_id: str) -> dict | None:
    """Resuelve un espacio por UUID. None si falla."""
    base = settings.SPACES_SERVICE_URL.rstrip('/')
    url = f'{base}/api/v1/spaces/{space_id}/'
    try:
        data, status = _get_json(url, timeout=5.0)
        if status >= 400:
            return None
        return data
    except UpstreamServiceError:
        return None


def check_holiday(date_iso: str, space_id: str | None) -> dict:
    """HU-19 — consulta a spaces si la fecha está bloqueada."""
    base = settings.SPACES_SERVICE_URL.rstrip('/')
    params = {'date': date_iso}
    if space_id:
        params['space_id'] = str(space_id)
    qs = urllib.parse.urlencode(params)
    url = f'{base}/api/v1/holidays/check/?{qs}'
    try:
        data, status = _get_json(url)
        if status >= 400:
            return {'is_blocked': False, 'label': None}
        return data
    except UpstreamServiceError:
        return {'is_blocked': False, 'label': None}
