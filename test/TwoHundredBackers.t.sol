// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {QuadraticFundingRound} from "../src/QuadraticFundingRound.sol";
import {MerkleTreeHelper} from "./helpers/MerkleTreeHelper.sol";

/**
 * @title TwoHundredBackersTest
 * @notice Validates the core challenge thesis:
 *         "Two Hundred Small Backers Should Beat One Whale"
 *         200 small contributors giving 0.01 ETH each (total 2.0 ETH)
 *         vs 1 whale giving 2.0 ETH (total 2.0 ETH).
 */
contract TwoHundredBackersTest is Test {
    QuadraticFundingRound public round;
    MerkleTreeHelper public treeHelper;

    address public operator = makeAddr("operator");
    address public whale = makeAddr("whale");
    address payable public recipient1 = payable(makeAddr("recipient1"));
    address payable public recipient2 = payable(makeAddr("recipient2"));

    uint256 public roundStart = 1000;
    uint256 public roundEnd = 3000;
    uint256 public constant SMALL_BACKERS_COUNT = 200;

    bytes32[] public leaves;
    bytes32 public eligibilityRoot;
    address[] public smallBackers;

    function setUp() public {
        treeHelper = new MerkleTreeHelper();
        smallBackers = new address[](SMALL_BACKERS_COUNT);

        // Total leaves: 200 small backers + 1 whale = 201 leaves
        leaves = new bytes32[](SMALL_BACKERS_COUNT + 1);

        for (uint256 i = 0; i < SMALL_BACKERS_COUNT; i++) {
            smallBackers[i] = makeAddr(string(abi.encodePacked("backer_", vm.toString(i))));
            vm.deal(smallBackers[i], 1 ether);
            leaves[i] = treeHelper.hashLeaf(smallBackers[i]);
        }

        vm.deal(whale, 10 ether);
        leaves[SMALL_BACKERS_COUNT] = treeHelper.hashLeaf(whale);

        eligibilityRoot = treeHelper.getRoot(leaves);

        vm.warp(500);
        vm.deal(operator, 50 ether);

        vm.prank(operator);
        round = new QuadraticFundingRound{value: 10 ether}(operator, roundStart, roundEnd, eligibilityRoot);

        // Project 1: Community project (200 small backers)
        vm.prank(operator);
        round.registerProject(1, "Community Education & Dev Tools", "Grassroots tools", recipient1);

        // Project 2: Whale project (1 backer)
        vm.prank(operator);
        round.registerProject(2, "Whale Funded Tooling", "Single backer tool", recipient2);
    }

    function test_TwoHundredSmallBackersBeatOneWhaleMathematically() public {
        vm.warp(1500); // Live round

        // 200 small backers contribute 0.01 ETH each to Project 1
        for (uint256 i = 0; i < SMALL_BACKERS_COUNT; i++) {
            bytes32[] memory proof = treeHelper.getProof(leaves, i);
            vm.prank(smallBackers[i]);
            round.contribute{value: 0.01 ether}(1, proof);
        }

        // 1 whale contributes 2.0 ETH to Project 2
        bytes32[] memory whaleProof = treeHelper.getProof(leaves, SMALL_BACKERS_COUNT);
        vm.prank(whale);
        round.contribute{value: 2.0 ether}(2, whaleProof);

        // Verify identical raw capital
        assertEq(round.getProjectContributionTotal(1), 2.0 ether, "Project 1 should have 2 ETH");
        assertEq(round.getProjectContributionTotal(2), 2.0 ether, "Project 2 should have 2 ETH");
        assertEq(round.getProjectContributorCount(1), 200, "Project 1 must have 200 unique contributors");
        assertEq(round.getProjectContributorCount(2), 1, "Project 2 must have 1 contributor");

        // Warp past round end and finalize
        vm.warp(3500);
        round.finalize();

        uint256 score1 = round.getProjectScore(1);
        uint256 score2 = round.getProjectScore(2);

        // Exact mathematical expectations:
        // Project 1: sqrt(0.01e18 * 1e18) = sqrt(1e34) = 1e17
        // Sum of roots = 200 * 1e17 = 2e19
        // Q_1 = (2e19)^2 = 4e38
        assertEq(score1, 4e38, "Score 1 must equal 4e38");

        // Project 2: sqrt(2.0e18 * 1e18) = sqrt(2e36) = 1414213562373095048
        // Q_2 = (1414213562373095048)^2 = 1999999999999999997732481866842122304
        assertEq(score2, 1999999999999999997732481866842122304, "Score 2 must equal floor(sqrt(2e36))^2");

        // Ratio verification: Q_1 is ~200x Q_2 (4e38 / ~2e36 = 200)
        uint256 ratio = score1 / score2;
        assertEq(ratio, 200, "200 small backers beat 1 whale by 200x quadratic score ratio");

        // Matching allocation out of 10 ETH pool
        uint256 match1 = round.getProjectMatch(1);
        uint256 match2 = round.getProjectMatch(2);

        // Match 1: floor(10e18 * 4e38 / totalScore) = 9950248756218905472 wei (~9.9502 ETH, 99.502%)
        // Match 2: floor(10e18 * score2 / totalScore) = 49751243781094527 wei (~0.0498 ETH, 0.498%)
        assertEq(match1, 9950248756218905472, "Project 1 match must be 9.950248756218905472 ETH");
        assertEq(match2, 49751243781094527, "Project 2 match must be 0.049751243781094527 ETH");

        // Invariant: match1 + match2 <= 10 ether (1 wei rounding dust retained)
        assertLe(match1 + match2, 10 ether, "Total allocated match cannot exceed matching pool");
        assertEq(match1 + match2, 9999999999999999999, "Allocated match + retained dust equals 10 ETH");

        // Both recipients claim their funds successfully
        round.claimProjectFunds(1);
        round.claimProjectFunds(2);

        assertEq(recipient1.balance, 2.0 ether + match1, "Recipient 1 receives contributions + match");
        assertEq(recipient2.balance, 2.0 ether + match2, "Recipient 2 receives contributions + match");
        assertTrue(round.hasProjectClaimed(1));
        assertTrue(round.hasProjectClaimed(2));
    }
}
