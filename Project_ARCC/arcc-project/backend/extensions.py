"""Shared Flask extensions, kept here to avoid circular imports between
app.py and the route blueprints that decorate their views with limits."""

from flask import request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address


def rate_limit_key() -> str:
    """Limit per authenticated user when we can identify one, else per IP."""
    try:
        verify_jwt_in_request(optional=True)
        identity = get_jwt_identity()
        if identity is not None:
            return f"user:{identity}"
    except Exception:
        pass
    return get_remote_address()


# Default in-memory storage is per-process. Fine to start; point `storage_uri`
# at Redis (e.g. "redis://localhost:6379") when running multiple workers.
limiter = Limiter(
    key_func=rate_limit_key,
    default_limits=["240 per hour"],
)


@limiter.request_filter
def _exempt_from_limits() -> bool:
    """Never rate-limit CORS preflight or health checks - they must always
    succeed so the browser preflight can't fail with a network error."""
    return request.method == "OPTIONS" or request.path.endswith("/health")
