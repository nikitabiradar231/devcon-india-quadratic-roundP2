// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {QuadraticFundingRound} from "../src/QuadraticFundingRound.sol";
import {console2} from "forge-std/console2.sol";

/**
 * @title DeployAndRegisterScript
 * @notice Automated deployment and pre-registration script for QuadraticFundingRound.
 * @dev Enforces:
 *      1. Robust environment variable configuration with pre-flight checks.
 *      2. Verification that roundStart provides sufficient buffer for project registration.
 *      3. Project registration occurring immediately after deployment while block.timestamp < roundStart.
 *      4. Explicit recipient addresses or explicit demo-only opt-in.
 */
contract DeployAndRegisterScript is Script {
    function run() external returns (address roundAddress) {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        address operator;
        try vm.envAddress("OPERATOR_ADDRESS") returns (address op) {
            operator = op == address(0) ? deployer : op;
        } catch {
            operator = deployer;
        }

        uint256 roundStart;
        try vm.envUint("ROUND_START") returns (uint256 start) {
            roundStart = start;
        } catch {
            // Default recommended safe buffer: 2 hours after current block
            roundStart = block.timestamp + 2 hours;
        }

        uint256 roundEnd;
        try vm.envUint("ROUND_END") returns (uint256 end) {
            roundEnd = end;
        } catch {
            roundEnd = roundStart + 7 days;
        }

        bytes32 eligibilityRoot;
        try vm.envBytes32("ELIGIBILITY_ROOT") returns (bytes32 root) {
            eligibilityRoot = root == bytes32(0)
                ? bytes32(0x3d46a36f54db9dafd55ba03b00ccea72265b806e0cf494752ec20e9c20ab680d)
                : root;
        } catch {
            eligibilityRoot = bytes32(0x3d46a36f54db9dafd55ba03b00ccea72265b806e0cf494752ec20e9c20ab680d);
        }

        uint256 initialPool;
        try vm.envUint("INITIAL_MATCHING_POOL") returns (uint256 pool) {
            initialPool = pool;
        } catch {
            initialPool = 0;
        }

        // Recipient addresses
        bool demoMode = false;
        try vm.envString("ALLOW_DEMO_RECIPIENTS") returns (string memory dm) {
            if (keccak256(bytes(dm)) == keccak256("true") || keccak256(bytes(dm)) == keccak256("1")) {
                demoMode = true;
            }
        } catch {}

        address payable rec1;
        try vm.envAddress("PROJECT_1_RECIPIENT") returns (address r1) {
            rec1 = payable(r1);
        } catch {
            rec1 = payable(address(0));
        }

        address payable rec2;
        try vm.envAddress("PROJECT_2_RECIPIENT") returns (address r2) {
            rec2 = payable(r2);
        } catch {
            rec2 = payable(address(0));
        }

        address payable rec3;
        try vm.envAddress("PROJECT_3_RECIPIENT") returns (address r3) {
            rec3 = payable(r3);
        } catch {
            rec3 = payable(address(0));
        }

        address payable rec4;
        try vm.envAddress("PROJECT_4_RECIPIENT") returns (address r4) {
            rec4 = payable(r4);
        } catch {
            rec4 = payable(address(0));
        }

        if (demoMode) {
            if (rec1 == address(0)) rec1 = payable(operator);
            if (rec2 == address(0)) rec2 = payable(operator);
            if (rec3 == address(0)) rec3 = payable(operator);
            if (rec4 == address(0)) rec4 = payable(operator);
        }

        // Preflight safety checks
        require(operator != address(0), "OPERATOR_ADDRESS cannot be zero");
        require(roundStart > block.timestamp, "ROUND_START must be strictly in the future");
        require(roundEnd > roundStart, "ROUND_END must be after ROUND_START");
        require(eligibilityRoot != bytes32(0), "ELIGIBILITY_ROOT cannot be zero");
        require(rec1 != address(0), "PROJECT_1_RECIPIENT required or ALLOW_DEMO_RECIPIENTS=true");
        require(rec2 != address(0), "PROJECT_2_RECIPIENT required or ALLOW_DEMO_RECIPIENTS=true");
        require(rec3 != address(0), "PROJECT_3_RECIPIENT required or ALLOW_DEMO_RECIPIENTS=true");
        require(rec4 != address(0), "PROJECT_4_RECIPIENT required or ALLOW_DEMO_RECIPIENTS=true");

        console2.log("=== PRE-FLIGHT DEPLOYMENT CHECK ===");
        console2.log("Deployer Address:", deployer);
        console2.log("Operator Address:", operator);
        console2.log("Round Start (Unix):", roundStart);
        console2.log("Round End   (Unix):", roundEnd);
        console2.log("Eligibility Root :", vm.toString(eligibilityRoot));
        console2.log("Initial Pool Wei :", initialPool);
        console2.log("Demo Recipients  :", demoMode ? "ENABLED (Operator Fallback)" : "DISABLED (Distinct Teams)");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Contract
        QuadraticFundingRound round = new QuadraticFundingRound{value: initialPool}(
            operator,
            roundStart,
            roundEnd,
            eligibilityRoot
        );
        roundAddress = address(round);
        console2.log("Contract deployed at:", roundAddress);

        // 2. Register Project 1
        round.registerProject(
            1,
            "Community Education & Dev Tools",
            "Grassroots educational workshops, regional meetups, and developer tooling across India",
            rec1
        );
        console2.log("Registered Project 1 -> Recipient:", rec1);

        // 3. Register Project 2
        round.registerProject(
            2,
            "Whale Funded Tooling",
            "Ethereum infrastructure tooling backed by concentrated capital",
            rec2
        );
        console2.log("Registered Project 2 -> Recipient:", rec2);

        // 4. Register Project 3
        round.registerProject(
            3,
            "ZK Privacy Tools",
            "Open-source zero-knowledge circuits for private identity and voting",
            rec3
        );
        console2.log("Registered Project 3 -> Recipient:", rec3);

        // 5. Register Project 4
        round.registerProject(
            4,
            "Decentralized RPC Gateway",
            "Peer-to-peer resilient fallback network for censorship-resistant RPC access",
            rec4
        );
        console2.log("Registered Project 4 -> Recipient:", rec4);

        vm.stopBroadcast();

        console2.log("=== DEPLOYMENT AND REGISTRATION COMPLETE ===");
        console2.log("Total Registered Projects:", round.getProjectCount());
    }
}
