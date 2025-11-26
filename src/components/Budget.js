import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import supabase from "../supabaseClient";
import { Trash2, PlusCircle } from "lucide-react";
import { useData } from "../DataContext";

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
  const debounceTimers = useRef({});

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
      await supabase
        .from("budget_items")
        .update({ budget: numericValue })
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
      budget: 0,
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
    await supabase.from("budget_groups").insert([newGroup]);
    refetchBudgetGroups();
  };

  const handleDeleteItem = async (itemId) => {
    await supabase.from("budget_items").delete().eq("id", itemId);
    refetchBudgetGroups();
  };

  const handleDeleteGroup = async (groupId) => {
    await supabase.from("budget_groups").delete().eq("id", groupId);
    refetchBudgetGroups();
  };

  // Memoize totals calculation
  const totals = useMemo(() => {
    let totalBudget = 0;
    const totalSpent = calculateTotalSpent;

    groups.forEach((group) => {
      if (Array.isArray(group.budget_items)) {
        group.budget_items.forEach((item) => {
          totalBudget += Number(item.budget) || 0;
        });
      }
    });

    return {
      totalBudget,
      totalSpent,
      remainingBudget: income - totalBudget,
      remainingSpent: income - totalSpent,
    };
  }, [groups, income, calculateTotalSpent]);

  return (
    <div className="w-full mx-auto p-6 bg-white dark:bg-slate-800 shadow-lg rounded-lg">
      <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-6">
        Budget
      </h1>
      <div className="flex justify-between items-start mb-6">
        <div className="text-xl font-semibold text-gray-800 dark:text-white">Income: ${income}</div>
        <button
          onClick={handleAddGroup}
          className="flex items-center bg-blue-500 dark:bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
        >
          {!isSmallScreen && <PlusCircle className="mr-2" size={20} />}
          Add Group
        </button>
      </div>

      {groups.map((group) => (
        <div key={group.id} className="mb-6 bg-gray-50 dark:bg-slate-700 p-4 rounded-lg border dark:border-gray-600">
          <div className="flex justify-between items-center mb-4">
            <input
              type="text"
              value={tempGroupNames[group.id] ?? group.name}
              onChange={(e) => handleGroupInputChange(group.id, e.target.value)}
              className="text-xl font-semibold text-gray-700 dark:text-gray-200 bg-transparent border-b border-gray-300 dark:border-gray-600 w-full hover:bg-blue-200 dark:hover:bg-slate-600 rounded-sm pl-2"
            />
            <div className="flex space-x-1">
              <div className="flex items-center ml-2 px-3 py-1 border dark:border-gray-600 rounded-md bg-gray-200 dark:bg-slate-600 text-gray-800 dark:text-white">
                {group.budget_items.reduce((sum, item) => sum + item.budget, 0)}
                $
              </div>
              <button
                onClick={() => handleAddItem(group.id)}
                className="flex items-center bg-blue-500 dark:bg-blue-600 text-white px-2 py-1 rounded-md hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
              >
                <PlusCircle size={isSmallScreen ? 24 : 30} />
                {!isSmallScreen && <span className="text-sm">Add Item</span>}
              </button>
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      "Are you sure you want to delete this group?"
                    )
                  ) {
                    handleDeleteGroup(group.id);
                  }
                }}
                className="flex items-center bg-red-500 dark:bg-red-600 text-white px-2 py-1 rounded-md hover:bg-red-600 dark:hover:bg-red-700 transition-colors"
              >
                <Trash2 size={isSmallScreen ? 24 : 30} />
                {!isSmallScreen && (
                  <span className="text-sm">Delete {group.name}</span>
                )}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-md">
            <table className="w-full border dark:border-gray-600 bg-gray-50 dark:bg-slate-600 rounded-md">
              <thead>
                <tr className="bg-gray-100 dark:bg-slate-500">
                  <th className="w-full p-3 font-semibold text-left text-gray-700 dark:text-gray-200">
                    Item
                  </th>
                  <th className="w-15 p-3 font-semibold text-left text-gray-700 dark:text-gray-200">
                    Budget
                  </th>
                  <th className="w-15 p-3 font-semibold text-left text-gray-700 dark:text-gray-200">
                    Spent
                  </th>
                  <th className="w-10 p-3 font-semibold text-gray-700 dark:text-gray-200"></th>
                </tr>
              </thead>
              <tbody>
                {group.budget_items?.map((item) => (
                  <tr key={item.id} className="transition-colors">
                    <td className="p-1">
                      <input
                        type="text"
                        value={tempItemNames[item.id] ?? item.name}
                        onChange={(e) =>
                          handleItemInputChange(item.id, e.target.value)
                        }
                        className="w-full px-2 bg-transparent hover:bg-gray-200 dark:hover:bg-slate-500 rounded-sm text-gray-800 dark:text-white"
                      />
                    </td>
                    <td className="p-1">
                      <input
                        type="number"
                        defaultValue={item.budget}
                        onBlur={(e) =>
                          handleItemBudgetChange(item.id, e.target.value)
                        }
                        className="w-full px-2 bg-transparent hover:bg-gray-200 dark:hover:bg-slate-500 rounded-sm text-gray-800 dark:text-white"
                      />
                    </td>
                    <td className="p-1 w-10">
                      <span
                        className={`text-sm ${
                          calculateSpent(item.id) > item.budget
                            ? "text-red-500 dark:text-red-400"
                            : calculateSpent(item.id) === item.budget
                            ? "text-yellow-500 dark:text-yellow-400"
                            : "text-green-500 dark:text-green-400"
                        }`}
                      >
                        ${calculateSpent(item.id).toFixed(2)}
                      </span>
                    </td>
                    <td className="p-1">
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                      >
                        <Trash2 size={isSmallScreen ? 20 : 24} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4 bg-white dark:bg-slate-700 p-4 rounded-lg shadow border dark:border-gray-600">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-300">Total Budgeted:</span>
            <span className="font-semibold text-gray-800 dark:text-white">
              ${totals.totalBudget.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-300">Remaining Budget:</span>
            <span className="font-semibold text-gray-800 dark:text-white">
              ${totals.remainingBudget.toFixed(2)}
            </span>
          </div>
        </div>
        <div className="space-y-4 bg-white dark:bg-slate-700 p-4 rounded-lg shadow border dark:border-gray-600">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-300">Total Spent:</span>
            <span className="font-semibold text-gray-800 dark:text-white">
              ${totals.totalSpent.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-300">Remaining:</span>
            <span className="font-semibold text-gray-800 dark:text-white">
              ${totals.remainingSpent.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Budget;
