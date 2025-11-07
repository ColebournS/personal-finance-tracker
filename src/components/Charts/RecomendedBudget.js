import React, { useState } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { useData } from "../../DataContext";

ChartJS.register(ArcElement, Tooltip, Legend);

function RecommendedBudget() {
  const { income: incomeData } = useData();
  const monthlyIncome = incomeData?.monthlyTakeHome || 0;
  const [budgetView, setBudgetView] = useState("monthly");

  const displayIncome =
    budgetView === "monthly" ? monthlyIncome : monthlyIncome * 12;
  const needs = (displayIncome * 0.5).toFixed(0);
  const wants = (displayIncome * 0.3).toFixed(0);
  const savings = (displayIncome * 0.2).toFixed(0);

  const data = {
    labels: [
      `💰 Needs: $${needs} (50%)`,
      `🎉 Wants: $${wants} (30%)`,
      `📈 Savings: $${savings} (20%)`,
    ],
    datasets: [
      {
        data: [needs, wants, savings],
        backgroundColor: ["#f87171", "#60a5fa", "#34d399"],
        hoverBackgroundColor: ["#ef4444", "#3b82f6", "#10b981"],
      },
    ],
  };

  return (
    <div className="w-full mx-auto p-6 bg-white shadow-lg rounded-lg">
      <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
        Recommended Budget
      </h1>

      <div className="flex justify-center mb-4">
        <label className="inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={budgetView === "yearly"}
            onChange={() =>
              setBudgetView(budgetView === "monthly" ? "yearly" : "monthly")
            }
          />
          <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          <span className="ml-3 text-sm font-medium text-gray-900">
            {budgetView === "monthly"
              ? "Switch to Yearly"
              : "Switch to Monthly"}
          </span>
        </label>
      </div>

      <div className="text-center text-gray-700 mb-4">
        <p>
          💵 {budgetView === "monthly" ? "Monthly" : "Yearly"} Income: $
          {displayIncome.toFixed(2)}
        </p>
      </div>

      <Doughnut data={data} />

    </div>
  );
}

export default RecommendedBudget;
