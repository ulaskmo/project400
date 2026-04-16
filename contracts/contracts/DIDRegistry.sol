// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DIDRegistry {
    struct DIDRecord {
        address controller;
        string publicKey;
        uint256 createdAt;
        bool exists;
    }

    mapping(string => DIDRecord) private dids;

    event DIDRegistered(string indexed did, address indexed controller, string publicKey, uint256 createdAt);

    function registerDID(string calldata did, string calldata publicKey) external {
        require(bytes(did).length > 0, "DID required");
        require(!dids[did].exists, "DID already registered");

        dids[did] = DIDRecord({
            controller: msg.sender,
            publicKey: publicKey,
            createdAt: block.timestamp,
            exists: true
        });

        emit DIDRegistered(did, msg.sender, publicKey, block.timestamp);
    }

    function getDID(string calldata did)
        external
        view
        returns (address controller, string memory publicKey, uint256 createdAt)
    {
        DIDRecord storage record = dids[did];
        require(record.exists, "DID not found");

        return (record.controller, record.publicKey, record.createdAt);
    }
}
