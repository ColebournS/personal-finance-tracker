import React, { useState, useEffect, useRef } from "react";
import { Upload, X, Save, AlertCircle } from "lucide-react";
import supabase from "../supabaseClient.js";

const BulkPurchaseImport = () => {
  const dialogRef = useRef(null);
  const [rawData, setRawData] = useState("");
  const [mappings, setMappings] = useState({
    itemName: "",
    cost: "",
    date: "",
  });
  const [preview, setPreview] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getCurrentUser();
  }, []);

  const detectDelimiter = (text) => {
    const firstLine = text.split("\n")[0];
    if (!firstLine) return null;

    const delimiters = ["\t", ",", ";"];
    const counts = delimiters.map((d) => ({
      delimiter: d,
      count: (firstLine.match(new RegExp(d, "g")) || []).length,
    }));

    const mostLikely = counts.reduce(
      (max, curr) => (curr.count > max.count ? curr : max),
      { delimiter: null, count: 0 }
    );

    return mostLikely.count > 0 ? mostLikely.delimiter : null;
  };

  const parseData = (raw) => {
    try {
      if (!raw.trim()) {
        setError("No data provided");
        return;
      }

      const delimiter = detectDelimiter(raw);
      if (!delimiter) {
        setError(
          "Could not detect a valid delimiter (tab, comma, or semicolon)"
        );
        return;
      }

      const lines = raw
        .trim()
        .split("\n")
        .map((line) => line.trim());
      if (lines.length < 2) {
        setError("At least two lines are required (headers and data)");
        return;
      }

      const headers = lines[0].split(delimiter).map((h) => h.trim());
      if (headers.length < 2) {
        setError(
          `Only found ${headers.length} column(s). Please check the format.`
        );
        return;
      }

      const data = lines.slice(1).map((line) => {
        const values = line.split(delimiter).map((v) => v.trim());
        return headers.reduce((obj, header, index) => {
          obj[header] = values[index] || "";
          return obj;
        }, {});
      });

      setHeaders(headers);
      setPreview(data);
      setError("");
    } catch (err) {
      console.error("Parsing error:", err);
      setError(`Parsing error: ${err.message}`);
      setPreview([]);
    }
  };

  const handlePaste = (e) => {
    const text = e.target.value;
    setRawData(text);
    parseData(text);
  };

  const handleMapping = (field, header) => {
    setMappings((prev) => ({
      ...prev,
      [field]: header,
    }));
  };

  const validateMapping = () => {
    if (!mappings.itemName) return "Item Name mapping is required";
    if (!mappings.cost) return "Cost mapping is required";
    return null;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return new Date().toISOString();

    // Try parsing the date string
    const parsedDate = new Date(dateStr);

    // Check if the date is valid
    if (isNaN(parsedDate.getTime())) {
      return new Date().toISOString();
    }

    return parsedDate.toISOString();
  };

  const handleImport = async () => {
    const validationError = validateMapping();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      const purchases = preview
        .map((row) => ({
          item_name: row[mappings.itemName]?.trim() || "",
          cost: parseFloat(row[mappings.cost]) || 0,
          user_id: userId,
          budget_item_id: null,
          timestamp: formatDate(mappings.date ? row[mappings.date] : null),
        }))
        .filter((p) => p.item_name && !isNaN(p.cost));

      const { error } = await supabase.from("purchases").insert(purchases);

      if (error) throw error;

      alert("Purchases imported successfully!");
      dialogRef.current?.close();
      setRawData("");
      setPreview([]);
      setMappings({
        itemName: "",
        cost: "",
        date: "",
      });
    } catch (error) {
      console.error("Error importing purchases:", error);
      setError("Failed to import purchases. Please try again.");
    }
  };

  return (
    <>
      <button
        onClick={() => dialogRef.current?.showModal()}
        className="w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600 transition-colors flex items-center justify-center mt-4"
      >
        <Upload className="mr-2" size={20} />
        Bulk Import
      </button>

      <dialog
        ref={dialogRef}
        className="w-full max-w-3xl rounded-lg p-6 backdrop:bg-black backdrop:bg-opacity-50"
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Bulk Import Purchases</h2>
            <button
              onClick={() => dialogRef.current?.close()}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 text-red-700">
              <div className="flex">
                <AlertCircle className="h-5 w-5 mr-2" />
                <span>{error}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">
              Paste your data (tab, comma, or semicolon separated):
            </label>
            <div className="text-xs text-gray-500 mb-2">
              Example format:
              <br />
              Item Name,Cost,Date
              <br />
              Groceries,45.99,2024-02-14
            </div>
            <textarea
              value={rawData}
              onChange={handlePaste}
              className="w-full h-32 p-2 border rounded-md font-mono text-sm"
              placeholder="Item Name,Cost,Date"
            />
          </div>

          {headers.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium">Map Columns</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Item Name*</label>
                  <select
                    value={mappings.itemName}
                    onChange={(e) => handleMapping("itemName", e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">Select column</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Cost*</label>
                  <select
                    value={mappings.cost}
                    onChange={(e) => handleMapping("cost", e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">Select column</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Date (Optional)</label>
                  <select
                    value={mappings.date}
                    onChange={(e) => handleMapping("date", e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">Select column</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {preview.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">
                    Preview ({preview.length} rows)
                  </h3>
                  <div className="max-h-48 overflow-auto border rounded-md">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {headers.map((header) => (
                            <th
                              key={header}
                              className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {preview.slice(0, 5).map((row, idx) => (
                          <tr key={idx}>
                            {headers.map((header) => (
                              <td key={header} className="px-4 py-2 text-sm">
                                {row[header]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end space-x-2 mt-4 pt-4 border-t">
            <button
              onClick={() => dialogRef.current?.close()}
              className="px-4 py-2 border rounded-md hover:bg-gray-100"
            >
              <X className="mr-2 inline-block" size={16} />
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!preview.length || !mappings.itemName || !mappings.cost}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="mr-2 inline-block" size={16} />
              Import
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
};

export default BulkPurchaseImport;
