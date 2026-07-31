"""QR code generation for TelegramInvite deep links.

Generated server-side (qrcode + Pillow, both pure-Python/no external service call) so an invite
token never leaves our own server just to render an image — no third-party QR API involved.
"""
import base64
import io

import qrcode


def qr_data_uri(data):
    """PNG QR code for `data`, as a data: URI ready to drop straight into an <img src>."""
    img = qrcode.make(data)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    encoded = base64.b64encode(buf.getvalue()).decode('ascii')
    return f'data:image/png;base64,{encoded}'
