from flask_oidc import OpenIDConnect
from flask import redirect, current_app


class OpenIDConnectRedirect(OpenIDConnect):
    """Extend OIDC class to redirect back to root on error"""

    def _oidc_error(self, message=None, code=None):
        message = f": {message}" if message is not None else ""
        current_app.logger.error(f"Error{message}; redirecting to /home")
        return redirect("/home")


oidc = OpenIDConnectRedirect()
