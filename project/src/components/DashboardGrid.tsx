// src/components/DashboardGrid.tsx
import React, { useState, useEffect, useMemo } from "react";
import { useDashboard } from "./DashboardContext";
import ChartDisplay from "./ChartDisplay";
import { X } from "lucide-react";

const DashboardGrid = () => {
  const { charts, removeChart } = useDashboard();
  const [hoveredChart, setHoveredChart] = useState<string | null>(null);
  const [cards, setCards] = useState(charts); // State to track card positions
  const [chartSorting, setChartSorting] = useState<{ [key: string]: 'asc' | 'desc' | null }>({});

  const [isMounted, setIsMounted] = useState(false); // To track the component mount state

  useEffect(() => {
    setIsMounted(true); // Set to true after the component mounts
  }, []);

  // Update cards when charts change
  useEffect(() => {
    setCards(charts);
  }, [charts]);

  // Handle sorting of a specific chart's data
  const handleSortChange = (chartId: string, order: string) => {
    // If "none" is selected, set to null, otherwise set the order
    const sortOrder = order === 'none' ? null : order as 'asc' | 'desc';
    setChartSorting((prev) => ({ ...prev, [chartId]: sortOrder }));
  };

  // Function to handle drag start event
  const handleDragStart = (e: React.DragEvent, chartId: string) => {
    e.dataTransfer.setData("chartId", chartId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    const draggedId = e.dataTransfer.getData("chartId");
    if (draggedId !== targetId) {
      const draggedIndex = cards.findIndex((card) => card.id === draggedId);
      const targetIndex = cards.findIndex((card) => card.id === targetId);

      if (draggedIndex !== -1 && targetIndex !== -1) {
        const newCards = [...cards];
        const [removed] = newCards.splice(draggedIndex, 1);
        newCards.splice(targetIndex, 0, removed);
        setCards(newCards);
      }
    }
  };

  const handleRemoveChart = (chartId: string) => {
    removeChart(chartId);
    setCards(cards.filter(chart => chart.id !== chartId));
    // Also remove sorting preference for this chart
    setChartSorting((prev) => {
      const newSorting = { ...prev };
      delete newSorting[chartId];
      return newSorting;    });
  };

  if (!cards.length)
    return <div className="p-10 text-center text-slate-500">No charts added yet.</div>;

  return (
    <div className="space-y-4">
      {/* Grid of Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-4">
        {cards.map((chart) => (
          <div
            key={chart.id}
            className={`relative border border-gray-400 rounded-lg bg-white p-2 shadow-xl transition-all duration-300 ease-in-out transform ${
              hoveredChart === chart.id ? 'scale-105 translate-y-2 shadow-2xl' : ''
            }`} // Apply hover effect only when hovered
            draggable
            onDragStart={(e) => handleDragStart(e, chart.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, chart.id)}
            onMouseEnter={() => setHoveredChart(chart.id)}
            onMouseLeave={() => setHoveredChart(null)}
          >
            {/* Remove button that shows only on hover */}
            {hoveredChart === chart.id && (
              <button
                onClick={() => handleRemoveChart(chart.id)}
                className="absolute top-2 right-2 z-10 bg-red-100 p-1 rounded-full text-red-600 hover:bg-red-200"
                title="Remove chart"
              >
                <X size={16} />
              </button>
            )}

            {/* Sorting Dropdown inside each chart */}
            <div className="absolute top-2 left-2 z-10">
              <select
                value={chartSorting[chart.id] || 'none'}
                onChange={(e) => handleSortChange(chart.id, e.target.value)}
                className="border border-gray-300 p-1 rounded text-sm"
              >
                <option value="none">No Sorting</option>
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>

            {/* Pass the sorting option to ChartDisplay */}
            <ChartDisplay
              key={`${chart.id}-${chartSorting[chart.id] || 'none'}`} // Force re-render when sort changes
              chartContainerRef={React.createRef()}
              loading={false}
              error={null}
              sortOrder={chartSorting[chart.id] || null} // Pass null when no sorting
              {...chart}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardGrid;