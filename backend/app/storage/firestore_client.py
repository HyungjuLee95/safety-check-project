from functools import lru_cache

from google.cloud import firestore
from google.oauth2 import service_account

SERVICE_ACCOUNT_INFO = {
    "type": "service_account",
    "project_id": "lhb-safety-check",
    "private_key_id": "4175af13930d71eb84631a67991c03b29db9d126",
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCWD0Dsg98PYzv8\nq2wgsS8+C8qev40a+na+nho0WR7RoCLonlhEaihRynUi+qOqtgL7jRLyFHUbOBFA\nuBQLGaAalTSW+0ke0zd6Ge1H0OsutYnxV7kC9o0uWMPBY1NNIGqo7mUcTvCY5h+i\n+W0hsdGKM8NV3ExscyjOvZD970rNwgNmmdX8Vja/qT0l0/+bPWBiZAAw7S213A87\nGA4QPND7nPuXTwrg2EsfHr9Di/+5Dm/LWN0lLiq+/cRhON+4A2j5R9qbvh2Fic16\nOhWAhmJQFoa/g/vv9AIajF2eZ0hLO3BD8Nigufs+5sG3GOUpxBVG6b4916LJ76pU\n45OnKLyZAgMBAAECggEABacotBhCLZFYk8vN6JvgKptVXF5dNZZYpZTtagou8Ojy\nU7bOXrJslys0Nzd/talCasFNZMj8QeSecsSUfbgPCd1T1Dm+bw64LO1/3LgcOf/d\nBNZgCgJpfmTZ6AXCwDmvxvInJTY8llf5+mDg2Xd6TDVnvwrr5px+fa5SwVwzwlVF\nWNgK70xtA0vNrUey6HjVGgqfdBFPOZOSfLtxyTGpXN3ByXq5lH7rHifAleA5nZ9h\nUHUrsq0aylC8uw6tvex9o7GcQ3zTAUbutkb9Vfj0Pq2YMIGGB8bKIIlC5aA3kSeV\nMfnr7tPMLsWHgGON6itNif5c5V5jXlYFxYN5HEkHoQKBgQDETBFY8d/lKslY0DBk\nVAwpo8/EoJxnjK3NYM8heGGDsAFL/fq3Gexr0VLYmsokkcXAcpi83rmu/MotDlMB\njYtAy9P+GZ3Sx1TP1SBvyFAko3h8ZSguzaV4ySyFyyfE02Y/1GDTA1bf+ohJkT8I\nnw0G6k7g0BcsRvQyiGFcEGOEoQKBgQDDsxLwVfNgZjhAnF6EEo6eaNrsrI6Ya0de\nqP/2d+Y8RjDa+2gm6GaXejCPWeGMKCB47P3BE64MYHugKKqNL4Ncqjf/SVVRVG+N\nKEmHInpeh9YwmsEnyykF8lB3AKPT14Yj8qebqy4X7ccujHktVTNwD0mfIBVwYjOK\naFtR9uc8+QKBgQCeqlG3UELGbNA1Doqe/eSa38L3z0680FRH1sF172T62ZAiyZcW\n20hjWd4aIPvVlVJ/nOFigLEcBU6yHorvjWaKqHahRDlyfxZJq569W++TveKMwgM5\n2ZWvzQRE3RI3IRzb6SGeTmuxPUNeG54UrOMNvOSnCOxCKNQH6H6xuLmIIQKBgGMN\nOVHB/zxUoLY7Ly+kAOG26tAOCuKksev8mAmU6EirskC0LSQ8TujupLN558o76Sur\nsEhQgLCtCQWob6KkYNW/JjalVHSkyw1kTcsDLXK5SDUzrv5IOwxSeF2zSjiIBtId\nGK6W9u6PoFg0K4VBcZaPdlD/OTq3yaSNa2NSF/ppAoGAVjIC7NjRchsuJ1kxAK4m\nElbBFDQ0jLfZMwFKmyBdEUZPIcNjdo69wguoCr48ZQS/WJZUY3DXMS7HAY+ivpiv\n3GNbHMwaRKvQmH140oJFIw/qZ9L0nDAq12/NPXPgXP21dwoJhReLJ0jilGWssky0\nRw5WAMaEAlcrVHVdBQoUxIs=\n-----END PRIVATE KEY-----\n",
    "client_email": "firebase-adminsdk-fbsvc@lhb-safety-check.iam.gserviceaccount.com",
    "client_id": "114148346597110949690",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40lhb-safety-check.iam.gserviceaccount.com",
    "universe_domain": "googleapis.com",
}


@lru_cache(maxsize=1)
def get_firestore_client() -> firestore.Client:
    project_id = SERVICE_ACCOUNT_INFO["project_id"]
    credentials = service_account.Credentials.from_service_account_info(SERVICE_ACCOUNT_INFO)
    return firestore.Client(project=project_id, credentials=credentials)
