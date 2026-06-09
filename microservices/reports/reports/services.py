"""
HTTP clients del MS reports hacia otros microservicios.
Usa stdlib para no añadir dependencias.
"""

from __future__ import annotations

import json
import logging
import os
import urllib.error
import urllib.request

logger = logging.getLogger(__name__)


def _spaces_base() -> str:
  return os.environ.get('SPACES_SERVICE_URL', 'http://spaces:8000').rstrip('/')


def fetch_spaces_map(timeout: float = 10.0) -> dict[str, dict]:
  """
  Trae todos los espacios y arma un dict {space_id: {'label': '...', 'name': '...', ...}}
  para enriquecer reportes con datos legibles. Si falla, devuelve dict vacío.
  """
  url = f'{_spaces_base()}/api/v1/spaces/?page_size=200&include_inactive=true'
  try:
    req = urllib.request.Request(url, headers={'Accept': 'application/json'})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
      raw = resp.read().decode()
      data = json.loads(raw) if raw else {}
  except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError) as exc:
    logger.warning('No se pudo resolver espacios: %s', exc)
    return {}

  results = data.get('results') if isinstance(data, dict) else data
  out = {}
  for s in (results or []):
    sid = str(s.get('id'))
    if not sid:
      continue
    area_code = (s.get('area') or {}).get('code', '') or ''
    code = s.get('code', '') or ''
    name = s.get('name', '') or ''
    out[sid] = {
      'label': f'{area_code.upper()}-{code} · {name}'.strip(' ·-'),
      'area_code': area_code,
      'code': code,
      'name': name,
      'capacity': s.get('capacity'),
      'type': s.get('space_type'),
    }
  return out
