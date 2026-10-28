// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {QuadraticFundingRound} from "../src/QuadraticFundingRound.sol";

contract DeploymentWorkflowTest is Test {
    QuadraticFundingRound public round;

    address public deployer = makeAddr("deployer");
    address public operator = makeAddr("operator");
    address payable public recipient1 = payable(makeAddr("recipient1"));
    address payable public recipient2 = payable(makeAddr("recipient2"));
    address payable public recipient3 = payable(makeAddr("recipient3"));
    address payable public recipient4 = payable(makeAddr("recipient4"));
    address public unauthorized = makeAddr("unauthorized");

    bytes32 public constant TRACKED_ELIGIBILITY_ROOT =
        0x3d46a36f54db9dafd55ba03b00ccea72265b806e0cf494752ec20e9c20ab680d;

    uint256 public deployTimestamp = 1793200000;
    uint256 public roundStart;
    uint256 public roundEnd;

    function setUp() public {
        vm.warp(deployTimestamp);
        // 2-hour buffer between deployment and round start
        roundStart = deployTimestamp + 2 hours;
        // 7-day round duration
        roundEnd = roundStart + 7 days;

        // Deploy with 0 initial matching pool
        vm.prank(deployer);
        round = new QuadraticFundingRound{value: 0}(operator, roundStart, roundEnd, TRACKED_ELIGIBILITY_ROOT);
    }

    function test_InitialDeploymentConfiguration() public view {
        assertEq(round.operator(), operator, "Operator must match configured address");
        assertEq(round.roundStart(), roundStart, "Round start must have 2h buffer");
        assertEq(round.roundEnd(), roundEnd, "Round end must be 7 days after start");
        assertEq(round.eligibilityRoot(), TRACKED_ELIGIBILITY_ROOT, "Merkle root must match tracked root");
        assertEq(round.matchingPool(), 0, "Initial matching pool must be 0 ETH");
        assertEq(round.getProjectCount(), 0, "Initial project count must be 0");
        assertFalse(round.isFinalized(), "Round must not be finalized");
        assertEq(uint256(round.getRoundStatus()), uint256(QuadraticFundingRound.RoundStatus.Upcoming));
    }

    function test_RegisterAllFourProjectsBeforeRoundStart() public {
        // Operator registers all 4 draft projects sequentially during the 2h buffer
        vm.startPrank(operator);

        round.registerProject(
            1,
            "Community Education & Dev Tools",
            "Grassroots educational workshops, regional meetups, and developer tooling across India",
            recipient1
        );

        round.registerProject(
            2,
            "Whale Funded Tooling",
            "Ethereum infrastructure tooling backed by concentrated capital",
            recipient2
        );

        round.registerProject(
            3,
            "ZK Privacy Tools",
            "Open-source zero-knowledge circuits for private identity and voting",
            recipient3
        );

        round.registerProject(
            4,
            "Decentralized RPC Gateway",
            "Peer-to-peer resilient fallback network for censorship-resistant RPC access",
            recipient4
        );

        vm.stopPrank();

        assertEq(round.getProjectCount(), 4, "All 4 projects must be registered");
        uint256[] memory pids = round.getAllProjectIds();
        assertEq(pids.length, 4);
        assertEq(pids[0], 1);
        assertEq(pids[1], 2);
        assertEq(pids[2], 3);
        assertEq(pids[3], 4);

        QuadraticFundingRound.Project memory p1 = round.getProject(1);
        assertEq(p1.recipient, recipient1);
        assertTrue(p1.active);
        assertFalse(p1.claimed);

        QuadraticFundingRound.Project memory p4 = round.getProject(4);
        assertEq(p4.recipient, recipient4);
        assertTrue(p4.active);
    }

    function test_RegistrationFailsAfterRoundStart() public {
        // Warp past round start
        vm.warp(roundStart);

        vm.prank(operator);
        vm.expectRevert(QuadraticFundingRound.RegistrationClosed.selector);
        round.registerProject(1, "Late Project", "Should fail", recipient1);

        // Warp into active round
        vm.warp(roundStart + 1 hours);
        vm.prank(operator);
        vm.expectRevert(QuadraticFundingRound.RegistrationClosed.selector);
        round.registerProject(1, "Late Project", "Should fail", recipient1);
    }

    function test_RegistrationFailsForNonOperator() public {
        vm.prank(unauthorized);
        vm.expectRevert(QuadraticFundingRound.Unauthorized.selector);
        round.registerProject(1, "Community Project", "Desc", recipient1);
    }

    function test_RegistrationFailsForInvalidParameters() public {
        vm.startPrank(operator);

        // Zero project ID
        vm.expectRevert(QuadraticFundingRound.InvalidProjectId.selector);
        round.registerProject(0, "Invalid ID", "Desc", recipient1);

        // Zero recipient address
        vm.expectRevert(QuadraticFundingRound.InvalidRecipient.selector);
        round.registerProject(1, "Zero Recipient", "Desc", payable(address(0)));

        // Empty project name
        vm.expectRevert(QuadraticFundingRound.InvalidProjectName.selector);
        round.registerProject(1, "", "Empty Name", recipient1);

        // Valid registration
        round.registerProject(1, "Valid Name", "Desc", recipient1);

        // Duplicate ID
        vm.expectRevert(abi.encodeWithSelector(QuadraticFundingRound.DuplicateProjectId.selector, 1));
        round.registerProject(1, "Duplicate", "Desc", recipient2);

        vm.stopPrank();
    }
}
