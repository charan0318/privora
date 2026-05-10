// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@fhevm/solidity/lib/FHE.sol";

interface IPredictionHub {
    // Enums
    enum PredictionType { BINARY, MULTIPLE_CHOICE, NESTED_CHOICE }
    enum Outcome { YES, NO }

    // Structs
    struct Prediction {
        uint256 id;
        uint256 endTime;
        bool isActive;
        bool isResolved;
        PredictionType predictionType;
        address createdBy;
        uint256 minPositionAmount;
        uint256 maxPositionAmount;
        uint256 optionCount;
        uint256 createdAt;
        string title;
        string description;
        uint256 liquidityParam;
    }

    struct PositionOption {
        string title;
        bool isWinner;
        uint256 publicTotalShares;
        uint256 publicYesShares;
        uint256 publicNoShares;
    }

    // Core getters
    function predictions(uint256 predictionId) external view returns (
        uint256 id,
        uint256 endTime,
        bool isActive,
        bool isResolved,
        PredictionType predictionType,
        address createdBy,
        uint256 minPositionAmount,
        uint256 maxPositionAmount,
        uint256 optionCount,
        uint256 createdAt,
        string memory title,
        string memory description,
        uint256 liquidityParam
    );

    function getPrediction(uint256 predictionId) external view returns (Prediction memory);
    function getPositionOption(uint256 predictionId, uint256 optionIndex) external view returns (PositionOption memory);
    function hasSubmittedPosition(address user, uint256 predictionId) external view returns (bool);
    function hasRedeemed(address user, uint256 predictionId) external view returns (bool);

    // Balance management
    function getUserEncryptedBalance(address user) external view returns (euint64);
    function getUserEncryptedPositionAmount(address user, uint256 predictionId, uint256 optionIndex) external view returns (euint64);
    function getUserNestedPositionAmount(address user, uint256 predictionId, uint256 optionIndex, uint8 outcome) external view returns (euint64);

    // Option totals
    function getOptionEncryptedTotal(uint256 predictionId, uint256 optionIndex) external view returns (euint64);
    function getNestedOptionEncryptedTotal(uint256 predictionId, uint256 optionIndex, uint8 outcome) external view returns (euint64);
    function getTotalPoolEncrypted(uint256 predictionId) external view returns (euint64);

    // Setters (only for authorized contracts)
    function setHasRedeemed(address user, uint256 predictionId) external;
    function addToUserBalance(address user, uint256 amount) external;
}
