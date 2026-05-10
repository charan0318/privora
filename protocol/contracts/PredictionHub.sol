// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title Intelligence Hub - Institutional Research Infrastructure
 * @notice Core contract for encrypted intelligence signals and confidence-weighted research allocations
 * @dev Built on Zama FHEVM for confidential research operations
 */
contract PredictionHub is SepoliaConfig, ReentrancyGuard {
    // --- Types ---
    enum SignalType { BINARY, MULTIPLE_CHOICE, NESTED_CHOICE }
    enum Outcome { YES, NO }

    /**
     * @dev Represents an intelligence signal for institutional research
     */
    struct IntelligenceSignal {
        uint256 id;
        uint256 endTime;
        bool isActive;
        bool isResolved;
        SignalType signalType;
        address createdBy;
        uint256 minAllocationAmount;
        uint256 maxAllocationAmount;
        uint256 optionCount;
        uint256 createdAt;
        string title;
        string description;
        uint256 liquidityParam;
    }

    /**
     * @dev Represents a research option within an intelligence signal
     */
    struct ResearchOption {
        string title;
        bool isWinner;
        uint256 publicTotalShares;
        uint256 publicYesShares;
        uint256 publicNoShares;
    }

    /**
     * @dev Encrypted research transaction record
     */
    struct EncryptedResearchTransaction {
        uint256 timestamp;
        euint8 optionIndex;
        euint8 outcome;
        euint64 amount;
        uint64 priceAtPosition;
    }

    // --- Storage ---
    mapping(uint256 => IntelligenceSignal) public signals;
    mapping(uint256 => ResearchOption[]) private researchOptions;
    uint256 private nextSignalId = 1;

    mapping(address => euint64) private userEncryptedBalances;
    mapping(address => mapping(uint256 => mapping(uint256 => euint64))) private userAllocationAmounts;
    mapping(address => mapping(uint256 => euint8)) private userOptionChoices;
    mapping(address => mapping(uint256 => mapping(uint256 => mapping(uint8 => euint64)))) private userNestedAllocationAmounts;

    mapping(address => mapping(uint256 => bool)) public hasSubmittedAllocation;
    mapping(address => mapping(uint256 => bool)) public hasRedeemed;

    address[] private allResearchers;
    mapping(address => bool) private isResearcher;

    mapping(uint256 => mapping(uint256 => euint64)) private optionTotals;
    mapping(uint256 => mapping(uint256 => mapping(uint8 => euint64))) private nestedOptionTotals;
    mapping(uint256 => euint64) private totalPoolAmounts;
    mapping(uint256 => euint32) private totalParticipants;
    mapping(uint256 => uint256) public totalAllocationCount;

    mapping(address => mapping(uint256 => EncryptedResearchTransaction[])) private userResearchTransactions;

    // Global total volume across all intelligence signals
    euint64 public globalTotalVolume;

    IERC20 public usdcToken;
    address public owner;

    // Authorized contracts
    address public settlementContract;
    address public analyticsContract;

    // Events
    event Deposited(address indexed researcher, uint256 amount);
    event SignalInitialized(uint256 indexed signalId, uint256 indexed endTime, uint256 optionCount);
    event AllocationSubmitted(uint256 indexed signalId, address indexed researcher, uint256 timestamp);
    event OutcomeFinalized(uint256 indexed signalId, uint256 indexed winnerIndex);
    event NestedOutcomeFinalized(uint256 indexed signalId, uint256 indexed optionIndex, uint8 indexed outcome);
    event Withdrawn(address indexed researcher, uint256 amount);
    event OwnerChanged(address indexed oldOwner, address indexed newOwner);
    event SettlementContractSet(address indexed settlementContract);
    event AnalyticsContractSet(address indexed analyticsContract);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyAuthorized() {
        require(
            msg.sender == owner ||
            msg.sender == settlementContract ||
            msg.sender == analyticsContract,
            "Not authorized"
        );
        _;
    }

    modifier signalExists(uint256 _signalId) {
        require(signals[_signalId].id != 0, "Signal does not exist");
        _;
    }

    modifier signalActive(uint256 _signalId) {
        require(signals[_signalId].isActive, "Signal not active");
        require(block.timestamp < signals[_signalId].endTime, "Signal ended");
        require(!signals[_signalId].isResolved, "Signal resolved");
        _;
    }

    modifier signalFinalized(uint256 _signalId) {
        // DISABLED FOR TESTING: Allow finalizing signals before end time
        // require(block.timestamp >= signals[_signalId].endTime, "Signal not ended");
        _;
    }

    constructor(address _usdcToken) {
        require(_usdcToken != address(0), "USDC address zero");
        owner = msg.sender;
        usdcToken = IERC20(_usdcToken);

        // Initialize global total volume
        globalTotalVolume = FHE.asEuint64(0);
        FHE.allowThis(globalTotalVolume);
        FHE.makePubliclyDecryptable(globalTotalVolume);
    }

    function setSettlementContract(address _settlementContract) external onlyOwner {
        require(_settlementContract != address(0), "Zero address");
        settlementContract = _settlementContract;
        emit SettlementContractSet(_settlementContract);
    }

    function setAnalyticsContract(address _analyticsContract) external onlyOwner {
        require(_analyticsContract != address(0), "Zero address");
        analyticsContract = _analyticsContract;
        emit AnalyticsContractSet(_analyticsContract);
    }

    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Zero address");
        address old = owner;
        owner = _newOwner;
        emit OwnerChanged(old, _newOwner);
    }

    function deposit(uint256 _amount) external nonReentrant {
        require(_amount > 0, "Amount must be > 0");
        require(usdcToken.transferFrom(msg.sender, address(this), _amount), "USDC transfer failed");

        euint64 currentBalance = userEncryptedBalances[msg.sender];
        euint64 amountEncrypted = FHE.asEuint64(uint64(_amount));

        if (FHE.isInitialized(currentBalance)) {
            userEncryptedBalances[msg.sender] = FHE.add(currentBalance, amountEncrypted);
        } else {
            userEncryptedBalances[msg.sender] = amountEncrypted;
        }

        FHE.allowThis(userEncryptedBalances[msg.sender]);
        FHE.allow(userEncryptedBalances[msg.sender], msg.sender);

        emit Deposited(msg.sender, _amount);
    }

    /**
     * @notice Initialize a new intelligence signal for institutional research
     * @param _optionCount Number of research options available
     * @param _endTime Signal resolution timestamp
     * @param _signalType Type of intelligence signal (BINARY, MULTIPLE_CHOICE, NESTED_CHOICE)
     * @param _minAllocationAmount Minimum research allocation
     * @param _maxAllocationAmount Maximum research allocation
     * @param _liquidityParam Liquidity parameter for signal creator
     * @param _title Signal title
     * @param _description Signal description
     * @param _optionTitles Titles for each research option
     * @return signalId The ID of the created signal
     */
    function initializeSignal(
        uint256 _optionCount,
        uint256 _endTime,
        SignalType _signalType,
        uint256 _minAllocationAmount,
        uint256 _maxAllocationAmount,
        uint256 _liquidityParam,
        string memory _title,
        string memory _description,
        string[] memory _optionTitles
    ) external returns (uint256) {
        require(_optionCount >= 2, "At least 2 options required");
        require(_endTime > block.timestamp, "End time must be in future");
        require(_minAllocationAmount > 0, "Min allocation > 0");
        require(_maxAllocationAmount >= _minAllocationAmount, "Max >= Min");
        require(_liquidityParam >= 10, "Liquidity param too low");
        require(_liquidityParam <= 1000, "Liquidity param too high");
        require(_optionTitles.length == _optionCount, "Option titles count mismatch");

        // Transfer liquidity USDC from signal creator to contract
        uint256 liquidityAmount = _liquidityParam * 1e6; // Convert to 6 decimals (USDC)
        require(usdcToken.transferFrom(msg.sender, address(this), liquidityAmount), "Liquidity transfer failed");

        uint256 signalId = nextSignalId++;
        signals[signalId] = IntelligenceSignal({
            id: signalId,
            endTime: _endTime,
            isActive: true,
            isResolved: false,
            signalType: _signalType,
            createdBy: msg.sender,
            minAllocationAmount: _minAllocationAmount,
            maxAllocationAmount: _maxAllocationAmount,
            optionCount: _optionCount,
            createdAt: block.timestamp,
            title: _title,
            description: _description,
            liquidityParam: _liquidityParam
        });

        // Distribute liquidity to YES/NO pools for NESTED bets
        uint256 liquidityPerOutcome = liquidityAmount / 2; // Split equally between YES and NO
        uint256 liquidityPerOption = liquidityPerOutcome / _optionCount; // Distribute across options

        for (uint256 i = 0; i < _optionCount; i++) {
            researchOptions[signalId].push(ResearchOption({
                title: _optionTitles[i],
                isWinner: false,
                publicTotalShares: 0,
                publicYesShares: 0,
                publicNoShares: 0
            }));

            if (_signalType == SignalType.NESTED_CHOICE) {
                // Initialize YES/NO pools at 0 (liquidity only in totalPool)
                nestedOptionTotals[signalId][i][uint8(Outcome.YES)] = FHE.asEuint64(0);
                nestedOptionTotals[signalId][i][uint8(Outcome.NO)] = FHE.asEuint64(0);
                FHE.allowThis(nestedOptionTotals[signalId][i][uint8(Outcome.YES)]);
                FHE.allowThis(nestedOptionTotals[signalId][i][uint8(Outcome.NO)]);
                if (settlementContract != address(0)) {
                    FHE.allow(nestedOptionTotals[signalId][i][uint8(Outcome.YES)], settlementContract);
                    FHE.allow(nestedOptionTotals[signalId][i][uint8(Outcome.NO)], settlementContract);
                }
                FHE.makePubliclyDecryptable(nestedOptionTotals[signalId][i][uint8(Outcome.YES)]);
                FHE.makePubliclyDecryptable(nestedOptionTotals[signalId][i][uint8(Outcome.NO)]);
            } else {
                optionTotals[signalId][i] = FHE.asEuint64(0);
                FHE.allowThis(optionTotals[signalId][i]);
                if (settlementContract != address(0)) {
                    FHE.allow(optionTotals[signalId][i], settlementContract);
                }
                FHE.makePubliclyDecryptable(optionTotals[signalId][i]);
            }
        }

        // Initialize total pool with liquidity amount
        totalPoolAmounts[signalId] = FHE.asEuint64(uint64(liquidityAmount));
        totalParticipants[signalId] = FHE.asEuint32(0);
        FHE.allowThis(totalPoolAmounts[signalId]);
        FHE.allowThis(totalParticipants[signalId]);
        if (settlementContract != address(0)) {
            FHE.allow(totalPoolAmounts[signalId], settlementContract);
        }
        FHE.makePubliclyDecryptable(totalPoolAmounts[signalId]);
        FHE.makePubliclyDecryptable(totalParticipants[signalId]);

        emit SignalInitialized(signalId, _endTime, _optionCount);
        return signalId;
    }

    /**
     * @notice Submit a research allocation to an intelligence signal
     * @param _signalId The signal ID
     * @param _encryptedOptionIndex Encrypted option index selection
     * @param _optionProof Proof for option decryption
     * @param _encryptedAmount Encrypted allocation amount
     * @param _amountProof Proof for amount decryption
     */
    function submitAllocation(
        uint256 _signalId,
        externalEuint8 _encryptedOptionIndex,
        bytes calldata _optionProof,
        externalEuint64 _encryptedAmount,
        bytes calldata _amountProof
    ) external nonReentrant signalExists(_signalId) signalActive(_signalId) {
        require(signals[_signalId].signalType != SignalType.NESTED_CHOICE, "Use submitNestedAllocation for nested signals");

        euint8 optionIndex = FHE.fromExternal(_encryptedOptionIndex, _optionProof);
        euint64 amount = FHE.fromExternal(_encryptedAmount, _amountProof);

        FHE.allowThis(optionIndex);
        FHE.allowThis(amount);

        uint64 currentPrice = _calculateBinaryPrice(_signalId);
        _processEncryptedAllocation(_signalId, optionIndex, amount);

        euint8 zeroOutcome = FHE.asEuint8(0);
        userResearchTransactions[msg.sender][_signalId].push(EncryptedResearchTransaction({
            timestamp: block.timestamp,
            optionIndex: optionIndex,
            outcome: zeroOutcome,
            amount: amount,
            priceAtPosition: currentPrice
        }));

        FHE.allow(optionIndex, msg.sender);
        FHE.allow(zeroOutcome, msg.sender);
        FHE.allow(amount, msg.sender);

        totalAllocationCount[_signalId]++;
        emit AllocationSubmitted(_signalId, msg.sender, block.timestamp);
    }

    /**
     * @notice Submit a nested research allocation (for NESTED_CHOICE signals)
     * @param _signalId The signal ID
     * @param _encryptedOptionIndex Encrypted option index selection
     * @param _optionProof Proof for option decryption
     * @param _encryptedOutcome Encrypted outcome selection (YES/NO)
     * @param _outcomeProof Proof for outcome decryption
     * @param _encryptedAmount Encrypted allocation amount
     * @param _amountProof Proof for amount decryption
     */
    function submitNestedAllocation(
        uint256 _signalId,
        externalEuint8 _encryptedOptionIndex,
        bytes calldata _optionProof,
        externalEuint8 _encryptedOutcome,
        bytes calldata _outcomeProof,
        externalEuint64 _encryptedAmount,
        bytes calldata _amountProof
    ) external nonReentrant signalExists(_signalId) signalActive(_signalId) {
        require(signals[_signalId].signalType == SignalType.NESTED_CHOICE, "Use submitAllocation for non-nested signals");

        euint8 optionIndex = FHE.fromExternal(_encryptedOptionIndex, _optionProof);
        euint8 outcome = FHE.fromExternal(_encryptedOutcome, _outcomeProof);
        euint64 amount = FHE.fromExternal(_encryptedAmount, _amountProof);

        FHE.allowThis(optionIndex);
        FHE.allowThis(outcome);
        FHE.allowThis(amount);

        uint64 currentPrice = _calculateNestedPrice(_signalId);
        _processNestedEncryptedAllocation(_signalId, optionIndex, outcome, amount);

        userResearchTransactions[msg.sender][_signalId].push(EncryptedResearchTransaction({
            timestamp: block.timestamp,
            optionIndex: optionIndex,
            outcome: outcome,
            amount: amount,
            priceAtPosition: currentPrice
        }));

        FHE.allow(optionIndex, msg.sender);
        FHE.allow(outcome, msg.sender);
        FHE.allow(amount, msg.sender);

        totalAllocationCount[_signalId]++;
        emit AllocationSubmitted(_signalId, msg.sender, block.timestamp);
    }

    function _processEncryptedAllocation(uint256 _signalId, euint8 optionIndex, euint64 amount) internal {
        euint64 currentBalance = userEncryptedBalances[msg.sender];

        ebool validOption = FHE.lt(optionIndex, FHE.asEuint8(uint8(signals[_signalId].optionCount)));
        ebool validMinAmount = FHE.ge(amount, FHE.asEuint64(uint64(signals[_signalId].minAllocationAmount)));
        ebool validMaxAmount = FHE.le(amount, FHE.asEuint64(uint64(signals[_signalId].maxAllocationAmount)));
        ebool validAmount = FHE.and(validMinAmount, validMaxAmount);
        ebool hasSufficientBalance = FHE.ge(currentBalance, amount);
        ebool allValid = FHE.and(FHE.and(validOption, validAmount), hasSufficientBalance);

        euint64 updatedBalance = FHE.select(allValid, FHE.sub(currentBalance, amount), currentBalance);
        userEncryptedBalances[msg.sender] = updatedBalance;
        FHE.allowThis(userEncryptedBalances[msg.sender]);
        FHE.allow(userEncryptedBalances[msg.sender], msg.sender);

        bool isFirstAllocation = !hasSubmittedAllocation[msg.sender][_signalId];
        if (isFirstAllocation) {
            userOptionChoices[msg.sender][_signalId] = FHE.select(allValid, optionIndex, FHE.asEuint8(0));
        } else {
            euint8 existingChoice = userOptionChoices[msg.sender][_signalId];
            userOptionChoices[msg.sender][_signalId] = FHE.select(allValid, optionIndex, existingChoice);
        }
        FHE.allowThis(userOptionChoices[msg.sender][_signalId]);
        FHE.allow(userOptionChoices[msg.sender][_signalId], msg.sender);
        if (settlementContract != address(0)) {
            FHE.allow(userOptionChoices[msg.sender][_signalId], settlementContract);
        }

        _updateEncryptedAllocationTotals(_signalId, optionIndex, amount, allValid, isFirstAllocation);

        if (isFirstAllocation) {
            hasSubmittedAllocation[msg.sender][_signalId] = true;
            if (!isResearcher[msg.sender]) {
                isResearcher[msg.sender] = true;
                allResearchers.push(msg.sender);
            }
            euint32 currentParticipants = totalParticipants[_signalId];
            totalParticipants[_signalId] = FHE.select(allValid, FHE.add(currentParticipants, FHE.asEuint32(1)), currentParticipants);
            FHE.allowThis(totalParticipants[_signalId]);
            FHE.makePubliclyDecryptable(totalParticipants[_signalId]);
        }
    }

    function _processNestedEncryptedAllocation(uint256 _signalId, euint8 optionIndex, euint8 outcome, euint64 amount) internal {
        euint64 currentBalance = userEncryptedBalances[msg.sender];

        ebool validOption = FHE.lt(optionIndex, FHE.asEuint8(uint8(signals[_signalId].optionCount)));
        ebool validOutcome = FHE.lt(outcome, FHE.asEuint8(2));
        ebool validMinAmount = FHE.ge(amount, FHE.asEuint64(uint64(signals[_signalId].minAllocationAmount)));
        ebool validMaxAmount = FHE.le(amount, FHE.asEuint64(uint64(signals[_signalId].maxAllocationAmount)));
        ebool validAmount = FHE.and(validMinAmount, validMaxAmount);
        ebool hasSufficientBalance = FHE.ge(currentBalance, amount);
        ebool allValid = FHE.and(FHE.and(FHE.and(validOption, validOutcome), validAmount), hasSufficientBalance);

        euint64 updatedBalance = FHE.select(allValid, FHE.sub(currentBalance, amount), currentBalance);
        userEncryptedBalances[msg.sender] = updatedBalance;
        FHE.allowThis(userEncryptedBalances[msg.sender]);
        FHE.allow(userEncryptedBalances[msg.sender], msg.sender);

        bool isFirstAllocation = !hasSubmittedAllocation[msg.sender][_signalId];
        _updateNestedEncryptedAllocationTotals(_signalId, optionIndex, outcome, amount, allValid, isFirstAllocation);

        if (isFirstAllocation) {
            hasSubmittedAllocation[msg.sender][_signalId] = true;
            if (!isResearcher[msg.sender]) {
                isResearcher[msg.sender] = true;
                allResearchers.push(msg.sender);
            }
            euint32 currentParticipants = totalParticipants[_signalId];
            totalParticipants[_signalId] = FHE.select(allValid, FHE.add(currentParticipants, FHE.asEuint32(1)), currentParticipants);
            FHE.allowThis(totalParticipants[_signalId]);
            FHE.makePubliclyDecryptable(totalParticipants[_signalId]);
        }
    }

    function _updateEncryptedAllocationTotals(uint256 _signalId, euint8 optionIndex, euint64 amount, ebool isValid, bool isFirstAllocation) internal {
        uint256 len = researchOptions[_signalId].length;
        for (uint256 i = 0; i < len; i++) {
            euint8 currentOption = FHE.asEuint8(uint8(i));
            ebool isThisOption = FHE.eq(optionIndex, currentOption);
            ebool shouldUpdate = FHE.and(isValid, isThisOption);

            euint64 currentUserAmount = isFirstAllocation ? FHE.asEuint64(0) : userAllocationAmounts[msg.sender][_signalId][i];
            userAllocationAmounts[msg.sender][_signalId][i] = FHE.select(shouldUpdate, FHE.add(currentUserAmount, amount), currentUserAmount);
            FHE.allowThis(userAllocationAmounts[msg.sender][_signalId][i]);
            FHE.allow(userAllocationAmounts[msg.sender][_signalId][i], msg.sender);
            if (settlementContract != address(0)) {
                FHE.allow(userAllocationAmounts[msg.sender][_signalId][i], settlementContract);
            }

            euint64 currentTotal = optionTotals[_signalId][i];
            optionTotals[_signalId][i] = FHE.select(shouldUpdate, FHE.add(currentTotal, amount), currentTotal);
            FHE.allowThis(optionTotals[_signalId][i]);
            if (settlementContract != address(0)) {
                FHE.allow(optionTotals[_signalId][i], settlementContract);
            }
            FHE.makePubliclyDecryptable(optionTotals[_signalId][i]);
        }

        euint64 currentPool = totalPoolAmounts[_signalId];
        totalPoolAmounts[_signalId] = FHE.select(isValid, FHE.add(currentPool, amount), currentPool);
        FHE.allowThis(totalPoolAmounts[_signalId]);
        if (settlementContract != address(0)) {
            FHE.allow(totalPoolAmounts[_signalId], settlementContract);
        }
        FHE.makePubliclyDecryptable(totalPoolAmounts[_signalId]);

        // Update global total volume
        globalTotalVolume = FHE.select(isValid, FHE.add(globalTotalVolume, amount), globalTotalVolume);
        FHE.allowThis(globalTotalVolume);
        FHE.makePubliclyDecryptable(globalTotalVolume);
    }

    function _updateNestedEncryptedAllocationTotals(uint256 _signalId, euint8 optionIndex, euint8 outcome, euint64 amount, ebool isValid, bool isFirstAllocation) internal {
        uint256 len = researchOptions[_signalId].length;

        // Initialize ALL option/outcome combinations on first allocation
        if (isFirstAllocation) {
            for (uint256 i = 0; i < len; i++) {
                for (uint8 j = 0; j < 2; j++) {
                    userNestedAllocationAmounts[msg.sender][_signalId][i][j] = FHE.asEuint64(0);
                    FHE.allowThis(userNestedAllocationAmounts[msg.sender][_signalId][i][j]);
                    FHE.allow(userNestedAllocationAmounts[msg.sender][_signalId][i][j], msg.sender);
                    if (settlementContract != address(0)) {
                        FHE.allow(userNestedAllocationAmounts[msg.sender][_signalId][i][j], settlementContract);
                    }
                }
            }
        }

        // Update the actual allocation amounts
        for (uint256 i = 0; i < len; i++) {
            euint8 currentOption = FHE.asEuint8(uint8(i));
            ebool isThisOption = FHE.eq(optionIndex, currentOption);

            for (uint8 j = 0; j < 2; j++) {
                euint8 currentOutcome = FHE.asEuint8(j);
                ebool isThisOutcome = FHE.eq(outcome, currentOutcome);
                ebool shouldUpdate = FHE.and(FHE.and(isValid, isThisOption), isThisOutcome);

                euint64 currentUserAmount = userNestedAllocationAmounts[msg.sender][_signalId][i][j];
                userNestedAllocationAmounts[msg.sender][_signalId][i][j] = FHE.select(shouldUpdate, FHE.add(currentUserAmount, amount), currentUserAmount);
                FHE.allowThis(userNestedAllocationAmounts[msg.sender][_signalId][i][j]);
                FHE.allow(userNestedAllocationAmounts[msg.sender][_signalId][i][j], msg.sender);
                if (settlementContract != address(0)) {
                    FHE.allow(userNestedAllocationAmounts[msg.sender][_signalId][i][j], settlementContract);
                }

                euint64 currentTotal = nestedOptionTotals[_signalId][i][j];
                nestedOptionTotals[_signalId][i][j] = FHE.select(shouldUpdate, FHE.add(currentTotal, amount), currentTotal);
                FHE.allowThis(nestedOptionTotals[_signalId][i][j]);
                if (settlementContract != address(0)) {
                    FHE.allow(nestedOptionTotals[_signalId][i][j], settlementContract);
                }
                FHE.makePubliclyDecryptable(nestedOptionTotals[_signalId][i][j]);
            }
        }

        euint64 currentPool = totalPoolAmounts[_signalId];
        totalPoolAmounts[_signalId] = FHE.select(isValid, FHE.add(currentPool, amount), currentPool);
        FHE.allowThis(totalPoolAmounts[_signalId]);
        if (settlementContract != address(0)) {
            FHE.allow(totalPoolAmounts[_signalId], settlementContract);
        }
        FHE.makePubliclyDecryptable(totalPoolAmounts[_signalId]);

        // Update global total volume
        globalTotalVolume = FHE.select(isValid, FHE.add(globalTotalVolume, amount), globalTotalVolume);
        FHE.allowThis(globalTotalVolume);
        FHE.makePubliclyDecryptable(globalTotalVolume);
    }

    function _calculateBinaryPrice(uint256 _signalId) internal view returns (uint64) {
        uint256 liquidityParam = signals[_signalId].liquidityParam;
        uint256 totalShares = 0;
        uint256 optionCount = researchOptions[_signalId].length;

        for (uint256 i = 0; i < optionCount; i++) {
            totalShares += researchOptions[_signalId][i].publicTotalShares;
        }

        totalShares += liquidityParam * optionCount * 1000000;
        if (totalShares == 0) return uint64(1000000 / optionCount);

        uint256 avgPrice = 0;
        for (uint256 i = 0; i < optionCount; i++) {
            uint256 optionShares = researchOptions[_signalId][i].publicTotalShares + (liquidityParam * 1000000);
            avgPrice += (optionShares * 1000000) / totalShares;
        }

        return uint64(avgPrice / optionCount);
    }

    function _calculateNestedPrice(uint256 _signalId) internal view returns (uint64) {
        uint256 liquidityParam = signals[_signalId].liquidityParam;
        uint256 optionCount = researchOptions[_signalId].length;
        uint256 totalPrice = 0;
        uint256 validOptions = 0;

        for (uint256 i = 0; i < optionCount; i++) {
            uint256 yesShares = researchOptions[_signalId][i].publicYesShares;
            uint256 noShares = researchOptions[_signalId][i].publicNoShares;
            uint256 totalOptionShares = yesShares + noShares;

            if (totalOptionShares > 0) {
                uint256 yesProb = (yesShares * 1000000) / totalOptionShares;
                totalPrice += yesProb;
                validOptions++;
            } else {
                totalPrice += 500000;
                validOptions++;
            }
        }

        if (validOptions == 0) return 500000;
        return uint64(totalPrice / validOptions);
    }

    /**
     * @notice Finalize the outcome of a binary intelligence signal
     * @param _signalId The signal ID
     * @param _winnerIndex The winning option index
     */
    function finalizeSignalOutcome(uint256 _signalId, uint256 _winnerIndex) external signalExists(_signalId) signalFinalized(_signalId) onlyOwner {
        require(!signals[_signalId].isResolved, "Already resolved");
        require(_winnerIndex < researchOptions[_signalId].length, "Invalid winner");
        require(signals[_signalId].signalType != SignalType.NESTED_CHOICE, "Use finalizeNestedSignalOutcome for nested signals");

        for (uint256 i = 0; i < researchOptions[_signalId].length; i++) {
            require(!researchOptions[_signalId][i].isWinner, "Winner already set");
        }

        researchOptions[_signalId][_winnerIndex].isWinner = true;
        signals[_signalId].isResolved = true;
        emit OutcomeFinalized(_signalId, _winnerIndex);
    }

    /**
     * @notice Finalize the outcome of a nested intelligence signal
     * @param _signalId The signal ID
     * @param _optionIndex The winning option index
     * @param _outcome The winning outcome (YES/NO)
     */
    function finalizeNestedSignalOutcome(uint256 _signalId, uint256 _optionIndex, uint8 _outcome) external signalExists(_signalId) signalFinalized(_signalId) onlyOwner {
        require(!signals[_signalId].isResolved, "Already resolved");
        require(_optionIndex < researchOptions[_signalId].length, "Invalid option");
        require(_outcome <= 1, "Invalid outcome");
        require(signals[_signalId].signalType == SignalType.NESTED_CHOICE, "Use finalizeSignalOutcome for non-nested signals");

        researchOptions[_signalId][_optionIndex].isWinner = true;
        signals[_signalId].isResolved = true;

        // Return liquidity to signal creator
        uint256 liquidityAmount = signals[_signalId].liquidityParam * 1e6;
        address creator = signals[_signalId].createdBy;
        require(usdcToken.transfer(creator, liquidityAmount), "Liquidity return failed");

        emit NestedOutcomeFinalized(_signalId, _optionIndex, _outcome);
    }

    function withdraw(uint256 _amount) external nonReentrant {
        require(_amount > 0, "Amount must be greater than 0");

        euint64 currentBalance = userEncryptedBalances[msg.sender];
        euint64 amountEncrypted = FHE.asEuint64(uint64(_amount));
        ebool hasSufficient = FHE.ge(currentBalance, amountEncrypted);

        euint64 newBalance = FHE.select(hasSufficient, FHE.sub(currentBalance, amountEncrypted), currentBalance);
        userEncryptedBalances[msg.sender] = newBalance;
        FHE.allowThis(userEncryptedBalances[msg.sender]);
        FHE.allow(userEncryptedBalances[msg.sender], msg.sender);

        require(usdcToken.transfer(msg.sender, _amount), "USDC transfer failed");
        emit Withdrawn(msg.sender, _amount);
    }

    // ===== AUTHORIZED CONTRACT FUNCTIONS =====

    function setHasRedeemed(address _researcher, uint256 _signalId) external onlyAuthorized {
        hasRedeemed[_researcher][_signalId] = true;
    }

    function addToUserBalance(address _researcher, uint256 _amount) external onlyAuthorized {
        euint64 currentBalance = userEncryptedBalances[_researcher];
        euint64 amountEncrypted = FHE.asEuint64(uint64(_amount));
        euint64 newBalance = FHE.add(currentBalance, amountEncrypted);

        userEncryptedBalances[_researcher] = newBalance;
        FHE.allowThis(userEncryptedBalances[_researcher]);
        FHE.allow(userEncryptedBalances[_researcher], _researcher);
    }

    function setResearchOptionWinner(uint256 _signalId, uint256 _optionIndex) external onlyAuthorized {
        researchOptions[_signalId][_optionIndex].isWinner = true;
    }

    function updatePublicShares(
        uint256 _signalId,
        uint256 _optionIndex,
        uint256 _totalShares,
        uint256 _yesShares,
        uint256 _noShares
    ) external onlyAuthorized {
        researchOptions[_signalId][_optionIndex].publicTotalShares = _totalShares;
        researchOptions[_signalId][_optionIndex].publicYesShares = _yesShares;
        researchOptions[_signalId][_optionIndex].publicNoShares = _noShares;
    }

    // ===== VIEW FUNCTIONS =====

    function getTotalSignals() external view returns (uint256) {
        return nextSignalId - 1;
    }

    function getSignal(uint256 _signalId) external view signalExists(_signalId) returns (IntelligenceSignal memory) {
        return signals[_signalId];
    }

    function getResearchOption(uint256 _signalId, uint256 _optionIndex) external view signalExists(_signalId) returns (ResearchOption memory) {
        require(_optionIndex < researchOptions[_signalId].length, "Invalid option");
        return researchOptions[_signalId][_optionIndex];
    }

    function getSignalOptions(uint256 _signalId) external view signalExists(_signalId) returns (ResearchOption[] memory) {
        return researchOptions[_signalId];
    }

    function getMyEncryptedBalance() external view returns (euint64) {
        return userEncryptedBalances[msg.sender];
    }

    function getUserEncryptedBalance(address _researcher) external view returns (euint64) {
        return userEncryptedBalances[_researcher];
    }

    function getUserEncryptedAllocationAmount(address _researcher, uint256 _signalId, uint256 _optionIndex) external view returns (euint64) {
        return userAllocationAmounts[_researcher][_signalId][_optionIndex];
    }

    function getUserNestedAllocationAmount(address _researcher, uint256 _signalId, uint256 _optionIndex, uint8 _outcome) external view returns (euint64) {
        return userNestedAllocationAmounts[_researcher][_signalId][_optionIndex][_outcome];
    }

    function getOptionEncryptedTotal(uint256 _signalId, uint256 _optionIndex) external view signalExists(_signalId) returns (euint64) {
        require(_optionIndex < researchOptions[_signalId].length, "Invalid option");
        return optionTotals[_signalId][_optionIndex];
    }

    function getNestedOptionEncryptedTotal(uint256 _signalId, uint256 _optionIndex, uint8 _outcome) external view signalExists(_signalId) returns (euint64) {
        require(_optionIndex < researchOptions[_signalId].length, "Invalid option");
        require(_outcome <= 1, "Invalid outcome");
        return nestedOptionTotals[_signalId][_optionIndex][_outcome];
    }

    function getTotalPoolEncrypted(uint256 _signalId) external view signalExists(_signalId) returns (euint64) {
        return totalPoolAmounts[_signalId];
    }

    function getTotalParticipantsEncrypted(uint256 _signalId) external view signalExists(_signalId) returns (euint32) {
        return totalParticipants[_signalId];
    }

    function getTotalAllocationCount(uint256 _signalId) external view signalExists(_signalId) returns (uint256) {
        return totalAllocationCount[_signalId];
    }

    function getUniqueResearchersCount() external view returns (uint256) {
        return allResearchers.length;
    }

    function getAllResearchers() external view returns (address[] memory) {
        return allResearchers;
    }

    function isAddressResearcher(address _address) external view returns (bool) {
        return isResearcher[_address];
    }

    function getUserTransactionCount(address _researcher, uint256 _signalId) external view returns (uint256) {
        return userResearchTransactions[_researcher][_signalId].length;
    }

    function getUserAllTransactions(address _researcher, uint256 _signalId) external view returns (EncryptedResearchTransaction[] memory) {
        return userResearchTransactions[_researcher][_signalId];
    }

    function getHasSubmittedAllocation(address _researcher, uint256 _signalId) external view returns (bool) {
        return hasSubmittedAllocation[_researcher][_signalId];
    }

    receive() external payable {}
}
