import React, { useState, useEffect } from 'react';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Activity,
  Settings,
  BarChart3,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Download
} from 'lucide-react';
import { useWallet } from '../../core/useWallet';
import { hasAnyAdminPrivileges } from '../../utils/adminUtils';
import Analytics from './Analytics';
import PredictionManagement from './PredictionManagement';
import TopicManagementSimple from './TopicManagementSimple';
import UserManagement from './UserManagement';
import LoadingSpinner from '../common/LoadingSpinner';

const AdminPanel = ({ stats }) => {
  const { account } = useWallet();
  const isAdmin = hasAnyAdminPrivileges(account);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('7d');

  // Use stats from props (contract data)
  const dashboardStats = stats;

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F1E32]">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="heading-mono text-3xl mb-2">Access Denied</h1>
          <p className="text-gray-400">You don't have permission to access the admin panel.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'predictions', label: 'Prediction Management', icon: Target },
    { id: 'topics', label: 'Topics', icon: Filter },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
  ];

  const StatCard = ({ title, value, change, icon: Icon, color = 'blue' }) => {
    const colorClasses = {
      blue: 'text-[#5ce1e6] bg-primary-100',
      green: 'text-[#5ce1e6] bg-green-100',
      blue: 'text-[#5ce1e6] bg-primary-100',
      red: 'text-red-600 bg-red-100',
      purple: 'text-purple-600 bg-purple-100'
    };

    return (
      <div className="bg-[#0A1424] rounded-none shadow-none border border-[#1A2F45] p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="heading-mono text-sm text-[#5ce1e6]">{title}</p>
            <p className="text-3xl font-bold text-white mt-2">{value}</p>
            {change && (
              <p className={`text-sm mt-1 ${change.startsWith('+') ? 'text-[#5ce1e6]' : 'text-red-600'}`}>
                {change} from last period
              </p>
            )}
          </div>
          <div className={`w-12 h-12 rounded-none flex items-center justify-center ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </div>
    );
  };

  const QuickActions = () => (
    <div className="bg-[#0A1424] rounded-none shadow-none border border-[#1A2F45] p-6">
      <h3 className="heading-mono text-xl mb-4">Quick Actions</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button 
          onClick={() => setActiveTab('predictions')}
          className="flex items-center gap-3 p-3 rounded-none border border-[#1A2F45] hover:bg-[#0F1E32] transition-colors text-left"
        >
          <Target className="w-5 h-5 text-[#5ce1e6]" />
          <span className="font-medium">Manage Predictions</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('topics')}
          className="flex items-center gap-3 p-3 rounded-none border border-[#1A2F45] hover:bg-[#0F1E32] transition-colors text-left"
        >
          <Filter className="w-5 h-5 text-[#5ce1e6]" />
          <span className="font-medium">Manage Topics</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('analytics')}
          className="flex items-center gap-3 p-3 rounded-none border border-[#1A2F45] hover:bg-[#0F1E32] transition-colors text-left"
        >
          <TrendingUp className="w-5 h-5 text-purple-600" />
          <span className="font-medium">View Analytics</span>
        </button>
        
        <button 
          className="flex items-center gap-3 p-3 rounded-none border border-[#1A2F45] hover:bg-[#0F1E32] transition-colors text-left"
        >
          <Download className="w-5 h-5 text-[#5ce1e6]" />
          <span className="font-medium">Export Data</span>
        </button>
      </div>
    </div>
  );

  const RecentActivity = () => {
    const activities = [
      {
        id: 1,
        type: 'prediction_created',
        message: 'New prediction created: "Will Bitcoin reach $100k?"',
        time: '2 minutes ago',
        icon: Target,
        color: 'text-[#5ce1e6]'
      },
      {
        id: 2,
        type: 'user_registered',
        message: 'New user registered: 0x742d35...',
        time: '15 minutes ago',
        icon: Users,
        color: 'text-[#5ce1e6]'
      },
      {
        id: 3,
        type: 'prediction_resolved',
        message: 'Prediction resolved: "Election 2024"',
        time: '1 hour ago',
        icon: CheckCircle,
        color: 'text-purple-600'
      },
      {
        id: 4,
        type: 'large_prediction',
        message: 'Large prediction placed: $5,000 on sports market',
        time: '2 hours ago',
        icon: DollarSign,
        color: 'text-[#5ce1e6]'
      }
    ];

    return (
      <div className="bg-[#0A1424] rounded-none shadow-none border border-[#1A2F45] p-6">
        <h3 className="heading-mono text-xl mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-none-full bg-[#1A2F45] flex items-center justify-center ${activity.color}`}>
                <activity.icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white">{activity.message}</p>
                <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const DashboardContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      );
    }

    return (
      <div className="space-y-6 p-6">
        {/* Quick Actions and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <QuickActions />
          <RecentActivity />
        </div>

        {/* Chart Overview - Future implementation */}
        <div className="bg-[#0A1424] rounded-none shadow-none border border-[#1A2F45] p-6">
          <h3 className="heading-mono text-xl mb-4">Performance Overview</h3>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <p>Chart component - Coming soon</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0F1E32]">
      {/* Header */}
      <div className="bg-[#0A1424] border-b border-[#1A2F45]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
              <p className="text-gray-400 mt-1">Welcome back, {account?.slice(0, 6)}...{account?.slice(-4)}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-800 rounded-none">
                <Activity className="w-4 h-4" />
                <span className="text-sm font-medium">System Healthy</span>
              </div>
              <button className="p-2 text-gray-400 hover:text-gray-400 transition-colors">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-[#0A1424] border-b border-[#1A2F45]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-mono uppercase tracking-wider text-xs transition-colors
                  ${activeTab === tab.id
                    ? 'border-[#5ce1e6] text-[#5ce1e6]'
                    : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-[#233F59]'
                  }
                `}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && <DashboardContent />}
        {activeTab === 'predictions' && <PredictionManagement />}
        {activeTab === 'topics' && <TopicManagementSimple />}
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'analytics' && <Analytics />}
      </div>
    </div>
  );
};

export default AdminPanel;





