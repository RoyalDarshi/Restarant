import React from 'react';
import { TrendingUp, Users, ShoppingCart, Star, BarChart3, Database } from 'lucide-react';
import { DataRow } from '../types';

interface StatsCardsProps {
  data: DataRow[];
}

const StatsCards: React.FC<StatsCardsProps> = ({ data }) => {
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
  const totalCustomers = data.reduce((sum, item) => sum + item.customers, 0);
  const totalOrders = data.reduce((sum, item) => sum + item.orders, 0);
  const averageRating = data.reduce((sum, item) => sum + item.rating, 0) / data.length;
  const activeProducts = data.filter(item => item.status === 'Active').length;
  const totalRecords = data.length;

  const stats = [
    {
      title: 'Total Revenue',
      value: `$${totalRevenue.toLocaleString()}`,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Total Customers',
      value: totalCustomers.toLocaleString(),
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Total Orders',
      value: totalOrders.toLocaleString(),
      icon: ShoppingCart,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Average Rating',
      value: `${averageRating.toFixed(1)}/5`,
      icon: Star,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      title: 'Active Products',
      value: `${activeProducts}/${totalRecords}`,
      icon: BarChart3,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100'
    },
    {
      title: 'Total Records',
      value: totalRecords.toLocaleString(),
      icon: Database,
      color: 'text-slate-600',
      bgColor: 'bg-slate-100'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.title} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">{stat.title}</p>
                <p className="text-2xl font-bold text-slate-900 mt-2">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <Icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatsCards;