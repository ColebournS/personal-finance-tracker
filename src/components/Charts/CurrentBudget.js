import React from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { useData } from "../../DataContext";

ChartJS.register(ArcElement, Tooltip, Legend);

function CurrentBudget() {
  const { income: incomeData, budgetGroups: groups } = useData();
  const income = incomeData?.monthlyTakeHome || 0;

  const colorPalette = {
    backgroundColor: [
      "#f87171",
      "#60a5fa",
      "#34d399",
      "#a78bfa",
      "#fcd34d",
      "#fb923c",
      "#4ade80",
      "#22d3ee",
      "#e879f9",
      "#fb7185",
    ],
    hoverBackgroundColor: [
      "#ef4444",
      "#3b82f6",
      "#10b981",
      "#8b5cf6",
      "#f59e0b",
      "#ea580c",
      "#16a34a",
      "#0891b2",
      "#d946ef",
      "#e11d48",
    ],
  };

  const data = {
    labels: groups.map(
      (group) =>
        `${group.name}: $${group.budget_items.reduce(
          (sum, item) => sum + item.budget,
          0
        )} (${(group.budget_items.reduce((sum, item) => sum + item.budget, 0) * 100 / income).toFixed(1)}%)`
    ),
    datasets: [
      {
        data: groups.map((group) =>
          group.budget_items.reduce((sum, item) => sum + item.budget, 0)
        ),
        backgroundColor: colorPalette.backgroundColor,
        hoverBackgroundColor: colorPalette.hoverBackgroundColor,
      },
    ],
  };

  const options = {
    plugins: {
      legend: {
        display: true,
        position: "top",
      },
    },
  };

  return (
    <div className="w-full mx-auto p-6 bg-white shadow-lg rounded-lg">
      <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
        Current Budget
      </h1>
      <Doughnut data={data} options={options} />
    </div>
  );
}

export default CurrentBudget;
