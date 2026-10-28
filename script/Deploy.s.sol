// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {QuadraticFundingRound} from "../src/QuadraticFundingRound.sol";
import {console2} from "forge-std/console2.sol";

contract DeployScript is Script {
    function run() external returns (address roundAddress) {
        uint256 deployerPrivateKey;
        try vm.envUint("DEPLOYER_PRIVATE_KEY") returns (uint256 key) {
            deployerPrivateKey = key;
        } catch {
            // Default test key if not set (for local simulation/dry-run)
            deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        }

        address operator;
        try vm.envAddress("OPERATOR_ADDRESS") returns (address op) {
            operator = op;
        } catch {
            operator = vm.addr(deployerPrivateKey);
        }

        uint256 roundStart;
        try vm.envUint("ROUND_START") returns (uint256 start) {
            roundStart = start;
        } catch {
            roundStart = block.timestamp + 300; // 5 mins in future
        }

        uint256 roundEnd;
        try vm.envUint("ROUND_END") returns (uint256 end) {
            roundEnd = end;
        } catch {
            roundEnd = roundStart + 7 days;
        }

        bytes32 eligibilityRoot;
        try vm.envBytes32("ELIGIBILITY_ROOT") returns (bytes32 root) {
            eligibilityRoot = root;
        } catch {
            // Default to generated 200-member Merkle tree root from eligibility-tree.json
            eligibilityRoot = 0x3d46a36f54db9dafd55ba03b00ccea72265b806e0cf494752ec20e9c20ab680d;
        }

        uint256 initialPool;
        try vm.envUint("INITIAL_MATCHING_POOL") returns (uint256 pool) {
            initialPool = pool;
        } catch {
            initialPool = 0;
        }

        console2.log("--- Deploying QuadraticFundingRound ---");
        console2.log("Deployer / Operator:", operator);
        console2.log("Round Start:", roundStart);
        console2.log("Round End:", roundEnd);
        console2.log("Eligibility Root:", vm.toString(eligibilityRoot));
        console2.log("Initial Matching Pool (wei):", initialPool);

        vm.startBroadcast(deployerPrivateKey);

        QuadraticFundingRound qfRound =
            new QuadraticFundingRound{value: initialPool}(operator, roundStart, roundEnd, eligibilityRoot);

        vm.stopBroadcast();

        roundAddress = address(qfRound);
        console2.log("QuadraticFundingRound deployed to:", roundAddress);
    }
}
