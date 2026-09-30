# DAuth — Decentralized Academic Identity & Credential Verification

DAuth lets students own their academic identity through a MetaMask wallet. University staff issue non-transferable academic certificates and skill proofs; recruiters can verify public credentials without trusting a university database.

## Architecture

```text
client (React + Vite) ── wallet signatures/JWT ──> server (Express + MongoDB)
                                                        │
                              Pinata IPFS <─────────────┼── certificate PDFs and metadata
                                                        │
                              Polygon Amoy <────────────└── soulbound NFTs and attendance hashes
```

The maintained DAuth application is in `client/`, `server/`, and `contracts/`. Older attendance-only folders remain in the repository for backwards compatibility.

## Features

- Wallet sign-message authentication with expiring nonces and JWT sessions
- Role-based student, admin, teacher, and recruiter access
- Soulbound ERC-721 academic certificates and skill proof NFTs
- IPFS/Pinata storage for PDF evidence and NFT metadata
- Immutable on-chain attendance hashes with signed attendance challenges
- Public `/verify` page, QR links, public profiles, and recruiter search
- Rate limiting, Helmet, input validation, and environment-based configuration

## Quick start

Prerequisites: Node.js 18+, MongoDB (or the development in-memory fallback), MetaMask, and an RPC endpoint for chain-backed issuance.

```bash
cp server/.env.example server/.env
cd server && npm install && npm run dev
```

In a second terminal:

```bash
cd client && npm install && npm run dev
```

Open the Vite URL (normally `http://localhost:5173`). For local development without deployed contracts, wallet login and off-chain views work; issuance, attendance anchoring, and on-chain verification correctly report that chain configuration is required.

## Full local blockchain demo

Start MongoDB first so seeded data persists. Then use three terminals:

```bash
cd contracts && npm install && npx hardhat node
```

```bash
cd contracts && npm run deploy:local
cp server/.env.local.example server/.env
cd server && npm install && npm run dev
```

```bash
cd client && npm install && npm run dev
```

The API seeds a real on-chain credential when `SEED_DEMO=true`. Verify it at `http://localhost:5173/verify/DAUTH-2026-042-BTECH`. Import Hardhat account #0 into MetaMask only for local admin demonstration; the supplied private key is public and must never be used outside the local network.

## Smart contracts

```bash
cd contracts
npm install
npm run compile
npm run deploy:amoy
```

Copy the emitted addresses from `contracts/deployments/amoy.json` into `server/.env`:

- `CERTIFICATE_NFT_ADDRESS`
- `SKILL_PROOF_NFT_ADDRESS`
- `VERIFICATION_CONTRACT_ADDRESS`
- `ATTENDANCE_CONTRACT_ADDRESS`

Set `CHAIN_RPC_URL` to a Polygon Amoy RPC endpoint and `CHAIN_PRIVATE_KEY` to the university issuer wallet. Add that wallet to `ADMIN_WALLETS`. MetaMask users should add Polygon Amoy (chain ID `80002`) before viewing minted assets.

## Environment variables

See `server/.env.example` for the full list. Production requires a strong `JWT_SECRET`, MongoDB connection string, contract addresses, Polygon RPC URL, issuer private key, and a Pinata JWT. `ADMIN_WALLETS` and `RECRUITER_WALLETS` are comma-separated wallet allowlists; a user cannot self-assign either role.

## Key flows

1. A student connects MetaMask, receives a login nonce, signs it, and gets a session token.
2. An admin registers/approves a student, uploads a certificate PDF, then the API uploads metadata to IPFS and mints the soulbound certificate NFT.
3. A teacher/admin creates an attendance session. The student signs an expiring, server-stored attendance challenge; the resulting immutable hash is anchored on-chain.
4. Anyone uses `/verify` with a wallet, roll number, or certificate token ID. The service verifies ownership and validity against contract state before presenting a credential as valid.

## Project layout

```text
client/       React dashboard and public verification interface
server/       Express API, Mongoose models, wallet auth, IPFS and chain services
contracts/    Hardhat Solidity contracts and deployment script
```

## Verification

```bash
cd client && npm run build && npm run lint
cd ../server && npm run check
cd ../contracts && npm run compile
```
