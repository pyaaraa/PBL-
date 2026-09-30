const PINATA_JSON_ENDPOINT = "https://api.pinata.cloud/pinning/pinJSONToIPFS";
const PINATA_FILE_ENDPOINT = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs";

function getPinataHeaders() {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    throw new Error("PINATA_JWT is not configured");
  }

  return { Authorization: `Bearer ${jwt}` };
}

export async function uploadJsonToPinata(name, payload) {
  const response = await fetch(PINATA_JSON_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getPinataHeaders(),
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
  const formData = new FormData();
  const file = new Blob([buffer], { type: contentType || "application/octet-stream" });
  formData.append("file", file, name);
  formData.append("pinataMetadata", JSON.stringify({ name }));

  const response = await fetch(PINATA_FILE_ENDPOINT, {
    method: "POST",
    headers: {
      ...getPinataHeaders(),
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
