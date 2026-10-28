// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {IntegerSqrt} from "../src/libraries/IntegerSqrt.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

contract IntegerSqrtTest is Test {
    function test_SqrtZeroAndOne() public pure {
        assertEq(IntegerSqrt.sqrt(0), 0, "sqrt(0) should be 0");
        assertEq(IntegerSqrt.sqrt(1), 1, "sqrt(1) should be 1");
    }

    function test_SqrtKnownPerfectSquares() public pure {
        assertEq(IntegerSqrt.sqrt(4), 2);
        assertEq(IntegerSqrt.sqrt(9), 3);
        assertEq(IntegerSqrt.sqrt(16), 4);
        assertEq(IntegerSqrt.sqrt(25), 5);
        assertEq(IntegerSqrt.sqrt(100), 10);
        assertEq(IntegerSqrt.sqrt(10000), 100);
        assertEq(IntegerSqrt.sqrt(1e18), 1e9);
        assertEq(IntegerSqrt.sqrt(4e18), 2e9);
        assertEq(IntegerSqrt.sqrt(100e18), 10e9);
    }

    function test_SqrtNonPerfectSquares() public pure {
        assertEq(IntegerSqrt.sqrt(2), 1);
        assertEq(IntegerSqrt.sqrt(3), 1);
        assertEq(IntegerSqrt.sqrt(5), 2);
        assertEq(IntegerSqrt.sqrt(8), 2);
        assertEq(IntegerSqrt.sqrt(15), 3);
        assertEq(IntegerSqrt.sqrt(24), 4);
        assertEq(IntegerSqrt.sqrt(99), 9);
    }

    function test_SqrtMaxUint256() public pure {
        uint256 maxVal = type(uint256).max;
        uint256 root = IntegerSqrt.sqrt(maxVal);
        // floor(sqrt(2^256 - 1)) is 2^128 - 1
        uint256 expected = type(uint128).max;
        assertEq(root, expected, "sqrt(uint256.max) should equal uint128.max");

        // Verify root^2 <= maxVal
        // Note: root^2 will not overflow uint256 since root is uint128.max
        assertLe(root * root, maxVal);
    }

    function testFuzz_SqrtMatchesOpenZeppelin(uint256 x) public pure {
        uint256 actual = IntegerSqrt.sqrt(x);
        uint256 expected = Math.sqrt(x);
        assertEq(actual, expected, "IntegerSqrt should match OpenZeppelin Math.sqrt");
    }

    function testFuzz_SqrtFloorInvariant(uint128 x) public pure {
        uint256 r = IntegerSqrt.sqrt(uint256(x));
        assertLe(r * r, uint256(x), "r^2 must be <= x");
        assertGt((r + 1) * (r + 1), uint256(x), "(r+1)^2 must be > x");
    }

    function test_ScaledSqrt() public pure {
        uint256 scaleSquared = 1e18; // scale = 1e9
        // 1 ETH = 1e18 wei -> scaled = 1e36 -> sqrt = 1e18
        assertEq(IntegerSqrt.scaledSqrt(1e18, scaleSquared), 1e18);

        // 4 ETH = 4e18 wei -> scaled = 4e36 -> sqrt = 2e18
        assertEq(IntegerSqrt.scaledSqrt(4e18, scaleSquared), 2e18);

        // 0.01 ETH = 1e16 wei -> scaled = 1e34 -> sqrt = 1e17
        assertEq(IntegerSqrt.scaledSqrt(1e16, scaleSquared), 1e17);

        // 0 wei -> 0
        assertEq(IntegerSqrt.scaledSqrt(0, scaleSquared), 0);
    }
}
