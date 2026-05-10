const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  topicId: {
    type: Number,
    unique: true,
    sparse: true,
  },
  parentId: {
    type: Number,
    default: 0,
  },
  level: {
    type: Number,
    default: 0,
    min: 0,
    max: 10,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  slug: {
    type: String,
    trim: true,
    lowercase: true,
  },
  displayOrder: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Index for efficient queries
topicSchema.index({ parentId: 1, isActive: 1 });
topicSchema.index({ level: 1, isActive: 1 });
topicSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Topic', topicSchema);