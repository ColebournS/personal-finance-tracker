import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import supabase from "../supabaseClient";
import { Trash2, PlusCircle, Wallet, DollarSign, ChevronDown, ChevronRight } from "lucide-react";
import { useData } from "../DataContext";
import { encryptValue } from "../utils/encryption";

function Budget() {
  const {
    income: incomeData,
    budgetGroups: groups,
    purchases,
    userId,
    refetchBudgetGroups,
  } = useData();
  const income = incomeData?.monthlyTakeHome || 0;
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [tempGroupNames, setTempGroupNames] = useState({});
  const [tempItemNames, setTempItemNames] = useState({});
  const [expandedItems, setExpandedItems] = useState({});
  const [newlyAddedGroupId, setNewlyAddedGroupId] = useState(null);
  const debounceTimers = useRef({});

  // Format currency with commas
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value || 0);
  };

  useEffect(() => {
    const checkScreenSize = () => {
      // Adjust these breakpoints as needed
      setIsSmallScreen(window.innerWidth < 1650);
    };

    // Check initial screen size
    checkScreenSize();

    // Add event listener for window resize
    window.addEventListener("resize", checkScreenSize);

    // Cleanup listener on component unmount
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Memoize total spent calculation
  const calculateTotalSpent = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const filteredPurchases = purchases.filter((purchase) => {
      const purchaseDate = new Date(purchase.timestamp);
      const purchaseMonth = purchaseDate.getMonth();
      const purchaseYear = purchaseDate.getFullYear();

      return (
        purchaseMonth === currentMonth &&
        purchaseYear === currentYear
      );
    });

    return filteredPurchases.reduce(
      (sum, purchase) => sum + (purchase.cost || 0),
      0
    );
  }, [purchases]);

  // Memoize spent by item calculation
  const calculateSpent = useCallback((itemId) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const filteredPurchases = purchases.filter((purchase) => {
      const purchaseDate = new Date(purchase.timestamp);
      const purchaseMonth = purchaseDate.getMonth();
      const purchaseYear = purchaseDate.getFullYear();

      return (
        purchase.budget_item_id === itemId &&
        purchaseMonth === currentMonth &&
        purchaseYear === currentYear
      );
    });

    return filteredPurchases.reduce(
      (sum, purchase) => sum + (purchase.cost || 0),
      0
    );
  }, [purchases]);

  // Toggle expanded state for mobile items
  const toggleItemExpanded = (itemId) => {
    setExpandedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  // Debounced update function
  const debounceUpdate = useCallback((key, callback, delay = 500) => {
    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key]);
    }
    debounceTimers.current[key] = setTimeout(callback, delay);
  }, []);

  const handleGroupInputChange = (groupId, value) => {
    // Update temp state immediately for responsive typing
    setTempGroupNames((prev) => ({
      ...prev,
      [groupId]: value,
    }));
    
    // Debounce the database update
    debounceUpdate(`group-${groupId}`, async () => {
      await supabase
        .from("budget_groups")
        .update({ name: value })
        .eq("id", groupId);
      refetchBudgetGroups();
    });
  };

  const handleItemInputChange = (itemId, value) => {
    // Update temp state immediately for responsive typing
    setTempItemNames((prev) => ({
      ...prev,
      [itemId]: value,
    }));
    
    // Debounce the database update
    debounceUpdate(`item-${itemId}`, async () => {
      await supabase
        .from("budget_items")
        .update({ name: value })
        .eq("id", itemId);
      refetchBudgetGroups();
    });
  };

  const handleItemBudgetChange = (itemId, value) => {
    debounceUpdate(`budget-${itemId}`, async () => {
      const numericValue = parseFloat(value) || 0;
      // Encrypt the budget value before saving
      const encryptedBudget = encryptValue(numericValue, userId);
      await supabase
        .from("budget_items")
        .update({ budget: encryptedBudget })
        .eq("id", itemId);
      refetchBudgetGroups();
    });
  };
    
  const handleAddItem = async (groupId) => {
    if (!userId) return;

    const { data: existingItems } = await supabase
      .from("budget_items")
      .select("name")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .like("name", "New Item%");

    const numbers = existingItems
      .map((item) => {
        const match = item.name.match(/New Item (\d+)/);
        return match ? parseInt(match[1]) : 0;
      })
      .filter((num) => !isNaN(num));

    const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;

    const newItem = {
      name: `New Item ${nextNumber}`,
      budget: encryptValue(0, userId), // Encrypt initial budget value
      group_id: groupId,
      user_id: userId, // Add user_id
    };

    await supabase.from("budget_items").insert([newItem]);
    refetchBudgetGroups();
  };

  const handleAddGroup = async () => {
    if (!userId) return;

    const newGroup = {
      name: "New Group",
      user_id: userId, // Add user_id
    };
    const { data, error } = await supabase.from("budget_groups").insert([newGroup]).select();
    
    if (!error && data && data[0]) {
      setNewlyAddedGroupId(data[0].id);
      // Clear the animation after 2 seconds
      setTimeout(() => {
        setNewlyAddedGroupId(null);
      }, 2000);
    }
    
    refetchBudgetGroups();
  };

  const handleDeleteItem = async (itemId) => {
    try {
      // Check if there are any purchases associated with this budget item
      const { data: associatedPurchases, error: purchaseError } = await supabase
        .from("purchases")
        .select("id")
        .eq("budget_item_id", itemId)
        .limit(1);

      if (purchaseError) throw purchaseError;

      if (associatedPurchases && associatedPurchases.length > 0) {
        // Soft delete: mark as inactive instead of deleting
        const { error: updateError } = await supabase
          .from("budget_items")
          .update({ is_active: false })
          .eq("id", itemId);

        if (updateError) throw updateError;
      } else {
        // Hard delete: no purchases associated, safe to delete
        const { error: deleteError } = await supabase
          .from("budget_items")
          .delete()
          .eq("id", itemId);

        if (deleteError) throw deleteError;
      }

      refetchBudgetGroups();
    } catch (error) {
      console.error("Error deleting budget item:", error);
      alert("Failed to delete budget item. Please try again.");
    }
  };

  const handleDeleteGroup = async (groupId) => {
    await supabase.from("budget_groups").delete().eq("id", groupId);
    refetchBudgetGroups();
  };

  // Memoize totals calculation
  const totals = useMemo(() => {
    let totalBudget = 0;

    groups.forEach((group) => {
      if (Array.isArray(group.budget_items)) {
        group.budget_items.forEach((item) => {
          totalBudget += Number(item.budget) || 0;
        });
      }
    });

    return {
      totalBudget,
    };
  }, [groups]);

  // Render a budget group (used for both mobile and desktop)
  const renderBudgetGroup = (group) => {
    const groupTotal = group.budget_items.reduce((sum, item) => sum + item.budget, 0);
    const groupPercentage = income > 0 ? ((groupTotal / income) * 100).toFixed(1) : 0;
    const isNewlyAdded = newlyAddedGroupId === group.id;
    
    return (
      <div className={`bg-transparent md:bg-white md:dark:bg-slate-700 p-2 md:p-6 mb-0 md:mb-6 last:mb-0 rounded-none md:rounded-xl shadow-none md:shadow-xl border-0 md:border border-gray-200 dark:border-gray-700 transition-all duration-500 ${
        isNewlyAdded ? 'animate-pulse ring-4 ring-blue-400 dark:ring-blue-500 scale-[1.02]' : ''
      }`}>
        <div className="flex justify-between items-center gap-2 mb-4">
            <input
              type="text"
              value={tempGroupNames[group.id] ?? group.name}
              onChange={(e) => handleGroupInputChange(group.id, e.target.value)}
              className="text-sm md:text-lg lg:text-xl font-bold text-gray-800 dark:text-white bg-transparent border-b-2 border-transparent hover:border-blue-500 dark:hover:border-blue-400 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-colors px-1 py-1 flex-shrink min-w-0"
            />
            <div className="flex gap-1 md:gap-2 flex-shrink-0 items-center">
              <div className="px-2 py-1 md:px-3 md:py-1.5 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200 dark:border-blue-700 rounded-lg">
                <span className="text-xs md:text-sm font-medium text-blue-700 dark:text-blue-300 whitespace-nowrap">
                  ${formatCurrency(groupTotal)} ({groupPercentage}%)
                </span>
              </div>
              <button
                onClick={() => handleAddItem(group.id)}
                className="flex items-center gap-1 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 hover:from-blue-600 hover:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800 text-white p-2 sm:px-3 sm:py-2 rounded-lg transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
              >
                <PlusCircle size={16} className="sm:w-5 sm:h-5 stroke-[2.5]" />
                {!isSmallScreen && <span className="text-sm font-semibold">Add Item</span>}
              </button>
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      "Are you sure you want to delete this group and all its items?"
                    )
                  ) {
                    handleDeleteGroup(group.id);
                  }
                }}
                className="flex items-center gap-1 bg-gradient-to-r from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 hover:from-red-600 hover:to-red-700 dark:hover:from-red-700 dark:hover:to-red-800 text-white p-2 sm:px-3 sm:py-2 rounded-lg transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
              >
                <Trash2 size={16} className="sm:w-5 sm:h-5 stroke-[2.5]" />
                {!isSmallScreen && (
                  <span className="text-sm font-semibold">Delete Group</span>
                )}
              </button>
            </div>
          </div>

          {/* Desktop Table View - Hidden on Mobile */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full bg-gray-50 dark:bg-slate-600 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-600">
                  <th className="p-4 font-semibold text-left text-gray-700 dark:text-gray-200 border-b-2 border-gray-300 dark:border-gray-600">
                    Item Name
                  </th>
                  <th className="p-4 font-semibold text-left text-gray-700 dark:text-gray-200 border-b-2 border-gray-300 dark:border-gray-600 whitespace-nowrap">
                    Budget
                  </th>
                  <th className="p-4 font-semibold text-center text-gray-700 dark:text-gray-200 border-b-2 border-gray-300 dark:border-gray-600">
                  </th>
                </tr>
              </thead>
              <tbody>
                {group.budget_items?.map((item, index) => {
                  return (
                    <tr 
                      key={item.id} 
                      className={`transition-colors hover:bg-gray-100 dark:hover:bg-slate-500 ${
                        index !== group.budget_items.length - 1 ? 'border-b border-gray-200 dark:border-gray-600' : ''
                      }`}
                    >
                      <td className="p-1">
                        <input
                          type="text"
                          value={tempItemNames[item.id] ?? item.name}
                          onChange={(e) =>
                            handleItemInputChange(item.id, e.target.value)
                          }
                          className="w-full px-3 py-2 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 rounded-lg text-gray-800 dark:text-white border border-transparent hover:border-gray-300 dark:hover:border-gray-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-colors"
                        />
                      </td>
                      <td className="p-1">
                        <div className="flex items-center">
                          <span className="text-gray-500 dark:text-gray-400 mr-1">$</span>
                          <input
                            type="number"
                            defaultValue={item.budget}
                            onBlur={(e) =>
                              handleItemBudgetChange(item.id, e.target.value)
                            }
                            className="w-24 px-3 py-2 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 rounded-lg text-gray-800 dark:text-white border border-transparent hover:border-gray-300 dark:hover:border-gray-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-colors"
                          />
                        </div>
                      </td>
                      <td className="p-1 text-center">
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title="Delete item"
                        >
                          <Trash2 size={20} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Collapsible Table View - Hidden on Desktop */}
          <div className="md:hidden">
            <div className="bg-gray-50 dark:bg-slate-600 rounded-lg overflow-hidden">
              {/* Table Header */}
              <div className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-600 px-3 py-2 grid grid-cols-[1fr,auto,auto] gap-2 items-center border-b-2 border-gray-300 dark:border-gray-600">
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                  NAME
                </div>
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                  BUDGET
                </div>
                <div className="w-8"></div>
              </div>

              {/* Table Rows */}
              {group.budget_items?.map((item, index) => {
                const isExpanded = expandedItems[item.id];
                
                return (
                  <div 
                    key={item.id}
                    className={`${
                      index !== group.budget_items.length - 1 ? 'border-b border-gray-200 dark:border-gray-600' : ''
                    }`}
                  >
                    {/* Collapsed Row */}
                    <div className="px-3 py-2 grid grid-cols-[1fr,auto,auto] gap-2 items-center bg-white dark:bg-slate-600">
                      <input
                        type="text"
                        value={tempItemNames[item.id] ?? item.name}
                        onChange={(e) =>
                          handleItemInputChange(item.id, e.target.value)
                        }
                        className="w-full px-2 py-1.5 bg-gray-50 dark:bg-slate-700 rounded text-gray-800 dark:text-white border border-gray-300 dark:border-gray-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-colors text-sm"
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 dark:text-gray-400 text-sm">$</span>
                        <input
                          type="number"
                          defaultValue={item.budget}
                          onBlur={(e) =>
                            handleItemBudgetChange(item.id, e.target.value)
                          }
                          className="w-20 px-2 py-1.5 bg-gray-50 dark:bg-slate-700 rounded text-gray-800 dark:text-white border border-gray-300 dark:border-gray-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-colors text-sm"
                        />
                      </div>
                      <button
                        onClick={() => toggleItemExpanded(item.id)}
                        className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
                        aria-label={isExpanded ? "Collapse" : "Expand"}
                      >
                        {isExpanded ? (
                          <ChevronDown size={20} />
                        ) : (
                          <ChevronRight size={20} />
                        )}
                      </button>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-3 pb-3 bg-white dark:bg-slate-600">
                        <div className="mt-2">
                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="w-full flex items-center justify-center gap-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 py-2 rounded-lg transition-colors font-medium text-sm"
                          >
                            <Trash2 size={16} />
                            <span>Delete Item</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
      </div>
    );
  };

  return (
    <div className="space-y-2 md:space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 gap-2 md:gap-4">
        {/* Monthly Income Card */}
        <div className="bg-blue-50/50 dark:bg-blue-900/10 p-2 md:p-4 rounded-lg">
          <div className="text-[10px] md:text-xs font-medium text-blue-600 dark:text-blue-400 mb-0.5 md:mb-1 uppercase tracking-wide">
            Monthly Income
          </div>
          <div className="text-sm md:text-2xl font-bold text-blue-700 dark:text-blue-300">
            ${formatCurrency(income)}
          </div>
        </div>

        {/* Total Budgeted Card */}
        <div className="bg-purple-50/50 dark:bg-purple-900/10 p-2 md:p-4 rounded-lg">
          <div className="text-[10px] md:text-xs font-medium text-purple-600 dark:text-purple-400 mb-0.5 md:mb-1 uppercase tracking-wide">
            Total Budgeted
          </div>
          <div className="text-sm md:text-2xl font-bold text-purple-700 dark:text-purple-300">
            ${formatCurrency(totals.totalBudget)}
          </div>
        </div>
      </div>

      {/* Main Budget Card */}
      <div className="hidden md:block w-full mx-auto md:p-6 bg-white dark:bg-slate-800 shadow-xl rounded-xl border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
            Budget
          </h1>
          <button
            onClick={handleAddGroup}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 hover:from-blue-600 hover:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800 text-white px-5 py-2.5 rounded-lg transition-all font-semibold shadow-md hover:shadow-xl hover:scale-105 active:scale-95"
          >
            <PlusCircle size={20} className="stroke-[2.5]" />
            <span>Add Group</span>
          </button>
        </div>

        {/* Desktop Budget Groups */}
        {groups.map((group) => (
          <React.Fragment key={group.id}>
            {renderBudgetGroup(group)}
          </React.Fragment>
        ))}

        {/* Empty State */}
        {groups.length === 0 && (
          <div className="text-center py-12 bg-gray-50 dark:bg-slate-700 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
            <Wallet className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              No Budget Groups Yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Get started by creating your first budget group
            </p>
            <button
              onClick={handleAddGroup}
              className="inline-flex items-center gap-2 bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-all font-medium shadow-md hover:shadow-lg"
            >
              <PlusCircle size={20} />
              Create Budget Group
            </button>
          </div>
        )}
      </div>

      {/* Mobile Header */}
      <div className="md:hidden flex justify-between items-center px-2">
        <h1 className="text-lg font-bold text-gray-800 dark:text-white">
          Budget
        </h1>
        <button
          onClick={handleAddGroup}
          className="flex items-center gap-1 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 hover:from-blue-600 hover:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800 text-white px-3 py-2 rounded-lg transition-all font-semibold text-xs shadow-md hover:shadow-lg active:scale-95"
        >
          <PlusCircle size={16} className="stroke-[2.5]" />
          <span>Add Group</span>
        </button>
      </div>

      {/* Mobile Budget Groups - Separate Cards */}
      {groups.map((group) => {
        const isNewlyAdded = newlyAddedGroupId === group.id;
        return (
          <div 
            key={group.id} 
            className={`md:hidden bg-white dark:bg-slate-800 shadow-xl rounded-xl border border-gray-200 dark:border-gray-700 transition-all duration-500 ${
              isNewlyAdded ? 'animate-pulse ring-4 ring-blue-400 dark:ring-blue-500 scale-[1.02]' : ''
            }`}
          >
            {renderBudgetGroup(group)}
          </div>
        );
      })}

      {/* Mobile Empty State */}
      {groups.length === 0 && (
        <div className="md:hidden text-center py-12 bg-white dark:bg-slate-800 shadow-xl rounded-xl border border-gray-200 dark:border-gray-700 mx-2">
          <Wallet className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
            No Budget Groups Yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Get started by creating your first budget group
          </p>
          <button
            onClick={handleAddGroup}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 hover:from-blue-600 hover:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800 text-white px-6 py-3 rounded-lg transition-all font-semibold shadow-md hover:shadow-xl hover:scale-105 active:scale-95"
          >
            <PlusCircle size={20} className="stroke-[2.5]" />
            Create Budget Group
          </button>
        </div>
      )}
    </div>
  );
}

export default Budget;
