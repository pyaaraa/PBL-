// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract SkillProofNFT is ERC721URIStorage, Ownable {
    struct SkillData {
        address student;
        string title;
        string description;
        string proofURI;
        bool valid;
    }

    uint256 private _nextTokenId = 1;
    mapping(uint256 => SkillData) private _skills;
    mapping(address => uint256[]) private _ownedTokens;

    event SkillIssued(
        uint256 indexed tokenId,
        address indexed student,
        string title,
        string proofURI,
        string tokenURI
    );

    event SkillRevoked(uint256 indexed tokenId);

    constructor(address initialOwner) ERC721("DAuth Skill Proof", "DAUTHSKILL") Ownable() {
        transferOwnership(initialOwner);
    }

    function mintSkill(
        address to,
        string calldata tokenURI_,
        string calldata title,
        string calldata description,
        string calldata proofURI
    ) external onlyOwner returns (uint256) {
        require(to != address(0), "invalid student");

        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);

        _skills[tokenId] = SkillData({
            student: to,
            title: title,
            description: description,
            proofURI: proofURI,
            valid: true
        });
        _ownedTokens[to].push(tokenId);

        emit SkillIssued(tokenId, to, title, proofURI, tokenURI_);
        return tokenId;
    }

    function revokeSkill(uint256 tokenId) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "token missing");
        _skills[tokenId].valid = false;
        emit SkillRevoked(tokenId);
    }

    function tokensOfOwner(address owner) external view returns (uint256[] memory) {
        return _ownedTokens[owner];
    }

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
        )
    {
        SkillData memory skill = _skills[tokenId];
        return (
            skill.student,
            skill.title,
            skill.description,
            skill.proofURI,
            tokenURI(tokenId),
            skill.valid
        );
    }
}
