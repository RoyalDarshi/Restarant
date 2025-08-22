// src/components/DashboardContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

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

export interface Dashboard {
  id: string;
  name: string;
  charts: DashboardChartConfig[];
}

const DashboardContext = createContext({
  dashboards: [],
  currentDashboardId: null,
  createDashboard: () => "",
  deleteDashboard: () => {},
  setCurrentDashboardId: () => {},
  addChartToDashboard: () => {},
  removeChartFromDashboard: () => {},
  updateDashboardCharts: () => {},
});
export const useDashboard = () => useContext(DashboardContext);

export const DashboardProvider = ({ children }) => {
  const [dashboards, setDashboards] = useState([]);
  const [currentDashboardId, setCurrentDashboardId] = useState(null);

  const createDashboard = (name) => {
    const id = uuidv4();
    setDashboards((prev) => [...prev, { id, name, charts: [] }]);
    if (!currentDashboardId) setCurrentDashboardId(id);
    return id;
  };
  const deleteDashboard = (id) => {
    setDashboards((prev) => prev.filter((d) => d.id !== id));
    if (currentDashboardId === id) {
      setCurrentDashboardId(dashboards.length > 1 ? dashboards[0].id : null);
    }
  };
  const addChartToDashboard = (dashboardId, chart) => {
    setDashboards((prev) =>
      prev.map((d) =>
        d.id === dashboardId ? { ...d, charts: [...d.charts, chart] } : d
      )
    );
  };

  const removeChartFromDashboard = (dashboardId, chartId) => {
    setDashboards((prev) =>
      prev.map((d) =>
        d.id === dashboardId
          ? { ...d, charts: d.charts.filter((c) => c.id !== chartId) }
          : d
      )
    );
  };

  const updateDashboardCharts = (dashboardId, charts) => {
    setDashboards((prev) =>
      prev.map((d) => (d.id === dashboardId ? { ...d, charts } : d))
    );
  };

  useEffect(() => {
    if (dashboards.length > 0 && !currentDashboardId) {
      setCurrentDashboardId(dashboards[0].id);
    } else if (dashboards.length === 0) {
      setCurrentDashboardId(null);
    }
  }, [dashboards]);
  return (
    <DashboardContext.Provider
      value={{
        dashboards,
        currentDashboardId,
        createDashboard,
        deleteDashboard,
        setCurrentDashboardId,
        addChartToDashboard,
        removeChartFromDashboard,
        updateDashboardCharts,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};