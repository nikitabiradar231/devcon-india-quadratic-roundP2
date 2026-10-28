// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {QuadraticFundingRound} from "../src/QuadraticFundingRound.sol";
import {IntegerSqrt} from "../src/libraries/IntegerSqrt.sol";
import {MerkleTreeHelper} from "./helpers/MerkleTreeHelper.sol";
import {ReentrantRecipient} from "./helpers/ReentrantRecipient.sol";

contract QuadraticFundingRoundTest is Test {
    QuadraticFundingRound public round;
    MerkleTreeHelper public treeHelper;

    address public operator = makeAddr("operator");
    address public sponsor = makeAddr("sponsor");
    address payable public recipient1 = payable(makeAddr("recipient1"));
    address payable public recipient2 = payable(makeAddr("recipient2"));
    address payable public recipient3 = payable(makeAddr("recipient3"));

    address public contributor1 = makeAddr("contributor1");
    address public contributor2 = makeAddr("contributor2");
    address public contributor3 = makeAddr("contributor3");
    address public contributor4 = makeAddr("contributor4");
    address public whale = makeAddr("whale");
    address public unauthorizedUser = makeAddr("unauthorizedUser");

    bytes32[] public leaves;
    bytes32 public eligibilityRoot;

    uint256 public roundStart;
    uint256 public roundEnd;
    uint256 public initialPool = 10 ether;

    event ProjectRegistered(uint256 indexed projectId, string name, address indexed recipient);
    event MatchingPoolFunded(address indexed funder, uint256 amount, uint256 totalPool);
    event ContributionReceived(
        uint256 indexed projectId, address indexed contributor, uint256 amount, uint256 cumulativeContribution
    );
    event RoundFinalized(uint256 totalScore, uint256 totalAllocatedMatching, uint256 projectCount);
    event ProjectClaimed(
        uint256 indexed projectId,
        address indexed recipient,
        uint256 totalAmount,
        uint256 contributions,
        uint256 matchingAmount
    );

    function setUp() public {
        treeHelper = new MerkleTreeHelper();

        // Prepare eligible members
        address[] memory members = new address[](6);
        members[0] = contributor1;
        members[1] = contributor2;
        members[2] = contributor3;
        members[3] = contributor4;
        members[4] = whale;
        members[5] = operator;

        leaves = new bytes32[](members.length);
        for (uint256 i = 0; i < members.length; i++) {
            leaves[i] = treeHelper.hashLeaf(members[i]);
        }
        eligibilityRoot = treeHelper.getRoot(leaves);

        vm.warp(1000);
        roundStart = 2000;
        roundEnd = 4000;

        vm.deal(operator, 100 ether);
        vm.deal(sponsor, 100 ether);
        vm.deal(contributor1, 50 ether);
        vm.deal(contributor2, 50 ether);
        vm.deal(contributor3, 50 ether);
        vm.deal(contributor4, 50 ether);
        vm.deal(whale, 50 ether);
        vm.deal(unauthorizedUser, 50 ether);

        vm.prank(operator);
        round = new QuadraticFundingRound{value: initialPool}(operator, roundStart, roundEnd, eligibilityRoot);

        // Operator registers 2 projects before round start
        vm.prank(operator);
        round.registerProject(1, "Ecosystem Tooling", "Dev tools for Ethereum", recipient1);

        vm.prank(operator);
        round.registerProject(2, "Community Education", "Workshops and guides", recipient2);
    }

    function _getProof(address account) internal view returns (bytes32[] memory) {
        for (uint256 i = 0; i < leaves.length; i++) {
            if (leaves[i] == treeHelper.hashLeaf(account)) {
                return treeHelper.getProof(leaves, i);
            }
        }
        return new bytes32[](0);
    }

    // --- Official Test 1: Correct Quadratic Formula ---
    // Q_p = (sum sqrt(c_{i,p}))^2
    // Small backers should beat one whale!
    function test_01_CorrectQuadraticFormula() public {
        vm.warp(2500); // During active round

        // Project 1 (Community project): 4 small backers each giving 0.25 ETH (Total: 1 ETH)
        // Project 2 (Whale project): 1 whale giving 1.00 ETH (Total: 1 ETH)
        bytes32[] memory p1 = _getProof(contributor1);
        bytes32[] memory p2 = _getProof(contributor2);
        bytes32[] memory p3 = _getProof(contributor3);
        bytes32[] memory p4 = _getProof(contributor4);
        bytes32[] memory pWhale = _getProof(whale);

        vm.prank(contributor1);
        round.contribute{value: 0.25 ether}(1, p1);

        vm.prank(contributor2);
        round.contribute{value: 0.25 ether}(1, p2);

        vm.prank(contributor3);
        round.contribute{value: 0.25 ether}(1, p3);

        vm.prank(contributor4);
        round.contribute{value: 0.25 ether}(1, p4);

        vm.prank(whale);
        round.contribute{value: 1.0 ether}(2, pWhale);

        // Check contribution totals are identical (1 ETH each)
        assertEq(round.getProjectContributionTotal(1), 1 ether);
        assertEq(round.getProjectContributionTotal(2), 1 ether);

        // Warp past round end and finalize
        vm.warp(4500);
        round.finalize();

        uint256 score1 = round.getProjectScore(1);
        uint256 score2 = round.getProjectScore(2);

        // Math verification:
        // Project 1: r = floor(sqrt(0.25e18 * 1e18)) = floor(sqrt(0.25e36)) = 0.5e18
        // 4 contributors: sumOfRoots = 4 * 0.5e18 = 2.0e18
        // Q_1 = (2.0e18)^2 = 4.0e36
        //
        // Project 2: r = floor(sqrt(1.00e18 * 1e18)) = floor(sqrt(1.00e36)) = 1.0e18
        // 1 contributor: sumOfRoots = 1.0e18
        // Q_2 = (1.0e18)^2 = 1.0e36
        //
        // Therefore Q_1 / Q_2 = 4.0e36 / 1.0e36 = 4x!
        // Despite having the exact same raw contribution (1 ETH), 4 small backers beat 1 whale 4 to 1!
        assertEq(score1, 4e36, "Score 1 must match exact QF formula (4.0e36)");
        assertEq(score2, 1e36, "Score 2 must match exact QF formula (1.0e36)");
        assertEq(score1, 4 * score2, "Four 0.25 ETH backers should beat one 1 ETH whale 4 to 1");

        // Verify matches:
        // Total score = 5.0e36
        // Match 1 = floor(10 ETH * 4.0e36 / 5.0e36) = 8 ETH
        // Match 2 = floor(10 ETH * 1.0e36 / 5.0e36) = 2 ETH
        assertEq(round.getProjectMatch(1), 8 ether, "Project 1 should receive 80% of matching pool (8 ETH)");
        assertEq(round.getProjectMatch(2), 2 ether, "Project 2 should receive 20% of matching pool (2 ETH)");
    }

    // --- Official Test 2: Matching Pool Cap ---
    function test_02_MatchingPoolCap() public {
        vm.warp(2500);

        bytes32[] memory p1 = _getProof(contributor1);
        bytes32[] memory p2 = _getProof(contributor2);
        bytes32[] memory p3 = _getProof(contributor3);

        vm.prank(contributor1);
        round.contribute{value: 0.123456 ether}(1, p1);

        vm.prank(contributor2);
        round.contribute{value: 0.789012 ether}(1, p2);

        vm.prank(contributor3);
        round.contribute{value: 1.555555 ether}(2, p3);

        vm.warp(4500);
        round.finalize();

        uint256 match1 = round.getProjectMatch(1);
        uint256 match2 = round.getProjectMatch(2);
        uint256 totalAllocated = round.totalAllocatedMatching();
        uint256 pool = round.matchingPool();

        assertGe(match1, 0, "Match 1 must be non-negative");
        assertGe(match2, 0, "Match 2 must be non-negative");
        assertLe(match1, pool, "No single allocation can exceed pool");
        assertLe(match2, pool, "No single allocation can exceed pool");
        assertLe(match1 + match2, pool, "Sum of allocations must never exceed matching pool");
        assertEq(match1 + match2, totalAllocated, "Sum of project matches must equal totalAllocatedMatching");

        // Rounding dust remains in pool
        uint256 remainingDust = round.getRemainingMatchingPool();
        assertEq(remainingDust, pool - totalAllocated, "Remaining dust is safely retained in contract");
    }

    // --- Official Test 3: Onchain Eligibility ---
    function test_03_OnchainEligibility() public {
        vm.warp(2500);

        // 1. Valid contributor with valid proof succeeds
        bytes32[] memory validProof = _getProof(contributor1);
        assertTrue(round.isEligible(contributor1, validProof), "Contributor 1 must be eligible");

        vm.prank(contributor1);
        round.contribute{value: 0.1 ether}(1, validProof);
        assertEq(round.getContribution(1, contributor1), 0.1 ether);

        // 2. Unauthorized caller with empty or dummy proof reverts
        bytes32[] memory emptyProof = new bytes32[](0);
        assertFalse(round.isEligible(unauthorizedUser, emptyProof), "Unauthorized user must not be eligible");

        vm.prank(unauthorizedUser);
        vm.expectRevert(abi.encodeWithSelector(QuadraticFundingRound.IneligibleContributor.selector, unauthorizedUser));
        round.contribute{value: 0.1 ether}(1, emptyProof);

        // 3. Unauthorized caller attempting to use another user's proof reverts
        vm.prank(unauthorizedUser);
        vm.expectRevert(abi.encodeWithSelector(QuadraticFundingRound.IneligibleContributor.selector, unauthorizedUser));
        round.contribute{value: 0.1 ether}(1, validProof);
    }

    // --- Official Test 4: One-Time Project Withdrawal & Reentrancy Defense ---
    function test_04_OneTimeProjectWithdrawal() public {
        vm.warp(2500);
        bytes32[] memory p1 = _getProof(contributor1);

        vm.prank(contributor1);
        round.contribute{value: 2 ether}(1, p1);

        vm.warp(4500);
        round.finalize();

        uint256 matchAmt = round.getProjectMatch(1);
        uint256 expectedClaim = 2 ether + matchAmt;
        assertEq(round.getProjectClaimable(1), expectedClaim);

        uint256 balBefore = recipient1.balance;

        // Recipient or caller claims
        round.claimProjectFunds(1);

        uint256 balAfter = recipient1.balance;
        assertEq(balAfter - balBefore, expectedClaim, "Recipient should receive contributions + matching");
        assertTrue(round.hasProjectClaimed(1), "Project should be marked claimed");
        assertEq(round.getProjectClaimable(1), 0, "Claimable amount should now be 0");

        // Attempting to claim a second time reverts
        vm.expectRevert(abi.encodeWithSelector(QuadraticFundingRound.AlreadyClaimed.selector, 1));
        round.claimProjectFunds(1);
    }

    function test_04_ReentrancyAttackPrevented() public {
        vm.warp(1500); // Before round start, register reentrant recipient project
        ReentrantRecipient attacker = new ReentrantRecipient(round, 3);

        vm.prank(operator);
        round.registerProject(3, "Attacker Project", "Reentrancy test", payable(address(attacker)));

        vm.warp(2500);
        bytes32[] memory p1 = _getProof(contributor1);
        vm.prank(contributor1);
        round.contribute{value: 1 ether}(3, p1);

        vm.warp(4500);
        round.finalize();

        // When attacker attempts reentrancy during claimProjectFunds, it must fail safely
        // Because claimed flag is set before external call, second reentrant call reverts with AlreadyClaimed,
        // causing attacker receive() to fail, reverting the entire transaction
        vm.expectRevert(QuadraticFundingRound.TransferFailed.selector);
        round.claimProjectFunds(3);
    }

    // --- Official Test 5: Contributor Event ---
    function test_05_ContributorEvent() public {
        vm.warp(2500);
        bytes32[] memory p1 = _getProof(contributor1);

        vm.expectEmit(true, true, false, true);
        emit ContributionReceived(1, contributor1, 0.5 ether, 0.5 ether);

        vm.prank(contributor1);
        round.contribute{value: 0.5 ether}(1, p1);

        // Second contribution check cumulative event
        vm.expectEmit(true, true, false, true);
        emit ContributionReceived(1, contributor1, 0.3 ether, 0.8 ether);

        vm.prank(contributor1);
        round.contribute{value: 0.3 ether}(1, p1);
    }

    // --- Official Test 6: Finalization Timing ---
    function test_06_FinalizationTiming() public {
        // Attempting to finalize before roundEnd reverts
        vm.warp(3999);
        vm.expectRevert(QuadraticFundingRound.RoundNotEnded.selector);
        round.finalize();

        // Finalization succeeds once roundEnd has passed
        vm.warp(4000);
        round.finalize();
        assertTrue(round.isFinalized(), "Round must be finalized");

        // Calling finalize a second time reverts
        vm.expectRevert(QuadraticFundingRound.RoundAlreadyFinalized.selector);
        round.finalize();
    }

    // --- Official Test 7: Contribution Cutoff ---
    function test_07_ContributionCutoff() public {
        bytes32[] memory p1 = _getProof(contributor1);

        // Reverts before roundStart
        vm.warp(1999);
        vm.prank(contributor1);
        vm.expectRevert(QuadraticFundingRound.RoundNotStarted.selector);
        round.contribute{value: 0.1 ether}(1, p1);

        // Works during round window
        vm.warp(2000);
        vm.prank(contributor1);
        round.contribute{value: 0.1 ether}(1, p1);

        // Reverts at and after roundEnd
        vm.warp(4000);
        vm.prank(contributor1);
        vm.expectRevert(QuadraticFundingRound.RoundEnded.selector);
        round.contribute{value: 0.1 ether}(1, p1);

        vm.warp(4500);
        vm.prank(contributor1);
        vm.expectRevert(QuadraticFundingRound.RoundEnded.selector);
        round.contribute{value: 0.1 ether}(1, p1);
    }

    // --- Official Test 8: Operator-Only Registration ---
    function test_08_OperatorOnlyRegistration() public {
        vm.warp(1500);

        // Unauthorized user cannot register
        vm.prank(unauthorizedUser);
        vm.expectRevert(QuadraticFundingRound.Unauthorized.selector);
        round.registerProject(10, "Fake Project", "Desc", recipient1);

        // Operator cannot register duplicate project ID
        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(QuadraticFundingRound.DuplicateProjectId.selector, 1));
        round.registerProject(1, "Duplicate", "Desc", recipient1);

        // Operator cannot register invalid recipient
        vm.prank(operator);
        vm.expectRevert(QuadraticFundingRound.InvalidRecipient.selector);
        round.registerProject(10, "No Recipient", "Desc", payable(address(0)));

        // Operator registers project 3 before round start
        vm.prank(operator);
        round.registerProject(3, "Valid Project 3", "Desc", recipient3);
        assertEq(round.getProjectCount(), 3);

        // Registration is locked once round starts
        vm.warp(2000);
        vm.prank(operator);
        vm.expectRevert(QuadraticFundingRound.RegistrationClosed.selector);
        round.registerProject(4, "Late Project", "Desc", recipient3);
    }

    // --- Official Test 9: Deployment Address & Public Getters ---
    function test_09_DeploymentAddressAndGetters() public view {
        assertEq(round.operator(), operator);
        assertEq(round.roundStart(), 2000);
        assertEq(round.roundEnd(), 4000);
        assertEq(round.eligibilityRoot(), eligibilityRoot);
        assertEq(round.matchingPool(), 10 ether);
        assertEq(round.getProjectCount(), 2);
        assertFalse(round.isFinalized());

        QuadraticFundingRound.Project memory p1 = round.getProject(1);
        assertEq(p1.id, 1);
        assertEq(p1.name, "Ecosystem Tooling");
        assertEq(p1.recipient, recipient1);
        assertTrue(p1.active);
        assertFalse(p1.claimed);
    }

    // --- Critical Scoring Rule Test: Pre-aggregate Repeat Contributions ---
    // Section 6.3: "First aggregate that contributor's contributions.
    // If one wallet contributes 0.1 ETH and later another 0.2 ETH to the same project,
    // calculate the project's contribution for that wallet using 0.3 ETH,
    // not separate square roots of 0.1 and 0.2 ETH."
    function test_AntiSplitTransactionAggregation() public {
        vm.warp(2500);
        bytes32[] memory p1 = _getProof(contributor1);
        bytes32[] memory p2 = _getProof(contributor2);

        // Contributor 1 makes 3 separate contributions to Project 1: 0.1 ETH + 0.1 ETH + 0.1 ETH = 0.3 ETH
        vm.prank(contributor1);
        round.contribute{value: 0.1 ether}(1, p1);
        vm.prank(contributor1);
        round.contribute{value: 0.1 ether}(1, p1);
        vm.prank(contributor1);
        round.contribute{value: 0.1 ether}(1, p1);

        // Contributor 2 makes a single contribution of 0.3 ETH to Project 2
        vm.prank(contributor2);
        round.contribute{value: 0.3 ether}(2, p2);

        vm.warp(4500);
        round.finalize();

        // Scores must be identical! Splitting into 3 transactions does NOT increase score.
        uint256 score1 = round.getProjectScore(1);
        uint256 score2 = round.getProjectScore(2);

        assertEq(score1, score2, "Split contributions must yield the exact same score as single aggregate contribution");
    }

    // --- Test: One Contributor Supporting Multiple Projects ---
    function test_OneContributorSupportsMultipleProjects() public {
        vm.warp(2500);
        bytes32[] memory p1 = _getProof(contributor1);

        // Contributor 1 gives 0.5 ETH to Project 1 and 0.5 ETH to Project 2
        vm.prank(contributor1);
        round.contribute{value: 0.5 ether}(1, p1);

        vm.prank(contributor1);
        round.contribute{value: 0.5 ether}(2, p1);

        assertEq(round.getContribution(1, contributor1), 0.5 ether);
        assertEq(round.getContribution(2, contributor1), 0.5 ether);
        assertEq(round.uniqueWalletsCount(), 1, "Global unique wallets should be 1");

        vm.warp(4500);
        round.finalize();

        assertEq(round.getProjectScore(1), round.getProjectScore(2));
        assertEq(round.getProjectMatch(1), 5 ether);
        assertEq(round.getProjectMatch(2), 5 ether);
    }

    // --- Test: Sponsor Deposits Matching Pool ---
    function test_MatchingPoolFunding() public {
        vm.prank(sponsor);
        round.fundMatchingPool{value: 5 ether}();

        assertEq(round.matchingPool(), 15 ether, "Matching pool should increase by 5 ETH");

        // Cannot deposit after finalization
        vm.warp(4500);
        round.finalize();

        vm.prank(sponsor);
        vm.expectRevert(QuadraticFundingRound.RoundAlreadyFinalized.selector);
        round.fundMatchingPool{value: 1 ether}();
    }

    // --- Test: Finalization with Zero Contributions ---
    function test_FinalizeWithZeroContributions() public {
        vm.warp(4500);
        round.finalize();

        assertTrue(round.isFinalized());
        assertEq(round.totalQuadraticScore(), 0);
        assertEq(round.totalAllocatedMatching(), 0);
        assertEq(round.getProjectMatch(1), 0);
        assertEq(round.getProjectMatch(2), 0);
        assertEq(round.getRemainingMatchingPool(), 10 ether);
    }

    // --- Invariant Test: Total ETH Balance Always Covers Liabilities ---
    function testFuzz_AccountingInvariants(uint128 c1, uint128 c2) public {
        vm.assume(c1 > 0 && c1 <= 10 ether);
        vm.assume(c2 > 0 && c2 <= 10 ether);

        vm.warp(2500);
        bytes32[] memory p1 = _getProof(contributor1);
        bytes32[] memory p2 = _getProof(contributor2);

        vm.prank(contributor1);
        round.contribute{value: c1}(1, p1);

        vm.prank(contributor2);
        round.contribute{value: c2}(2, p2);

        vm.warp(4500);
        round.finalize();

        uint256 totalContributions = round.getTotalContributions();
        uint256 matchingPool = round.matchingPool();
        uint256 totalAllocated = round.totalAllocatedMatching();

        assertLe(totalAllocated, matchingPool, "Allocated matching cannot exceed matching pool");
        assertEq(
            address(round).balance, totalContributions + matchingPool, "Contract balance equals contributions + pool"
        );

        // Project 1 claims
        uint256 claimable1 = round.getProjectClaimable(1);
        round.claimProjectFunds(1);

        assertEq(
            address(round).balance,
            (totalContributions + matchingPool) - claimable1,
            "Remaining balance covers remaining liabilities"
        );
    }
}
