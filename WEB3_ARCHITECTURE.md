# Decentralized Attendance Architecture

## Goal

Keep attendance logic in the backend, use wallets for identity and signatures, and store only cryptographic proof plus NFT certificates on-chain.

## High-Level Architecture

### Frontend

- React + Vite UI
- MetaMask wallet connection
- Wallet login challenge signing
- Attendance signing flow
- Dashboard for history, proof status, and NFT claim

### Backend

- Express API
- MongoDB for sessions, attendance, audit logs, auth challenges, and off-chain state
- `ethers.js` signer for recording attendance proof on-chain
- NFT mint endpoint for eligible attendance records

### Blockchain

- `AttendanceRegistry.sol`
  - stores immutable attendance proof hashes
- `AttendanceCertificate.sol`
  - mints one NFT certificate per proof hash

## Product Flow

### 1. Wallet Authentication

1. Frontend requests `/api/auth/request-challenge`
2. Backend returns a nonce-based sign-in message
3. User signs message in MetaMask
4. Frontend sends signature to `/api/auth/verify`
5. Backend returns a short-lived signed auth token

### 2. Attendance Marking

1. Teacher starts a session
2. Student connects wallet and authenticates
3. Student requests attendance nonce from `/api/attendance/request-nonce`
4. Backend validates:
   - live session
   - class match
   - anti-replay nonce
   - wallet uniqueness
   - registration uniqueness
   - location/network constraints
5. Student signs the attendance message
6. Frontend sends signature to `/api/attendance/verify`
7. Backend stores attendance in MongoDB
8. Backend computes `proofHash`
9. Backend writes `proofHash` to `AttendanceRegistry`

### 3. NFT Certificate

1. Student opens dashboard/history
2. Student clicks `Claim NFT`
3. Frontend calls `/api/student/certificates/claim`
4. Backend verifies wallet-auth token
5. Backend checks anchored proof
6. Backend mints one NFT certificate on `AttendanceCertificate`

## Folder Structure

```text
PBL/
├── backend/
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── rateLimit.js
│   │   └── validate.js
│   ├── models/
│   │   ├── AttendanceRecord.js
│   │   ├── AuditLog.js
│   │   ├── AuthChallenge.js
│   │   ├── NonceStore.js
│   │   └── SessionMetadata.js
│   ├── routes/
│   │   ├── admin.js
│   │   ├── attendance.js
│   │   ├── auth.js
│   │   └── student.js
│   ├── utils/
│   │   ├── audit.js
│   │   ├── auth.js
│   │   ├── blockchain.js
│   │   └── session.js
│   └── server.js
├── contracts/
│   ├── contracts/
│   │   ├── AttendanceCertificate.sol
│   │   └── AttendanceRegistry.sol
│   ├── scripts/
│   │   └── deploy.js
│   ├── hardhat.config.js
│   └── package.json
├── frontend/frontend/src/
│   ├── api.js
│   ├── authStorage.js
│   ├── web3Auth.js
│   ├── profileStorage.js
│   └── pages/
│       ├── AttendancePage.jsx
│       ├── AdminPage.jsx
│       └── StudentDashboard.jsx
└── WEB3_ARCHITECTURE.md
```

## APIs

### Wallet Auth

- `POST /api/auth/request-challenge`
  - body: `{ walletAddress }`
- `POST /api/auth/verify`
  - body: `{ walletAddress, signature }`

### Attendance

- `GET /api/session/active`
- `POST /api/attendance/request-nonce`
  - body: `{ registrationNumber, campus, branch, section, walletAddress, location? }`
- `POST /api/attendance/verify`
  - body: `{ nonce, signature, walletAddress, registrationNumber, location? }`

### Admin

- `GET /api/admin/sessions`
- `POST /api/admin/sessions`
- `POST /api/admin/sessions/:sessionId/close`
- `GET /api/admin/attendance`
- `GET /api/admin/attendance/export`
- `GET /api/admin/audit`

### Student

- `GET /api/student/dashboard`
- `GET /api/student/history`
- `GET /api/student/history/export`
- `POST /api/student/certificates/claim`
  - auth: `Bearer <walletAuthToken>`
  - body: `{ proofHash }`

## Smart Contracts

### AttendanceRegistry

- only backend signer writes proofs
- one proof hash stored once
- immutable verification layer

### AttendanceCertificate

- one NFT per proof hash
- mint only if proof exists in registry
- metadata delivered as on-chain-compatible `data:` URI

## Implementation Order

### Phase 1

1. Deploy MongoDB + backend + frontend
2. Configure session flow
3. Enable wallet attendance signatures

### Phase 2

1. Deploy `AttendanceRegistry`
2. Set backend signer envs
3. Auto-anchor proof after attendance verify

### Phase 3

1. Deploy `AttendanceCertificate`
2. Enable certificate claim in dashboard
3. Surface token ID / tx hash in history

## Production Notes

- Use Polygon Amoy or Sepolia for test deployments
- Use Polygon mainnet only after gas + wallet policies are finalized
- Keep private key only on the backend or inside a secure signer service
- Move `data:` NFT metadata to IPFS if you want richer certificates later
- Add admin auth before production classroom rollout
