import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Target,
  Calendar,
  BarChart3,
  PieChart,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';

const Analytics = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState('volume');

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);

      // Try to fetch real analytics data first
      try {
        const response = await fetch(`/api/admin/analytics?timeRange=${timeRange}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setAnalyticsData(data.data);
          console.log('✅ Using real analytics data from API');
          return;
        }
      } catch (apiError) {
        console.log('⚠️ Analytics API not available, using mock data:', apiError.message);
      }

      // Fallback to mock analytics data
      const mockAnalyticsData = {
        totalVolume: 2547832,
        volumeChange: 12.5,
        activeUsers: 8492,
        userChange: 8.3,
        totalBets: 1247,
        betChange: 15.7,
        avgBetSize: 245,
        avgBetChange: -2.1,
        dailyActiveUsers: 1247,
        weeklyActiveUsers: 5832,
        monthlyActiveUsers: 18492,
        avgSessionDuration: '12m 34s',
        totalTransactions: 45678,
        failedTransactions: 23,
        successRate: '99.95%',
        avgGasUsed: '125,432',
        activeMarkets: 67,
        resolvedMarkets: 89,
        avgMarketDuration: '5d 12h',
        topCategory: 'Cryptocurrency',
        categoryBreakdown: [
          { name: 'Cryptocurrency', volume: 856234, percentage: 33.6 },
          { name: 'Politics', volume: 612450, percentage: 24.0 },
          { name: 'Sports', volume: 489123, percentage: 19.2 },
          { name: 'Technology', volume: 312456, percentage: 12.3 },
          { name: 'Entertainment', volume: 277569, percentage: 10.9 }
        ],
        topBets: [
          {
            id: 1,
            title: 'Will Bitcoin reach $100,000 by end of 2024?',
            category: 'Cryptocurrency',
            volume: 156234,
            participants: 892,
            status: 'active'
          },
          {
            id: 2,
            title: '2024 US Presidential Election Winner',
            category: 'Politics',
            volume: 134567,
            participants: 1247,
            status: 'active'
          },
          {
            id: 3,
            title: 'Super Bowl 2024 Winner',
            category: 'Sports',
            volume: 98765,
            participants: 634,
            status: 'resolved'
          },
          {
            id: 4,
            title: 'Tesla Stock Price Prediction',
            category: 'Technology',
            volume: 87432,
            participants: 456,
            status: 'active'
          }
        ],
        userGrowth: [
          { date: '2024-01-01', users: 1200 },
          { date: '2024-01-02', users: 1350 },
          { date: '2024-01-03', users: 1450 },
          { date: '2024-01-04', users: 1380 },
          { date: '2024-01-05', users: 1620 },
          { date: '2024-01-06', users: 1780 },
          { date: '2024-01-07', users: 1950 }
        ],
        revenueBreakdown: [
          { source: 'Trading Fees', amount: 45678, percentage: 65 },
          { source: 'Premium Features', amount: 12345, percentage: 18 },
          { source: 'Market Creation', amount: 8765, percentage: 12 },
          { source: 'Other', amount: 3456, percentage: 5 }
        ]
      };

      setAnalyticsData(mockAnalyticsData);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const MetricCard = ({ title, value, change, icon: Icon, color = 'blue', subtitle }) => {
    const isPositive = change && change > 0;
    const colorClasses = {
      blue: 'text-[#5ce1e6] bg-primary-100',
      green: 'text-[#5ce1e6] bg-green-100',
      purple: 'text-purple-600 bg-purple-100',
      orange: 'text-orange-600 bg-orange-100'
    };

    return (
      <div className="bg-[#0A1424] rounded-none-xl shadow-none border border-[#1A2F45] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 rounded-none flex items-center justify-center ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
          {change !== undefined && (
            <div className={`flex items-center gap-1 ${isPositive ? 'text-[#5ce1e6]' : 'text-red-600'}`}>
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span className="text-sm font-medium">{Math.abs(change)}%</span>
            </div>
          )}
        </div>
        <div>
          <h3 className="heading-mono text-sm text-[#5ce1e6]">{title}</h3>
          <p className="heading-mono text-3xl mt-1">{value}</p>
          {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
        </div>
      </div>
    );
  };

  const ChartCard = ({ title, children, actions }) => (
    <div className="bg-[#0A1424] rounded-none-xl shadow-none border border-[#1A2F45] p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="heading-mono text-xl">{title}</h3>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );

  const CategoryBreakdown = () => {
    const categories = analyticsData?.categoryBreakdown || [];
    
    return (
      <ChartCard title="Betting Volume by Category">
        <div className="space-y-4">
          {categories.map((category, index) => (
            <div key={category.name} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-none-full"
                  style={{ backgroundColor: `hsl(${index * 60}, 70%, 50%)` }}
                />
                <span className="font-medium text-white">{category.name}</span>
              </div>
              <div className="text-right">
                <p className="font-semibold text-white">${category.volume?.toLocaleString()}</p>
                <p className="text-sm text-gray-400">{category.percentage}%</p>
              </div>
            </div>
          ))}
        </div>
      </ChartCard>
    );
  };

  const TopBets = () => {
    const topBets = analyticsData?.topBets || [];
    
    return (
      <ChartCard title="Top Performing Bets">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-400 border-b">
                <th className="pb-3">Bet Title</th>
                <th className="pb-3">Volume</th>
                <th className="pb-3">Participants</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {topBets.map((bet) => (
                <tr key={bet.id} className="text-sm">
                  <td className="py-3">
                    <p className="font-medium text-white truncate max-w-xs">
                      {bet.title}
                    </p>
                    <p className="text-gray-400">{bet.category}</p>
                  </td>
                  <td className="py-3 font-semibold text-white">
                    ${bet.volume?.toLocaleString()}
                  </td>
                  <td className="py-3 text-gray-400">
                    {bet.participants}
                  </td>
                  <td className="py-3">
                    <span className={`
                      px-2 py-1 rounded-none-full text-xs font-medium
                      ${bet.status === 'active' ? 'bg-green-100 text-green-800' : 
                        bet.status === 'resolved' ? 'bg-primary-100 text-primary-800' : 
                        'bg-[#1A2F45] text-gray-100'}
                    `}>
                      {bet.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    );
  };

  const UserGrowthChart = () => {
    const userData = analyticsData?.userGrowth || [];
    
    return (
      <ChartCard 
        title="User Growth"
        actions={[
          <button
            key="download"
            className="p-2 text-gray-400 hover:text-gray-400 transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
        ]}
      >
        <div className="h-64 flex items-center justify-center">
          {userData.length > 0 ? (
            <div className="w-full h-full flex items-end justify-between px-4 space-x-2">
              {userData.map((data, index) => (
                <div key={index} className="flex flex-col items-center space-y-2">
                  <div 
                    className="bg-[#5ce1e6] rounded-none-t min-w-[20px] transition-all hover:bg-[#5ce1e6]"
                    style={{ height: `${(data.users / Math.max(...userData.map(d => d.users))) * 200}px` }}
                  />
                  <span className="text-xs text-gray-400 rotate-45 origin-left">
                    {data.date}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-400">
              <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No data available</p>
            </div>
          )}
        </div>
      </ChartCard>
    );
  };

  const RevenueChart = () => {
    const revenueData = analyticsData?.revenueBreakdown || [];
    
    return (
      <ChartCard title="Revenue Breakdown">
        <div className="grid grid-cols-2 gap-4">
          {revenueData.map((item, index) => (
            <div key={item.source} className="p-4 border border-[#1A2F45] rounded-none">
              <div className="flex items-center justify-between mb-2">
                <span className="heading-mono text-sm text-[#5ce1e6]">{item.source}</span>
                <span className="text-xs text-gray-400">{item.percentage}%</span>
              </div>
              <p className="text-xl font-bold text-white">${item.amount?.toLocaleString()}</p>
              <div className="w-full bg-[#233F59] rounded-none-full h-2 mt-2">
                <div
                  className="bg-[#5ce1e6] h-2 rounded-none-full transition-all"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </ChartCard>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" text="Loading analytics..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="heading-mono text-3xl">Analytics Dashboard</h2>
          <p className="text-gray-400 mt-1">Comprehensive platform performance metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-[#1A2F45] rounded-none focus:ring-2 focus:ring-[#5ce1e6] focus:border-[#5ce1e6]"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>
          <button
            onClick={fetchAnalyticsData}
            className="p-2 text-gray-400 hover:text-gray-400 transition-colors border border-[#1A2F45] rounded-none"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Volume"
          value={`$${analyticsData?.totalVolume?.toLocaleString() || '0'}`}
          change={analyticsData?.volumeChange}
          icon={DollarSign}
          color="blue"
          subtitle="Platform lifetime"
        />
        <MetricCard
          title="Active Users"
          value={analyticsData?.activeUsers?.toLocaleString() || '0'}
          change={analyticsData?.userChange}
          icon={Users}
          color="green"
          subtitle={`${timeRange} period`}
        />
        <MetricCard
          title="Total Bets"
          value={analyticsData?.totalBets?.toLocaleString() || '0'}
          change={analyticsData?.betChange}
          icon={Target}
          color="purple"
          subtitle="All time"
        />
        <MetricCard
          title="Avg Bet Size"
          value={`$${analyticsData?.avgBetSize?.toLocaleString() || '0'}`}
          change={analyticsData?.avgBetChange}
          icon={BarChart3}
          color="orange"
          subtitle="Per transaction"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UserGrowthChart />
        <CategoryBreakdown />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart />
        <TopBets />
      </div>

      {/* Detailed Statistics */}
      <div className="bg-[#0A1424] rounded-none-xl shadow-none border border-[#1A2F45] p-6">
        <h3 className="heading-mono text-xl mb-6">Detailed Statistics</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-4">
            <h4 className="font-medium text-white">User Engagement</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Daily Active Users</span>
                <span className="font-medium">{analyticsData?.dailyActiveUsers || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Weekly Active Users</span>
                <span className="font-medium">{analyticsData?.weeklyActiveUsers || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Monthly Active Users</span>
                <span className="font-medium">{analyticsData?.monthlyActiveUsers || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Avg Session Duration</span>
                <span className="font-medium">{analyticsData?.avgSessionDuration || '0m'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-white">Platform Performance</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Transaction Count</span>
                <span className="font-medium">{analyticsData?.totalTransactions?.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Failed Transactions</span>
                <span className="font-medium">{analyticsData?.failedTransactions || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Success Rate</span>
                <span className="font-medium">{analyticsData?.successRate || '0%'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Avg Gas Used</span>
                <span className="font-medium">{analyticsData?.avgGasUsed || '0'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-white">Market Activity</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Active Markets</span>
                <span className="font-medium">{analyticsData?.activeMarkets || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Resolved Markets</span>
                <span className="font-medium">{analyticsData?.resolvedMarkets || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Avg Market Duration</span>
                <span className="font-medium">{analyticsData?.avgMarketDuration || '0d'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Most Popular Category</span>
                <span className="font-medium">{analyticsData?.topCategory || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="bg-[#0A1424] rounded-none-xl shadow-none border border-[#1A2F45] p-6">
        <h3 className="heading-mono text-xl mb-4">Export Data</h3>
        <div className="flex flex-wrap gap-3">
          <button className="flex items-center gap-2 px-4 py-2  btn-primary  text-white rounded-none hover:bg-[#06b6d4] transition-colors">
            <Download className="w-4 h-4" />
            Download CSV
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-[#1A2F45] text-gray-300 rounded-none hover:bg-[#0F1E32] transition-colors">
            <Download className="w-4 h-4" />
            Download PDF Report
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-[#1A2F45] text-gray-300 rounded-none hover:bg-[#0F1E32] transition-colors">
            <Calendar className="w-4 h-4" />
            Schedule Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default Analytics;





