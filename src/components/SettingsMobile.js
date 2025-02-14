import React, { useState, useEffect, useRef } from "react";
import { Download, LogOut } from "lucide-react";
import * as XLSX from "xlsx";
import supabase from "../supabaseClient";
import BulkPurchaseImport from "./BulkPurchaseImport";

const SettingsMobile = ({
  onToggleIncome = () => {},
  onToggleRecommended = () => {},
}) => {
  const [hideIncome, setHideIncome] = useState(false);
  const [hideRecommended, setHideRecommended] = useState(false);
  const popupRef = useRef(null);
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
    if (userId) {
      fetchProfileData();

      const profileChannel = supabase
        .channel(`profile_changes_${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "profiles",
            match: { id: userId },
          },
          () => fetchProfileData()
        )
        .subscribe();

      return () => {
        profileChannel.unsubscribe();
      };
    }
  }, [userId]);

  const fetchProfileData = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("hide_income, hide_recommended_budget")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching profile data:", error);
        return;
      }

      if (data) {
        setHideIncome(data.hide_income || false);
        setHideRecommended(data.hide_recommended_budget || false);
        onToggleIncome(!data.hide_income);
        onToggleRecommended(!data.hide_recommended_budget);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    }
  };

  const updateProfile = async (updates) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId);

      if (error) {
        console.error("Error updating profile:", error);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    }
  };

  const handleIncomeToggle = async () => {
    const newValue = !hideIncome;
    setHideIncome(newValue);
    onToggleIncome(!newValue);
    await updateProfile({ hide_income: newValue });
  };

  const handleRecommendedToggle = async () => {
    const newValue = !hideRecommended;
    setHideRecommended(newValue);
    onToggleRecommended(!newValue);
    await updateProfile({ hide_recommended_budget: newValue });
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // The page will likely need to refresh or redirect after sign out
      window.location.href = "/";
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const exportToExcel = async () => {
    try {
      const { data: budgetGroups, error: groupsError } = await supabase
        .from("budget_groups")
        .select("*")
        .eq("id", userId);

      if (groupsError) throw groupsError;

      const { data: budgetItems, error: itemsError } = await supabase
        .from("budget_items")
        .select("*")
        .eq("id", userId);

      if (itemsError) throw itemsError;

      const { data: purchases, error: purchasesError } = await supabase
        .from("purchases")
        .select("*")
        .eq("id", userId);

      if (purchasesError) throw purchasesError;

      const budgetItemsData = budgetItems.map((item) => {
        const group = budgetGroups.find((g) => g.id === item.group_id);
        return {
          Group: group?.name || "Unknown",
          ItemName: item.name,
          Budget: item.budget,
          ItemID: item.id,
        };
      });

      const purchasesData = purchases.map((purchase) => ({
        ItemName: purchase.item_name,
        Cost: purchase.cost,
        BudgetGroup: purchase.budget_item_id,
        Timestamp: new Date(purchase.timestamp).toLocaleString(),
      }));

      const workbook = XLSX.utils.book_new();

      const budgetItemsSheet = XLSX.utils.json_to_sheet(budgetItemsData);
      XLSX.utils.book_append_sheet(workbook, budgetItemsSheet, "Budget Items");

      const purchasesSheet = XLSX.utils.json_to_sheet(purchasesData);
      XLSX.utils.book_append_sheet(workbook, purchasesSheet, "Purchases");

      const groupsSheet = XLSX.utils.json_to_sheet(budgetGroups);
      XLSX.utils.book_append_sheet(workbook, groupsSheet, "Budget Groups");

      XLSX.writeFile(workbook, "Budget_Export.xlsx");
    } catch (error) {
      console.error("Error exporting data to Excel: ", error);
      throw error;
    }
  };


  return (
    <div className="w-full mx-auto p-6 bg-white shadow-lg rounded-lg">
      <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
        Settings
      </h1>
      <div className="space-y-4">
        <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Hide Income</h3>
            <p className="text-sm text-gray-500">Toggle income visibility</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={hideIncome}
              onChange={handleIncomeToggle}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md">
          <div>
            <h3 className="text-sm font-medium text-gray-900">
              Hide Recommended Budget
            </h3>
            <p className="text-sm text-gray-500">
              Toggle recommended budget visibility
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={hideRecommended}
              onChange={handleRecommendedToggle}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <button
          onClick={exportToExcel}
          className="w-full flex items-center justify-center gap-2 p-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
        >
          <Download className="w-4 h-4" />
          Export Data
        </button>

        <BulkPurchaseImport />

        <div className="border-t border-gray-200 pt-4">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 p-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsMobile;
