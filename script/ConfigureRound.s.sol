// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {QuadraticFundingRound} from "../src/QuadraticFundingRound.sol";
import {console2} from "forge-std/console2.sol";

contract ConfigureRoundScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address roundAddress = vm.envAddress("VITE_CONTRACT_ADDRESS");

        QuadraticFundingRound round = QuadraticFundingRound(roundAddress);

        console2.log("--- Configuring QuadraticFundingRound at:", roundAddress);

        vm.startBroadcast(deployerPrivateKey);

        // Register default grassroots Ethereum projects if not already registered
        if (round.getProjectCount() == 0) {
            address op = vm.addr(deployerPrivateKey);

            round.registerProject(
                1,
                "ZK Privacy Tools",
                "Open-source zero-knowledge circuits for private identity and voting",
                payable(op)
            );

            round.registerProject(
                2,
                "Solidity Gas Profiler",
                "Developer CLI and VS Code extension for automated EVM gas bottleneck detection",
                payable(op)
            );

            round.registerProject(
                3,
                "Ethereum India Fellowship",
                "Community grassroots mentorship program onboarding next-gen Web3 developers",
                payable(op)
            );

            round.registerProject(
                4,
                "Decentralized RPC Gateway",
                "Peer-to-peer resilient fallback network for censorship-resistant RPC access",
                payable(op)
            );

            console2.log("Registered 4 grassroots ecosystem projects.");
        }

        vm.stopBroadcast();
    }
}
