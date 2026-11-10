import base64
import hashlib
import hmac
import os
import struct
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Optional, Union
import jwt

from app.core.config import settings


# ---------------- Password Hashing (PBKDF2-HMAC-SHA256) ----------------
def get_password_hash(password: str) -> str:
    """Generates a secure PBKDF2-HMAC-SHA256 hash with random salt."""
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return f"{salt.hex()}${dk.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against stored PBKDF2 hash."""
    try:
        salt_hex, hash_hex = hashed_password.split("$")
        salt = bytes.fromhex(salt_hex)
        expected_dk = bytes.fromhex(hash_hex)
        actual_dk = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, 100000)
        return hmac.compare_digest(actual_dk, expected_dk)
    except Exception:
        return False


# ---------------- JWT Authentication ----------------
def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode = {"exp": expire, "sub": str(subject), "type": "access"}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except Exception:
        return None


# ---------------- RFC 6238 TOTP Two-Factor Authentication ----------------
def generate_totp_secret() -> str:
    """Generates standard 32-character Base32 secret for Google Authenticator / 1Password."""
    random_bytes = os.urandom(20)
    return base64.b32encode(random_bytes).decode("utf-8").replace("=", "")


def get_totp_token(secret: str, interval_offset: int = 0) -> str:
    """Calculates 6-digit TOTP token for given secret at current time + interval_offset."""
    key = base64.b32decode(secret + "=" * ((8 - len(secret) % 8) % 8), casefold=True)
    counter = int(time.time() // 30) + interval_offset
    msg = struct.pack(">Q", counter)
    h = hmac.new(key, msg, hashlib.sha1).digest()
    offset = h[-1] & 0x0F
    code = (struct.unpack(">I", h[offset : offset + 4])[0] & 0x7FFFFFFF) % 1000000
    return f"{code:06d}"


def get_totp_uri(secret: str, email: str) -> str:
    """Builds standard otpauth:// URL for QR code generation."""
    return f"otpauth://totp/{settings.PROJECT_NAME}:{email}?secret={secret}&issuer={settings.PROJECT_NAME}&algorithm=SHA1&digits=6&period=30"


def verify_totp(secret: str, code: str) -> bool:
    """Verifies a 6-digit code with +/- 1 window drift tolerance."""
    clean_code = code.strip()
    for offset in (-1, 0, 1):
        if hmac.compare_digest(get_totp_token(secret, offset), clean_code):
            return True
    return False
