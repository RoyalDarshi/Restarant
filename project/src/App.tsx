import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import DynamicDataTable from './components/DynamicDataTable';
import DynamicChartBuilder from './components/DynamicChartBuilder';
import DynamicColumnsPanel from './components/DynamicColumnsPanel';
import DatabaseSelector from './components/DatabaseSelector';
import DragDropProvider from './components/DragDropProvider';
import { DatabaseColumn } from './services/api';

function App() {
  const [activeTab, setActiveTab] = useState('data');
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableColumns, setTableColumns] = useState<DatabaseColumn[]>([]);

  const handleTableSelect = (tableName: string, columns: DatabaseColumn[]) => {
    setSelectedTable(tableName);
    setTableColumns(columns);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'data':
        return (
          <div className="space-y-8">
            <DatabaseSelector 
              onTableSelect={handleTableSelect}
              selectedTable={selectedTable}
            />
            {selectedTable && (
              <DynamicDataTable 
                tableName={selectedTable}
                columns={tableColumns}
              />
            )}
          </div>
        );
      
      case 'charts':
        return (
          <DragDropProvider>
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
              <div className="xl:col-span-1">
                <DynamicColumnsPanel 
                  tableName={selectedTable}
                  columns={tableColumns}
                />
              </div>
              <div className="xl:col-span-3">
                <DynamicChartBuilder 
                  tableName={selectedTable || ''}
                  columns={tableColumns}
                />
              </div>
            </div>
          </DragDropProvider>
        );
      
      case 'trends':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Trends Analysis</h2>
            <p className="text-slate-600">Advanced trends and forecasting features coming soon...</p>
          </div>
        );
      
      case 'settings':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Settings</h2>
            <p className="text-slate-600">Dashboard configuration options coming soon...</p>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-slate-100">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 overflow-auto">
        <div className="">
          <div className="">
            <h1 className="text-3xl font-bold text-slate-900">
              {activeTab === "data" && "Database Explorer"}
              {activeTab === "trends" && "Trends Analysis"}
              {activeTab === "settings" && "Settings"}
            </h1>
            <p className="text-slate-600 mt-2">
              {activeTab === "data" &&
                "Connect to your PostgreSQL database and explore tables"}
              {activeTab === "trends" &&
                "Discover patterns and forecast future trends"}
              {activeTab === "settings" &&
                "Configure your dashboard preferences"}
            </p>
          </div>

          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default App;