// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract GrindlyMembership is ERC721 {
    error IssuerOnly();
    error InvalidConfiguration();
    error InvalidIssuance();
    error IssuanceRecipientMismatch();

    address public immutable issuer;
    string private metadataBase;
    uint256 public totalIssued;
    mapping(bytes32 => uint256) public tokenForIssuance;
    mapping(bytes32 => address) public issuanceRecipient;
    mapping(uint256 => uint256) public ownershipEpoch;

    event MembershipIssued(bytes32 indexed issuanceKey, uint256 indexed tokenId, address indexed recipient);
    event OwnershipEpochChanged(uint256 indexed tokenId, uint256 epoch);

    constructor(address issuer_, string memory metadataBase_) ERC721("Grindly Membership", "GRINDLY") {
        bytes memory base = bytes(metadataBase_);
        if (issuer_ == address(0) || base.length == 0 || base[base.length - 1] != bytes1("/")) {
            revert InvalidConfiguration();
        }
        issuer = issuer_;
        metadataBase = metadataBase_;
    }

    function mint(address recipient, bytes32 issuanceKey) external returns (uint256 tokenId) {
        if (msg.sender != issuer) revert IssuerOnly();
        if (recipient == address(0) || issuanceKey == bytes32(0)) revert InvalidIssuance();
        tokenId = tokenForIssuance[issuanceKey];
        if (tokenId != 0) {
            if (issuanceRecipient[issuanceKey] != recipient) revert IssuanceRecipientMismatch();
            return tokenId;
        }
        tokenId = ++totalIssued;
        // Commit idempotency before the receiver callback can reenter.
        tokenForIssuance[issuanceKey] = tokenId;
        issuanceRecipient[issuanceKey] = recipient;
        _safeMint(recipient, tokenId);
        emit MembershipIssued(issuanceKey, tokenId, recipient);
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = super._update(to, tokenId, auth);
        // Self-transfers also invalidate previous epoch-bound approvals.
        emit OwnershipEpochChanged(tokenId, ++ownershipEpoch[tokenId]);
        return from;
    }

    function _baseURI() internal view override returns (string memory) {
        return metadataBase;
    }
}
