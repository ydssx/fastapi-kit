#!/usr/bin/env bash
# Generate a local self-signed TLS cert for Caddy (localhost / 127.0.0.1).
set -euo pipefail

cd "$(dirname "$0")/.."

CERT_DIR="docker/certs"
CERT_FILE="${CERT_DIR}/cert.pem"
KEY_FILE="${CERT_DIR}/key.pem"
DAYS="${DEV_CERT_DAYS:-825}"

if ! command -v openssl >/dev/null 2>&1; then
  echo "Error: openssl is required. Install OpenSSL or use Git Bash on Windows."
  exit 1
fi

mkdir -p "${CERT_DIR}"

# Git Bash converts /CN=... to a Windows path; use // prefix on MSYS.
SUBJ="/CN=localhost"
if [ -n "${MSYSTEM:-}" ]; then
  SUBJ="//CN=localhost"
fi

openssl req -x509 -nodes -days "${DAYS}" -newkey rsa:2048 \
  -keyout "${KEY_FILE}" \
  -out "${CERT_FILE}" \
  -subj "${SUBJ}" \
  -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1,IP:::1"

chmod 600 "${KEY_FILE}"
echo "Wrote ${CERT_FILE} and ${KEY_FILE} (valid ${DAYS} days)."
echo "Browsers will warn until you trust this cert; curl uses -k / --insecure."
