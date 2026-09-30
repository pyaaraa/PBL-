// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ICertificateNFT {
    function ownerOf(uint256 tokenId) external view returns (address);
    function getCertificate(uint256 tokenId)
        external
        view
        returns (
            address student,
            string memory degreeName,
            string memory universityName,
            uint256 issueDate,
            string memory metadataURI,
            bool valid
        );
}

interface ISkillProofNFT {
    function ownerOf(uint256 tokenId) external view returns (address);
    function getSkill(uint256 tokenId)
        external
        view
        returns (
            address student,
            string memory title,
            string memory description,
            string memory proofURI,
            string memory metadataURI,
            bool valid
        );
}

contract VerificationContract {
    ICertificateNFT public immutable certificateContract;
    ISkillProofNFT public immutable skillContract;

    constructor(address certificateAddress, address skillAddress) {
        certificateContract = ICertificateNFT(certificateAddress);
        skillContract = ISkillProofNFT(skillAddress);
    }

    function verifyCertificate(address wallet, uint256 tokenId)
        external
        view
        returns (bool ownsCertificate, bool isValid)
    {
        (
            address student,
            ,
            ,
            ,
            ,
            bool valid
        ) = certificateContract.getCertificate(tokenId);
        return (student == wallet && certificateContract.ownerOf(tokenId) == wallet, valid);
    }

    function verifySkill(address wallet, uint256 tokenId)
        external
        view
        returns (bool ownsSkill, bool isValid)
    {
        (
            address student,
            ,
            ,
            ,
            ,
            bool valid
        ) = skillContract.getSkill(tokenId);
        return (student == wallet && skillContract.ownerOf(tokenId) == wallet, valid);
    }
}
