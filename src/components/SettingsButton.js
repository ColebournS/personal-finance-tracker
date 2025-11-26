import React, { useState, useEffect, useRef } from "react";
import { Settings, Download, LogOut, Moon, Sun } from "lucide-react";
import * as XLSX from "xlsx";
import supabase from "../supabaseClient";
import BulkPurchaseImport from "./BulkPurchaseImport";
import { useTheme } from "next-themes";

const SettingsButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const popupRef = useRef(null);
  const [userId, setUserId] = useState(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-4 rounded-md bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 shadow-md transition-colors"
        aria-label="Settings"
      >
        <Settings className="w-6 h-6 text-gray-700 dark:text-gray-200" />
      </button>

      {isOpen && (
        <div
          ref={popupRef}
          className="absolute right-0 mt-2 w-80 rounded-lg bg-white dark:bg-slate-800 shadow-lg ring-1 ring-black dark:ring-gray-600 ring-opacity-5"
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Settings</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400"
              >
                <span className="sr-only">Close</span>
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {mounted && (
                <div className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-md">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      Dark Mode
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Toggle dark/light theme
                    </p>
                  </div>
                  <button
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="p-2 rounded-lg bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors"
                    aria-label="Toggle theme"
                  >
                    {theme === "dark" ? (
                      <Sun className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                    ) : (
                      <Moon className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                    )}
                  </button>
                </div>
              )}

              <button
                onClick={exportToExcel}
                className="w-full flex items-center justify-center gap-2 p-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800 rounded-md transition-colors"
              >
                <Download className="w-4 h-4" />
                Export Data
              </button>
              
              <BulkPurchaseImport />

              <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 p-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsButton;
