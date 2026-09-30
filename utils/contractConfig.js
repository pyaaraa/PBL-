export const certificateNftAbi = [
  "function mintCertificate(address to, string tokenURI, string degreeName, string universityName, uint256 issueDate) external returns (uint256)",
  "function tokensOfOwner(address owner) external view returns (uint256[] memory)",
  "function getCertificate(uint256 tokenId) external view returns (address student, string degreeName, string universityName, uint256 issueDate, string tokenURI, bool valid)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
];

export const skillProofNftAbi = [
  "function mintSkill(address to, string tokenURI, string title, string description, string proofURI) external returns (uint256)",
  "function tokensOfOwner(address owner) external view returns (uint256[] memory)",
  "function getSkill(uint256 tokenId) external view returns (address student, string title, string description, string proofURI, string tokenURI, bool valid)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
];

export const verificationAbi = [
  "function verifyCertificate(address wallet, uint256 tokenId) external view returns (bool ownsCertificate, bool isValid)",
  "function verifySkill(address wallet, uint256 tokenId) external view returns (bool ownsSkill, bool isValid)",
];
