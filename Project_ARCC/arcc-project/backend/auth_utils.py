from flask_jwt_extended import get_jwt_identity


def current_user_id():
    """Return authenticated user id from JWT, or None if missing."""
    try:
        identity = get_jwt_identity()
        if identity is None:
            return None
        return int(identity)
    except (TypeError, ValueError):
        return None
