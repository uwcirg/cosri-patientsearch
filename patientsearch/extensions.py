from flask_oidc import OpenIDConnect
from flask import redirect, current_app


class OpenIDConnectRedirect(OpenIDConnect):
    """Extend OIDC class to redirect back to root on error"""

    def _oidc_error(self, message=None, code=None):
        message = f": {message}" if message is not None else ""
        current_app.logger.warn(f"{message}; redirecting to /home, presumably from post-auth bookmark")
        return redirect("/home")


oidc = OpenIDConnectRedirect()
