// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title MerkleTreeHelper
 * @notice Pure Solidity helper to generate Merkle roots and proofs matching OpenZeppelin MerkleProof.
 */
contract MerkleTreeHelper {
    function hashLeaf(address account) public pure returns (bytes32) {
        return keccak256(abi.encode(account));
    }

    function hashPair(bytes32 a, bytes32 b) public pure returns (bytes32) {
        return a < b ? keccak256(abi.encodePacked(a, b)) : keccak256(abi.encodePacked(b, a));
    }

    function getRoot(bytes32[] memory leaves) public pure returns (bytes32) {
        uint256 n = leaves.length;
        if (n == 0) return bytes32(0);
        bytes32[] memory current = new bytes32[](n);
        for (uint256 i = 0; i < n; i++) {
            current[i] = leaves[i];
        }

        while (n > 1) {
            uint256 nextN = (n + 1) / 2;
            for (uint256 i = 0; i < n; i += 2) {
                if (i + 1 < n) {
                    current[i / 2] = hashPair(current[i], current[i + 1]);
                } else {
                    current[i / 2] = current[i];
                }
            }
            n = nextN;
        }
        return current[0];
    }

    function getProof(bytes32[] memory leaves, uint256 index) public pure returns (bytes32[] memory) {
        uint256 n = leaves.length;
        require(index < n, "Index out of bounds");
        if (n <= 1) {
            return new bytes32[](0);
        }

        bytes32[] memory current = new bytes32[](n);
        for (uint256 i = 0; i < n; i++) {
            current[i] = leaves[i];
        }

        uint256 maxDepth = 0;
        uint256 temp = n;
        while (temp > 1) {
            temp = (temp + 1) / 2;
            maxDepth++;
        }

        bytes32[] memory proof = new bytes32[](maxDepth);
        uint256 pIdx = 0;
        uint256 currentIndex = index;

        while (n > 1) {
            uint256 sibling = (currentIndex % 2 == 0) ? currentIndex + 1 : currentIndex - 1;
            if (sibling < n) {
                proof[pIdx++] = current[sibling];
            }
            currentIndex = currentIndex / 2;
            uint256 nextN = (n + 1) / 2;
            for (uint256 i = 0; i < n; i += 2) {
                if (i + 1 < n) {
                    current[i / 2] = hashPair(current[i], current[i + 1]);
                } else {
                    current[i / 2] = current[i];
                }
            }
            n = nextN;
        }

        bytes32[] memory exactProof = new bytes32[](pIdx);
        for (uint256 i = 0; i < pIdx; i++) {
            exactProof[i] = proof[i];
        }
        return exactProof;
    }
}
