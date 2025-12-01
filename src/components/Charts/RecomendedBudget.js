import React, { useState } from "react";
import { useData } from "../../DataContext";
import { PieChart, Home, PartyPopper, TrendingUp } from "lucide-react";

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
    <div className="w-full mx-auto p-2 sm:p-6 md:p-8 bg-white dark:bg-slate-800 shadow-xl rounded-xl border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3 sm:mb-6">
        <div className="flex items-center gap-1.5 sm:gap-3">
          <div className="p-1 sm:p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex-shrink-0">
            <PieChart className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <h2 className="text-sm sm:text-xl md:text-2xl font-bold text-gray-800 dark:text-white">
            <span className="hidden sm:inline">Recommended Budget (50/30/20)</span>
            <span className="sm:hidden">Recommended Budget</span>
          </h2>
        </div>
        
        {/* Toggle Switch */}
        <label className="inline-flex items-center cursor-pointer flex-shrink-0">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={budgetView === "yearly"}
            onChange={() =>
              setBudgetView(budgetView === "monthly" ? "yearly" : "monthly")
            }
          />
          <div className="relative w-8 h-4 sm:w-11 sm:h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-2 sm:peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] sm:after:top-[2px] after:left-[1px] sm:after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 sm:after:h-5 sm:after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          <span className="ml-1.5 sm:ml-3 text-[10px] sm:text-sm font-medium text-gray-900 dark:text-white">
            {budgetView === "monthly" ? "Yearly" : "Monthly"}
          </span>
        </label>
      </div>

      {/* Total Income Display */}
      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 p-2 sm:p-4 rounded-lg border-2 border-indigo-200 dark:border-indigo-700 mb-3 sm:mb-6">
        <div className="text-center">
          <div className="text-[10px] sm:text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-0.5 sm:mb-1">
            {budgetView === "monthly" ? "Monthly" : "Annual"} Take Home
          </div>
          <div className="text-sm sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            ${formatCurrency(displayIncome)}
          </div>
        </div>
      </div>

      {/* Budget Breakdown Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {/* Needs */}
        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-2 sm:p-4 md:p-6 rounded-lg border-2 border-red-200 dark:border-red-700 shadow-sm">
          <div className="flex items-center justify-between mb-1 sm:mb-3">
            <div className="flex items-center gap-1 sm:gap-2">
              <Home className="w-3 h-3 sm:w-5 sm:h-5 md:w-6 md:h-6 text-red-600 dark:text-red-400" />
              <span className="font-semibold text-[10px] sm:text-base md:text-lg text-red-700 dark:text-red-300">Needs</span>
            </div>
            <span className="hidden sm:inline text-[9px] sm:text-sm font-medium text-red-600 dark:text-red-400 bg-red-200 dark:bg-red-800/30 px-1.5 py-0.5 sm:px-3 sm:py-1 rounded-full flex-shrink-0">50%</span>
          </div>
          <div className="flex items-baseline justify-between gap-1 mb-0.5 sm:mb-2">
            <div className="text-xs sm:text-2xl md:text-3xl font-bold text-red-600 dark:text-red-400">
              ${formatCurrency(needs)}
            </div>
            <span className="sm:hidden text-[9px] font-medium text-red-600 dark:text-red-400 bg-red-200 dark:bg-red-800/30 px-1.5 py-0.5 rounded-full flex-shrink-0">50%</span>
          </div>
          <p className="text-xs sm:text-sm text-red-700 dark:text-red-300 hidden sm:block">
            Housing, utilities, groceries, insurance
          </p>
        </div>

        {/* Wants */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-2 sm:p-4 md:p-6 rounded-lg border-2 border-blue-200 dark:border-blue-700 shadow-sm">
          <div className="flex items-center justify-between mb-1 sm:mb-3">
            <div className="flex items-center gap-1 sm:gap-2">
              <PartyPopper className="w-3 h-3 sm:w-5 sm:h-5 md:w-6 md:h-6 text-blue-600 dark:text-blue-400" />
              <span className="font-semibold text-[10px] sm:text-base md:text-lg text-blue-700 dark:text-blue-300">Wants</span>
            </div>
            <span className="hidden sm:inline text-[9px] sm:text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-200 dark:bg-blue-800/30 px-1.5 py-0.5 sm:px-3 sm:py-1 rounded-full flex-shrink-0">30%</span>
          </div>
          <div className="flex items-baseline justify-between gap-1 mb-0.5 sm:mb-2">
            <div className="text-xs sm:text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400">
              ${formatCurrency(wants)}
            </div>
            <span className="sm:hidden text-[9px] font-medium text-blue-600 dark:text-blue-400 bg-blue-200 dark:bg-blue-800/30 px-1.5 py-0.5 rounded-full flex-shrink-0">30%</span>
          </div>
          <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 hidden sm:block">
            Entertainment, dining, hobbies, subscriptions
          </p>
        </div>

        {/* Savings */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-2 sm:p-4 md:p-6 rounded-lg border-2 border-green-200 dark:border-green-700 shadow-sm">
          <div className="flex items-center justify-between mb-1 sm:mb-3">
            <div className="flex items-center gap-1 sm:gap-2">
              <TrendingUp className="w-3 h-3 sm:w-5 sm:h-5 md:w-6 md:h-6 text-green-600 dark:text-green-400" />
              <span className="font-semibold text-[10px] sm:text-base md:text-lg text-green-700 dark:text-green-300">Savings</span>
            </div>
            <span className="hidden sm:inline text-[9px] sm:text-sm font-medium text-green-600 dark:text-green-400 bg-green-200 dark:bg-green-800/30 px-1.5 py-0.5 sm:px-3 sm:py-1 rounded-full flex-shrink-0">20%</span>
          </div>
          <div className="flex items-baseline justify-between gap-1 mb-0.5 sm:mb-2">
            <div className="text-xs sm:text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">
              ${formatCurrency(savings)}
            </div>
            <span className="sm:hidden text-[9px] font-medium text-green-600 dark:text-green-400 bg-green-200 dark:bg-green-800/30 px-1.5 py-0.5 rounded-full flex-shrink-0">20%</span>
          </div>
          <p className="text-xs sm:text-sm text-green-700 dark:text-green-300 hidden sm:block">
            Emergency fund, investments, debt payoff
          </p>
        </div>
      </div>
    </div>
  );
}

export default RecommendedBudget;
