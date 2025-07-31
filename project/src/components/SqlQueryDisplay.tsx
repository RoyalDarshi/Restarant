import React, { useState } from 'react';
import { Copy } from 'lucide-react';

interface SqlQueryDisplayProps {
  generatedQuery: string;
}

const SqlQueryDisplay: React.FC<SqlQueryDisplayProps> = ({ generatedQuery }) => {
  const [copySuccess, setCopySuccess] = useState<string>("");

  const handleCopyQuery = () => {
    const queryToCopy = generatedQuery.trim();
    if (queryToCopy) {
      const textArea = document.createElement("textarea");
      textArea.value = queryToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopySuccess("Copied!");
      } catch (err) {
        setCopySuccess("Failed to copy.");
        console.error("Failed to copy query: ", err);
      }
      document.body.removeChild(textArea);

      setTimeout(() => setCopySuccess(""), 2000);
    }
  };

  return (
    <div className="mt-4 p-4 bg-gray-800 rounded-lg text-white font-mono text-sm relative">
      <h3 className="text-md font-semibold mb-2 text-gray-200">
        Generated SQL Query
      </h3>
      {generatedQuery ? (
        <>
          <pre className="whitespace-pre-wrap break-all pr-10">
            {generatedQuery}
          </pre>
          <button
            onClick={handleCopyQuery}
            className="absolute top-4 right-4 p-2 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors"
            title="Copy to clipboard"
          >
            <Copy className="h-4 w-4" />
          </button>
          {copySuccess && (
            <span className="absolute top-4 right-14 text-xs text-green-400">
              {copySuccess}
            </span>
          )}
        </>
      ) : (
        <p className="text-gray-400 text-center py-8">
          Select X-axis and Y-axis columns to generate the SQL query.
        </p>
      )}
    </div>
  );
};

export default SqlQueryDisplay;
