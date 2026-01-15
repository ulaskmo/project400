// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CredentialRegistry {
    enum CredentialStatus {
        Valid,
        Revoked,
        Expired
    }

    struct CredentialRecord {
        string issuerDid;
        string holderDid;
        string ipfsHash;
        string signature;
        CredentialStatus status;
        uint256 issuedAt;
        uint256 revokedAt;
        bool exists;
    }

    mapping(string => CredentialRecord) private credentials;

    event CredentialRegistered(
        string credentialId,
        string issuerDid,
        string holderDid,
        string ipfsHash,
        string signature,
        uint256 issuedAt
    );
    event CredentialRevoked(string credentialId, uint256 revokedAt);

    function registerCredential(
        string calldata credentialId,
        string calldata issuerDid,
        string calldata holderDid,
        string calldata ipfsHash,
        string calldata signature
    ) external {
        require(bytes(credentialId).length > 0, "Credential ID required");
        require(!credentials[credentialId].exists, "Credential already registered");

        credentials[credentialId] = CredentialRecord({
            issuerDid: issuerDid,
            holderDid: holderDid,
            ipfsHash: ipfsHash,
            signature: signature,
            status: CredentialStatus.Valid,
            issuedAt: block.timestamp,
            revokedAt: 0,
            exists: true
        });

        emit CredentialRegistered(
            credentialId,
            issuerDid,
            holderDid,
            ipfsHash,
            signature,
            block.timestamp
        );
    }

    function revokeCredential(string calldata credentialId) external {
        CredentialRecord storage record = credentials[credentialId];
        require(record.exists, "Credential not found");
        require(record.status == CredentialStatus.Valid, "Credential not active");

        record.status = CredentialStatus.Revoked;
        record.revokedAt = block.timestamp;

        emit CredentialRevoked(credentialId, block.timestamp);
    }

    function getCredential(string calldata credentialId)
        external
        view
        returns (
            string memory issuerDid,
            string memory holderDid,
            string memory ipfsHash,
            string memory signature,
            CredentialStatus status,
            uint256 issuedAt,
            uint256 revokedAt
        )
    {
        CredentialRecord storage record = credentials[credentialId];
        require(record.exists, "Credential not found");

        return (
            record.issuerDid,
            record.holderDid,
            record.ipfsHash,
            record.signature,
            record.status,
            record.issuedAt,
            record.revokedAt
        );
    }
}
