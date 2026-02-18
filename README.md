# Web3 Attendance System

A full-stack attendance application that uses **MetaMask** for identity verification. Students sign a one-time message to prove wallet ownership; no passwords or private keys are stored. The system is academic and practical: no blockchain writes and no smart contracts.

---

## Problem

Traditional attendance can be gamed (e.g. proxy attendance). This project ties attendance to a **cryptographic signature** from the student’s wallet:

- Each student connects MetaMask and signs a unique message (nonce + session + time).
- The backend verifies the signature with `ethers.verifyMessage` and records attendance only if the signer matches the claimed wallet.
- One wallet and one registration number per session, with a short time window for the nonce, reduce proxy and replay abuse.

---

## Architecture

```
┌─────────────────┐     REST + JSON      ┌─────────────────┐     ┌──────────────┐
│  React (Vite)   │ ◄──────────────────► │  Express API    │ ◄──►│   MongoDB    │
│  MetaMask       │   request-nonce      │  (validation,   │     │  Attendance  │
│  ethers.js      │   verify             │   rate limit)   │     │  Sessions    │
└─────────────────┘                      └─────────────────┘     │  AuditLog    │
                                                                 └──────────────┘
```

- **Frontend:** React + Vite. Form (campus, branch, section, reg no) → Connect Wallet → Mark Attendance (nonce → sign → verify).
- **Backend:** Node.js + Express. REST APIs with validation and rate limiting. No private keys; only verification of signatures.
- **Database:** MongoDB. Stores attendance records, session metadata, temporary nonces (with TTL), and audit logs.

---

## Flow

1. **Admin** creates an active session (e.g. via Admin dashboard). Attendance is only allowed during an active session.
2. **Student** opens the Attendance page, selects campus/branch/section, enters registration number, and clicks “Connect Wallet”.
3. After MetaMask connects, student clicks **“Mark Attendance”**.
4. Frontend calls **POST /api/attendance/request-nonce** with `registrationNumber`, `campus`, `branch`, `section`, `walletAddress`.
5. Backend checks: active session, time window, no duplicate wallet or reg number for this session. Then it generates a **nonce** and builds a **message** like:  
   `"I confirm my attendance for Session ID XYZ at 2025-02-18T10:00:00.000Z"`.  
   Message + nonce expiry (e.g. 2 minutes) are stored temporarily.
6. Frontend asks the user to **sign that message** in MetaMask (`signer.signMessage(messageToSign)`).
7. Frontend calls **POST /api/attendance/verify** with `nonce`, `signature`, `walletAddress`, `registrationNumber`.
8. Backend:
   - Loads the stored nonce and message.
   - Verifies **signature** with `ethers.verifyMessage(messageToSign, signature)` and checks recovered address matches `walletAddress`.
   - Checks nonce not expired, session still active, and no duplicate wallet/reg number.
   - Saves an **attendance record** and logs the attempt in the **audit log**.
9. Frontend shows success or a clear error (wallet not connected, invalid signature, already marked, time window expired, etc.).

---

## How Proxy Attendance Is Prevented

- **One wallet per session:** A wallet can mark attendance only once per session; duplicate attempts are rejected and logged.
- **One registration number per session:** A registration number cannot be reused in the same session.
- **Signature binding:** The message includes session ID and timestamp; the backend verifies that the signature was produced by the claimed `walletAddress` for that exact message. Someone else cannot sign on behalf of the student without access to that wallet.
- **Short nonce window:** The nonce (and thus the valid signature window) expires in a few minutes, limiting replay and delayed misuse.
- **Audit log:** Every request (success and failure) is logged with action, wallet, reg number, and reason, so suspicious patterns can be reviewed.

No data is stored on a blockchain; the blockchain is used only for **identity verification** (proving ownership of a wallet via signing).

---

## Setup

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- MetaMask (or another Ethereum wallet) in the browser

### Backend

```bash
cd backend
cp ../.env.example .env
# Edit .env: set MONGODB_URI and optionally PORT
npm install
npm run dev
```

Server runs at `http://localhost:5000` (or your `PORT`).

### Frontend

```bash
cd frontend/frontend
# Optional: create .env with VITE_API_URL=http://localhost:5000
npm install
npm run dev
```

Open the URL shown by Vite (e.g. `http://localhost:5173`).

### First run

1. Open **Admin** → **Create new session** so an active session exists.
2. Open **Mark Attendance**, fill the form, connect MetaMask, and click **Mark Attendance**. Sign the message in MetaMask when prompted.

---

## Environment variables (sample)

See `.env.example`:

- **Backend:** `PORT`, `MONGODB_URI`.
- **Frontend:** `VITE_API_URL` (optional; defaults to `http://localhost:5000`).

Keep secrets in `.env`; do not commit `.env` to version control.

---

## API summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/session/active` | Current active session (if any) |
| POST | `/api/attendance/request-nonce` | Get nonce and message to sign (body: registrationNumber, campus, branch, section, walletAddress) |
| POST | `/api/attendance/verify` | Verify signature and record attendance (body: nonce, signature, walletAddress, registrationNumber) |
| GET | `/api/admin/sessions` | List sessions |
| POST | `/api/admin/sessions` | Create a new session |
| GET | `/api/admin/attendance` | List attendance (query: campus, branch, section, sessionId) |
| GET | `/api/admin/attendance/export` | Export attendance as CSV (same query params) |
| GET | `/api/admin/audit` | Recent audit log (query: limit) |

---

## Project structure

```
PBL/
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── middleware/
│   │   ├── rateLimit.js
│   │   └── validate.js
│   ├── models/
│   │   ├── AttendanceRecord.js
│   │   ├── AuditLog.js
│   │   ├── NonceStore.js
│   │   └── SessionMetadata.js
│   ├── routes/
│   │   ├── attendance.js
│   │   └── admin.js
│   ├── utils/
│   │   └── audit.js
│   └── server.js
├── frontend/
│   └── frontend/
│       └── src/
│           ├── api.js
│           ├── App.jsx
│           ├── pages/
│           │   ├── AttendancePage.jsx
│           │   └── AdminPage.jsx
│           └── main.jsx
├── .env.example
└── README.md
```

---

## Security notes

- **Input validation:** All attendance inputs (campus, branch, section, reg number, wallet address) are validated on the backend.
- **Rate limiting:** Attendance endpoints are rate-limited per IP to reduce abuse.
- **No private keys:** The server never sees or stores private keys; it only verifies signatures.
- **Audit:** Every attempt is logged for review.

---

## Constraints (as required)

- **No blockchain storage** – nothing is written to a blockchain.
- **No smart contracts** – only off-chain backend + MetaMask signing.
- **Blockchain used only for identity** – proving wallet ownership via signature verification.
