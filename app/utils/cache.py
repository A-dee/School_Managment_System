import time
from threading import RLock
from typing import Any, Callable, Hashable


class TTLMemoryCache:
    def __init__(self, default_ttl_seconds: int = 60):
        self.default_ttl_seconds = max(default_ttl_seconds, 0)
        self._items: dict[Hashable, tuple[float, Any]] = {}
        self._lock = RLock()

    def get_or_set(self, key: Hashable, factory: Callable[[], Any], ttl_seconds: int | None = None) -> Any:
        ttl = self.default_ttl_seconds if ttl_seconds is None else max(ttl_seconds, 0)
        if ttl == 0:
            return factory()

        now = time.monotonic()
        with self._lock:
            item = self._items.get(key)
            if item:
                expires_at, value = item
                if expires_at > now:
                    return value
                self._items.pop(key, None)

        value = factory()
        with self._lock:
            self._items[key] = (now + ttl, value)
        return value

    def clear_prefix(self, prefix: str) -> None:
        with self._lock:
            for key in list(self._items):
                if isinstance(key, tuple) and key and key[0] == prefix:
                    self._items.pop(key, None)
                elif isinstance(key, str) and key.startswith(prefix):
                    self._items.pop(key, None)

    def clear(self) -> None:
        with self._lock:
            self._items.clear()
