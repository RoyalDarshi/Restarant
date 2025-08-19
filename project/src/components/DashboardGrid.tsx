// src/components/DashboardGrid.tsx
import React from "react";
import { useDashboard } from "./DashboardContext";
import ChartDisplay from "./ChartDisplay";
import { X } from "lucide-react";

const DashboardGrid = () => {
  const { charts, removeChart } = useDashboard();

  if (!charts.length)
    return <div className="p-10 text-center text-slate-500">No charts added yet.</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-4">
      {charts.map((chart) => (
        <div key={chart.id} className="relative border rounded-lg bg-white p-2 shadow">
          <button
            onClick={() => removeChart(chart.id)}
            className="absolute top-2 right-2 z-10 bg-red-100 p-1 rounded-full text-red-600 hover:bg-red-200"
            title="Remove chart"
          >
            <X size={16} />
          </button>
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