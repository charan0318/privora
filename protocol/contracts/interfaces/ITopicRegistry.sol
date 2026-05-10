// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ITopicRegistry {
    event TopicRegistered(uint256 indexed topicId);
    event TopicDeactivated(uint256 indexed topicId);

    function registerTopic() external returns (uint256);
    function deactivateTopic(uint256 _topicId) external;
    function isTopicActive(uint256 _topicId) external view returns (bool);
    function getActiveTopics() external view returns (uint256[] memory);
}