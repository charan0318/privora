const Topic = require('../models/Topic');
const { logger } = require('../utils/logger');

// Get all topics
exports.getTopics = async (req, res, next) => {
  try {
    const topics = await Topic.find({ isActive: true })
      .sort({ level: 1, createdAt: 1 });

    res.status(200).json({
      success: true,
      count: topics.length,
      data: { topics },
    });
  } catch (error) {
    next(error);
  }
};

// Get single topic
exports.getTopic = async (req, res, next) => {
  try {
    const topic = await Topic.findById(req.params.id);

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
      });
    }

    res.status(200).json({
      success: true,
      data: { topic },
    });
  } catch (error) {
    next(error);
  }
};

// Get top level topics
exports.getTopLevelTopics = async (req, res, next) => {
  try {
    const topics = await Topic.find({
      parentId: { $in: [null, 0] },
      isActive: true,
    }).sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      count: topics.length,
      data: { topics },
    });
  } catch (error) {
    next(error);
  }
};

// Get subtopics
exports.getSubTopics = async (req, res, next) => {
  try {
    const { parentId } = req.params;

    const subtopics = await Topic.find({
      parentId: parseInt(parentId),
      isActive: true,
    }).sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      count: subtopics.length,
      data: { topics: subtopics },
    });
  } catch (error) {
    next(error);
  }
};

// Get topic tree (with children)
exports.getTopicTree = async (req, res, next) => {
  try {
    const buildTree = async (parentId = null) => {
      const topics = await Topic.find({
        parentId: parentId || { $in: [null, 0] },
        isActive: true,
      }).sort({ createdAt: 1 });

      const tree = [];
      for (const topic of topics) {
        const children = await buildTree(topic.topicId);
        tree.push({
          ...topic.toObject(),
          children,
        });
      }
      return tree;
    };

    const tree = await buildTree();

    res.status(200).json({
      success: true,
      count: tree.length,
      data: { topics: tree },
    });
  } catch (error) {
    next(error);
  }
};

// Get topic path (breadcrumb)
exports.getTopicPath = async (req, res, next) => {
  try {
    const { id } = req.params;
    const path = [];
    let currentTopic = await Topic.findById(id);

    while (currentTopic) {
      path.unshift(currentTopic);
      if (currentTopic.parentId) {
        currentTopic = await Topic.findById(currentTopic.parentId);
      } else {
        break;
      }
    }

    res.status(200).json({
      success: true,
      data: { topics: path },
    });
  } catch (error) {
    next(error);
  }
};

// Search topics
exports.searchTopics = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
      });
    }

    const topics = await Topic.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ],
      isActive: true,
    }).limit(20);

    res.status(200).json({
      success: true,
      count: topics.length,
      data: { topics },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;