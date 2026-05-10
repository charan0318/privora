import React, { useState, useEffect } from 'react';
import {
  Plus,
  Filter,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  DollarSign,
  Target,
  Calendar,
  Image as ImageIcon,
  AlertTriangle
} from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';

const PredictionManagement = () => {
  const [predictions, setPredictions] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    topic: 'all',
    search: ''
  });

  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    imageUrl: '',
    topicId: '',
    options: ['', ''],
    endTime: '',
    predictionType: 0, // Binary by default (BINARY=0, MULTIPLE_CHOICE=1, SPORTS=2)
    mustShowLive: false,
    liveStartTime: '',
    liveEndTime: '',

    // ===== GROUPING FIELDS FOR NESTED MARKETS =====
    marketGroup: {
      groupId: '',
      groupTitle: '',
      groupType: 'standalone', // nested, series, tournament, standalone
      groupOrder: 0,
      isGroupHeader: false
    }
  });

  // State for bulk creation (Fed Decision example)
  const [bulkCreateMode, setBulkCreateMode] = useState(false);
  const [bulkCreateForm, setBulkCreateForm] = useState({
    groupTitle: '',
    groupType: 'nested',
    predictions: [
      { title: '', description: '', options: ['Yes', 'No'] },
      { title: '', description: '', options: ['Yes', 'No'] },
      { title: '', description: '', options: ['Yes', 'No'] }
    ]
  });

  useEffect(() => {
    fetchPredictions();
    fetchTopics();
  }, [filters]);

  const fetchPredictions = async () => {
    try {
      setLoading(true);

      // Try to fetch real data first
      try {
        const queryParams = new URLSearchParams();
        if (filters.status !== 'all') queryParams.append('status', filters.status);
        if (filters.topic !== 'all') queryParams.append('topic', filters.topic);
        if (filters.search) queryParams.append('search', filters.search);

        const response = await fetch(`/api/predictions?${queryParams}`);

        if (response.ok) {
          const data = await response.json();
          setPredictions(data.data.predictions);
          console.log('✅ Using real prediction data from API');
          return;
        }
      } catch (apiError) {
        console.log('⚠️ API not available, using mock data:', apiError.message);
      }

      // Fallback to mock data if API fails
      const mockPredictions = [
        {
          id: 1,
          title: "Will Bitcoin reach $100,000 by end of 2024?",
          description: "Prediction market for Bitcoin reaching the $100k milestone by December 31, 2024",
          imageUrl: "",
          topicId: "crypto",
          isActive: true,
          isResolved: false,
          endTime: "2024-12-31T23:59:59.000Z",
          predictionType: 2,
          totalParticipants: 156,
          totalVolume: 45678,
          options: [
            { title: "Yes", totalShares: 1234 },
            { title: "No", totalShares: 987 }
          ]
        },
        {
          id: 2,
          title: "2024 US Presidential Election Winner",
          description: "Who will win the 2024 US Presidential Election?",
          imageUrl: "",
          topicId: "politics",
          isActive: true,
          isResolved: false,
          endTime: "2024-11-05T23:59:59.000Z",
          predictionType: 1,
          totalParticipants: 892,
          totalVolume: 123456,
          options: [
            { title: "Donald Trump", totalShares: 2345 },
            { title: "Joe Biden", totalShares: 1876 },
            { title: "Other", totalShares: 234 }
          ]
        },
        {
          id: 3,
          title: "Will Tesla stock exceed $300?",
          description: "Tesla stock price prediction for Q4 2024",
          imageUrl: "",
          topicId: "stocks",
          isActive: false,
          isResolved: true,
          endTime: "2024-10-31T23:59:59.000Z",
          predictionType: 2,
          totalParticipants: 67,
          totalVolume: 8900,
          options: [
            { title: "Yes", totalShares: 456 },
            { title: "No", totalShares: 789 }
          ]
        }
      ];

      // Apply filters to mock data
      let filteredPredictions = mockPredictions;

      if (filters.search) {
        filteredPredictions = filteredPredictions.filter(prediction =>
          prediction.title.toLowerCase().includes(filters.search.toLowerCase()) ||
          prediction.description.toLowerCase().includes(filters.search.toLowerCase())
        );
      }

      if (filters.status !== 'all') {
        filteredPredictions = filteredPredictions.filter(prediction => {
          if (filters.status === 'active') return prediction.isActive && !prediction.isResolved;
          if (filters.status === 'ended') return new Date(prediction.endTime) < new Date() && !prediction.isResolved;
          if (filters.status === 'resolved') return prediction.isResolved;
          if (filters.status === 'inactive') return !prediction.isActive;
          return true;
        });
      }

      if (filters.topic !== 'all') {
        filteredPredictions = filteredPredictions.filter(prediction => prediction.topicId === filters.topic);
      }

      setPredictions(filteredPredictions);
    } catch (error) {
      console.error('Failed to fetch predictions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopics = async () => {
    try {
      // Try to fetch real topics first
      try {
        const response = await fetch('/api/topics');
        if (response.ok) {
          const data = await response.json();
          setTopics(data.data.topics);
          console.log('✅ Using real topic data from API');
          return;
        }
      } catch (apiError) {
        console.log('⚠️ Topics API not available, using mock data:', apiError.message);
      }

      // Fallback to mock topics
      const mockTopics = [
        { _id: 'crypto', name: 'Cryptocurrency' },
        { _id: 'politics', name: 'Politics' },
        { _id: 'sports', name: 'Sports' },
        { _id: 'stocks', name: 'Stock Market' },
        { _id: 'entertainment', name: 'Entertainment' },
        { _id: 'technology', name: 'Technology' },
        { _id: 'weather', name: 'Weather' },
        { _id: 'economics', name: 'Economics' }
      ];
      setTopics(mockTopics);
    } catch (error) {
      console.error('Failed to fetch topics:', error);
    }
  };

  const handleCreatePrediction = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(createForm)
      });

      if (response.ok) {
        console.log('✅ Prediction created successfully via API');
        setShowCreateModal(false);
        setCreateForm({
          title: '',
          description: '',
          imageUrl: '',
          topicId: '',
          options: ['', ''],
          endTime: '',
          predictionType: 2,
          mustShowLive: false,
          liveStartTime: '',
          liveEndTime: ''
        });
        fetchPredictions(); // Refresh list to show new prediction
      } else {
        throw new Error(`API Error: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to create prediction:', error);
      alert('Failed to create prediction. This feature requires a backend API to be running.');
    }
  };

  const handleResolvePrediction = async (predictionId, winnerIndex) => {
    try {
      const response = await fetch(`/api/admin/predictions/${predictionId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ winnerIndex })
      });

      if (response.ok) {
        console.log('✅ Prediction resolved successfully via API');
        setShowResolveModal(false);
        setSelectedPrediction(null);
        fetchPredictions(); // Refresh list to show updated prediction status
      } else {
        throw new Error(`API Error: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to resolve prediction:', error);
      alert('Failed to resolve prediction. This feature requires a backend API to be running.');
    }
  };

  const handleDeletePrediction = async (predictionId) => {
    if (!window.confirm('Are you sure you want to delete this prediction?')) return;

    try {
      const response = await fetch(`/api/admin/predictions/${predictionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        console.log('✅ Prediction deleted successfully via API');
        fetchPredictions(); // Refresh list to remove deleted prediction
      } else {
        throw new Error(`API Error: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to delete prediction:', error);
      alert('Failed to delete prediction. This feature requires a backend API to be running.');
    }
  };

  const addOption = () => {
    setCreateForm(prev => ({
      ...prev,
      options: [...prev.options, '']
    }));
  };

  const removeOption = (index) => {
    if (createForm.options.length > 2) {
      setCreateForm(prev => ({
        ...prev,
        options: prev.options.filter((_, i) => i !== index)
      }));
    }
  };

  const updateOption = (index, value) => {
    setCreateForm(prev => ({
      ...prev,
      options: prev.options.map((option, i) => i === index ? value : option)
    }));
  };

  // ===== BULK CREATION HANDLERS =====
  const handleBulkCreateSubmit = async () => {
    try {
      console.log('🚀 Creating bulk nested markets...');

      // Generate unique group ID
      const groupId = `${bulkCreateForm.groupType}_${Date.now()}`;

      // Create multiple separate binary predictions
      const createdPredictions = [];

      for (let i = 0; i < bulkCreateForm.predictions.length; i++) {
        const prediction = bulkCreateForm.predictions[i];

        const predictionData = {
          title: prediction.title,
          description: prediction.description,
          imageUrl: '',
          topicId: createForm.topicId,
          options: prediction.options,
          endTime: createForm.endTime,
          predictionType: 0, // Binary for nested markets
          marketGroup: {
            groupId: groupId,
            groupTitle: bulkCreateForm.groupTitle,
            groupType: bulkCreateForm.groupType,
            groupOrder: i,
            isGroupHeader: i === 0
          }
        };

        // Create prediction via API
        const response = await fetch('/api/admin/predictions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(predictionData)
        });

        if (response.ok) {
          const result = await response.json();
          createdPredictions.push(result.data);
          console.log(`✅ Created prediction ${i + 1}/${bulkCreateForm.predictions.length}: ${prediction.title}`);
        }
      }

      console.log('🎉 Bulk creation completed!', createdPredictions);
      setShowCreateModal(false);
      setBulkCreateMode(false);
      fetchPredictions(); // Refresh list

    } catch (error) {
      console.error('❌ Bulk creation failed:', error);
      alert('Failed to create bulk predictions. Please try again.');
    }
  };

  const addBulkPrediction = () => {
    setBulkCreateForm(prev => ({
      ...prev,
      predictions: [...prev.predictions, { title: '', description: '', options: ['Yes', 'No'] }]
    }));
  };

  const removeBulkPrediction = (index) => {
    if (bulkCreateForm.predictions.length > 1) {
      setBulkCreateForm(prev => ({
        ...prev,
        predictions: prev.predictions.filter((_, i) => i !== index)
      }));
    }
  };

  const updateBulkPrediction = (index, field, value) => {
    setBulkCreateForm(prev => ({
      ...prev,
      predictions: prev.predictions.map((prediction, i) =>
        i === index ? { ...prediction, [field]: value } : prediction
      )
    }));
  };

  const getPredictionStatusColor = (prediction) => {
    if (prediction.isResolved) return 'bg-primary-100 text-primary-800';
    if (!prediction.isActive) return 'bg-[#1A2F45] text-gray-100';
    if (new Date(prediction.endTime) < new Date()) return 'bg-primary-100 text-primary-800';
    return 'bg-green-100 text-green-800';
  };

  const getPredictionStatusText = (prediction) => {
    if (prediction.isResolved) return 'Resolved';
    if (!prediction.isActive) return 'Inactive';
    if (new Date(prediction.endTime) < new Date()) return 'Ended';
    return 'Active';
  };

  const PredictionCard = ({ prediction }) => (
    <div className="bg-[#0A1424] rounded-none shadow-none border border-[#1A2F45] p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="heading-mono text-xl mb-2">{bet.title}</h3>
          <p className="text-sm text-gray-400 mb-3 line-clamp-2">{bet.description}</p>
          
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Target className="w-4 h-4" />
              {bet.betType === 0 ? 'Binary' : bet.betType === 1 ? 'Multiple Choice' : 'Sports'}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {bet.totalParticipants || 0} participants
            </span>
            <span className="flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              ${bet.totalVolume?.toLocaleString() || '0'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-none-full text-xs font-medium ${getBetStatusColor(bet)}`}>
            {getBetStatusText(bet)}
          </span>
          <div className="relative">
            <button className="p-1 text-gray-400 hover:text-gray-400">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {prediction.options?.slice(0, 2).map((option, index) => (
          <div key={index} className="p-3 bg-[#0F1E32] rounded-none">
            <p className="text-sm font-medium text-white">{option.title}</p>
            <p className="text-xs text-gray-500 mt-1">
              {option.totalShares?.toLocaleString() || 0} shares
            </p>
          </div>
        ))}
        {prediction.options?.length > 2 && (
          <div className="col-span-2 text-center text-sm text-gray-500">
            +{prediction.options.length - 2} more options
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
        <span className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          Ends: {new Date(prediction.endTime).toLocaleDateString()}
        </span>
        <span>ID: #{prediction.id}</span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setSelectedPrediction(prediction);
            // Show edit modal
          }}
        >
          <Edit className="w-4 h-4 mr-1" />
          Edit
        </Button>
        
        {!prediction.isResolved && new Date(prediction.endTime) < new Date() && (
          <Button
            size="sm"
            onClick={() => {
              setSelectedPrediction(prediction);
              setShowResolveModal(true);
            }}
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Resolve
          </Button>
        )}
        
        <Button
          size="sm"
          variant="danger"
          onClick={() => handleDeletePrediction(prediction.id)}
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Delete
        </Button>
      </div>
    </div>
  );

  // ===== BULK CREATE FORM COMPONENT =====
  const BulkCreateForm = () => (
    <form onSubmit={(e) => { e.preventDefault(); handleBulkCreateSubmit(); }} className="space-y-6">
      {/* Group Settings */}
      <div className="bg-primary-50 p-4 rounded-none">
        <h3 className="text-lg font-semibold text-primary-900 mb-3">Group Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Group Title"
            value={bulkCreateForm.groupTitle}
            onChange={(e) => setBulkCreateForm(prev => ({ ...prev, groupTitle: e.target.value }))}
            placeholder="e.g., Fed Decision October"
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Group Type</label>
            <select
              value={bulkCreateForm.groupType}
              onChange={(e) => setBulkCreateForm(prev => ({ ...prev, groupType: e.target.value }))}
              className="w-full px-3 py-2 border border-[#233F59] rounded-none focus:ring-2 focus:ring-[#5ce1e6] focus:border-[#5ce1e6]"
            >
              <option value="nested">Nested (Fed Decision)</option>
              <option value="series">Series (Weekly Matches)</option>
              <option value="tournament">Tournament</option>
            </select>
          </div>
        </div>
      </div>

      {/* Common Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Topic</label>
          <select
            value={createForm.topicId}
            onChange={(e) => setCreateForm(prev => ({ ...prev, topicId: e.target.value }))}
            className="w-full px-3 py-2 border border-[#233F59] rounded-none focus:ring-2 focus:ring-[#5ce1e6] focus:border-[#5ce1e6]"
            required
          >
            <option value="">Select Topic</option>
            {topics.map(topic => (
              <option key={topic._id} value={topic._id}>{topic.name}</option>
            ))}
          </select>
        </div>
        <Input
          label="End Time"
          type="datetime-local"
          value={createForm.endTime}
          onChange={(e) => setCreateForm(prev => ({ ...prev, endTime: e.target.value }))}
          required
        />
      </div>

      {/* Individual Predictions */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="heading-mono text-xl">Individual Markets</h3>
          <Button type="button" onClick={addBulkPrediction} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Add Market
          </Button>
        </div>

        {bulkCreateForm.predictions.map((prediction, index) => (
          <div key={index} className="border border-[#1A2F45] rounded-none p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium text-white">Market {index + 1}</h4>
              {bulkCreateForm.predictions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeBulkPrediction(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="space-y-3">
              <Input
                label="Market Title"
                value={prediction.title}
                onChange={(e) => updateBulkPrediction(index, 'title', e.target.value)}
                placeholder="e.g., Fed 50+ bps decrease?"
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={prediction.description}
                  onChange={(e) => updateBulkPrediction(index, 'description', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-[#233F59] rounded-none focus:ring-2 focus:ring-[#5ce1e6] focus:border-[#5ce1e6]"
                  placeholder="Market description..."
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Submit */}
      <div className="flex justify-end space-x-3 pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowCreateModal(false)}
        >
          Cancel
        </Button>
        <Button type="submit">
          Create {bulkCreateForm.predictions.length} Markets
        </Button>
      </div>
    </form>
  );

  const CreatePredictionModal = () => (
    <Modal
      isOpen={showCreateModal}
      onClose={() => setShowCreateModal(false)}
      title={bulkCreateMode ? "Create Nested Markets" : "Create New Prediction"}
      size={bulkCreateMode ? "xl" : "lg"}
    >
      {bulkCreateMode ? (
        <BulkCreateForm />
      ) : (
        <form onSubmit={handleCreatePrediction} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Prediction Title"
              value={createForm.title}
              onChange={(e) => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Will Bitcoin reach $100k by 2024?"
              required
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={createForm.description}
              onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-[#233F59] rounded-none focus:ring-2 focus:ring-[#5ce1e6] focus:border-[#5ce1e6]"
              placeholder="Detailed description of the prediction..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Topic
            </label>
            <select
              value={createForm.topicId}
              onChange={(e) => setCreateForm(prev => ({ ...prev, topicId: e.target.value }))}
              className="w-full px-3 py-2 border border-[#233F59] rounded-none focus:ring-2 focus:ring-[#5ce1e6] focus:border-[#5ce1e6]"
              required
            >
              <option value="">Select Topic</option>
              {topics.map(topic => (
                <option key={topic._id} value={topic._id}>
                  {topic.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Prediction Type
            </label>
            <select
              value={createForm.predictionType}
              onChange={(e) => setCreateForm(prev => ({ ...prev, predictionType: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-[#233F59] rounded-none focus:ring-2 focus:ring-[#5ce1e6] focus:border-[#5ce1e6]"
            >
              <option value={1}>Multiple Choice</option>
              <option value={2}>Binary (Yes/No)</option>
              <option value={3}>Sports (3-way)</option>
            </select>
          </div>

          <div>
            <Input
              label="End Date & Time"
              type="datetime-local"
              value={createForm.endTime}
              onChange={(e) => setCreateForm(prev => ({ ...prev, endTime: e.target.value }))}
              min={new Date().toISOString().slice(0, 16)}
              required
            />
          </div>

          <div>
            <Input
              label="Image URL"
              value={createForm.imageUrl}
              onChange={(e) => setCreateForm(prev => ({ ...prev, imageUrl: e.target.value }))}
              placeholder="https://example.com/image.jpg"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Betting Options
          </label>
          <div className="space-y-2">
            {createForm.options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  required
                />
                {createForm.options.length > 2 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeOption(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            {createForm.options.length < 10 && (
              <Button
                type="button"
                variant="outline"
                onClick={addOption}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Option
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={createForm.mustShowLive}
              onChange={(e) => setCreateForm(prev => ({ ...prev, mustShowLive: e.target.checked }))}
              className="rounded-none border-[#233F59] text-[#5ce1e6] focus:ring-[#5ce1e6]"
            />
            <span className="text-sm text-gray-300">Show live indicator</span>
          </label>
        </div>

        {createForm.mustShowLive && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-[#0F1E32] rounded-none">
            <Input
              label="Live Start Time"
              type="datetime-local"
              value={createForm.liveStartTime}
              onChange={(e) => setCreateForm(prev => ({ ...prev, liveStartTime: e.target.value }))}
            />
            <Input
              label="Live End Time"
              type="datetime-local"
              value={createForm.liveEndTime}
              onChange={(e) => setCreateForm(prev => ({ ...prev, liveEndTime: e.target.value }))}
            />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowCreateModal(false)}
          >
            Cancel
          </Button>
          <Button type="submit">
            Create Prediction
          </Button>
        </div>
      </form>
      )}
    </Modal>
  );

  const ResolvePredictionModal = () => (
    <Modal
      isOpen={showResolveModal}
      onClose={() => setShowResolveModal(false)}
      title="Resolve Prediction"
    >
      {selectedPrediction && (
        <div className="space-y-4">
          <div className="p-4 bg-[#0F1E32] rounded-none">
            <h3 className="font-semibold text-white">{selectedPrediction.title}</h3>
            <p className="text-sm text-gray-400 mt-1">
              Select the winning option to resolve this prediction.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Winning Option
            </label>
            {selectedPrediction.options?.map((option, index) => (
              <button
                key={index}
                onClick={() => handleResolvePrediction(selectedPrediction.id, index)}
                className="w-full p-3 text-left border border-[#1A2F45] rounded-none hover:bg-[#0F1E32] transition-colors"
              >
                <div className="font-medium text-white">{option.title}</div>
                <div className="text-sm text-gray-500">
                  {option.totalShares?.toLocaleString() || 0} shares
                </div>
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowResolveModal(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="heading-mono text-3xl">Prediction Management</h2>
          <p className="text-gray-400 mt-1">Create, manage, and resolve prediction markets</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setBulkCreateMode(!bulkCreateMode)}
            variant={bulkCreateMode ? "secondary" : "outline"}
          >
            <Target className="w-4 h-4 mr-2" />
            {bulkCreateMode ? 'Single Mode' : 'Bulk Create'}
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {bulkCreateMode ? 'Create Group' : 'Create New Prediction'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#0A1424] rounded-none shadow-none border border-[#1A2F45] p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search predictions..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-[#233F59] rounded-none focus:ring-2 focus:ring-[#5ce1e6] focus:border-[#5ce1e6]"
            />
          </div>

          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="px-3 py-2 border border-[#233F59] rounded-none focus:ring-2 focus:ring-[#5ce1e6] focus:border-[#5ce1e6]"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="ended">Ended</option>
            <option value="resolved">Resolved</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={filters.topic}
            onChange={(e) => setFilters(prev => ({ ...prev, topic: e.target.value }))}
            className="px-3 py-2 border border-[#233F59] rounded-none focus:ring-2 focus:ring-[#5ce1e6] focus:border-[#5ce1e6]"
          >
            <option value="all">All Topics</option>
            {topics.map(topic => (
              <option key={topic._id} value={topic._id}>
                {topic.name}
              </option>
            ))}
          </select>

          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            More Filters
          </Button>
        </div>
      </div>

      {/* Predictions Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" text="Loading predictions..." />
        </div>
      ) : predictions.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {predictions.map(prediction => (
            <PredictionCard key={prediction.id} prediction={prediction} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-[#0A1424] rounded-none shadow-none border border-[#1A2F45]">
          <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No predictions found</h3>
          <p className="text-gray-400 mb-4">
            {filters.search || filters.status !== 'all' || filters.topic !== 'all'
              ? 'Try adjusting your filters to see more results.'
              : 'Get started by creating your first prediction market.'
            }
          </p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create First Prediction
          </Button>
        </div>
      )}

      {/* Modals */}
      <CreatePredictionModal />
      <ResolvePredictionModal />
    </div>
  );
};

export default PredictionManagement;





