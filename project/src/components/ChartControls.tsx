import React from 'react';
import {
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Activity,
  Layers,
  ChevronDown,
  ChevronUp,
  Settings,
  LayoutGrid,
  Table,
  Terminal,
  Check,
} from "lucide-react";
import { AggregationType, ChartType } from "./types";

interface ChartControlsProps {
  chartType: ChartType;
  setChartType: (type: ChartType) => void;
  aggregationType: AggregationType;
  setAggregationType: (type: AggregationType) => void;
  stacked: boolean;
  setStacked: (isStacked: boolean) => void;
  activeView: "graph" | "table" | "query";
  setActiveView: (view: "graph" | "table" | "query") => void;
  yAxisCount: number;
  groupByColumn: any; // Added this prop to check for stacked bar chart logic
}

const chartTypeOptions = [
  { type: "bar" as const, label: "Bar", icon: BarChart3 },
  { type: "line" as const, label: "Line", icon: LineChartIcon },
  { type: "area" as const, label: "Area", icon: Activity },
  { type: "composed" as const, label: "Mixed", icon: Layers },
  { type: "pie" as const, label: "Pie", icon: PieChartIcon },
];

const aggregationOptions = [
  { value: "SUM", label: "Sum" },
  { value: "AVG", label: "Average" },
  { value: "COUNT", label: "Count" },
  { value: "MIN", label: "Minimum" },
  { value: "MAX", label: "Maximum" },
];

const viewOptions = [
  { type: "graph" as const, label: "Graph", icon: LayoutGrid },
  { type: "table" as const, label: "Table", icon: Table },
  { type: "query" as const, label: "SQL", icon: Terminal },
];

const ChartControls: React.FC<ChartControlsProps> = ({
  chartType,
  setChartType,
  aggregationType,
  setAggregationType,
  stacked,
  setStacked,
  activeView,
  setActiveView,
  yAxisCount,
  groupByColumn,
}) => {
  const [showChartOptions, setShowChartOptions] = React.useState(false);
  const [showAggregationOptions, setShowAggregationOptions] = React.useState(false);
  const chartOptionsRef = React.useRef<HTMLDivElement>(null);
  const aggregationOptionsRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        chartOptionsRef.current &&
        !chartOptionsRef.current.contains(event.target as Node)
      ) {
        setShowChartOptions(false);
      }
      if (
        aggregationOptionsRef.current &&
        !aggregationOptionsRef.current.contains(event.target as Node)
      ) {
        setShowAggregationOptions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const CurrentChartIcon = chartTypeOptions.find(option => option.type === chartType)?.icon || BarChart3;

  return (
    <div className="relative z-20 flex flex-wrap items-center justify-between gap-4 mb-1">
      <div className="flex flex-wrap items-center gap-3">
        {activeView === "graph" && (
          <div className="relative">
            <button
              onClick={() => setShowChartOptions(!showChartOptions)}
              className="flex items-center px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Settings className="h-4 w-4 mr-2 text-blue-500" />
              <span>Chart Options</span>
              {showChartOptions ? (
                <ChevronUp className="h-4 w-4 ml-2" />
              ) : (
                <ChevronDown className="h-4 w-4 ml-2" />
              )}
            </button>
            {showChartOptions && (
              <div
                ref={chartOptionsRef}
                className="absolute z-10 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg p-4 w-64"
              >
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Chart Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {chartTypeOptions.map(({ type, label, icon: Icon }) => (
                      <button
                        key={type}
                        onClick={() => setChartType(type)}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg text-sm font-medium transition-colors ${
                          chartType === type
                            ? "bg-blue-100 text-blue-700 border border-blue-300"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        <Icon className="h-5 w-5 mb-1" />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {chartType === "bar" && yAxisCount >= 2 && !groupByColumn && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Bar Style
                    </label>
                    <div className="flex items-center">
                      <button
                        onClick={() => setStacked(false)}
                        className={`flex-1 py-2 rounded-l-lg text-sm font-medium transition-colors ${
                          !stacked
                            ? "bg-blue-600 text-white"
                            : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                        }`}
                      >
                        Side-by-side
                      </button>
                      <button
                        onClick={() => setStacked(true)}
                        className={`flex-1 py-2 rounded-r-lg text-sm font-medium transition-colors ${
                          stacked
                            ? "bg-blue-600 text-white"
                            : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                        }`}
                      >
                        Stacked
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        <div className="relative">
          <button
            onClick={() => setShowAggregationOptions(!showAggregationOptions)}
            className="flex items-center px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Layers className="h-4 w-4 mr-2 text-indigo-500" />
            <span>Aggregation: {aggregationType}</span>
            {showAggregationOptions ? (
              <ChevronUp className="h-4 w-4 ml-2" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-2" />
            )}
          </button>
          {showAggregationOptions && (
            <div
              ref={aggregationOptionsRef}
              className="absolute z-30 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg p-2 w-48 max-h-60 overflow-y-auto"
            >
              {aggregationOptions.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => {
                    setAggregationType(value as AggregationType);
                    setShowAggregationOptions(false);
                  }}
                  className={`flex items-center w-full px-4 py-2 text-sm text-left rounded-md ${
                    aggregationType === value
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {aggregationType === value && (
                    <Check className="h-4 w-4 mr-2 text-blue-500" />
                  )}
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-2 ml-auto">
        <div className="flex bg-slate-100 rounded-lg p-1">
          {viewOptions.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              onClick={() => setActiveView(type)}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeView === type
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-700 hover:text-blue-600"
              }`}
            >
              <Icon className="h-4 w-4 mr-1" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChartControls;
