import React, { useState, useEffect } from "react";
import supabase from "../supabaseClient";
import { Trash2, PlusCircle } from "lucide-react";

function Budget() {
  const [income, setIncome] = useState(0);
  const [groups, setGroups] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [tempGroupNames, setTempGroupNames] = useState({});
  const [tempItemNames, setTempItemNames] = useState({});
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    // Get the current user's ID when component mounts
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


  const fetchData = async () => {
    if (!userId) return; // Don't fetch if we don't have a user ID

    fetchIncomeData();

    const { data: groupsData, error: groupsError } = await supabase
      .from("budget_groups")
      .select(
        `
        id,
        name,
        budget_items (
          id,
          name,
          budget
        )
      `
      )
      .eq("user_id", userId) // Filter by user_id
      .order("name");

    if (groupsError) {
      console.error("Error fetching budget groups:", groupsError);
    } else {
      setGroups(groupsData);
    }

    const { data: purchasesData, error: purchasesError } = await supabase
      .from("purchases")
      .select(
        `
        *,
        budget_items (
          id,
          name,
          budget_groups (
            id,
            name
          )
        )
      `
      )
      .eq("user_id", userId) // Filter by user_id
      .order("timestamp", { ascending: false });

    if (purchasesError) {
      console.error("Error fetching purchases:", purchasesError);
    } else {
      setPurchases(purchasesData);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchData();
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const budgetGroupsSubscription = supabase
      .channel(`budget_groups_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "budget_groups",
          match: { user_id: userId }, // Only listen to this user's changes
        },
        fetchData
      )
      .subscribe();

    const budgetItemsSubscription = supabase
      .channel(`budget_items_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "budget_items",
          match: { user_id: userId }, // Only listen to this user's changes
        },
        fetchData
      )
      .subscribe();

    const purchasesSubscription = supabase
      .channel(`purchases__${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "purchases",
          match: { user_id: userId }, // Only listen to this user's changes
        },
        fetchData
      )
      .subscribe();

    const incomeChannel = supabase
      .channel(`income_changes_${userId}`) // Unique name per user
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "income",
          match: { user_id: userId },
        },
        (payload) => {
          setIncome(payload.new?.monthlyTakeHome || 0);
        }
      )
      .subscribe();


    return () => {
      supabase.removeChannel(budgetGroupsSubscription);
      supabase.removeChannel(budgetItemsSubscription);
      supabase.removeChannel(purchasesSubscription);
      supabase.removeChannel(incomeChannel);
    };
  }, [userId]);

  const fetchIncomeData = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("income")
        .select("monthlyTakeHome")
        .eq("user_id", userId) // Filter by user_id
        .single();
      if (error) {
        console.error("Error fetching income data:", error);
        return;
      }
      if (data?.monthlyTakeHome !== undefined) {
        setIncome(data.monthlyTakeHome || 0);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    }
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

  const calculateSpent = (itemId) => {
    const filteredPurchases = purchases.filter(
      (purchase) => purchase.budget_item_id === itemId
    );
    return filteredPurchases.reduce(
      (sum, purchase) => sum + (purchase.cost || 0),
      0
    );
  };

  const handleGroupInputChange = async (groupId, value) => {
    await supabase
      .from("budget_groups")
      .update({ name: value })
      .eq("id", groupId);
    fetchData();
  };

  const handleGroupInputBlur = (groupId, value) => {
    setTempGroupNames((prev) => ({
      ...prev,
      [groupId]: value === "" ? "" : value,
    }));
  };

  const handleItemInputChange = async (itemId, value) => {
    await supabase
      .from("budget_items")
      .update({ name: value })
      .eq("id", itemId);
    fetchData();
  };

  const handleItemInputBlur = (itemId, value) => {
    setTempItemNames((prev) => ({
      ...prev,
      [itemId]: value === "" ? "" : value,
    }));
  };

  const handleItemBudgetChange = async (itemId, value) => {
      const numericValue = parseFloat(value) || 0;
      await supabase
        .from("budget_items")
        .update({ budget: numericValue })
        .eq("id", itemId);
      fetchData();
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
    fetchData();
  };

  const handleAddGroup = async () => {
    if (!userId) return;

    const newGroup = {
      name: "New Group",
      user_id: userId, // Add user_id
    };
    await supabase.from("budget_groups").insert([newGroup]);
    fetchData();
  };

  const handleDeleteItem = async (itemId) => {
    await supabase.from("budget_items").delete().eq("id", itemId);
    fetchData();
  };

  const handleDeleteGroup = async (groupId) => {
    await supabase.from("budget_groups").delete().eq("id", groupId);
    fetchData();
  };

  const calculateTotals = () => {
    let totalBudget = 0;
    let totalSpent = 0;

    groups.forEach((group) => {
      if (Array.isArray(group.budget_items)) {
        group.budget_items.forEach((item) => {
          totalBudget += Number(item.budget) || 0;
          item.spent = calculateSpent(item.name);
          totalSpent += item.spent;
        });
        
      }
    });

    return {
      totalBudget,
      totalSpent,
      remainingBudget: income - totalBudget,
      remainingSpent: income - totalSpent,
    };
  };

  const totals = calculateTotals();

  return (
    <div className="w-full mx-auto p-6 bg-white shadow-lg rounded-lg">
      <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
        Budget
      </h1>
      <div className="flex justify-between items-start mb-6">
        <div className="text-xl font-semibold">Income: ${income}</div>
        <button
          onClick={handleAddGroup}
          className="flex items-center bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
        >
          {!isSmallScreen && <PlusCircle className="mr-2" size={20} />}
          Add Group
        </button>
      </div>

      {groups.map((group) => (
        <div key={group.id} className="mb-6 bg-gray-50 p-4 rounded-lg border">
          <div className="flex justify-between items-center mb-4">
            <input
              type="text"
              value={tempGroupNames[group.id] ?? group.name}
              onChange={(e) => handleGroupInputBlur(group.id, e.target.value)}
              onBlur={(e) => handleGroupInputChange(group.id, e.target.value)}
              className="text-xl font-semibold text-gray-700 bg-transparent border-b border-gray-300 w-full hover:bg-blue-200 rounded-sm pl-2"
            />
            <div className="flex space-x-1">
              <div className="flex items-center ml-2 px-3 py-1 border rounded-md bg-gray-200">
                {group.budget_items.reduce((sum, item) => sum + item.budget, 0)}
                $
              </div>
              <button
                onClick={() => handleAddItem(group.id)}
                className="flex items-center bg-blue-500 text-white px-2 py-1 rounded-md hover:bg-blue-600 transition-colors"
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
                className="flex items-center bg-red-500 text-white px-2 py-1 rounded-md hover:bg-red-600 transition-colors"
              >
                <Trash2 size={isSmallScreen ? 24 : 30} />
                {!isSmallScreen && (
                  <span className="text-sm">Delete {group.name}</span>
                )}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-md">
            <table className="w-full border bg-blue-50 rounded-md">
              <thead>
                <tr className="bg-blue-100">
                  <th className="w-full p-3 font-semibold text-left text-gray-700">
                    Item
                  </th>
                  <th className="w-15 p-3 font-semibold text-left text-gray-700">
                    Budget
                  </th>
                  <th className="w-15 p-3 font-semibold text-left text-gray-700">
                    Spent
                  </th>
                  <th className="w-10 p-3 font-semibold text-gray-700"></th>
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
                          handleItemInputBlur(item.id, e.target.value)
                        }
                        onBlur={(e) =>
                          handleItemInputChange(item.id, e.target.value)
                        }
                        className="w-full px-2 bg-transparent hover:bg-blue-200 rounded-sm"
                      />
                    </td>
                    <td className="p-1">
                      <input
                        type="number"
                        defaultValue={item.budget}
                        onBlur={(e) =>
                          handleItemBudgetChange(item.id, e.target.value)
                        }
                        className="w-full px-2 bg-transparent hover:bg-blue-200 rounded-sm"
                      />
                    </td>
                    <td className="p-1 w-10">
                      <span
                        className={`text-sm ${
                          calculateSpent(item.id) > item.budget
                            ? "text-red-500"
                            : calculateSpent(item.id) === item.budget
                            ? "text-yellow-500"
                            : "text-green-500"
                        }`}
                      >
                        ${calculateSpent(item.id).toFixed(2)}
                      </span>
                    </td>
                    <td className="p-1">
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-red-500 hover:text-red-700"
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
        <div className="space-y-4 bg-white p-4 rounded-lg shadow">
          <div className="flex justify-between">
            <span className="text-gray-600">Total Budget:</span>
            <span className="font-semibold">
              ${totals.totalBudget.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Remaining Budget:</span>
            <span className="font-semibold">
              ${totals.remainingBudget.toFixed(2)}
            </span>
          </div>
        </div>
        <div className="space-y-4 bg-white p-4 rounded-lg shadow">
          <div className="flex justify-between">
            <span className="text-gray-600">Total Spent:</span>
            <span className="font-semibold">
              ${totals.totalSpent.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Remaining Spent:</span>
            <span className="font-semibold">
              ${totals.remainingSpent.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Budget;
