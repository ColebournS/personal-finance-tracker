import React, { useState, useMemo, useEffect, useRef } from "react";
import supabase from "../supabaseClient.js";
import { Trash2, ChevronLeft, ChevronRight, Edit2, Search, X, Calendar, DollarSign, Tag, ArrowUpDown, RotateCcw, Plus } from "lucide-react";
import { useData } from "../DataContext";
import AddPurchase from "./AddPurchase";

const PurchasesList = () => {
  const { purchases, budgetGroups, refetchPurchases, userId } = useData();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editableField, setEditableField] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBudgetItem, setFilterBudgetItem] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "timestamp", direction: "desc" });
  const [showDeleted, setShowDeleted] = useState(false);
  const [deletedPurchases, setDeletedPurchases] = useState([]);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const groupBy = "budget"; // Always show by budget category
  const hasAutoSetCurrentMonth = useRef(false);
  const lastFiltersRef = useRef({ searchTerm: "", filterBudgetItem: "", showDeleted: false });

  // Fetch deleted purchases when showing hidden view
  const fetchDeletedPurchases = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from("purchases")
        .select(`
          id,
          item_name,
          cost,
          timestamp,
          budget_item_id,
          simplefin_transaction_id,
          is_simplefin_synced,
          is_deleted,
          budget_items (
            id,
            name,
            budget,
            budget_groups (
              id,
              name
            )
          )
        `)
        .eq("user_id", userId)
        .eq("is_deleted", true)
        .order("timestamp", { ascending: false });

      if (error) throw error;
      setDeletedPurchases(data || []);
    } catch (error) {
      console.error("Error fetching deleted purchases:", error);
    }
  };

  const handleDelete = async (id) => {
    try {
      // Soft delete all purchases so they can be restored
      const { error } = await supabase
        .from("purchases")
        .update({ is_deleted: true })
        .eq("id", id);

      if (error) throw error;

      await refetchPurchases();
      if (showDeleted) {
        await fetchDeletedPurchases();
      }
    } catch (error) {
      console.error("Error deleting purchase:", error);
      alert("Failed to delete purchase. Please try again.");
    }
  };

  const handleRestore = async (id) => {
    try {
      const { error } = await supabase
        .from("purchases")
        .update({ is_deleted: false })
        .eq("id", id);

      if (error) throw error;

      await refetchPurchases();
      await fetchDeletedPurchases();
    } catch (error) {
      console.error("Error restoring purchase:", error);
      alert("Failed to restore purchase. Please try again.");
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
        setEditingValue(purchase.budget_item_id || "");
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
          updateData.budget_item_id = value || null;
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

  // Filter, sort, and group purchases by month
  const { availableMonths, currentPurchases, currentMonthName, currentMonthTotal, purchasesByCategory } = useMemo(() => {
    // Use deleted purchases if showing hidden, otherwise use active purchases
    let filtered = showDeleted ? [...deletedPurchases] : [...purchases];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.budget_items?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply budget item filter
    if (filterBudgetItem === 'uncategorized') {
      // Show only uncategorized purchases
      filtered = filtered.filter((p) => !p.budget_item_id);
    } else if (filterBudgetItem) {
      // Show purchases for specific budget item
      filtered = filtered.filter((p) => p.budget_item_id === filterBudgetItem);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortConfig.key) {
        case "timestamp":
          aValue = new Date(a.timestamp);
          bValue = new Date(b.timestamp);
          break;
        case "item_name":
          aValue = a.item_name?.toLowerCase() || "";
          bValue = b.item_name?.toLowerCase() || "";
          break;
        case "cost":
          aValue = a.cost;
          bValue = b.cost;
          break;
        case "budget_item":
          aValue = a.budget_items?.name?.toLowerCase() || "";
          bValue = b.budget_items?.name?.toLowerCase() || "";
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    // Group purchases by month (using local time to match user's timezone)
    const groupedByMonth = {};
    filtered.forEach((purchase) => {
      const date = new Date(purchase.timestamp);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!groupedByMonth[monthKey]) {
        groupedByMonth[monthKey] = [];
      }
      groupedByMonth[monthKey].push(purchase);
    });
    
    // Sort months newest first
    const months = Object.keys(groupedByMonth).sort((a, b) => b.localeCompare(a));
    
    // Get current month's purchases
    const currentMonthKey = months[currentMonthIndex];
    const currentMonthPurchases = currentMonthKey ? groupedByMonth[currentMonthKey] : [];
    
    // Get current month display name and total
    let monthName = '';
    let monthTotal = 0;
    
    if (currentMonthPurchases.length > 0) {
      monthTotal = currentMonthPurchases.reduce((sum, p) => sum + p.cost, 0);
      // Parse year and month from key (format: "YYYY-MM")
      const [year, month] = currentMonthKey.split('-').map(Number);
      const date = new Date(year, month - 1, 1); // month is 0-indexed, use local time
      monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    
    // If in budget mode, also group current month's purchases by category
    let categorizedPurchases = {};
    if (groupBy === "budget" && currentMonthPurchases.length > 0) {
      currentMonthPurchases.forEach((purchase) => {
        const budgetKey = purchase.budget_item_id || 'uncategorized';
        if (!categorizedPurchases[budgetKey]) {
          categorizedPurchases[budgetKey] = {
            name: purchase.budget_items?.name || 'Uncategorized',
            budget: purchase.budget_items?.budget || 0,
            purchases: [],
          };
        }
        categorizedPurchases[budgetKey].purchases.push(purchase);
      });
      
      // Sort categories alphabetically, but put Uncategorized last
      const sortedCategories = {};
      Object.keys(categorizedPurchases)
        .sort((a, b) => {
          if (a === 'uncategorized') return 1;
          if (b === 'uncategorized') return -1;
          return categorizedPurchases[a].name.localeCompare(categorizedPurchases[b].name);
        })
        .forEach(key => {
          sortedCategories[key] = categorizedPurchases[key];
        });
      categorizedPurchases = sortedCategories;
    }

    return {
      availableMonths: months,
      currentPurchases: currentMonthPurchases,
      currentMonthName: monthName,
      currentMonthTotal: monthTotal,
      purchasesByCategory: categorizedPurchases,
    };
  }, [purchases, deletedPurchases, showDeleted, searchTerm, filterBudgetItem, sortConfig, groupBy, currentMonthIndex]);

  // Check if filters have changed
  useEffect(() => {
    const filtersChanged = 
      lastFiltersRef.current.searchTerm !== searchTerm ||
      lastFiltersRef.current.filterBudgetItem !== filterBudgetItem ||
      lastFiltersRef.current.showDeleted !== showDeleted;
    
    if (filtersChanged) {
      lastFiltersRef.current = { searchTerm, filterBudgetItem, showDeleted };
      hasAutoSetCurrentMonth.current = false; // Reset flag when filters change
    }
  }, [searchTerm, filterBudgetItem, showDeleted]);

  // Auto-set to current month when available months change (on initial load or filter changes)
  useEffect(() => {
    if (availableMonths.length === 0) return;
    
    // Get current month key (format: "YYYY-MM") using local time to match user's timezone
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Find current month in available months
    const currentMonthIndexInList = availableMonths.indexOf(currentMonthKey);
    
    // If current month exists in the list and we should auto-set (initial load or filters changed)
    if (currentMonthIndexInList !== -1 && !hasAutoSetCurrentMonth.current) {
      setCurrentMonthIndex(currentMonthIndexInList);
      hasAutoSetCurrentMonth.current = true;
    } else if (currentMonthIndexInList === -1 && hasAutoSetCurrentMonth.current === false) {
      // If current month doesn't exist, just mark as set so we don't keep trying
      hasAutoSetCurrentMonth.current = true;
    }
  }, [availableMonths, purchases.length]);

  // Calculate pagination info (always by month)
  const totalMonths = availableMonths.length;

  const handleNextMonth = () => {
    if (currentMonthIndex < totalMonths - 1) {
      setCurrentMonthIndex(currentMonthIndex + 1);
    }
  };

  const handlePrevMonth = () => {
    if (currentMonthIndex > 0) {
      setCurrentMonthIndex(currentMonthIndex - 1);
    }
  };

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ArrowUpDown size={14} className="opacity-40" />;
    return sortConfig.direction === "asc" ? (
      <ArrowUpDown size={14} className="text-blue-600 dark:text-blue-400" />
    ) : (
      <ArrowUpDown size={14} className="text-blue-600 dark:text-blue-400 rotate-180" />
    );
  };

  // Helper function to render purchase table rows (desktop)
  const renderDesktopPurchaseRow = (purchase) => (
    <tr
      key={purchase.id}
      className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors group"
    >
      {/* Date Cell */}
      <td
        onClick={() => handleCellEditStart("timestamp", purchase)}
        className="px-6 py-4 whitespace-nowrap cursor-pointer"
      >
        {editableField === "timestamp" && editingId === purchase.id ? (
          <input
            type="date"
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            onBlur={() => {
              handleCellUpdate("timestamp", editingValue);
              setEditableField(null);
              setEditingId(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.target.blur();
              }
            }}
            className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-slate-600 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"
            autoFocus
          />
        ) : (
          <div className="flex items-center gap-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {new Date(purchase.timestamp).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <Edit2 size={14} className="opacity-0 group-hover:opacity-50 transition-opacity" />
          </div>
        )}
      </td>

      {/* Item Name Cell */}
      <td
        onClick={() => handleCellEditStart("itemName", purchase)}
        className="px-6 py-4 cursor-pointer"
      >
        {editableField === "itemName" && editingId === purchase.id ? (
          <input
            type="text"
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            onBlur={() => {
              handleCellUpdate("itemName", editingValue);
              setEditableField(null);
              setEditingId(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.target.blur();
              }
            }}
            className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-slate-600 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"
            autoFocus
          />
        ) : (
          <div className="flex items-center gap-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {purchase.item_name}
            </span>
            <Edit2 size={14} className="opacity-0 group-hover:opacity-50 transition-opacity" />
          </div>
        )}
      </td>

      {/* Cost Cell */}
      <td
        onClick={() => handleCellEditStart("cost", purchase)}
        className="px-6 py-4 whitespace-nowrap cursor-pointer"
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
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.target.blur();
              }
            }}
            className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-slate-600 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"
            min="0"
            step="0.01"
            autoFocus
          />
        ) : (
          <div className="flex items-center gap-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              ${purchase.cost.toFixed(2)}
            </span>
            <Edit2 size={14} className="opacity-0 group-hover:opacity-50 transition-opacity" />
          </div>
        )}
      </td>

      {/* Budget Item Cell */}
      <td
        onClick={() => handleCellEditStart("budgetItemId", purchase)}
        className="px-6 py-4 cursor-pointer"
      >
        {editableField === "budgetItemId" && editingId === purchase.id ? (
          <select
            value={editingValue || ""}
            onChange={(e) => {
              const newValue = e.target.value;
              setEditingValue(newValue);
              handleCellUpdate("budgetItemId", newValue);
            }}
            onBlur={() => {
              setEditableField(null);
              setEditingId(null);
            }}
            className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-slate-600 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"
            autoFocus
          >
            <option value="">Uncategorized</option>
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
          <div className="flex items-center gap-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200">
              {purchase.budget_items?.name || "Uncategorized"}
            </span>
            <Edit2 size={14} className="opacity-0 group-hover:opacity-50 transition-opacity" />
          </div>
        )}
      </td>

      {/* Actions Cell */}
      <td className="px-6 py-4 whitespace-nowrap text-right">
        {showDeleted ? (
          <button
            onClick={() => {
              if (
                window.confirm(
                  "Are you sure you want to restore this purchase?"
                )
              ) {
                handleRestore(purchase.id);
              }
            }}
            className="inline-flex items-center justify-center p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all"
            title="Restore purchase"
          >
            <RotateCcw size={18} />
          </button>
        ) : (
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
            className="inline-flex items-center justify-center p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
            title="Delete purchase"
          >
            <Trash2 size={18} />
          </button>
        )}
      </td>
    </tr>
  );

  return (
    <>
      <AddPurchase isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
      
      <div className="w-full bg-white dark:bg-slate-800 shadow-xl rounded-xl overflow-hidden">
        {/* Header */}
        <div className="px-3 md:px-6 py-3 md:py-8 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-1 md:mb-2">
            <h1 className="text-sm md:text-3xl font-bold text-gray-800 dark:text-white">
              Purchase History
            </h1>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg font-semibold text-xs md:text-base"
            >
              <Plus size={16} className="md:w-5 md:h-5" />
              <span className="hidden sm:inline">Add Purchase</span>
            </button>
          </div>
          {totalMonths > 0 && currentMonthName && (
            <div className="flex items-center gap-1.5 md:gap-2 text-gray-600 dark:text-gray-400">
              <Calendar size={14} className="md:w-[18px] md:h-[18px]" />
              <span className="text-xs md:text-lg font-medium">{currentMonthName}</span>
            </div>
          )}
        </div>

        {/* Filters and Search */}
        <div className="p-3 md:p-6 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
          {!isSearchExpanded ? (
            // Default view - All controls on one row
            <div className="flex gap-2 md:gap-4">
              {/* Search Icon Button - Mobile only */}
              <button
                onClick={() => setIsSearchExpanded(true)}
                className="sm:hidden flex items-center justify-center w-8 h-8 bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-all flex-shrink-0"
              >
                <Search size={16} />
              </button>
              
              {/* Desktop: Always show search bar */}
              <div className="hidden sm:flex flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={16} />
                <input
                  type="text"
                  placeholder="Search purchases..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentMonthIndex(0);
                  }}
                  className="w-full pl-10 pr-10 py-2.5 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              {/* Budget Item Filter */}
              <div className="w-32 sm:w-48 md:w-64">
                <select
                  value={filterBudgetItem}
                  onChange={(e) => {
                    setFilterBudgetItem(e.target.value);
                    setCurrentMonthIndex(0);
                  }}
                  className="w-full h-8 md:h-auto px-2 md:px-4 md:py-2.5 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-xs md:text-base"
                >
                  <option value="">All</option>
                  <option value="uncategorized">Uncategorized</option>
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
              </div>

              {/* Show Hidden Toggle */}
              <button
                onClick={async () => {
                  const newShowDeleted = !showDeleted;
                  setShowDeleted(newShowDeleted);
                  if (newShowDeleted) {
                    await fetchDeletedPurchases();
                  }
                  setCurrentMonthIndex(0);
                }}
                className={`h-8 md:h-auto px-2.5 md:px-4 md:py-2.5 rounded-lg font-medium transition-all text-xs md:text-base flex-shrink-0 whitespace-nowrap ${
                  showDeleted
                    ? "bg-orange-500 dark:bg-orange-600 text-white shadow-md"
                    : "bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-slate-600"
                }`}
              >
                {showDeleted ? "Show Active" : "Show Hidden"}
              </button>
            </div>
          ) : (
            // Expanded search view - Mobile only
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={16} />
                <input
                  type="text"
                  placeholder="Search purchases..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentMonthIndex(0);
                  }}
                  onBlur={() => {
                    // On mobile, collapse search if empty
                    if (!searchTerm) {
                      setTimeout(() => setIsSearchExpanded(false), 100);
                    }
                  }}
                  autoFocus
                  className="w-full h-8 pl-8 pr-8 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-xs"
                />
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setIsSearchExpanded(false);
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        {currentPurchases.length === 0 ? (
          <div className="p-8 md:p-12 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full bg-gray-100 dark:bg-slate-700 mb-3 md:mb-4">
              <Search className="text-gray-400" size={24} />
            </div>
            <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No purchases found
            </h3>
            <p className="text-sm md:text-base text-gray-500 dark:text-gray-400">
              {searchTerm || filterBudgetItem
                ? "Try adjusting your filters"
                : "Start by adding your first purchase"}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View - Hidden on Mobile */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                <thead className="bg-gray-50 dark:bg-slate-900">
                  <tr>
                    <th
                      onClick={() => handleSort("timestamp")}
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-gray-400" />
                        Date
                        {getSortIcon("timestamp")}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("item_name")}
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <Tag size={16} className="text-gray-400" />
                        Item Name
                        {getSortIcon("item_name")}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("cost")}
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <DollarSign size={16} className="text-gray-400" />
                        Cost
                        {getSortIcon("cost")}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("budget_item")}
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        Budget Item
                        {getSortIcon("budget_item")}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      
                    </th>
              </tr>
            </thead>
                <tbody className="bg-white dark:bg-slate-800">
              {groupBy === "budget" && Object.keys(purchasesByCategory).length > 0 ? (
                // Grouped by budget category
                Object.entries(purchasesByCategory).map(([categoryId, categoryData]) => {
                  const categoryTotal = categoryData.purchases.reduce((sum, p) => sum + p.cost, 0);
                  const remaining = categoryData.budget - categoryTotal;
                  
                  return (
                    <React.Fragment key={categoryId}>
                      {/* Category Header Row */}
                      <tr className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-y-2 border-purple-200 dark:border-purple-700">
                        <td colSpan="5" className="px-6 py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
                                <Tag className="text-purple-600 dark:text-purple-400" size={18} />
                              </div>
                              <div>
                                <div className="text-lg font-bold text-purple-900 dark:text-purple-100">
                                  {categoryData.name}
                                </div>
                                <div className="hidden md:block text-sm text-purple-700 dark:text-purple-300">
                                  {categoryData.purchases.length} {categoryData.purchases.length === 1 ? 'purchase' : 'purchases'}
                                </div>
                              </div>
                            </div>
                            {categoryData.budget > 0 && (
                              <div className="flex items-center gap-6">
                                <div className="text-right">
                                  <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">Budgeted</div>
                                  <div className="text-base font-bold text-purple-900 dark:text-purple-100">
                                    ${categoryData.budget.toFixed(2)}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">Spent</div>
                                  <div className={`text-base font-bold ${
                                    categoryTotal > categoryData.budget
                                      ? 'text-red-600 dark:text-red-400'
                                      : 'text-green-600 dark:text-green-400'
                                  }`}>
                                    ${categoryTotal.toFixed(2)}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">Remaining</div>
                                  <div className={`text-base font-bold ${
                                    remaining < 0
                                      ? 'text-red-600 dark:text-red-400'
                                      : 'text-green-600 dark:text-green-400'
                                  }`}>
                                    ${remaining.toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                      {/* Category Purchases */}
                      {categoryData.purchases.map((purchase) => renderDesktopPurchaseRow(purchase))}
                    </React.Fragment>
                  );
                })
              ) : (
                // Regular list view
                currentPurchases.map((purchase) => renderDesktopPurchaseRow(purchase))
              )}
            </tbody>
              </table>
            </div>

            {/* Mobile Card View - Hidden on Desktop */}
            <div className="md:hidden px-4 py-3 space-y-3">
              {groupBy === "budget" && Object.keys(purchasesByCategory).length > 0 ? (
                // Grouped by budget category
                Object.entries(purchasesByCategory).map(([categoryId, categoryData]) => (
                  <React.Fragment key={categoryId}>
                    {/* Category Header */}
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg p-1.5 border-2 border-purple-200 dark:border-purple-700 mb-2 ml-2">
                      <div className="flex items-center gap-1.5">
                        <div className="p-1 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
                          <Tag className="text-purple-600 dark:text-purple-400" size={12} />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-bold text-purple-900 dark:text-purple-100">
                            {categoryData.name}
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Category Purchases */}
                    {categoryData.purchases.map((purchase) => (
                      <div
                        key={purchase.id}
                        className="bg-white dark:bg-slate-800 rounded-xl shadow-md hover:shadow-lg border border-gray-200 dark:border-slate-700 p-4 transition-all duration-200 hover:scale-[1.01] ml-2"
                      >
                        {/* Purchase card content will follow */}
                        {/* Header: Date, Category, and Delete */}
                        <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-gray-100 dark:border-slate-700 gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="cursor-pointer flex-shrink-0">
                              {editableField === "timestamp" && editingId === purchase.id ? (
                                <input
                                  type="date"
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                  onBlur={() => {
                                    handleCellUpdate("timestamp", editingValue);
                                    setEditableField(null);
                                    setEditingId(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.target.blur();
                                    }
                                  }}
                                  className="px-3 py-2 border dark:border-gray-600 rounded-md bg-white dark:bg-slate-600 text-gray-800 dark:text-white text-base focus:ring-2 focus:ring-blue-500"
                                  autoFocus
                                />
                              ) : (
                                <div 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCellEditStart("timestamp", purchase);
                                  }}
                                  onTouchEnd={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleCellEditStart("timestamp", purchase);
                                  }}
                                  className="flex items-center gap-1.5 active:opacity-70 transition-opacity"
                                >
                                  <div className="p-1 bg-blue-50 dark:bg-blue-900/20 rounded">
                                    <Calendar size={12} className="text-blue-600 dark:text-blue-400" />
                                  </div>
                                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                    {new Date(purchase.timestamp).toLocaleDateString(undefined, {
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            {/* Budget Item */}
                            <div className="cursor-pointer flex-shrink-0 ml-auto">
                              {editableField === "budgetItemId" && editingId === purchase.id ? (
                                <select
                                  value={editingValue || ""}
                                  onChange={(e) => {
                                    const newValue = e.target.value;
                                    setEditingValue(newValue);
                                    handleCellUpdate("budgetItemId", newValue);
                                  }}
                                  onBlur={() => {
                                    setEditableField(null);
                                    setEditingId(null);
                                  }}
                                  className="px-2 py-1.5 border dark:border-gray-600 rounded-lg bg-white dark:bg-slate-600 text-gray-800 dark:text-white text-xs focus:ring-2 focus:ring-blue-500"
                                  autoFocus
                                >
                                  <option value="">Uncategorized</option>
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
                                <div 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCellEditStart("budgetItemId", purchase);
                                  }}
                                  onTouchEnd={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleCellEditStart("budgetItemId", purchase);
                                  }}
                                  className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/40 dark:to-indigo-900/40 text-purple-700 dark:text-purple-200 border border-purple-200 dark:border-purple-800 shadow-sm active:scale-95 transition-all whitespace-nowrap"
                                >
                                  {purchase.budget_items?.name || "Uncategorized"}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {showDeleted ? (
                            <button
                              onClick={() => {
                                if (
                                  window.confirm(
                                    "Are you sure you want to restore this purchase?"
                                  )
                                ) {
                                  handleRestore(purchase.id);
                                }
                              }}
                              className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all active:scale-95 flex-shrink-0"
                              title="Restore purchase"
                            >
                              <RotateCcw size={16} />
                            </button>
                          ) : (
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
                              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all active:scale-95 flex-shrink-0"
                              title="Delete purchase"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>

                        {/* Item Name and Cost */}
                        <div className="flex items-center gap-2">
                          {/* Item Name */}
                          <div className="flex-1 min-w-0 cursor-pointer group">
                            {editableField === "itemName" && editingId === purchase.id ? (
                              <input
                                type="text"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onBlur={() => {
                                  handleCellUpdate("itemName", editingValue);
                                  setEditableField(null);
                                  setEditingId(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.target.blur();
                                  }
                                }}
                                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-slate-600 text-gray-800 dark:text-white text-base focus:ring-2 focus:ring-blue-500"
                                autoFocus
                              />
                            ) : (
                              <div 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCellEditStart("itemName", purchase);
                                }}
                                onTouchEnd={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleCellEditStart("itemName", purchase);
                                }}
                                className="flex items-center gap-2 active:opacity-70 transition-opacity"
                              >
                                <Tag size={14} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                <h3 className="text-base font-bold text-gray-900 dark:text-white leading-snug truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                  {purchase.item_name}
                                </h3>
                              </div>
                            )}
                          </div>

                          {/* Cost */}
                          <div className="cursor-pointer group flex-shrink-0">
                            {editableField === "cost" && editingId === purchase.id ? (
                              <input
                                type="number"
                                inputMode="decimal"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onBlur={() => {
                                  handleCellUpdate("cost", editingValue);
                                  setEditableField(null);
                                  setEditingId(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.target.blur();
                                  }
                                }}
                                className="w-24 px-2 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-slate-600 text-gray-800 dark:text-white text-base focus:ring-2 focus:ring-blue-500"
                                min="0"
                                step="0.01"
                                autoFocus
                              />
                            ) : (
                              <div 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCellEditStart("cost", purchase);
                                }}
                                onTouchEnd={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleCellEditStart("cost", purchase);
                                }}
                                className="flex items-center gap-1 px-2 py-1.5 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800 group-hover:shadow-sm transition-all active:scale-95 whitespace-nowrap"
                              >
                                <DollarSign size={14} className="text-green-600 dark:text-green-400 flex-shrink-0" />
                                <span className="text-sm font-bold text-green-700 dark:text-green-400">
                                  {purchase.cost.toFixed(2)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </React.Fragment>
                ))
              ) : (
                // Regular list view
                currentPurchases.map((purchase) => (
                <div
                  key={purchase.id}
                  className="bg-white dark:bg-slate-800 rounded-xl shadow-md hover:shadow-lg border border-gray-200 dark:border-slate-700 p-4 transition-all duration-200 hover:scale-[1.01]"
                >
                  {/* Header: Date and Delete */}
                  <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-gray-100 dark:border-slate-700">
                    <div className="cursor-pointer flex-1">
                      {editableField === "timestamp" && editingId === purchase.id ? (
                        <input
                          type="date"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => {
                            handleCellUpdate("timestamp", editingValue);
                            setEditableField(null);
                            setEditingId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.target.blur();
                            }
                          }}
                          className="px-3 py-2 border dark:border-gray-600 rounded-md bg-white dark:bg-slate-600 text-gray-800 dark:text-white text-base focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      ) : (
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCellEditStart("timestamp", purchase);
                          }}
                          onTouchEnd={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleCellEditStart("timestamp", purchase);
                          }}
                          className="flex items-center gap-1.5 active:opacity-70 transition-opacity"
                        >
                          <div className="p-1 bg-blue-50 dark:bg-blue-900/20 rounded">
                            <Calendar size={12} className="text-blue-600 dark:text-blue-400" />
                          </div>
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                            {new Date(purchase.timestamp).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                    {showDeleted ? (
                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              "Are you sure you want to restore this purchase?"
                            )
                          ) {
                            handleRestore(purchase.id);
                          }
                        }}
                        className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all active:scale-95"
                        title="Restore purchase"
                      >
                        <RotateCcw size={16} />
                      </button>
                    ) : (
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
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all active:scale-95"
                        title="Delete purchase"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  {/* Item Name */}
                  <div className="mb-3 cursor-pointer group">
                    {editableField === "itemName" && editingId === purchase.id ? (
                      <input
                        type="text"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() => {
                          handleCellUpdate("itemName", editingValue);
                          setEditableField(null);
                          setEditingId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.target.blur();
                          }
                        }}
                        className="w-full px-3 py-3 border dark:border-gray-600 rounded-lg bg-white dark:bg-slate-600 text-gray-800 dark:text-white text-base focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                    ) : (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCellEditStart("itemName", purchase);
                        }}
                        onTouchEnd={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleCellEditStart("itemName", purchase);
                        }}
                        className="flex items-start gap-2 active:opacity-70 transition-opacity"
                      >
                        <Tag size={16} className="text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                        <h3 className="text-base font-bold text-gray-900 dark:text-white leading-snug flex-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {purchase.item_name}
                        </h3>
                      </div>
                    )}
                  </div>

                  {/* Cost and Budget Item */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Cost */}
                    <div className="cursor-pointer group">
                      {editableField === "cost" && editingId === purchase.id ? (
                        <input
                          type="number"
                          inputMode="decimal"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => {
                            handleCellUpdate("cost", editingValue);
                            setEditableField(null);
                            setEditingId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.target.blur();
                            }
                          }}
                          className="w-full px-3 py-3 border dark:border-gray-600 rounded-lg bg-white dark:bg-slate-600 text-gray-800 dark:text-white text-base focus:ring-2 focus:ring-blue-500"
                          min="0"
                          step="0.01"
                          autoFocus
                        />
                      ) : (
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCellEditStart("cost", purchase);
                          }}
                          onTouchEnd={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleCellEditStart("cost", purchase);
                          }}
                          className="flex items-center justify-center gap-1 px-3 py-2 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800 group-hover:shadow-sm transition-all h-full active:scale-95"
                        >
                          <DollarSign size={16} className="text-green-600 dark:text-green-400 flex-shrink-0" />
                          <span className="text-base font-bold text-green-700 dark:text-green-400 truncate">
                            {purchase.cost.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Budget Item */}
                    <div className="cursor-pointer">
                      {editableField === "budgetItemId" && editingId === purchase.id ? (
                        <select
                          value={editingValue || ""}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            setEditingValue(newValue);
                            handleCellUpdate("budgetItemId", newValue);
                          }}
                          onBlur={() => {
                            setEditableField(null);
                            setEditingId(null);
                          }}
                          className="w-full px-3 py-3 border dark:border-gray-600 rounded-lg bg-white dark:bg-slate-600 text-gray-800 dark:text-white text-base focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        >
                          <option value="">Uncategorized</option>
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
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCellEditStart("budgetItemId", purchase);
                          }}
                          onTouchEnd={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleCellEditStart("budgetItemId", purchase);
                          }}
                          className="flex items-center justify-center px-3 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/40 dark:to-indigo-900/40 text-purple-700 dark:text-purple-200 border border-purple-200 dark:border-purple-800 shadow-sm h-full active:scale-95 transition-all"
                        >
                          <span className="truncate">
                            {purchase.budget_items?.name || "Uncategorized"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                ))
              )}
            </div>
          </>
        )}

        {/* Pagination */}
        {totalMonths > 0 && (
          <div className="px-3 md:px-6 py-3 md:py-4 bg-gray-50 dark:bg-slate-900/50 border-t dark:border-slate-700">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 md:gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-semibold text-gray-900 dark:text-white">{currentPurchases.length}</span>{" "}
                  {currentPurchases.length === 1 ? 'purchase' : 'purchases'}{" "}
                  in{" "}
                  <span className="font-semibold text-gray-900 dark:text-white">{currentMonthName}</span>
                </div>
                {currentPurchases.length > 0 && (
                  <div className="text-xs md:text-sm font-semibold">
                    <span className="text-gray-600 dark:text-gray-400">Total: </span>
                    <span className="text-green-600 dark:text-green-400">
                      ${currentMonthTotal.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                disabled={currentMonthIndex === 0}
                  className={`inline-flex items-center gap-1 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium rounded-lg transition-all ${
                  currentMonthIndex === 0
                      ? "text-gray-400 dark:text-gray-600 cursor-not-allowed bg-gray-100 dark:bg-slate-800"
                      : "text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 border border-gray-300 dark:border-slate-600"
                }`}
              >
                  <ChevronLeft size={16} className="md:w-[18px] md:h-[18px]" />
                  <span className="hidden sm:inline">Previous</span>
              </button>
                <span className="px-2 sm:px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 rounded-lg border border-gray-300 dark:border-slate-600 whitespace-nowrap">
                  Month {currentMonthIndex + 1} of {totalMonths}
              </span>
              <button
                onClick={handleNextMonth}
                disabled={currentMonthIndex === totalMonths - 1}
                  className={`inline-flex items-center gap-1 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium rounded-lg transition-all ${
                  currentMonthIndex === totalMonths - 1
                      ? "text-gray-400 dark:text-gray-600 cursor-not-allowed bg-gray-100 dark:bg-slate-800"
                      : "text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 border border-gray-300 dark:border-slate-600"
                }`}
              >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight size={16} className="md:w-[18px] md:h-[18px]" />
              </button>
            </div>
          </div>
        </div>
        )}
      </div>
    </>
  );
};

export default PurchasesList;
