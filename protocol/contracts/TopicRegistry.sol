// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IGovernanceController.sol";
import "./interfaces/ITopicRegistry.sol";

contract TopicRegistry is ITopicRegistry {
    // MINIMAL - Only active status tracking
    mapping(uint256 => bool) private activeTopics;
    uint256 private nextTopicId = 1;

    IGovernanceController public governanceController;

    modifier onlyAdmin() {
        governanceController.requireAnyAdminRole(msg.sender);
        _;
    }

    modifier onlyTopicManager() {
        require(
            governanceController.hasRole(msg.sender, IGovernanceController.Role.CATEGORY_MANAGER) ||
            governanceController.hasRole(msg.sender, IGovernanceController.Role.SUPER_ADMIN),
            "Only topic manager can call this function"
        );
        _;
    }

    constructor(address _governanceController) {
        governanceController = IGovernanceController(_governanceController);
    }

    function registerTopic() external onlyTopicManager returns (uint256) {
        uint256 topicId = nextTopicId++;
        activeTopics[topicId] = true;

        emit TopicRegistered(topicId);
        return topicId;
    }

    function deactivateTopic(uint256 _topicId) external onlyTopicManager {
        require(activeTopics[_topicId], "Topic does not exist or already inactive");

        activeTopics[_topicId] = false;
        emit TopicDeactivated(_topicId);
    }

    function isTopicActive(uint256 _topicId) external view returns (bool) {
        return activeTopics[_topicId];
    }

    function getActiveTopics() external view returns (uint256[] memory) {
        uint256 count = 0;

        // Count active topics
        for (uint256 i = 1; i < nextTopicId; i++) {
            if (activeTopics[i]) {
                count++;
            }
        }

        // Create result array
        uint256[] memory result = new uint256[](count);
        uint256 index = 0;

        for (uint256 i = 1; i < nextTopicId; i++) {
            if (activeTopics[i]) {
                result[index] = i;
                index++;
            }
        }

        return result;
    }
}