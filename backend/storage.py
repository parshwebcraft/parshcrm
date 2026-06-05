"""Emergent Object Storage helpers."""
import logging
import os
from typing import Optional, Tuple

import requests

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
APP_NAME = "facets-crm"

logger = logging.getLogger("facets-crm.storage")
_storage_key: Optional[str] = None


def init_storage() -> Optional[str]:
    """Call once at startup. Returns a session-scoped storage_key."""
    global _storage_key
    if _storage_key:
        return _storage_key
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        logger.warning("EMERGENT_LLM_KEY missing; object storage disabled")
        return None
    try:
        resp = requests.post(
            f"{STORAGE_URL}/init", json={"emergent_key": api_key}, timeout=30
        )
        resp.raise_for_status()
        _storage_key = resp.json()["storage_key"]
        logger.info("Object storage initialized")
        return _storage_key
    except Exception as exc:  # noqa: BLE001
        logger.error("Storage init failed: %s", exc)
        return None


def _key() -> Optional[str]:
    return _storage_key or init_storage()


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = _key()
    if not key:
        raise RuntimeError("Storage not initialized")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=120,
    )
    if resp.status_code == 403:
        # try once more after re-init
        global _storage_key
        _storage_key = None
        key = _key()
        if not key:
            raise RuntimeError("Storage re-init failed")
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data,
            timeout=120,
        )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str) -> Tuple[bytes, str]:
    key = _key()
    if not key:
        raise RuntimeError("Storage not initialized")
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key},
        timeout=60,
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")
