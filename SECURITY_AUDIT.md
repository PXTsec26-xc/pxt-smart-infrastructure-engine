# PXT Smart Infrastructure — Cybersecurity Audit & Controls Report

## Implemented Security Controls

1. **Authentication & Password Hashing**:
   - Double SHA-256 salted password hashing (`hash_password(plain + salt)`).
   - JWT Bearer Tokens with `HS256` signature verification and 24-hour expiration (`create_access_token`, `decode_access_token`).
2. **HTTP Security Headers Middleware**:
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `X-XSS-Protection: 1; mode=block`
   - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
   - `Content-Security-Policy: default-src 'self' 'unsafe-inline' ws: wss:;`
3. **Authorization & Role-Based Access Control**:
   - Restricts administrative operations (device registration, command execution, alert resolution, mode switching) to authenticated sessions.
4. **Audit Logging**:
   - Records user logins, device commands, rule modifications, and mode changes in `audit_logs` table.
5. **Secret Management**:
   - No passwords or tokens exposed in frontend bundles, logs, or error responses.
