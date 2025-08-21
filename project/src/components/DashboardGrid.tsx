// src/components/DashboardGrid.tsx
import React, { useState, useEffect } from "react";
import { useDashboard } from "./DashboardContext";
import ChartDisplay from "./ChartDisplay";
import { X } from "lucide-react";

const DashboardGrid = () => {
  const { charts, removeChart } = useDashboard();
  const [hoveredChart, setHoveredChart] = useState<string | null>(null);
  const [cards, setCards] = useState(charts); // State to track card positions
  const [isMounted, setIsMounted] = useState(false); // To track the component mount state

  useEffect(() => {
    setIsMounted(true); // Set to true after the component mounts
  }, []);

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
    setCards(cards.filter((chart) => chart.id !== chartId));
  };

  if (!cards.length)
    return (
      <div className="p-10 text-center text-slate-500">
        No charts added yet.
      </div>
    );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-2">
      {cards.map((chart) => (
        <div
          key={chart.id}
          className={`relative border border-gray-400 rounded-lg bg-white p-2 shadow-xl transition-all duration-300 ease-in-out transform ${
            hoveredChart === chart.id
              ? "scale-105 translate-y-2 shadow-2xl"
              : ""
          }`} // Apply the hover effect only when hovered
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

          <ChartDisplay
            chartContainerRef={React.createRef()}
            loading={false}
            error={null}
            {...chart}
          />
        </div>
      ))}
    </div>
  );
};

export default DashboardGrid;