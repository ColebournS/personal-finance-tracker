import React, { useState, useEffect } from "react";
import supabase from "../supabaseClient.js";
import { Save, CheckCircle } from "lucide-react";

const AddPurchase = () => {
  const [formData, setFormData] = useState({
    itemName: "",
    cost: "",
    budgetItemId: "",
    timestamp: new Date().toISOString().split("T")[0],
  });
  const [userId, setUserId] = useState(null);
  const [budgetGroups, setBudgetGroups] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);

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

      // Show success animation
      setShowSuccess(true);

      // Hide animation after 3 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);

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
    <div className="w-full mx-auto p-6 bg-white shadow-lg rounded-lg relative">
      {showSuccess && (
        <div className="success-animation fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white p-8 rounded-lg shadow-2xl transform transition-all duration-500 animate-bounce-in">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-100 mb-6">
                <CheckCircle className="w-16 h-16 text-green-500 animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Success!
              </h2>
              <p className="text-gray-600 mb-4">Your purchase has been added</p>
              <div className="sparkles">
                <div className="sparkle" style={{ "--delay": "0s" }}></div>
                <div className="sparkle" style={{ "--delay": "0.3s" }}></div>
                <div className="sparkle" style={{ "--delay": "0.6s" }}></div>
                <div className="sparkle" style={{ "--delay": "0.9s" }}></div>
                <div className="sparkle" style={{ "--delay": "1.2s" }}></div>
                <div className="sparkle" style={{ "--delay": "1.5s" }}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes bounceIn {
          0% {
            transform: scale(0.3);
            opacity: 0;
          }
          50% {
            transform: scale(1.05);
            opacity: 1;
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            transform: scale(1);
          }
        }

        @keyframes float {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(-100px) rotate(360deg);
            opacity: 0;
          }
        }

        .animate-bounce-in {
          animation: bounceIn 0.7s cubic-bezier(0.215, 0.61, 0.355, 1) forwards;
        }

        .sparkles {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .sparkle {
          position: absolute;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            #fff 0%,
            rgba(255, 215, 0, 0.8) 60%,
            rgba(255, 215, 0, 0) 100%
          );
          animation: float 2s ease-in-out forwards;
          animation-delay: var(--delay);
          opacity: 0;
        }

        .sparkle:nth-child(1) {
          top: 20%;
          left: 20%;
        }
        .sparkle:nth-child(2) {
          top: 30%;
          left: 70%;
        }
        .sparkle:nth-child(3) {
          top: 70%;
          left: 30%;
        }
        .sparkle:nth-child(4) {
          top: 60%;
          left: 80%;
        }
        .sparkle:nth-child(5) {
          top: 80%;
          left: 40%;
        }
        .sparkle:nth-child(6) {
          top: 40%;
          left: 60%;
        }
      `}</style>

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
