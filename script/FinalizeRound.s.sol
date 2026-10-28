// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {QuadraticFundingRound} from "../src/QuadraticFundingRound.sol";
import {console2} from "forge-std/console2.sol";

contract FinalizeRoundScript is Script {
    function run() external {
        uint256 callerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address roundAddress = vm.envAddress("VITE_CONTRACT_ADDRESS");

        QuadraticFundingRound round = QuadraticFundingRound(roundAddress);

        console2.log("--- Finalizing QuadraticFundingRound at:", roundAddress);
        console2.log("Round End:", round.roundEnd());
        console2.log("Current Block Timestamp:", block.timestamp);

        vm.startBroadcast(callerPrivateKey);
        round.finalize();
        vm.stopBroadcast();

        console2.log("Finalization successful!");
        console2.log("Total Quadratic Score:", round.totalQuadraticScore());
        console2.log("Total Allocated Matching (wei):", round.totalAllocatedMatching());
    }
}
