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
    <div className="w-full mx-auto p-8 bg-white dark:bg-slate-800 shadow-xl rounded-xl border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <PieChart className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            Recommended Budget (50/30/20 Rule)
          </h2>
        </div>
        
        {/* Toggle Switch */}
        <label className="inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={budgetView === "yearly"}
            onChange={() =>
              setBudgetView(budgetView === "monthly" ? "yearly" : "monthly")
            }
          />
          <div className="relative w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          <span className="ml-3 text-sm font-medium text-gray-900 dark:text-white">
            {budgetView === "monthly" ? "Yearly" : "Monthly"}
          </span>
        </label>
      </div>

      {/* Total Income Display */}
      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 p-4 rounded-lg border-2 border-indigo-200 dark:border-indigo-700 mb-6">
        <div className="text-center">
          <div className="text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-1">
            {budgetView === "monthly" ? "Monthly" : "Annual"} Take Home
          </div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            ${formatCurrency(displayIncome)}
          </div>
        </div>
      </div>

      {/* Budget Breakdown Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Needs */}
        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-6 rounded-lg border-2 border-red-200 dark:border-red-700 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Home className="w-6 h-6 text-red-600 dark:text-red-400" />
              <span className="font-semibold text-lg text-red-700 dark:text-red-300">Needs</span>
            </div>
            <span className="text-sm font-medium text-red-600 dark:text-red-400 bg-red-200 dark:bg-red-800/30 px-3 py-1 rounded-full">50%</span>
          </div>
          <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-2">
            ${formatCurrency(needs)}
          </div>
          <p className="text-sm text-red-700 dark:text-red-300">
            Housing, utilities, groceries, insurance
          </p>
        </div>

        {/* Wants */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-lg border-2 border-blue-200 dark:border-blue-700 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <PartyPopper className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <span className="font-semibold text-lg text-blue-700 dark:text-blue-300">Wants</span>
            </div>
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-200 dark:bg-blue-800/30 px-3 py-1 rounded-full">30%</span>
          </div>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
            ${formatCurrency(wants)}
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Entertainment, dining, hobbies, subscriptions
          </p>
        </div>

        {/* Savings */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-6 rounded-lg border-2 border-green-200 dark:border-green-700 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              <span className="font-semibold text-lg text-green-700 dark:text-green-300">Savings</span>
            </div>
            <span className="text-sm font-medium text-green-600 dark:text-green-400 bg-green-200 dark:bg-green-800/30 px-3 py-1 rounded-full">20%</span>
          </div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
            ${formatCurrency(savings)}
          </div>
          <p className="text-sm text-green-700 dark:text-green-300">
            Emergency fund, investments, debt payoff
          </p>
        </div>
      </div>
    </div>
  );
}

export default RecommendedBudget;
