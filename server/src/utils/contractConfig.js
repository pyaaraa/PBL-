export const certificateNftAbi = [
  "event CertificateIssued(uint256 indexed tokenId, address indexed student, string certificateId, bytes32 contentHash, string degreeName, string universityName, string tokenURI)",
  "event CertificateRevoked(uint256 indexed tokenId, string reason)",
  "function mintCertificate(address to, string tokenURI, string certificateId, bytes32 contentHash, string degreeName, string universityName, uint256 issueDate) external returns (uint256)",
  "function revokeCertificate(uint256 tokenId, string reason) external",
  "function tokenIdForCertificateId(string certificateId) external view returns (uint256)",
  "function tokensOfOwner(address owner) external view returns (uint256[] memory)",
  "function getCertificate(uint256 tokenId) external view returns (address student, string degreeName, string universityName, uint256 issueDate, string tokenURI, bool valid)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
];

export const skillProofNftAbi = [
  "event SkillIssued(uint256 indexed tokenId, address indexed student, string title, string proofURI, string tokenURI)",
  "function mintSkill(address to, string tokenURI, string title, string description, string proofURI) external returns (uint256)",
  "function tokensOfOwner(address owner) external view returns (uint256[] memory)",
  "function getSkill(uint256 tokenId) external view returns (address student, string title, string description, string proofURI, string tokenURI, bool valid)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
];

export const verificationAbi = [
  "function verifyCertificate(address wallet, uint256 tokenId) external view returns (bool ownsCertificate, bool isValid)",
  "function verifySkill(address wallet, uint256 tokenId) external view returns (bool ownsSkill, bool isValid)",
];

export const attendanceAbi = [
  "function recordAttendance(address student, string courseCode, uint256 sessionDate, string status, string attendanceHash) external",
  "function getAttendance(string attendanceHash) external view returns (address student, string courseCode, uint256 sessionDate, string status, uint256 timestamp, bool exists)",
  "function getStudentAttendanceHashes(address student) external view returns (string[] memory)",
];
