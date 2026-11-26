
import os

import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, status

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SERVICE_ACCOUNT_PATH = os.path.join(
    BASE_DIR,
    "serviceAccountKey.json"
)

if not os.path.exists(SERVICE_ACCOUNT_PATH):
    raise FileNotFoundError(
        "serviceAccountKey.json tidak ditemukan di folder backend."
    )

if not firebase_admin._apps:
    credential = credentials.Certificate(SERVICE_ACCOUNT_PATH)
    firebase_admin.initialize_app(credential)


def verify_firebase_token(token: str):
    try:
        return auth.verify_id_token(token)

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token Firebase tidak valid atau sudah kedaluwarsa.",
            headers={"WWW-Authenticate": "Bearer"},
        )
