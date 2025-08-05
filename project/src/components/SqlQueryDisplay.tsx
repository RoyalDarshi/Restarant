import React, { useState } from 'react';
import { Copy } from 'lucide-react';
import SyntaxHighlighter from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { format } from "sql-formatter";

interface SqlQueryDisplayProps {
  generatedQuery: string;
}

const SqlQueryDisplay: React.FC<SqlQueryDisplayProps> = ({
  generatedQuery,
}) => {
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

  let formattedQuery = "";
  if (generatedQuery) {
    try {
      formattedQuery = format(generatedQuery, { language: "sql" });
    } catch (error) {
      console.error("Error formatting query: ", error);
      formattedQuery = generatedQuery;
    }
  }

  return (
    <div className="bg-gradient-to-b from-white to-slate-50 rounded-xl border border-slate-200 p-1">
      <div className="w-full h-full bg-slate-900 rounded-lg text-white font-mono text-sm relative p-1">
        <div className="p-3">
          <h3 className="text-md font-semibold mb-2 text-gray-200">
            Generated SQL Query
          </h3>
          {generatedQuery ? (
            <div className="relative rounded-lg overflow-hidden">
              <SyntaxHighlighter
                language="sql"
                style={atomOneDark}
                showLineNumbers={true}
              >
                {formattedQuery}
              </SyntaxHighlighter>
              <button
                onClick={handleCopyQuery}
                className="absolute top-2 right-2 p-2 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors"
                title="Copy to clipboard"
              >
                <Copy className="h-4 w-4" />
              </button>
              {copySuccess && (
                <span className="absolute top-2 right-10 text-xs text-green-400">
                  {copySuccess}
                </span>
              )}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">
              Select X-axis and Y-axis columns to generate the SQL query.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SqlQueryDisplay;
