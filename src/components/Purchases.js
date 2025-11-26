import React, { useState } from "react";
import supabase from "../supabaseClient.js";
import { Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useData } from "../DataContext";

const PurchasesList = () => {
  const { purchases, budgetGroups, refetchPurchases } = useData();
  const [editingId, setEditingId] = useState(null);
  const [editableField, setEditableField] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from("purchases").delete().eq("id", id);

      if (error) throw error;

      await refetchPurchases();
    } catch (error) {
      console.error("Error deleting purchase:", error);
      alert("Failed to delete purchase. Please try again.");
    }
  };

  const handleCellEditStart = (field, purchase) => {
    setEditableField(field);
    setEditingId(purchase.id);
    
    // Set initial value based on field
    switch (field) {
      case "timestamp":
        setEditingValue(new Date(purchase.timestamp).toISOString().split("T")[0]);
        break;
      case "itemName":
        setEditingValue(purchase.item_name);
        break;
      case "cost":
        setEditingValue(purchase.cost);
        break;
      case "budgetItemId":
        setEditingValue(purchase.budget_item_id);
        break;
      default:
        setEditingValue("");
        break;
    }
  };

  const handleCellUpdate = async (field, value) => {
    try {
      const updateData = {};

      switch (field) {
        case "timestamp":
          updateData.timestamp = new Date(value + "T00:00:00Z").toISOString();
          break;
        case "itemName":
          updateData.item_name = value.trim();
          break;
        case "cost":
          updateData.cost = parseFloat(value) || 0;
          break;
        case "budgetItemId":
          updateData.budget_item_id = value;
          break;
      }

      const { error } = await supabase
        .from("purchases")
        .update(updateData)
        .eq("id", editingId);

      if (error) throw error;

      setEditingId(null);
      setEditableField(null);
      setEditingValue("");
      await refetchPurchases();
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      alert(`Failed to update ${field}. Please try again.`);
    }
  };

  // Calculate pagination values
  const totalPages = Math.ceil(purchases.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPurchases = purchases.slice(startIndex, endIndex);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="w-full max-w-screen overflow-x-auto p-6 bg-white dark:bg-slate-800 shadow-lg rounded-lg">
      <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-6">
        Purchases
      </h1>

      <div className="w-full overflow-x-auto">
        <div className="inline-block min-w-full align-middle">
          <table className="min-w-full table-auto border dark:border-gray-600 bg-gray-50 dark:bg-slate-700 rounded-md">
            <thead>
              <tr className="bg-gray-100 dark:bg-slate-600">
                <th className="p-3 text-left text-gray-700 dark:text-gray-200">Date</th>
                <th className="p-3 text-left text-gray-700 dark:text-gray-200">Item Name</th>
                <th className="p-3 text-left text-gray-700 dark:text-gray-200">Cost</th>
                <th className="p-3 text-left text-gray-700 dark:text-gray-200">Budget Item</th>
                <th className="p-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {currentPurchases.map((purchase) => (
                <tr key={purchase.id} className="border-b dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-slate-600">
                  <td
                    onClick={() => handleCellEditStart("timestamp", purchase)}
                    className="p-2 text-gray-800 dark:text-white"
                  >
                    {editableField === "timestamp" &&
                    editingId === purchase.id ? (
                      <input
                        type="date"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() => {
                          handleCellUpdate("timestamp", editingValue);
                          setEditableField(null);
                          setEditingId(null);
                        }}
                        className="w-full px-2 py-1 border dark:border-gray-600 rounded bg-white dark:bg-slate-600 text-gray-800 dark:text-white"
                        autoFocus
                      />
                    ) : (
                      new Date(purchase.timestamp).toLocaleDateString(
                        undefined,
                        {
                          month: "numeric",
                          day: "numeric",
                        }
                      )
                    )}
                  </td>
                  <td
                    onClick={() => handleCellEditStart("itemName", purchase)}
                    className="p-2 truncate text-gray-800 dark:text-white"
                    style={{
                      maxWidth: "6ch",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {editableField === "itemName" &&
                    editingId === purchase.id ? (
                      <input
                        type="text"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() => {
                          handleCellUpdate("itemName", editingValue);
                          setEditableField(null);
                          setEditingId(null);
                        }}
                        className="w-full px-2 py-1 border dark:border-gray-600 rounded bg-white dark:bg-slate-600 text-gray-800 dark:text-white"
                        autoFocus
                      />
                    ) : (
                      purchase.item_name
                    )}
                  </td>
                  <td
                    onClick={() => handleCellEditStart("cost", purchase)}
                    className="p-2 text-gray-800 dark:text-white"
                  >
                    {editableField === "cost" && editingId === purchase.id ? (
                      <input
                        type="number"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() => {
                          handleCellUpdate("cost", editingValue);
                          setEditableField(null);
                          setEditingId(null);
                        }}
                        className="w-full px-2 py-1 border dark:border-gray-600 rounded bg-white dark:bg-slate-600 text-gray-800 dark:text-white"
                        min="0"
                        step="0.01"
                        autoFocus
                      />
                    ) : (
                      `$${purchase.cost.toFixed(2)}`
                    )}
                  </td>
                  <td
                    onClick={() =>
                      handleCellEditStart("budgetItemId", purchase)
                    }
                    className="p-2 text-overflow:ellipsis text-gray-800 dark:text-white"
                  >
                    {editableField === "budgetItemId" &&
                    editingId === purchase.id ? (
                      <select
                        value={editingValue}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          setEditingValue(newValue);
                          handleCellUpdate("budgetItemId", newValue);
                        }}
                        onBlur={() => {
                          setEditableField(null);
                          setEditingId(null);
                        }}
                        className="w-full px-2 py-1 border dark:border-gray-600 rounded bg-white dark:bg-slate-600 text-gray-800 dark:text-white"
                        autoFocus
                      >
                        <option value="">Select a budget item</option>
                        {budgetGroups.map((group) => (
                          <optgroup key={group.id} label={group.name}>
                            {group.budget_items?.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    ) : (
                      purchase.budget_items?.name
                    )}
                  </td>
                  <td className="p-2 text-center">
                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            "Are you sure you want to delete this purchase?"
                          )
                        ) {
                          handleDelete(purchase.id);
                        }
                      }}
                      className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination Controls */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Showing {startIndex + 1} to {Math.min(endIndex, purchases.length)}{" "}
              of {purchases.length} purchases
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className={`p-2 rounded ${
                  currentPage === 1
                    ? "text-gray-400 dark:text-gray-600 cursor-not-allowed"
                    : "text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                }`}
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className={`p-2 rounded ${
                  currentPage === totalPages
                    ? "text-gray-400 dark:text-gray-600 cursor-not-allowed"
                    : "text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                }`}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchasesList;
