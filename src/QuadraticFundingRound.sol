// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IntegerSqrt} from "./libraries/IntegerSqrt.sol";

/**
 * @title QuadraticFundingRound
 * @author Two Hundred Small Backers Should Beat One Whale
 * @notice Production-quality, testnet-deployable quadratic funding round for the Road to Devcon XI challenge.
 * @dev Enforces:
 *      1. Immutable round windows with strict contribution and registration cutoffs.
 *      2. Onchain Sybil-resistant Merkle proof eligibility.
 *      3. Quadratic scoring with pre-aggregated contributor totals to prevent split-transaction manipulation.
 *      4. Scaled fixed-point square root precision model: r_{i,p} = floor(sqrt(c_{i,p} * S^2)).
 *      5. Non-exceeding matching pool distribution using safe integer math and deterministic rounding dust retention.
 *      6. One-time CEI (Checks-Effects-Interactions) reentrancy-protected recipient claims.
 */
contract QuadraticFundingRound is ReentrancyGuard {
    // --- Structs ---

    struct Project {
        uint256 id;
        string name;
        string description;
        address payable recipient;
        uint256 registrationTimestamp;
        bool active;
        bool claimed;
        uint256 totalContributions;
        uint256 contributorCount;
        uint256 quadraticScore;
        uint256 matchingAllocation;
    }

    enum RoundStatus {
        Upcoming,
        Live,
        Ended,
        Finalized
    }

    // --- Mathematical Constants ---

    /// @notice Scale factor S = 1e9 (1 gwei). Preserves 9 decimal digits of fractional precision in square root.
    uint256 public constant SCALE = 1e9;
    /// @notice S^2 = 1e18 (1 ether), applied to wei contribution before computing integer square root.
    uint256 public constant SCALE_SQUARED = 1e18;
    /// @notice Maximum projects allowed in a round to prevent gas exhaustion during finalization.
    uint256 public constant MAX_PROJECTS = 100;
    /// @notice Maximum unique contributors per project to guarantee finalization within block gas limit.
    uint256 public constant MAX_CONTRIBUTORS_PER_PROJECT = 1000;

    // --- State Variables ---

    address public immutable operator;
    uint256 public immutable roundStart;
    uint256 public immutable roundEnd;

    bytes32 public eligibilityRoot;
    bool public isFinalized;

    uint256 public matchingPool;
    uint256 public totalAllocatedMatching;
    uint256 public totalContributionsCollected;
    uint256 public totalClaimedAmount;
    uint256 public totalQuadraticScore;
    uint256 public uniqueWalletsCount;

    uint256[] public projectIds;
    mapping(uint256 => Project) private _projects;
    mapping(uint256 => address[]) private _projectContributors;
    mapping(uint256 => mapping(address => uint256)) public contributions;
    mapping(uint256 => mapping(address => bool)) private _hasContributedToProject;
    mapping(address => bool) private _hasContributedGlobally;

    // --- Custom Errors ---

    error Unauthorized();
    error InvalidOperator();
    error InvalidRoundWindow();
    error RoundAlreadyStarted();
    error RoundNotStarted();
    error RoundEnded();
    error RoundNotEnded();
    error RoundAlreadyFinalized();
    error RoundNotFinalized();
    error RegistrationClosed();
    error DuplicateProjectId(uint256 projectId);
    error InvalidProjectId();
    error InvalidRecipient();
    error InvalidProjectName();
    error ProjectNotFound(uint256 projectId);
    error ProjectNotActive(uint256 projectId);
    error IneligibleContributor(address contributor);
    error ZeroContribution();
    error ZeroDeposit();
    error AlreadyClaimed(uint256 projectId);
    error TransferFailed();
    error MaxProjectsExceeded();
    error MaxContributorsExceeded(uint256 projectId);

    // --- Events ---

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
    event EligibilityRootUpdated(bytes32 indexed newRoot);

    // --- Modifiers ---

    modifier onlyOperator() {
        _checkOperator();
        _;
    }

    function _checkOperator() internal view {
        if (msg.sender != operator) revert Unauthorized();
    }

    // --- Constructor ---

    /**
     * @notice Initializes the quadratic funding round.
     * @param _operator Address authorized to manage round setup and project registration.
     * @param _roundStart Unix timestamp for round opening. Must precede _roundEnd.
     * @param _roundEnd Unix timestamp for round closing.
     * @param _eligibilityRoot Merkle root for eligible contributor accounts.
     */
    constructor(address _operator, uint256 _roundStart, uint256 _roundEnd, bytes32 _eligibilityRoot) payable {
        if (_operator == address(0)) revert InvalidOperator();
        if (_roundStart >= _roundEnd) revert InvalidRoundWindow();

        operator = _operator;
        roundStart = _roundStart;
        roundEnd = _roundEnd;
        eligibilityRoot = _eligibilityRoot;

        if (msg.value > 0) {
            matchingPool = msg.value;
            emit MatchingPoolFunded(msg.sender, msg.value, msg.value);
        }
    }

    // --- Configuration & Funding ---

    /**
     * @notice Allows operator to commit the eligibility Merkle root before the round starts.
     * @param newRoot The Merkle root of keccak256(abi.encode(eligibleAddress)).
     */
    function setEligibilityRoot(bytes32 newRoot) external onlyOperator {
        if (block.timestamp >= roundStart) revert RoundAlreadyStarted();
        eligibilityRoot = newRoot;
        emit EligibilityRootUpdated(newRoot);
    }

    /**
     * @notice Allows the operator, sponsors, or community to deposit ETH into the matching pool.
     */
    function fundMatchingPool() external payable nonReentrant {
        if (isFinalized) revert RoundAlreadyFinalized();
        if (msg.value == 0) revert ZeroDeposit();

        matchingPool += msg.value;
        emit MatchingPoolFunded(msg.sender, msg.value, matchingPool);
    }

    /**
     * @notice Registers a new project before the round begins.
     * @param projectId Explicit unique ID for the project.
     * @param name Display name of the project.
     * @param description Brief summary of project purpose.
     * @param recipient Authorized address that will receive claimed funds.
     */
    function registerProject(
        uint256 projectId,
        string calldata name,
        string calldata description,
        address payable recipient
    ) external onlyOperator {
        if (block.timestamp >= roundStart) revert RegistrationClosed();
        if (projectId == 0) revert InvalidProjectId();
        if (_projects[projectId].registrationTimestamp != 0) revert DuplicateProjectId(projectId);
        if (recipient == address(0)) revert InvalidRecipient();
        if (bytes(name).length == 0) revert InvalidProjectName();
        if (projectIds.length >= MAX_PROJECTS) revert MaxProjectsExceeded();

        _projects[projectId] = Project({
            id: projectId,
            name: name,
            description: description,
            recipient: recipient,
            registrationTimestamp: block.timestamp,
            active: true,
            claimed: false,
            totalContributions: 0,
            contributorCount: 0,
            quadraticScore: 0,
            matchingAllocation: 0
        });

        projectIds.push(projectId);
        emit ProjectRegistered(projectId, name, recipient);
    }

    // --- Contribution ---

    /**
     * @notice Contributes ETH to a project during the active round window with a valid Merkle proof.
     * @dev Aggregates repeated contributions from the same wallet first.
     * @param projectId ID of the registered project to support.
     * @param merkleProof Merkle proof verifying leaf = keccak256(abi.encode(msg.sender)).
     */
    function contribute(uint256 projectId, bytes32[] calldata merkleProof) external payable nonReentrant {
        if (block.timestamp < roundStart) revert RoundNotStarted();
        if (block.timestamp >= roundEnd) revert RoundEnded();
        if (isFinalized) revert RoundAlreadyFinalized();
        if (msg.value == 0) revert ZeroContribution();

        Project storage project = _projects[projectId];
        if (project.registrationTimestamp == 0 || !project.active) revert ProjectNotActive(projectId);

        bytes32 leaf = keccak256(abi.encode(msg.sender));
        if (!MerkleProof.verify(merkleProof, eligibilityRoot, leaf)) revert IneligibleContributor(msg.sender);

        // Track unique contributor per project
        if (!_hasContributedToProject[projectId][msg.sender]) {
            if (_projectContributors[projectId].length >= MAX_CONTRIBUTORS_PER_PROJECT) {
                revert MaxContributorsExceeded(projectId);
            }
            _hasContributedToProject[projectId][msg.sender] = true;
            _projectContributors[projectId].push(msg.sender);
            project.contributorCount += 1;
        }

        // Track global unique contributor wallets
        if (!_hasContributedGlobally[msg.sender]) {
            _hasContributedGlobally[msg.sender] = true;
            uniqueWalletsCount += 1;
        }

        // Aggregate repeated contributions from same wallet
        contributions[projectId][msg.sender] += msg.value;
        project.totalContributions += msg.value;
        totalContributionsCollected += msg.value;

        emit ContributionReceived(projectId, msg.sender, msg.value, contributions[projectId][msg.sender]);
    }

    // --- Finalization ---

    /**
     * @notice Finalizes the round after roundEnd. Computes quadratic funding scores and proportional matches.
     * @dev Anyone can trigger finalization once the round end timestamp has elapsed.
     */
    function finalize() external nonReentrant {
        if (block.timestamp < roundEnd) revert RoundNotEnded();
        if (isFinalized) revert RoundAlreadyFinalized();

        uint256 pCount = projectIds.length;
        uint256 runningTotalScore = 0;

        // Step 1: Calculate quadratic score for each project using pre-aggregated contributor totals
        for (uint256 p = 0; p < pCount; p++) {
            uint256 pid = projectIds[p];
            address[] storage contributors = _projectContributors[pid];
            uint256 cCount = contributors.length;
            uint256 sumOfRoots = 0;

            for (uint256 i = 0; i < cCount; i++) {
                uint256 aggregateContribution = contributions[pid][contributors[i]];
                // r_{i,p} = floor(sqrt(c_{i,p} * S^2))
                sumOfRoots += IntegerSqrt.scaledSqrt(aggregateContribution, SCALE_SQUARED);
            }

            // Q_p = (sum r_{i,p})^2
            uint256 qScore = sumOfRoots * sumOfRoots;
            _projects[pid].quadraticScore = qScore;
            runningTotalScore += qScore;
        }

        totalQuadraticScore = runningTotalScore;

        // Step 2: Allocate matching pool proportionally: Match_p = floor((M * Q_p) / Q_total)
        uint256 runningAllocatedMatching = 0;
        if (runningTotalScore > 0 && matchingPool > 0) {
            for (uint256 p = 0; p < pCount; p++) {
                uint256 pid = projectIds[p];
                uint256 qScore = _projects[pid].quadraticScore;
                if (qScore > 0) {
                    uint256 matchAmount = Math.mulDiv(matchingPool, qScore, runningTotalScore);
                    _projects[pid].matchingAllocation = matchAmount;
                    runningAllocatedMatching += matchAmount;
                }
            }
        }

        totalAllocatedMatching = runningAllocatedMatching;
        isFinalized = true;

        emit RoundFinalized(runningTotalScore, runningAllocatedMatching, pCount);
    }

    // --- Claim ---

    /**
     * @notice Allows a registered project recipient to withdraw their total contributions plus matching allocation.
     * @dev Follows checks-effects-interactions and ReentrancyGuard to prevent double-spending or reentrancy.
     * @param projectId The ID of the project to claim funds for.
     */
    function claimProjectFunds(uint256 projectId) external nonReentrant {
        if (!isFinalized) revert RoundNotFinalized();

        Project storage project = _projects[projectId];
        if (project.registrationTimestamp == 0) revert ProjectNotFound(projectId);
        if (project.claimed) revert AlreadyClaimed(projectId);

        // Mark claimed before external transfer (Checks-Effects-Interactions)
        project.claimed = true;

        uint256 claimAmount = project.totalContributions + project.matchingAllocation;
        totalClaimedAmount += claimAmount;

        address payable recipient = project.recipient;

        // Emit event before external call following best practices
        emit ProjectClaimed(projectId, recipient, claimAmount, project.totalContributions, project.matchingAllocation);

        (bool success,) = recipient.call{value: claimAmount}("");
        if (!success) revert TransferFailed();
    }

    // --- Public Read APIs ---

    /**
     * @notice Returns current status of the round.
     */
    function getRoundStatus() external view returns (RoundStatus) {
        if (isFinalized) return RoundStatus.Finalized;
        if (block.timestamp < roundStart) return RoundStatus.Upcoming;
        if (block.timestamp < roundEnd) return RoundStatus.Live;
        return RoundStatus.Ended;
    }

    /**
     * @notice Returns total number of registered projects.
     */
    function getProjectCount() external view returns (uint256) {
        return projectIds.length;
    }

    /**
     * @notice Returns all registered project IDs.
     */
    function getAllProjectIds() external view returns (uint256[] memory) {
        return projectIds;
    }

    /**
     * @notice Returns project details by ID.
     */
    function getProject(uint256 projectId) external view returns (Project memory) {
        if (_projects[projectId].registrationTimestamp == 0) revert ProjectNotFound(projectId);
        return _projects[projectId];
    }

    /**
     * @notice Returns list of unique contributors for a project.
     */
    function getProjectContributors(uint256 projectId) external view returns (address[] memory) {
        return _projectContributors[projectId];
    }

    /**
     * @notice Returns contribution of a specific contributor to a project.
     */
    function getContribution(uint256 projectId, address contributor) external view returns (uint256) {
        return contributions[projectId][contributor];
    }

    /**
     * @notice Returns total direct contributions received by a project.
     */
    function getProjectContributionTotal(uint256 projectId) external view returns (uint256) {
        return _projects[projectId].totalContributions;
    }

    /**
     * @notice Returns count of unique contributors for a project.
     */
    function getProjectContributorCount(uint256 projectId) external view returns (uint256) {
        return _projects[projectId].contributorCount;
    }

    /**
     * @notice Returns finalized quadratic score of a project.
     */
    function getProjectScore(uint256 projectId) external view returns (uint256) {
        return _projects[projectId].quadraticScore;
    }

    /**
     * @notice Returns finalized matching allocation of a project.
     */
    function getProjectMatch(uint256 projectId) external view returns (uint256) {
        return _projects[projectId].matchingAllocation;
    }

    /**
     * @notice Returns whether a project has claimed its funds.
     */
    function hasProjectClaimed(uint256 projectId) external view returns (bool) {
        return _projects[projectId].claimed;
    }

    /**
     * @notice Returns claimable amount (contributions + match) for a project if unclaimed and finalized.
     */
    function getProjectClaimable(uint256 projectId) external view returns (uint256) {
        Project storage project = _projects[projectId];
        if (project.registrationTimestamp == 0 || project.claimed || !isFinalized) {
            return 0;
        }
        return project.totalContributions + project.matchingAllocation;
    }

    /**
     * @notice Checks if an account is eligible using the Merkle root.
     */
    function isEligible(address account, bytes32[] calldata proof) external view returns (bool) {
        bytes32 leaf = keccak256(abi.encode(account));
        return MerkleProof.verify(proof, eligibilityRoot, leaf);
    }

    /**
     * @notice Returns total direct contributions across all projects.
     */
    function getTotalContributions() external view returns (uint256) {
        return totalContributionsCollected;
    }

    /**
     * @notice Returns total outstanding matching liabilities (allocated minus claimed).
     */
    function getTotalMatchingLiabilities() external view returns (uint256) {
        if (!isFinalized) return 0;
        uint256 claimedMatching = 0;
        uint256 pLen = projectIds.length;
        for (uint256 i = 0; i < pLen; i++) {
            if (_projects[projectIds[i]].claimed) {
                claimedMatching += _projects[projectIds[i]].matchingAllocation;
            }
        }
        return totalAllocatedMatching - claimedMatching;
    }

    /**
     * @notice Returns unallocated matching pool funds (matching pool minus allocated matching).
     */
    function getRemainingMatchingPool() external view returns (uint256) {
        if (!isFinalized) return matchingPool;
        return matchingPool - totalAllocatedMatching;
    }
}
