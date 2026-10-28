// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {QuadraticFundingRound} from "../../src/QuadraticFundingRound.sol";

contract ReentrantRecipient {
    QuadraticFundingRound public round;
    uint256 public projectId;
    uint256 public attackCount;

    constructor(QuadraticFundingRound _round, uint256 _projectId) {
        round = _round;
        projectId = _projectId;
    }

    receive() external payable {
        if (attackCount == 0) {
            attackCount++;
            // Reentrancy attack attempt
            round.claimProjectFunds(projectId);
        }
    }
}
