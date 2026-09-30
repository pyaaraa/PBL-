// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract CertificateNFT is ERC721URIStorage, Ownable {
    struct CertificateData {
        address student;
        string certificateId;
        bytes32 contentHash;
        string degreeName;
        string universityName;
        uint256 issueDate;
        bool valid;
    }

    uint256 private _nextTokenId = 1;
    mapping(uint256 => CertificateData) private _certificates;
    mapping(bytes32 => uint256) private _tokenByCertificateId;
    mapping(address => uint256[]) private _ownedTokens;

    event CertificateIssued(
        uint256 indexed tokenId,
        address indexed student,
        string certificateId,
        bytes32 contentHash,
        string degreeName,
        string universityName,
        string tokenURI
    );

    event CertificateRevoked(uint256 indexed tokenId, string reason);

    constructor(address initialOwner) ERC721("DAuth Academic Certificate", "DAUTHCERT") Ownable() {
        transferOwnership(initialOwner);
    }

    function mintCertificate(
        address to,
        string calldata tokenURI_,
        string calldata certificateId,
        bytes32 contentHash,
        string calldata degreeName,
        string calldata universityName,
        uint256 issueDate
    ) external onlyOwner returns (uint256) {
        require(to != address(0), "invalid student");
        require(bytes(certificateId).length > 0, "certificate id required");
        require(_tokenByCertificateId[keccak256(bytes(certificateId))] == 0, "certificate id exists");

        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);

        _certificates[tokenId] = CertificateData({
            student: to,
            certificateId: certificateId,
            contentHash: contentHash,
            degreeName: degreeName,
            universityName: universityName,
            issueDate: issueDate,
            valid: true
        });
        _ownedTokens[to].push(tokenId);
        _tokenByCertificateId[keccak256(bytes(certificateId))] = tokenId;

        emit CertificateIssued(tokenId, to, certificateId, contentHash, degreeName, universityName, tokenURI_);
        return tokenId;
    }

    function revokeCertificate(uint256 tokenId, string calldata reason) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "token missing");
        _certificates[tokenId].valid = false;
        emit CertificateRevoked(tokenId, reason);
    }

    function tokensOfOwner(address owner) external view returns (uint256[] memory) {
        return _ownedTokens[owner];
    }

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
        )
    {
        CertificateData memory certificate = _certificates[tokenId];
        return (
            certificate.student,
            certificate.degreeName,
            certificate.universityName,
            certificate.issueDate,
            tokenURI(tokenId),
            certificate.valid
        );
    }

    function tokenIdForCertificateId(string calldata certificateId) external view returns (uint256) {
        return _tokenByCertificateId[keccak256(bytes(certificateId))];
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId,
        uint256 batchSize
    ) internal virtual override {
        super._beforeTokenTransfer(from, to, firstTokenId, batchSize);
        require(from == address(0) || to == address(0), "certificate is soulbound");
    }

    function approve(address, uint256) public pure override(ERC721, IERC721) {
        revert("certificate is soulbound");
    }

    function setApprovalForAll(address, bool) public pure override(ERC721, IERC721) {
        revert("certificate is soulbound");
    }
}
