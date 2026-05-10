// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import "./PredictionHub.sol";

/**
 * @title Intelligence Ledger - Analytics & Statistics
 * @notice Tracks research accuracy and provides analytics for intelligence signals
 */
contract IntelligenceLedger is SepoliaConfig {
    PredictionHub public hub;
    address public owner;

    mapping(uint256 => uint256) public signalDecryptionRequests;
    mapping(uint256 => bool) public isSignalStatsDecrypted;

    event SignalStatisticsDecrypted(uint256 indexed signalId, uint256 indexed requestId);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address payable _coreContract) {
        require(_coreContract != address(0), "Core address zero");
        hub = PredictionHub(_coreContract);
        owner = msg.sender;
    }

    /**
     * @notice Request statistics decryption for an intelligence signal
     * @param _signalId The signal ID to decrypt statistics for
     */
    function requestSignalStatistics(uint256 _signalId) external onlyOwner {
        (uint256 id, uint256 endTime, , , PredictionHub.SignalType signalType, , , , uint256 optionCount, , , , ) = hub.signals(_signalId);

        require(id != 0, "Signal does not exist");
        require(block.timestamp >= endTime, "Signal not ended");
        require(!isSignalStatsDecrypted[_signalId], "Already decrypted");

        bytes32[] memory cts;

        if (signalType == PredictionHub.SignalType.NESTED_CHOICE) {
            cts = new bytes32[](optionCount * 2 + 1);
            uint256 idx = 0;

            for (uint256 i = 0; i < optionCount; i++) {
                cts[idx++] = FHE.toBytes32(hub.getNestedOptionEncryptedTotal(_signalId, i, 0));
                cts[idx++] = FHE.toBytes32(hub.getNestedOptionEncryptedTotal(_signalId, i, 1));
            }

            cts[idx] = FHE.toBytes32(hub.getTotalPoolEncrypted(_signalId));
        } else {
            cts = new bytes32[](optionCount + 1);

            for (uint256 i = 0; i < optionCount; i++) {
                cts[i] = FHE.toBytes32(hub.getOptionEncryptedTotal(_signalId, i));
            }

            cts[optionCount] = FHE.toBytes32(hub.getTotalPoolEncrypted(_signalId));
        }

        uint256 requestId = FHE.requestDecryption(cts, this.callbackSignalStatistics.selector);
        signalDecryptionRequests[_signalId] = requestId;
    }

    function callbackSignalStatistics(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) external {
        FHE.checkSignatures(requestId, cleartexts, decryptionProof);

        uint256 signalId = 0;
        uint256 nextSignalId = hub.getTotalSignals() + 1;
        for (uint256 i = 1; i < nextSignalId; i++) {
            if (signalDecryptionRequests[i] == requestId) {
                signalId = i;
                break;
            }
        }
        require(signalId != 0, "Invalid request");

        (,,,, PredictionHub.SignalType signalType, , , , uint256 optionCount, , , , ) = hub.signals(signalId);

        if (signalType == PredictionHub.SignalType.NESTED_CHOICE) {
            if (optionCount == 2) {
                (uint64 opt0Yes, uint64 opt0No, uint64 opt1Yes, uint64 opt1No, ) =
                    abi.decode(cleartexts, (uint64, uint64, uint64, uint64, uint64));
                hub.updatePublicShares(signalId, 0, opt0Yes + opt0No, opt0Yes, opt0No);
                hub.updatePublicShares(signalId, 1, opt1Yes + opt1No, opt1Yes, opt1No);
            } else if (optionCount == 3) {
                (uint64 opt0Yes, uint64 opt0No, uint64 opt1Yes, uint64 opt1No, uint64 opt2Yes, uint64 opt2No, ) =
                    abi.decode(cleartexts, (uint64, uint64, uint64, uint64, uint64, uint64, uint64));
                hub.updatePublicShares(signalId, 0, opt0Yes + opt0No, opt0Yes, opt0No);
                hub.updatePublicShares(signalId, 1, opt1Yes + opt1No, opt1Yes, opt1No);
                hub.updatePublicShares(signalId, 2, opt2Yes + opt2No, opt2Yes, opt2No);
            }
        } else {
            if (optionCount == 2) {
                (uint64 opt0, uint64 opt1, ) = abi.decode(cleartexts, (uint64, uint64, uint64));
                hub.updatePublicShares(signalId, 0, opt0, 0, 0);
                hub.updatePublicShares(signalId, 1, opt1, 0, 0);
            } else if (optionCount == 3) {
                (uint64 opt0, uint64 opt1, uint64 opt2, ) = abi.decode(cleartexts, (uint64, uint64, uint64, uint64));
                hub.updatePublicShares(signalId, 0, opt0, 0, 0);
                hub.updatePublicShares(signalId, 1, opt1, 0, 0);
                hub.updatePublicShares(signalId, 2, opt2, 0, 0);
            }
        }

        isSignalStatsDecrypted[signalId] = true;
        emit SignalStatisticsDecrypted(signalId, requestId);
    }

    function getSignalStatistics(uint256 _signalId) external view returns (
        uint256[] memory optionTotalsDecrypted,
        bool isDecrypted
    ) {
        (uint256 id, , , , , , , , uint256 optionCount, , , , ) = hub.signals(_signalId);
        require(id != 0, "Signal does not exist");

        optionTotalsDecrypted = new uint256[](optionCount);

        for (uint256 i = 0; i < optionCount; i++) {
            PredictionHub.ResearchOption memory option = hub.getResearchOption(_signalId, i);
            optionTotalsDecrypted[i] = option.publicTotalShares;
        }

        return (optionTotalsDecrypted, isSignalStatsDecrypted[_signalId]);
    }

    function getNestedSignalStatistics(uint256 _signalId) external view returns (
        uint256[] memory yesShares,
        uint256[] memory noShares,
        bool isDecrypted
    ) {
        (uint256 id, , , , PredictionHub.SignalType signalType, , , , uint256 optionCount, , , , ) = hub.signals(_signalId);
        require(id != 0, "Signal does not exist");
        require(signalType == PredictionHub.SignalType.NESTED_CHOICE, "Not a nested signal");

        yesShares = new uint256[](optionCount);
        noShares = new uint256[](optionCount);

        for (uint256 i = 0; i < optionCount; i++) {
            PredictionHub.ResearchOption memory option = hub.getResearchOption(_signalId, i);
            yesShares[i] = option.publicYesShares;
            noShares[i] = option.publicNoShares;
        }

        return (yesShares, noShares, isSignalStatsDecrypted[_signalId]);
    }
}
