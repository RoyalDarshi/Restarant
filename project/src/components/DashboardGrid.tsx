import React, { useState, useEffect } from "react";
import { useDashboard } from "./DashboardContext";
import ChartDisplay from "./ChartDisplay";
import { X } from "lucide-react";

const DashboardGrid = () => {
  const {
    dashboards,
    currentDashboardId,
    setCurrentDashboardId,
    createDashboard,
    deleteDashboard,
    removeChartFromDashboard,
    updateDashboardCharts,
  } = useDashboard();
  const [hoveredChart, setHoveredChart] = useState(null);
  const [cards, setCards] = useState([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const currentDashboard = dashboards.find((d) => d.id === currentDashboardId);
  const charts = currentDashboard?.charts || [];

  // Sync local cards with charts from current dashboard whenever they change
  useEffect(() => {
    setCards(charts);
  }, [charts]);

  const handleDragStart = (e, chartId) => {
    e.dataTransfer.setData("chartId", chartId);
  };
  const handleDragOver = (e) => {
    e.preventDefault();
  };
  const handleDrop = (e, targetId) => {
    const draggedId = e.dataTransfer.getData("chartId");
    if (draggedId !== targetId) {
      const draggedIndex = cards.findIndex((card) => card.id === draggedId);
      const targetIndex = cards.findIndex((card) => card.id === targetId);
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const newCards = [...cards];
        const [removed] = newCards.splice(draggedIndex, 1);
        newCards.splice(targetIndex, 0, removed);
        setCards(newCards);
        if (currentDashboardId) {
          updateDashboardCharts(currentDashboardId, newCards);
        }
      }
    }
  };

  const handleRemoveChart = (chartId) => {
    if (currentDashboardId) {
      removeChartFromDashboard(currentDashboardId, chartId);
    }
  };

  if (!dashboards.length) {
    return (
      <div className="p-10 text-center text-slate-500">
        No dashboards yet. Create one to add charts.
      </div>
    );
  }

  if (!currentDashboardId || !currentDashboard) {
    return null;
  }

  return (
    <div className="p-4">
      {/* This section is now always rendered */}
      <div className="flex items-center gap-2 mb-4">
        <select
          className="border p-1 rounded"
          value={currentDashboardId || ""}
          onChange={(e) => setCurrentDashboardId(e.target.value)}
        >
          {dashboards.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <button
          className="bg-blue-500 text-white p-1 rounded"
          onClick={() => {
            const name = prompt("Enter dashboard name");
            if (name) {
              createDashboard(name);
            }
          }}
        >
          New Dashboard
        </button>
        <button
          className="bg-red-500 text-white p-1 rounded"
          onClick={() => deleteDashboard(currentDashboardId)}
          disabled={!currentDashboardId}
        >
          Delete Dashboard
        </button>
      </div>

      {/* Conditional rendering for charts or a message */}
      {!cards.length ? (
        <div className="p-10 text-center text-slate-500">
          No charts added to this dashboard yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 p-1">
          {cards.map((chart) => (
            <div
              key={chart.id}
              className={`relative border border-gray-300 rounded-md bg-white p-1 shadow-md transition-all duration-200 ease-in-out transform ${
                hoveredChart === chart.id ? "scale-[1.02] shadow-lg" : ""
              }`}
              draggable
              onDragStart={(e) => handleDragStart(e, chart.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, chart.id)}
              onMouseEnter={() => setHoveredChart(chart.id)}
              onMouseLeave={() => setHoveredChart(null)}
            >
              {hoveredChart === chart.id && (
                <button
                  onClick={() => handleRemoveChart(chart.id)}
                  className="absolute top-1.5 right-1.5 z-10 bg-red-100 p-0.5 rounded-full text-red-600 hover:bg-red-200"
                  title="Remove chart"
                >
                  <X size={14} />
                </button>
              )}
              <ChartDisplay
                chartContainerRef={React.createRef()}
                loading={false}
                error={null}
                {...chart}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardGrid;