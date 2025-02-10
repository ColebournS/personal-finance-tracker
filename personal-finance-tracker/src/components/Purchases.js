import React, { useState, useEffect } from "react";
import supabase from "../supabaseClient.js";
import { Trash2 } from "lucide-react";
import AddPurchase from "./AddPurchase";

const PurchasesList = () => {
  const [purchases, setPurchases] = useState([]);
  const [budgetGroups, setBudgetGroups] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editableField, setEditableField] = useState(null);
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

  useEffect(() => {
    const fetchInitialData = async () => {
      await fetchBudgetGroups();
      await fetchPurchases();
    };

    if (!userId) return;

    fetchInitialData();

    const purchasesChannel = supabase.channel(`purchases_changes_${userId}`);
    const budgetGroupsChannel = supabase.channel(
      `budget_groups_changes_${userId}`
    );

    purchasesChannel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "purchases",
          match: { user_id: userId },
        },
        () => fetchPurchases()
      )
      .subscribe();

    budgetGroupsChannel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "budget_groups",
          match: { user_id: userId },
        },
        () => fetchBudgetGroups()
      )
      .subscribe();

    return () => {
      purchasesChannel.unsubscribe();
      budgetGroupsChannel.unsubscribe();
    };
  }, [userId]);

  const fetchBudgetGroups = async () => {
    const { data, error } = await supabase
      .from("budget_groups")
      .select(
        `
        id,
        name,
        budget_items (
          id,
          name
        )
      `
      )
      .eq("user_id", userId)
      .order("name");

    if (error) {
      console.error("Error fetching budget groups:", error);
      return;
    }

    setBudgetGroups(data || []);
  };

  const fetchPurchases = async () => {
    const { data, error } = await supabase
      .from("purchases")
      .select(
        `
        id,
        item_name,
        cost,
        timestamp,
        budget_item_id,
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
      .eq("user_id", userId)
      .order("timestamp", { ascending: false });

    if (error) {
      console.error("Error fetching purchases:", error);
      return;
    }

    setPurchases(data || []);
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from("purchases").delete().eq("id", id);
      await fetchPurchases();

      if (error) throw error;
    } catch (error) {
      console.error("Error deleting purchase:", error);
      alert("Failed to delete purchase. Please try again.");
    }
  };

  const handleCellEditStart = (field, purchase) => {
    setEditableField(field);
    setEditingId(purchase.id);
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
      await fetchPurchases();
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      alert(`Failed to update ${field}. Please try again.`);
    }
  };

  return (
    <div className="w-full max-w-screen overflow-x-auto p-6 bg-white shadow-lg rounded-lg">
      <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
        Purchases
      </h1>

      <div className="w-full overflow-x-auto">
        <div className="inline-block min-w-full align-middle">
          <table className="min-w-full table-auto border bg-blue-50 rounded-md">
            <thead>
              <tr className="bg-blue-100">
                <th className="p-3 text-left text-gray-700">Date</th>
                <th className="p-3 text-left text-gray-700">Item Name</th>
                <th className="p-3 text-left text-gray-700">Cost</th>
                <th className="p-3 text-left text-gray-700">Budget Item</th>
                <th className="p-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((purchase) => (
                <tr key={purchase.id} className="border-b hover:bg-blue-100">
                  <td
                    onClick={() => handleCellEditStart("timestamp", purchase)}
                    className="p-2"
                  >
                    {editableField === "timestamp" &&
                    editingId === purchase.id ? (
                      <input
                        type="date"
                        value={
                          new Date(purchase.timestamp)
                            .toISOString()
                            .split("T")[0]
                        }
                        onChange={(e) =>
                          handleCellUpdate("timestamp", e.target.value)
                        }
                        onBlur={() => {
                          setEditableField(null);
                          setEditingId(null);
                        }}
                        className="w-full px-2 py-1 border rounded"
                        autoFocus
                      />
                    ) : (
                      new Date(purchase.timestamp).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "2-digit",
                      })
                    )}
                  </td>
                  <td
                    onClick={() => handleCellEditStart("itemName", purchase)}
                    className="p-2 truncate"
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
                        value={purchase.item_name}
                        onChange={(e) =>
                          handleCellUpdate("itemName", e.target.value)
                        }
                        onBlur={() => {
                          setEditableField(null);
                          setEditingId(null);
                        }}
                        className="w-full px-2 py-1 border rounded"
                        autoFocus
                      />
                    ) : (
                      purchase.item_name
                    )}
                  </td>
                  <td
                    onClick={() => handleCellEditStart("cost", purchase)}
                    className="p-2"
                  >
                    {editableField === "cost" && editingId === purchase.id ? (
                      <input
                        type="number"
                        value={purchase.cost}
                        onChange={(e) =>
                          handleCellUpdate("cost", e.target.value)
                        }
                        onBlur={() => {
                          setEditableField(null);
                          setEditingId(null);
                        }}
                        className="w-full px-2 py-1 border rounded"
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
                    className="p-2 text-overflow:ellipsis"
                  >
                    {editableField === "budgetItemId" &&
                    editingId === purchase.id ? (
                      <select
                        value={purchase.budget_item_id}
                        onChange={(e) =>
                          handleCellUpdate("budgetItemId", e.target.value)
                        }
                        onBlur={() => {
                          setEditableField(null);
                          setEditingId(null);
                        }}
                        className="w-full px-2 py-1 border rounded"
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
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );


};

export default PurchasesList;
