// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {QuadraticFundingRound} from "../src/QuadraticFundingRound.sol";
import {MerkleTreeHelper} from "./helpers/MerkleTreeHelper.sol";

contract GasScalabilityTest is Test {
    QuadraticFundingRound public round;
    MerkleTreeHelper public treeHelper;

    address public operator = makeAddr("operator");
    uint256 public roundStart = 1000;
    uint256 public roundEnd = 3000;
    uint256 public constant CONTRIBUTOR_COUNT = 50;

    bytes32[] public leaves;
    bytes32 public eligibilityRoot;
    address[] public contributors;

    function setUp() public {
        treeHelper = new MerkleTreeHelper();
        contributors = new address[](CONTRIBUTOR_COUNT);
        leaves = new bytes32[](CONTRIBUTOR_COUNT);

        for (uint256 i = 0; i < CONTRIBUTOR_COUNT; i++) {
            contributors[i] = makeAddr(string(abi.encodePacked("contributor_", vm.toString(i))));
            vm.deal(contributors[i], 10 ether);
            leaves[i] = treeHelper.hashLeaf(contributors[i]);
        }
        eligibilityRoot = treeHelper.getRoot(leaves);

        vm.warp(500);
        vm.deal(operator, 50 ether);

        vm.prank(operator);
        round = new QuadraticFundingRound{value: 20 ether}(operator, roundStart, roundEnd, eligibilityRoot);

        // Register 5 projects
        for (uint256 p = 1; p <= 5; p++) {
            address payable rec = payable(makeAddr(string(abi.encodePacked("rec_", vm.toString(p)))));
            vm.prank(operator);
            round.registerProject(
                p, string(abi.encodePacked("Project ", vm.toString(p))), "Gas test project description", rec
            );
        }
    }

    function test_GasScalability50Contributors() public {
        vm.warp(1500);

        // 50 contributors contribute across 5 projects (10 contributors per project)
        for (uint256 i = 0; i < CONTRIBUTOR_COUNT; i++) {
            uint256 projectId = (i % 5) + 1;
            bytes32[] memory proof = treeHelper.getProof(leaves, i);

            vm.prank(contributors[i]);
            round.contribute{value: 0.1 ether}(projectId, proof);
        }

        vm.warp(3500);
        uint256 gasBefore = gasleft();
        round.finalize();
        uint256 gasUsed = gasBefore - gasleft();

        emit log_named_uint("Gas used for finalization (50 contributors across 5 projects)", gasUsed);
        // Gas used must be well within typical Ethereum block limit (30,000,000 gas)
        assertLt(gasUsed, 3_000_000, "Finalization gas must be well below 3M gas");
        assertTrue(round.isFinalized());
    }
}
