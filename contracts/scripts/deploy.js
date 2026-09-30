const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);

  const CertificateNFT = await hre.ethers.getContractFactory("CertificateNFT");
  const certificateNft = await CertificateNFT.deploy(deployer.address);
  await certificateNft.waitForDeployment();

  const SkillProofNFT = await hre.ethers.getContractFactory("SkillProofNFT");
  const skillProofNft = await SkillProofNFT.deploy(deployer.address);
  await skillProofNft.waitForDeployment();

  const VerificationContract = await hre.ethers.getContractFactory("VerificationContract");
  const verificationContract = await VerificationContract.deploy(
    await certificateNft.getAddress(),
    await skillProofNft.getAddress()
  );
  await verificationContract.waitForDeployment();

  const Attendance = await hre.ethers.getContractFactory("Attendance");
  const attendanceContract = await Attendance.deploy(deployer.address);
  await attendanceContract.waitForDeployment();

  const deployment = {
    network: hre.network.name,
    deployer: deployer.address,
    certificateNft: await certificateNft.getAddress(),
    skillProofNft: await skillProofNft.getAddress(),
    verificationContract: await verificationContract.getAddress(),
    attendanceContract: await attendanceContract.getAddress(),
  };

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, `${hre.network.name}.json`),
    JSON.stringify(deployment, null, 2)
  );

  console.log("CertificateNFT:", deployment.certificateNft);
  console.log("SkillProofNFT:", deployment.skillProofNft);
  console.log("VerificationContract:", deployment.verificationContract);
  console.log("Attendance:", deployment.attendanceContract);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
