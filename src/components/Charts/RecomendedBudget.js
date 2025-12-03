import React, { useState } from "react";
import { useData } from "../../DataContext";

function RecommendedBudget() {
  const { income: incomeData } = useData();
  const monthlyIncome = incomeData?.monthlyTakeHome || 0;
  const [budgetView, setBudgetView] = useState("monthly");

  // Format number with commas
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const displayIncome =
    budgetView === "monthly" ? monthlyIncome : monthlyIncome * 12;
  const needs = displayIncome * 0.5;
  const wants = displayIncome * 0.3;
  const savings = displayIncome * 0.2;

  return (
    <div className="space-y-2 md:space-y-3">
      {/* Header (no card wrapper) */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs sm:text-sm md:text-base font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
          Recommended Budget
        </h2>
        
        {/* Toggle Switch */}
        <div className="inline-flex items-center bg-gray-100 dark:bg-slate-700 rounded-full p-0.5 text-[10px] sm:text-xs font-medium">
          {["monthly", "yearly"].map((viewOption) => {
            const isActive = budgetView === viewOption;
            return (
              <button
                key={viewOption}
                type="button"
                onClick={() => setBudgetView(viewOption)}
                className={`px-2 sm:px-3 py-0.5 rounded-full transition-all ${
                  isActive
                    ? "bg-white text-black dark:bg-black dark:text-white shadow"
                    : "text-gray-500 dark:text-gray-300"
                }`}
              >
                {viewOption === "monthly" ? "Monthly" : "Yearly"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Needs / Wants / Savings summary cards */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        {/* Needs */}
        <div className="bg-red-50/50 dark:bg-red-900/10 p-2 md:p-4 rounded-lg">
          <div className="text-[9px] md:text-[10px] font-medium text-red-600 dark:text-red-400 uppercase tracking-wide mb-0.5 md:mb-1">
            Needs (50%)
          </div>
          <div className="text-xs md:text-2xl font-bold text-red-700 dark:text-red-300">
            ${formatCurrency(needs)}
          </div>
        </div>

        {/* Wants */}
        <div className="bg-blue-50/50 dark:bg-blue-900/10 p-2 md:p-4 rounded-lg">
          <div className="text-[9px] md:text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-0.5 md:mb-1">
            Wants (30%)
          </div>
          <div className="text-xs md:text-2xl font-bold text-blue-700 dark:text-blue-300">
            ${formatCurrency(wants)}
          </div>
        </div>

        {/* Savings */}
        <div className="bg-green-50/50 dark:bg-green-900/10 p-2 md:p-4 rounded-lg">
          <div className="text-[9px] md:text-[10px] font-medium text-green-600 dark:text-green-400 uppercase tracking-wide mb-0.5 md:mb-1">
            Savings (20%)
          </div>
          <div className="text-xs md:text-2xl font-bold text-green-700 dark:text-green-300">
            ${formatCurrency(savings)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RecommendedBudget;
