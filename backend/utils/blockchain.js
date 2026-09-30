import { ethers } from "ethers";

const attendanceRegistryAbi = [
  "function recordProof(bytes32 proofHash, address student, string sessionId, string registrationNumber, string subject) external",
  "function proofExists(bytes32 proofHash) external view returns (bool)",
  "event AttendanceProofRecorded(bytes32 indexed proofHash, address indexed student, string sessionId, string registrationNumber, string subject)",
];

const attendanceCertificateAbi = [
  "function mintCertificate(address student, bytes32 proofHash, string tokenURI) external returns (uint256)",
  "function tokenByProofHash(bytes32 proofHash) external view returns (uint256)",
  "event CertificateMinted(bytes32 indexed proofHash, uint256 indexed tokenId, address indexed student, string tokenURI)",
];

let cachedClient = null;

function getBlockchainConfig() {
  return {
    rpcUrl: process.env.CHAIN_RPC_URL || "",
    privateKey: process.env.CHAIN_PRIVATE_KEY || "",
    registryAddress: process.env.ATTENDANCE_REGISTRY_ADDRESS || "",
    certificateAddress: process.env.ATTENDANCE_CERTIFICATE_ADDRESS || "",
  };
}

function getDataUri(payload) {
  return `data:application/json;base64,${Buffer.from(JSON.stringify(payload)).toString("base64")}`;
}

function getBlockchainClient() {
  const config = getBlockchainConfig();
  if (!config.rpcUrl || !config.privateKey || !config.registryAddress) {
    return null;
  }

  if (
    cachedClient &&
    cachedClient.config.rpcUrl === config.rpcUrl &&
    cachedClient.config.privateKey === config.privateKey &&
    cachedClient.config.registryAddress === config.registryAddress &&
    cachedClient.config.certificateAddress === config.certificateAddress
  ) {
    return cachedClient;
  }

  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const signer = new ethers.Wallet(config.privateKey, provider);
  cachedClient = {
    config,
    provider,
    signer,
    registry: new ethers.Contract(config.registryAddress, attendanceRegistryAbi, signer),
    certificate: config.certificateAddress
      ? new ethers.Contract(config.certificateAddress, attendanceCertificateAbi, signer)
      : null,
  };
  return cachedClient;
}

export async function anchorAttendanceProof(attendanceRecord, session) {
  const client = getBlockchainClient();
  if (!client) {
    return {
      status: "skipped",
      anchored: false,
      reason: "Blockchain configuration missing",
      chainId: null,
      txHash: null,
    };
  }

  if (attendanceRecord.blockchain?.anchorStatus === "anchored" && attendanceRecord.blockchain?.anchorTxHash) {
    return {
      status: "anchored",
      anchored: true,
      chainId: attendanceRecord.blockchain.anchorChainId || null,
      txHash: attendanceRecord.blockchain.anchorTxHash,
    };
  }

  const proofExists = await client.registry.proofExists(attendanceRecord.proofHash);
  if (proofExists) {
    const network = await client.provider.getNetwork();
    return {
      status: "anchored",
      anchored: true,
      chainId: Number(network.chainId),
      txHash: attendanceRecord.blockchain?.anchorTxHash || null,
      receipt: null,
    };
  }

  const tx = await client.registry.recordProof(
    attendanceRecord.proofHash,
    attendanceRecord.walletAddress,
    session.sessionId,
    attendanceRecord.registrationNumber,
    attendanceRecord.subject
  );
  const receipt = await tx.wait();
  const network = await client.provider.getNetwork();

  return {
    status: "anchored",
    anchored: true,
    chainId: Number(network.chainId),
    txHash: tx.hash,
    receipt,
  };
}

export async function mintAttendanceCertificate(attendanceRecord, session) {
  const client = getBlockchainClient();
  if (!client || !client.certificate) {
    throw new Error("Attendance certificate contract is not configured");
  }

  const existingTokenId = await client.certificate.tokenByProofHash(attendanceRecord.proofHash);
  if (existingTokenId && existingTokenId.toString() !== "0") {
    return {
      txHash: attendanceRecord.blockchain?.certificateTxHash || null,
      tokenId: existingTokenId.toString(),
      tokenUri: attendanceRecord.blockchain?.certificateTokenUri || null,
    };
  }

  const certificateName = `${attendanceRecord.subject} Attendance Certificate`;
  const tokenUri = getDataUri({
    name: certificateName,
    description: `Attendance certificate for ${attendanceRecord.subject} (${session.sessionId})`,
    image: "https://placehold.co/600x600/101828/ffffff?text=Attendance+Certificate",
    attributes: [
      { trait_type: "Subject", value: attendanceRecord.subject },
      { trait_type: "Session ID", value: session.sessionId },
      { trait_type: "Registration Number", value: attendanceRecord.registrationNumber },
      { trait_type: "Wallet", value: attendanceRecord.walletAddress },
      { trait_type: "Issued At", value: attendanceRecord.timestamp.toISOString() },
      { trait_type: "Proof Hash", value: attendanceRecord.proofHash },
    ],
  });

  const tx = await client.certificate.mintCertificate(
    attendanceRecord.walletAddress,
    attendanceRecord.proofHash,
    tokenUri
  );
  const receipt = await tx.wait();
  let tokenId = null;

  for (const log of receipt.logs || []) {
    try {
      const parsed = client.certificate.interface.parseLog(log);
      if (parsed?.name === "CertificateMinted") {
        tokenId = parsed.args?.tokenId?.toString() || null;
        break;
      }
    } catch {
      // ignore unrelated logs
    }
  }

  return {
    txHash: tx.hash,
    tokenId,
    tokenUri,
  };
}
