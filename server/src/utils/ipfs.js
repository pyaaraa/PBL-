import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const PINATA_JSON_ENDPOINT = "https://api.pinata.cloud/pinning/pinJSONToIPFS";
const PINATA_FILE_ENDPOINT = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_ROOT = path.resolve(__dirname, "..", "..", "storage", "ipfs");

function ensureStorageRoot() {
  fs.mkdirSync(STORAGE_ROOT, { recursive: true });
}

function createLocalCid() {
  return `local-${crypto.randomUUID()}`;
}

function getLocalGatewayBase() {
  const base = process.env.SERVER_PUBLIC_URL || `http://localhost:${process.env.PORT || 5050}`;
  return `${base}/beta/ipfs`;
}

function getPinataHeaders() {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    return null;
  }

  return { Authorization: `Bearer ${jwt}` };
}

function writeLocalJson(cid, payload) {
  ensureStorageRoot();
  const filePath = path.join(STORAGE_ROOT, `${cid}.json`);
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
  return {
    cid,
    url: `${getLocalGatewayBase()}/${cid}.json`,
    local: true,
  };
}

function writeLocalFile(cid, name, buffer) {
  ensureStorageRoot();
  const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileName = `${cid}-${safeName}`;
  const filePath = path.join(STORAGE_ROOT, fileName);
  fs.writeFileSync(filePath, buffer);
  return {
    cid,
    url: `${getLocalGatewayBase()}/${fileName}`,
    local: true,
  };
}

export async function uploadJsonToPinata(name, payload) {
  const authHeaders = getPinataHeaders();
  if (!authHeaders) {
    return writeLocalJson(createLocalCid(), payload);
  }

  const response = await fetch(PINATA_JSON_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({
      pinataMetadata: { name },
      pinataContent: payload,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Pinata JSON upload failed: ${text}`);
  }

  const data = await response.json();
  return {
    cid: data.IpfsHash,
    url: `${PINATA_GATEWAY}/${data.IpfsHash}`,
  };
}

export async function uploadFileToPinata({ name, contentType, buffer }) {
  const authHeaders = getPinataHeaders();
  if (!authHeaders) {
    return writeLocalFile(createLocalCid(), name, buffer);
  }

  const formData = new FormData();
  const file = new Blob([buffer], { type: contentType || "application/octet-stream" });
  formData.append("file", file, name);
  formData.append("pinataMetadata", JSON.stringify({ name }));

  const response = await fetch(PINATA_FILE_ENDPOINT, {
    method: "POST",
    headers: {
      ...authHeaders,
    },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Pinata file upload failed: ${text}`);
  }

  const data = await response.json();
  return {
    cid: data.IpfsHash,
    url: `${PINATA_GATEWAY}/${data.IpfsHash}`,
  };
}

export function ipfsUriFromCid(cid) {
  return `ipfs://${cid}`;
}
