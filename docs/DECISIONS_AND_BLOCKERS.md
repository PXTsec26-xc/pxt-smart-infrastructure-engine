# PXT Smart Infrastructure Engine — Architectural Decisions & Blockers Log

**Project Designation**: PXT SMART INFRASTRUCTURE ENGINE  
**Project Owner**: Sahil Maisuria (Elliot PXT sec26)  

---

## Architectural Decision Records (ADRs)

### ADR-001: PBKDF2-HMAC-SHA256 Password Hashing Algorithm
- **Context**: The initial prototype used double SHA-256 with a static salt string for quick prototyping without external C extension dependencies.
- **Decision**: Upgrade password hashing to NIST/OWASP-compliant PBKDF2-HMAC-SHA256 with random salt per user and 100,000 iterations (`pbkdf2:sha256:100000$salt$hash`), while preserving backward compatibility verification for legacy hashes.
- **Status**: Accepted & Implemented.

### ADR-002: Dynamic Environment API Base Resolution
- **Context**: `frontend/src/services/api.ts` initially contained hardcoded `http://127.0.0.1:8000` URLs, which break when deployed to public cloud URLs (Vercel CDN).
- **Decision**: Refactor `API_BASE` and `WS_BASE` to dynamically resolve `import.meta.env.VITE_API_BASE_URL` or window location, falling back to local defaults during local development.
- **Status**: Accepted & Implemented.

### ADR-003: Isolated Environment Mode for Test Execution
- **Context**: Running `pytest` fixtures while the master system was active caused socket port collisions (`[Errno 10048]`).
- **Decision**: Update `test_e2e.py` fixture to check `/api/health`. If the infrastructure is already active, the test suite reuses the active stack without spawning duplicate processes or killing running services.
- **Status**: Accepted & Implemented.

---

## Active & Resolved Blockers Log

| Blocker ID | Description | Severity | Resolution / Status |
| :--- | :--- | :---: | :--- |
| **BLK-01** | `gh` CLI installation stalled due to background UAC prompt session. | Low | Resolved. Terminated stuck background process, installed `gh.exe` v2.102.0 at `C:\Program Files\GitHub CLI\gh.exe`. |
| **BLK-02** | Hardcoded localhost URLs in React frontend. | Medium | Resolved. Made `API_BASE` and `WS_BASE` dynamic via `import.meta.env`. |
