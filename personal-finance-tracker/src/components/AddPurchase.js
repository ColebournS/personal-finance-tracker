import React, { useState, useEffect } from "react";
import supabase from "../supabaseClient.js";
import { Save } from "lucide-react";

const AddPurchase = () => {
  const [formData, setFormData] = useState({
    itemName: "",
    cost: "",
    budgetItemId: "",
    timestamp: new Date().toISOString().split("T")[0],
  });
  const [userId, setUserId] = useState(null);
  const [budgetGroups, setBudgetGroups] = useState([]);

  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        fetchBudgetGroups(user.id);
      }
    };
    getCurrentUser();
  }, []);

  const fetchBudgetGroups = async (userId) => {
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const purchaseData = {
        item_name: formData.itemName.trim(),
        user_id: userId,
        cost: parseFloat(formData.cost) || 0,
        budget_item_id: formData.budgetItemId,
        timestamp: new Date(formData.timestamp + "T00:00:00Z").toISOString(),
      };

      const { error } = await supabase.from("purchases").insert([purchaseData]);

      if (error) throw error;

      // Reset form after successful submission
      setFormData({
        itemName: "",
        cost: "",
        budgetItemId: "",
        timestamp: new Date().toISOString().split("T")[0],
      });
    } catch (error) {
      console.error("Error saving purchase:", error);
      alert("Failed to save purchase. Please try again.");
    }
  };

  return (
    <div className="w-full mx-auto p-6 bg-white shadow-lg rounded-lg">
      <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
        Add Purchase
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 mb-2">Item Name</label>
            <input
              type="text"
              name="itemName"
              value={formData.itemName}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border rounded-md hover:bg-blue-200"
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Cost</label>
            <input
              type="number"
              name="cost"
              value={formData.cost}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border rounded-md hover:bg-blue-200"
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Budget Item</label>
            <select
              name="budgetItemId"
              value={formData.budgetItemId}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border rounded-md hover:bg-blue-200"
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
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Date</label>
            <input
              type="date"
              name="timestamp"
              value={formData.timestamp}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border rounded-md hover:bg-blue-200"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition-colors flex items-center justify-center"
        >
          <Save className="mr-2" size={20} />
          Add Purchase
        </button>
      </form>
    </div>
  );
};

export default AddPurchase;
