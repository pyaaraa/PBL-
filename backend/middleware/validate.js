
const CAMPUSES = ["Main Campus", "North Campus", "South Campus"];
const BRANCHES = ["CSE", "Cyber Security", "AI & ML", "Data Science"];
const SECTIONS = ["Section A", "Section B", "Section C"];

const REG_NUMBER_REGEX = /^[A-Za-z0-9]{1,15}$/;

export function validateRequestNonce(req, res, next) {
  const { registrationNumber, campus, branch, section, walletAddress } = req.body || {};
  const errors = [];

  if (!registrationNumber || typeof registrationNumber !== "string") {
    errors.push("registrationNumber is required");
  } else {
    const trimmed = registrationNumber.trim().toUpperCase();
    if (!REG_NUMBER_REGEX.test(trimmed)) {
      errors.push("registrationNumber must be alphanumeric, max 15 characters");
    }
    req.body.registrationNumber = trimmed;
  }

  if (!CAMPUSES.includes(campus)) errors.push("Invalid campus");
  if (!BRANCHES.includes(branch)) errors.push("Invalid branch");
  if (!SECTIONS.includes(section)) errors.push("Invalid section");

  if (!walletAddress || typeof walletAddress !== "string") {
    errors.push("walletAddress is required");
  }

  if (errors.length) {
    return res.status(400).json({ error: "Validation failed", details: errors });
  }
  next();
}

export function validateVerify(req, res, next) {
  const { nonce, signature, walletAddress, registrationNumber } = req.body || {};
  const errors = [];

  if (!nonce || typeof nonce !== "string") errors.push("nonce is required");
  if (!signature || typeof signature !== "string") errors.push("signature is required");
  if (!walletAddress || typeof walletAddress !== "string") errors.push("walletAddress is required");
  if (!registrationNumber || typeof registrationNumber !== "string") {
    errors.push("registrationNumber is required");
  } else if (!REG_NUMBER_REGEX.test(registrationNumber.trim())) {
    errors.push("registrationNumber must be alphanumeric, max 15 characters");
  }

  if (errors.length) {
    return res.status(400).json({ error: "Validation failed", details: errors });
  }
  next();
}
