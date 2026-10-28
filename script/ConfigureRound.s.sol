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
                "Community Education & Dev Tools",
                "Grassroots educational workshops, regional meetups, and developer tooling across India",
                payable(op)
            );

            round.registerProject(
                2, "Whale Funded Tooling", "Ethereum infrastructure tooling backed by concentrated capital", payable(op)
            );

            round.registerProject(
                3,
                "ZK Privacy Tools",
                "Open-source zero-knowledge circuits for private identity and voting",
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
