import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, ResponsiveContainer, ComposedChart } from 'recharts';
import { Column, DataRow } from '../types';
import ChartDropZone from './ChartDropZone';
import { BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, Activity, RefreshCw, Layers } from 'lucide-react';

interface ChartBuilderProps {
  data: DataRow[];
}

const ChartBuilder: React.FC<ChartBuilderProps> = ({ data }) => {
  const [xAxisColumn, setXAxisColumn] = useState<Column | null>(null);
  const [yAxisColumns, setYAxisColumns] = useState<Column[]>([]);
  const [groupByColumn, setGroupByColumn] = useState<Column | null>(null);
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie' | 'area' | 'composed'>('bar');

  const chartData = useMemo(() => {
    if (!xAxisColumn || yAxisColumns.length === 0) return [];

    if (groupByColumn) {
      // Group by both X-axis and groupBy column
      const grouped = data.reduce((acc, item) => {
        const xValue = String(item[xAxisColumn.key]);
        const groupValue = String(item[groupByColumn.key]);
        const key = `${xValue}-${groupValue}`;
        
        if (!acc[key]) {
          acc[key] = { name: xValue, group: groupValue };
          yAxisColumns.forEach(col => {
            acc[key][col.label] = 0;
          });
        }
        
        yAxisColumns.forEach(col => {
          const value = item[col.key];
          if (typeof value === 'number') {
            acc[key][col.label] += value;
          }
        });
        
        return acc;
      }, {} as Record<string, any>);

      return Object.values(grouped);
    } else {
      // Simple grouping by X-axis only
      const grouped = data.reduce((acc, item) => {
        const xValue = String(item[xAxisColumn.key]);
        
        if (!acc[xValue]) {
          acc[xValue] = { name: xValue };
          yAxisColumns.forEach(col => {
            acc[xValue][col.label] = 0;
          });
        }
        
        yAxisColumns.forEach(col => {
          const value = item[col.key];
          if (typeof value === 'number') {
            acc[xValue][col.label] += value;
          }
        });
        
        return acc;
      }, {} as Record<string, any>);

      return Object.values(grouped);
    }
  }, [data, xAxisColumn, yAxisColumns, groupByColumn]);

  const pieChartData = useMemo(() => {
    if (!xAxisColumn || yAxisColumns.length === 0) return [];
    
    const firstYColumn = yAxisColumns[0];
    const grouped = data.reduce((acc, item) => {
      const xValue = String(item[xAxisColumn.key]);
      const yValue = item[firstYColumn.key];
      
      if (typeof yValue === 'number') {
        acc[xValue] = (acc[xValue] || 0) + yValue;
      }
      
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped).map(([key, value]) => ({
      name: key,
      value: value
    }));
  }, [data, xAxisColumn, yAxisColumns]);

  const handleDrop = (column: Column, axis: 'x' | 'y' | 'group') => {
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

  const handleRemove = (column: Column, axis: 'x' | 'y' | 'group') => {
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
  };

  const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

  const renderChart = () => {
    if (!xAxisColumn || yAxisColumns.length === 0 || chartData.length === 0) {
      return (
        <div className="h-96 flex items-center justify-center text-slate-500">
          <div className="text-center">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p>Drop columns above to generate a chart</p>
            <p className="text-sm mt-2">You can add multiple Y-axis columns for comparison</p>
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
                  dataKey={column.label} 
                  fill={COLORS[index % COLORS.length]} 
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
                  dataKey={column.label} 
                  stroke={COLORS[index % COLORS.length]} 
                  strokeWidth={2} 
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
                  dataKey={column.label} 
                  stroke={COLORS[index % COLORS.length]} 
                  fill={COLORS[index % COLORS.length]} 
                  fillOpacity={0.3} 
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
                      dataKey={column.label} 
                      fill={COLORS[index % COLORS.length]} 
                    />
                  );
                } else {
                  return (
                    <Line 
                      key={column.key}
                      type="monotone" 
                      dataKey={column.label} 
                      stroke={COLORS[index % COLORS.length]} 
                      strokeWidth={2} 
                    />
                  );
                }
              })}
            </ComposedChart>
          </ResponsiveContainer>
        );
      
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {pieChartData.map((entry, index) => (
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Chart Builder</h2>
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
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-3">Chart Type</label>
          <div className="flex space-x-2">
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
        
        <div className="bg-slate-50 rounded-lg p-6">
          {(xAxisColumn || yAxisColumns.length > 0 || groupByColumn) && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Chart Configuration:</h4>
              <div className="text-sm text-blue-800 space-y-1">
                {xAxisColumn && <p>• X-Axis: {xAxisColumn.label}</p>}
                {yAxisColumns.length > 0 && (
                  <p>• Y-Axis: {yAxisColumns.map(col => col.label).join(', ')}</p>
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

export default ChartBuilder;