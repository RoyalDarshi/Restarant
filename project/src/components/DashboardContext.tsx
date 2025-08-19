// src/components/DashboardContext.tsx
import React, { createContext, useContext, useState } from "react";

export interface DashboardChartConfig {
  id: string;
  chartType: any;
  chartData: any[];
  xAxisColumn: any;
  yAxisColumns: any[];
  groupByColumn: any;
  uniqueGroupKeys: string[];
  aggregationType: string;
  stacked: boolean;
}

const DashboardContext = createContext<{
  charts: DashboardChartConfig[];
  addChart: (chart: DashboardChartConfig) => void;
  removeChart: (id: string) => void;
}>({
  charts: [],
  addChart: () => {},
  removeChart: () => {},
});

export const useDashboard = () => useContext(DashboardContext);

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [charts, setCharts] = useState<DashboardChartConfig[]>([]);

  const addChart = (chart: DashboardChartConfig) => setCharts((prev) => [...prev, chart]);
  const removeChart = (id: string) => setCharts((prev) => prev.filter((c) => c.id !== id));

  return (
    <DashboardContext.Provider value={{ charts, addChart, removeChart }}>
      {children}
    </DashboardContext.Provider>
  );
};