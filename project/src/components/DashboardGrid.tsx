import React, { useState, useEffect } from "react";
import { useDashboard } from "./DashboardContext";
import ChartDisplay from "./ChartDisplay";
import { X } from "lucide-react";

const DashboardGrid = () => {
  const { charts, removeChart } = useDashboard();
  const [hoveredChart, setHoveredChart] = useState<string | null>(null);
  const [cards, setCards] = useState(charts); // Track card positions
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sync local cards with charts from context whenever charts change
  useEffect(() => {
    setCards(charts);
  }, [charts]);

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

  if (!cards.length) {
    return (
      <div className="p-10 text-center text-slate-500">
        No charts added yet.
      </div>
    );
  }

  return (
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
  );
};

export default DashboardGrid;
