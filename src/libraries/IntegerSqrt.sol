// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title IntegerSqrt
 * @author Two Hundred Small Backers Should Beat One Whale
 * @notice Fixed-point and pure integer square root calculations for quadratic funding.
 * @dev Computes floor(sqrt(x)) safely for EVM uint256 arithmetic without floating point.
 *      Uses the Newton-Raphson / Babylonian method with a log2-based initial estimation
 *      guaranteeing quadratic convergence in at most 7 iterations for any uint256 value.
 */
library IntegerSqrt {
    /**
     * @notice Computes floor(sqrt(x)) for any uint256.
     * @dev Never overflows. Handles 0, 1, non-perfect squares, and uint256.max safely.
     * @param x The value whose square root is to be calculated.
     * @return result floor(sqrt(x))
     */
    function sqrt(uint256 x) internal pure returns (uint256 result) {
        if (x <= 1) {
            return x;
        }

        unchecked {
            // Newton-Raphson method for f(r) = r^2 - x
            // r_{n+1} = (r_n + x / r_n) / 2
            //
            // Initial guess based on binary order of magnitude:
            // Let x_n = 2^(floor(log2(x)) / 2)
            uint256 xx = x;
            uint256 r = 1;

            if (xx >= 1 << 128) {
                xx >>= 128;
                r <<= 64;
            }
            if (xx >= 1 << 64) {
                xx >>= 64;
                r <<= 32;
            }
            if (xx >= 1 << 32) {
                xx >>= 32;
                r <<= 16;
            }
            if (xx >= 1 << 16) {
                xx >>= 16;
                r <<= 8;
            }
            if (xx >= 1 << 8) {
                xx >>= 8;
                r <<= 4;
            }
            if (xx >= 1 << 4) {
                xx >>= 4;
                r <<= 2;
            }
            if (xx >= 1 << 2) {
                r <<= 1;
            }

            // Refine initial estimate to center of interval [r, 2r)
            r = (3 * r) >> 1;

            // 6-7 Newton-Raphson iterations ensure full precision for uint256
            r = (r + x / r) >> 1;
            r = (r + x / r) >> 1;
            r = (r + x / r) >> 1;
            r = (r + x / r) >> 1;
            r = (r + x / r) >> 1;
            r = (r + x / r) >> 1;
            r = (r + x / r) >> 1;

            // Adjust if overestimate: floor(sqrt(x)) satisfies r^2 <= x < (r + 1)^2
            if (r > x / r) {
                r -= 1;
            }

            return r;
        }
    }

    /**
     * @notice Computes floor(sqrt(x * scaleSquared)) for scaled fixed-point quadratic calculations.
     * @dev Used to preserve fractional precision for wei amounts.
     * @param x The contribution amount in wei.
     * @param scaleSquared The scaling factor squared (e.g. 1e18 for scale 1e9).
     * @return result floor(sqrt(x * scaleSquared))
     */
    function scaledSqrt(uint256 x, uint256 scaleSquared) internal pure returns (uint256 result) {
        if (x == 0) return 0;
        uint256 scaled = x * scaleSquared;
        return sqrt(scaled);
    }
}
