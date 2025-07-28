import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, ResponsiveContainer, ComposedChart } from 'recharts';
import { DatabaseColumn, apiService, AggregationRequest } from '../services/api';
import ChartDropZone from './ChartDropZone';
import { BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, Activity, RefreshCw, Layers } from 'lucide-react';

interface DynamicChartBuilderProps {
  tableName: string;
  columns: DatabaseColumn[];
}

const DynamicChartBuilder: React.FC<DynamicChartBuilderProps> = ({ tableName, columns }) => {
  const [xAxisColumn, setXAxisColumn] = useState<DatabaseColumn | null>(null);
  const [yAxisColumns, setYAxisColumns] = useState<DatabaseColumn[]>([]);
  const [groupByColumn, setGroupByColumn] = useState<DatabaseColumn | null>(null);
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie' | 'area' | 'composed'>('bar');
  const [aggregationType, setAggregationType] = useState<'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX'>('SUM');
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChartData = async () => {
    if (!tableName || !xAxisColumn || yAxisColumns.length === 0) {
      setChartData([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const request: AggregationRequest = {
        tableName,
        xAxis: xAxisColumn.key,
        yAxes: yAxisColumns.map(col => col.key),
        groupBy: groupByColumn?.key,
        aggregationType
      };

      const response = await apiService.getAggregatedData(request);
      
      if (response.success && response.data) {
        setChartData(response.data);
      } else {
        setError(response.error || 'Failed to fetch chart data');
      }
    } catch (err) {
      setError('Failed to generate chart data');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (column: DatabaseColumn, axis: 'x' | 'y' | 'group') => {
    if (axis === 'x') {
      setXAxisColumn(column);
    } else if (axis === 'y') {
      if (!yAxisColumns.find(col => col.key === column.key)) {
        setYAxisColumns(prev => [...prev, column]);
      }
    } else if (axis === 'group') {
      setGroupByColumn(column);
    }
  };

  const handleRemove = (column: DatabaseColumn, axis: 'x' | 'y' | 'group') => {
    if (axis === 'x') {
      setXAxisColumn(null);
    } else if (axis === 'y') {
      setYAxisColumns(prev => prev.filter(col => col.key !== column.key));
    } else if (axis === 'group') {
      setGroupByColumn(null);
    }
  };

  const handleReset = () => {
    setXAxisColumn(null);
    setYAxisColumns([]);
    setGroupByColumn(null);
    setChartData([]);
    setError(null);
  };

  useEffect(() => {
    fetchChartData();
  }, [tableName, xAxisColumn, yAxisColumns, groupByColumn, aggregationType]);

  const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

  const renderChart = () => {
    if (loading) {
      return (
        <div className="h-96 flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
          <span className="ml-2 text-slate-600">Generating chart...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="h-96 flex items-center justify-center">
          <div className="text-center text-red-600">
            <p className="font-medium">Error generating chart</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      );
    }

    if (!xAxisColumn || yAxisColumns.length === 0 || chartData.length === 0) {
      return (
        <div className="h-96 flex items-center justify-center text-slate-500">
          <div className="text-center">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p>Configure chart settings above to generate visualization</p>
            <p className="text-sm mt-2">Select X-axis and Y-axis columns from your database</p>
          </div>
        </div>
      );
    }

    const commonProps = {
      width: 800,
      height: 400,
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 5 }
    };

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              {yAxisColumns.map((column, index) => (
                <Bar 
                  key={column.key} 
                  dataKey={column.key} 
                  fill={COLORS[index % COLORS.length]}
                  name={column.label}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              {yAxisColumns.map((column, index) => (
                <Line 
                  key={column.key}
                  type="monotone" 
                  dataKey={column.key} 
                  stroke={COLORS[index % COLORS.length]} 
                  strokeWidth={2}
                  name={column.label}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              {yAxisColumns.map((column, index) => (
                <Area 
                  key={column.key}
                  type="monotone" 
                  dataKey={column.key} 
                  stroke={COLORS[index % COLORS.length]} 
                  fill={COLORS[index % COLORS.length]} 
                  fillOpacity={0.3}
                  name={column.label}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );
      
      case 'composed':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              {yAxisColumns.map((column, index) => {
                if (index % 2 === 0) {
                  return (
                    <Bar 
                      key={column.key} 
                      dataKey={column.key} 
                      fill={COLORS[index % COLORS.length]}
                      name={column.label}
                    />
                  );
                } else {
                  return (
                    <Line 
                      key={column.key}
                      type="monotone" 
                      dataKey={column.key} 
                      stroke={COLORS[index % COLORS.length]} 
                      strokeWidth={2}
                      name={column.label}
                    />
                  );
                }
              })}
            </ComposedChart>
          </ResponsiveContainer>
        );
      
      case 'pie':
        const pieData = chartData.map(item => ({
          name: item.name,
          value: item[yAxisColumns[0]?.key] || 0
        }));
        
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
      
      default:
        return null;
    }
  };

  const chartTypes = [
    { type: 'bar' as const, icon: BarChart3, label: 'Bar Chart' },
    { type: 'line' as const, icon: LineChartIcon, label: 'Line Chart' },
    { type: 'area' as const, icon: Activity, label: 'Area Chart' },
    { type: 'composed' as const, icon: Layers, label: 'Mixed Chart' },
    { type: 'pie' as const, icon: PieChartIcon, label: 'Pie Chart' },
  ];

  const aggregationTypes: Array<{ value: typeof aggregationType; label: string }> = [
    { value: 'SUM', label: 'Sum' },
    { value: 'AVG', label: 'Average' },
    { value: 'COUNT', label: 'Count' },
    { value: 'MIN', label: 'Minimum' },
    { value: 'MAX', label: 'Maximum' },
  ];

  if (!tableName) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="text-center text-slate-500">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>Select a table to start building charts</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Chart Builder - {tableName}</h2>
          <button
            onClick={handleReset}
            className="flex items-center space-x-2 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Reset</span>
          </button>
        </div>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">X-Axis (Categories)</label>
            <ChartDropZone
              onDrop={handleDrop}
              onRemove={handleRemove}
              axis="x"
              selectedColumns={xAxisColumn ? [xAxisColumn] : []}
              label="X-Axis column"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Y-Axis (Values) - Multiple Supported</label>
            <ChartDropZone
              onDrop={handleDrop}
              onRemove={handleRemove}
              axis="y"
              selectedColumns={yAxisColumns}
              label="Y-Axis columns"
              allowMultiple={true}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Group By (Optional)</label>
            <ChartDropZone
              onDrop={handleDrop}
              onRemove={handleRemove}
              axis="group"
              selectedColumns={groupByColumn ? [groupByColumn] : []}
              label="Group by column"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">Chart Type</label>
            <div className="flex flex-wrap gap-2">
              {chartTypes.map(({ type, icon: Icon, label }) => (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                    chartType === type
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm">{label}</span>
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">Aggregation Type</label>
            <select
              value={aggregationType}
              onChange={(e) => setAggregationType(e.target.value as typeof aggregationType)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {aggregationTypes.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="bg-slate-50 rounded-lg p-6">
          {(xAxisColumn || yAxisColumns.length > 0 || groupByColumn) && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Chart Configuration:</h4>
              <div className="text-sm text-blue-800 space-y-1">
                {xAxisColumn && <p>• X-Axis: {xAxisColumn.label}</p>}
                {yAxisColumns.length > 0 && (
                  <p>• Y-Axis: {yAxisColumns.map(col => col.label).join(', ')} ({aggregationType})</p>
                )}
                {groupByColumn && <p>• Grouped by: {groupByColumn.label}</p>}
              </div>
            </div>
          )}
          {renderChart()}
        </div>
      </div>
    </div>
  );
};

export default DynamicChartBuilder;