import React, { useState } from "react";
import supabase from "../supabaseClient.js";
import { Save, ShoppingBag, DollarSign, Tag, X } from "lucide-react";
import { useData } from "../DataContext";

const AddPurchase = ({ isOpen, onClose }) => {
  const { budgetGroups, userId, refetchPurchases } = useData();
  const [formData, setFormData] = useState({
    itemName: "",
    cost: "",
    budgetItemId: "",
  });
  
  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const currentDate = new Date().toISOString().split("T")[0];
      const purchaseData = {
        item_name: formData.itemName.trim(),
        user_id: userId,
        cost: parseFloat(formData.cost) || 0,
        budget_item_id: formData.budgetItemId,
        timestamp: new Date(currentDate + "T00:00:00Z").toISOString(),
      };

      const { error } = await supabase.from("purchases").insert([purchaseData]);

      if (error) throw error;

      // Refetch purchases to update the context
      await refetchPurchases();

      // Reset form after successful submission
      setFormData({
        itemName: "",
        cost: "",
        budgetItemId: "",
      });

      // Close modal immediately
      onClose();
    } catch (error) {
      console.error("Error saving purchase:", error);
      alert("Failed to save purchase. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl mx-auto p-8 bg-white dark:bg-slate-800 shadow-2xl rounded-xl border border-gray-200 dark:border-gray-700 relative max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-all z-10"
        >
          <X size={24} />
        </button>

      <div className="text-center mb-4">
        <div className="inline-flex items-center justify-center p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
          <ShoppingBag className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
          Add Purchase
        </h1>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Item Name */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              Item Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                <Tag size={20} />
              </div>
              <input
                type="text"
                name="itemName"
                value={formData.itemName}
                onChange={handleChange}
                required
                placeholder="e.g., Groceries, Coffee, Gas"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Cost */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              Cost <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                <DollarSign size={20} />
              </div>
              <input
                type="number"
                name="cost"
                value={formData.cost}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Budget Item */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              Budget Category <span className="text-red-500">*</span>
            </label>
            <select
              name="budgetItemId"
              value={formData.budgetItemId}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all cursor-pointer appearance-none bg-no-repeat bg-right pr-10"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath fill='%236B7280' d='M4.427 6.573l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 6H4.604a.25.25 0 00-.177.427z'/%3E%3C/svg%3E")`,
                backgroundPosition: "right 0.75rem center",
                backgroundSize: "1.25rem"
              }}
            >
              <option value="">Select a category</option>
              {budgetGroups.map((group) => (
                <optgroup key={group.id} label={group.name} className="font-semibold">
                  {group.budget_items?.map((item) => (
                    <option key={item.id} value={item.id} className="font-normal">
                      {item.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white py-3.5 px-6 rounded-lg hover:from-blue-600 hover:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center font-semibold text-lg"
        >
          <Save className="mr-2" size={22} />
          Add Purchase
        </button>
      </form>
      </div>
    </div>
  );
};

export default AddPurchase;
