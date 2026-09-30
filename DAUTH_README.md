# DAuth - Decentralized Academic Identity Platform

DAuth is a production-style MERN + Web3 platform for academic identity.

## Modules

- MetaMask wallet authentication
- Role-based access: `student`, `teacher`, `admin`
- Attendance sessions with signature-based marking
- Soulbound certificate NFTs
- Skill proof NFTs
- Public profile + recruiter view
- Wallet verification page
- IPFS uploads via Pinata
- Certificate PDF export

## Folder Structure

```text
/client
/server
/contracts
/utils
```

## Smart Contracts

- [CertificateNFT.sol](/Users/aakash/Documents/PBL/contracts/contracts/CertificateNFT.sol)
- [SkillProofNFT.sol](/Users/aakash/Documents/PBL/contracts/contracts/SkillProofNFT.sol)
- [VerificationContract.sol](/Users/aakash/Documents/PBL/contracts/contracts/VerificationContract.sol)

## Backend APIs

### Auth

- `POST /api/login`
  - body: `{ walletAddress, role }` to request challenge
  - body: `{ walletAddress, role, nonce, signature }` to verify and issue token

### Attendance

- `POST /api/sessions`
- `GET /api/sessions/live`
- `POST /api/mark-attendance`
- `GET /api/attendance/:wallet`

### Certificates

- `POST /api/issue-certificate`
- `GET /api/certificates/:wallet`
- `GET /api/certificates/:wallet/:tokenId/pdf`

### Skills

- `POST /api/add-skill`
- `GET /api/skills/:wallet`

### Verification

- `GET /api/verify/:wallet`
- `GET /api/profile/:wallet`

## Environment

### Server

Copy [server/.env.example](/Users/aakash/Documents/PBL/server/.env.example) to `.env`:

```bash
cd /Users/aakash/Documents/PBL/server
cp .env.example .env
```

Required:

- `MONGODB_URI`
- `JWT_SECRET`
- `CHAIN_RPC_URL`
- `CHAIN_PRIVATE_KEY`
- `CERTIFICATE_NFT_ADDRESS`
- `SKILL_PROOF_NFT_ADDRESS`
- `VERIFICATION_CONTRACT_ADDRESS`
- `PINATA_JWT`

### Client

Copy [client/.env.example](/Users/aakash/Documents/PBL/client/.env.example) to `.env`:

```bash
cd /Users/aakash/Documents/PBL/client
cp .env.example .env
```

## Setup

### 1. Install dependencies

```bash
cd /Users/aakash/Documents/PBL/server && npm install
cd /Users/aakash/Documents/PBL/client && npm install
cd /Users/aakash/Documents/PBL/contracts && npm install
```

### 2. Compile contracts

```bash
cd /Users/aakash/Documents/PBL/contracts
npx hardhat compile
```

### 3. Deploy contracts

```bash
cd /Users/aakash/Documents/PBL/contracts
npx hardhat run scripts/deploy.js --network amoy
```

Deployment addresses are written to `contracts/deployments/<network>.json`.

### 4. Run server

```bash
cd /Users/aakash/Documents/PBL/server
npm run dev
```

### 5. Run client

```bash
cd /Users/aakash/Documents/PBL/client
npm run dev
```

## Product Flow

### Student

1. Login with MetaMask
2. Mark attendance by signing session message
3. View attendance, skills, and certificates on dashboard
4. Share public profile / recruiter page

### Teacher

1. Login with teacher wallet
2. Create live attendance session
3. Upload project/hackathon proof and mint skill NFT

### Admin

1. Login with admin wallet
2. Issue degree certificate NFT
3. Share PDF and public profile verification

## Notes

- Certificate NFTs are soulbound and non-transferable
- Skill NFTs are verifiable academic proof records
- Verification is read-only and contract-backed
- Attendance hash is stored off-chain by default to keep gas low
