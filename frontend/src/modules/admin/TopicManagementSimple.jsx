import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Edit, Trash2, Save, X, Smile, GripVertical } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';
import topicAPI from '../../integrations/topicAPI';
import EmojiPicker from 'emoji-picker-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable topic item component
const SortableTopicItem = ({
  topic,
  editingId,
  setEditingId,
  updateTopic,
  handleUpdate,
  handleDelete,
  showEditEmojiPicker,
  setShowEditEmojiPicker,
  editEmojiButtonRef,
  handleEditEmojiClick
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: topic._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="group px-6 py-4 transition-all relative">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-[#5ce1e6] transition-colors"></div>
      {editingId === topic._id ? (
        // Edit Mode
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          <input
            type="text"
            placeholder="Topic Name"
            value={topic.name}
            onChange={(e) => updateTopic(topic._id, 'name', e.target.value)}
            className="px-4 py-2 border border-[#1A2F45] rounded-none focus:ring-2 focus:ring-[#5ce1e6] focus:border-transparent bg-[#0A1424] text-white placeholder-gray-400"
          />

          {/* Emoji Picker for Edit */}
          <div className="relative">
            <button
              ref={editEmojiButtonRef}
              type="button"
              onClick={() => setShowEditEmojiPicker(topic._id)}
              className="w-full px-4 py-2 border border-[#1A2F45] rounded-none hover:bg-[#0F1E32] transition-colors flex items-center justify-center gap-2"
            >
              <span className="text-2xl">{topic.icon}</span>
              <Smile className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          <input
            type="color"
            value={topic.color}
            onChange={(e) => updateTopic(topic._id, 'color', e.target.value)}
            className="px-2 py-2 border border-[#1A2F45] rounded-none h-10 w-full cursor-pointer"
          />

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleUpdate(topic._id)}
              className="bg-[#5ce1e6] hover:bg-[#06b6d4] text-white px-6 py-2 rounded-none font-medium transition-colors flex items-center justify-center gap-2 flex-1"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={() => setEditingId(null)}
              className="bg-[#0F1E32]0 hover:bg-gray-600 text-white px-4 py-2 rounded-none font-medium transition-colors flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        // View Mode
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-400"
            >
              <GripVertical className="w-5 h-5" />
            </div>
            <div
              className="w-12 h-12 rounded-none flex items-center justify-center text-2xl"
              style={{ backgroundColor: `${topic.color}20`, color: topic.color }}
            >
              {topic.icon}
            </div>
            <div>
              <h4 className="font-semibold text-white">{topic.name}</h4>
              <p className="text-sm text-gray-400">Order: {topic.displayOrder}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditingId(topic._id)}
              className="p-2 text-[#5ce1e6] hover:bg-primary-50 rounded-none transition-colors"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(topic._id)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-none transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const TopicManagementSimple = ({ onUpdate }) => {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showEditEmojiPicker, setShowEditEmojiPicker] = useState(null);
  const [emojiPickerPosition, setEmojiPickerPosition] = useState({ top: 0, left: 0 });
  const emojiButtonRef = useRef(null);
  const editEmojiButtonRef = useRef(null);
  const [formData, setFormData] = useState({
    name: '',
    icon: '📊',
    color: '#6366f1',
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    try {
      setLoading(true);
      const response = await topicAPI.getTopics();
      const fetchedTopics = response.data || [];
      // Sort by displayOrder
      fetchedTopics.sort((a, b) => a.displayOrder - b.displayOrder);
      setTopics(fetchedTopics);
    } catch (error) {
      console.error('Error fetching topics:', error);
      setTopics([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      alert('Topic name is required!');
      return;
    }

    try {
      // Set displayOrder to be last
      const maxOrder = topics.length > 0 ? Math.max(...topics.map(t => t.displayOrder)) : -1;
      await topicAPI.createTopic({
        ...formData,
        displayOrder: maxOrder + 1
      });
      setFormData({ name: '', icon: '📊', color: '#6366f1' });
      fetchTopics();
      if (onUpdate) onUpdate();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create topic');
    }
  };

  const handleUpdate = async (id) => {
    const topic = topics.find(t => t._id === id);
    if (!topic) return;

    try {
      await topicAPI.updateTopic(id, topic);
      setEditingId(null);
      fetchTopics();
      if (onUpdate) onUpdate();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update topic');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this topic?')) return;

    try {
      await topicAPI.deleteTopic(id);
      fetchTopics();
      if (onUpdate) onUpdate();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete topic');
    }
  };

  const updateTopic = (id, field, value) => {
    setTopics(topics.map(t =>
      t._id === id ? { ...t, [field]: value } : t
    ));
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = topics.findIndex(t => t._id === active.id);
      const newIndex = topics.findIndex(t => t._id === over.id);

      const reordered = arrayMove(topics, oldIndex, newIndex);

      // Update displayOrder for all topics
      const updatedTopics = reordered.map((t, index) => ({
        ...t,
        displayOrder: index
      }));

      setTopics(updatedTopics);

      // Update all topics in DB
      try {
        await Promise.all(
          updatedTopics.map(t =>
            topicAPI.updateTopic(t._id, { ...t, displayOrder: t.displayOrder })
          )
        );
        if (onUpdate) onUpdate();
      } catch (error) {
        console.error('Failed to update topic order:', error);
        // Revert on error
        fetchTopics();
      }
    }
  };

  const handleEmojiClick = (emojiObject) => {
    setFormData({ ...formData, icon: emojiObject.emoji });
    setShowEmojiPicker(false);
  };

  const handleEditEmojiClick = (emojiObject) => {
    if (showEditEmojiPicker) {
      updateTopic(showEditEmojiPicker, 'icon', emojiObject.emoji);
      setShowEditEmojiPicker(null);
    }
  };

  const toggleEmojiPicker = () => {
    if (!showEmojiPicker && emojiButtonRef.current) {
      const rect = emojiButtonRef.current.getBoundingClientRect();
      setEmojiPickerPosition({
        top: rect.bottom + 8,
        left: rect.left
      });
    }
    setShowEmojiPicker(!showEmojiPicker);
  };

  const toggleEditEmojiPicker = (topicId) => {
    if (!showEditEmojiPicker && editEmojiButtonRef.current) {
      const rect = editEmojiButtonRef.current.getBoundingClientRect();
      setEmojiPickerPosition({
        top: rect.bottom + 8,
        left: rect.left
      });
    }
    setShowEditEmojiPicker(showEditEmojiPicker === topicId ? null : topicId);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <>
      {/* Create Emoji Picker Portal */}
      {showEmojiPicker && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setShowEmojiPicker(false)}
          />
          {/* Emoji Picker */}
          <div
            className="fixed z-[9999]"
            style={{
              top: `${emojiPickerPosition.top}px`,
              left: `${emojiPickerPosition.left}px`,
            }}
          >
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              autoFocusSearch={false}
              theme="light"
              height={400}
              width={350}
            />
          </div>
        </>,
        document.body
      )}

      {/* Edit Emoji Picker Portal */}
      {showEditEmojiPicker && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setShowEditEmojiPicker(null)}
          />
          {/* Emoji Picker */}
          <div
            className="fixed z-[9999]"
            style={{
              top: `${emojiPickerPosition.top}px`,
              left: `${emojiPickerPosition.left}px`,
            }}
          >
            <EmojiPicker
              onEmojiClick={handleEditEmojiClick}
              autoFocusSearch={false}
              theme="light"
              height={400}
              width={350}
            />
          </div>
        </>,
        document.body
      )}

      <div className="space-y-6">
        {/* Create Topic Form */}
        <div className="bg-[#0A1424] rounded-none shadow-none border border-[#1A2F45] p-6">
        <h3 className="heading-mono text-xl mb-4">Create New Topic</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Topic Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="px-4 py-2 border border-[#1A2F45] rounded-none focus:ring-2 focus:ring-[#5ce1e6] focus:border-transparent bg-[#0A1424] text-white placeholder-gray-400"
          />

          {/* Emoji Picker Button */}
          <div className="relative">
            <button
              ref={emojiButtonRef}
              type="button"
              onClick={toggleEmojiPicker}
              className="w-full px-4 py-2 border border-[#1A2F45] rounded-none hover:bg-[#0F1E32] transition-colors flex items-center justify-center gap-2"
            >
              <span className="text-2xl">{formData.icon}</span>
              <Smile className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          <input
            type="color"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            className="px-2 py-2 border border-[#1A2F45] rounded-none h-10 w-full cursor-pointer"
          />

          <button
            onClick={handleCreate}
            className="bg-[#5ce1e6] hover:bg-[#06b6d4] text-white px-6 py-2 rounded-none font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create
          </button>
        </div>
      </div>

      {/* Topics List */}
      <div className="bg-[#0A1424] rounded-none shadow-none border border-[#1A2F45]">
        <div className="px-6 py-3 border-b border-[#1A2F45]">
          <h3 className="text-base font-semibold text-white">Topics ({topics.length})</h3>
          <p className="text-xs text-gray-400 mt-0.5">Drag to reorder topics</p>
        </div>

        {topics.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No topics yet. Create one above!
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={topics.map(t => t._id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="divide-y divide-gray-300">
                {topics.map((topic) => (
                  <SortableTopicItem
                    key={topic._id}
                    topic={topic}
                    editingId={editingId}
                    setEditingId={setEditingId}
                    updateTopic={updateTopic}
                    handleUpdate={handleUpdate}
                    handleDelete={handleDelete}
                    showEditEmojiPicker={showEditEmojiPicker}
                    setShowEditEmojiPicker={toggleEditEmojiPicker}
                    editEmojiButtonRef={editEmojiButtonRef}
                    handleEditEmojiClick={handleEditEmojiClick}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
      </div>
    </>
  );
};

export default TopicManagementSimple;





