import React from 'react';
import { BarChart3, Users, AlertCircle, LogOut } from 'lucide-react';
import { Analytics } from '../hooks/useAnalytics';

interface AdminDashboardProps {
  analytics: Analytics;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ analytics, onLogout }) => {
  const stats = [
    {
      title: 'Patient Queries',
      value: analytics.patientQueries,
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      title: 'Staff Queries',
      value: analytics.staffQueries,
      icon: BarChart3,
      color: 'bg-green-500'
    },
    {
      title: 'Urgent Cases',
      value: analytics.urgentCases,
      icon: AlertCircle,
      color: 'bg-red-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-purple-500" />
            <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
          </div>
          <button
            onClick={onLogout}
            className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat) => (
            <div key={stat.title} className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} text-white p-3 rounded-lg`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <span className="text-3xl font-bold">{stat.value}</span>
              </div>
              <h3 className="text-gray-600 font-medium">{stat.title}</h3>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">Usage Analytics</h2>
          <div className="h-64 flex items-end justify-around gap-4 border-b border-l">
            {stats.map((stat) => (
              <div
                key={stat.title}
                className="w-1/4 flex flex-col items-center"
              >
                <div
                  className={`${stat.color} w-full rounded-t-lg transition-all duration-500`}
                  style={{
                    height: `${(stat.value / Math.max(...stats.map(s => s.value))) * 100}%`,
                  }}
                ></div>
                <p className="mt-2 text-sm font-medium text-gray-600">{stat.title}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};