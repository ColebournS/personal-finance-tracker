import React from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { useData } from "../../DataContext";
import { PieChart } from "lucide-react";

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

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value || 0);
  };

  const totalBudget = groups.reduce(
    (sum, group) => sum + group.budget_items.reduce((itemSum, item) => itemSum + item.budget, 0),
    0
  );

  const data = {
    labels: groups.map(
      (group) => {
        const groupTotal = group.budget_items.reduce((sum, item) => sum + item.budget, 0);
        return group.name;
      }
    ),
    datasets: [
      {
        data: groups.map((group) =>
          group.budget_items.reduce((sum, item) => sum + item.budget, 0)
        ),
        backgroundColor: colorPalette.backgroundColor,
        hoverBackgroundColor: colorPalette.hoverBackgroundColor,
        borderWidth: 2,
        borderColor: 'rgba(0, 0, 0, 0.1)',
        hoverBorderWidth: 3,
        hoverBorderColor: 'rgba(0, 0, 0, 0.2)',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(30, 41, 59, 0.95)",
        titleColor: "#f3f4f6",
        bodyColor: "#e5e7eb",
        borderColor: "rgba(148, 163, 184, 0.2)",
        borderWidth: 1,
        cornerRadius: 8,
        titleFont: {
          family: "'Inter', sans-serif",
          size: 14,
          weight: "600",
        },
        bodyFont: {
          family: "'Inter', sans-serif",
          size: 13,
        },
        padding: 12,
        displayColors: true,
        boxWidth: 12,
        boxHeight: 12,
        usePointStyle: true,
        callbacks: {
          label: function(context) {
            const value = context.parsed;
            const percentage = totalBudget > 0 ? ((value / totalBudget) * 100).toFixed(1) : 0;
            return `$${formatCurrency(value)} (${percentage}%)`;
          }
        }
      },
      datalabels: {
        color: '#fff',
        font: function(context) {
          const percentage = totalBudget > 0 ? ((context.dataset.data[context.dataIndex] / totalBudget) * 100) : 0;
          // Adjust font size based on segment size
          const fontSize = percentage > 15 ? 14 : percentage > 8 ? 12 : 10;
          return {
            family: "'Inter', sans-serif",
            weight: 'bold',
            size: fontSize,
          };
        },
        formatter: (value, context) => {
          const percentage = totalBudget > 0 ? ((value / totalBudget) * 100).toFixed(1) : 0;
          const label = context.chart.data.labels[context.dataIndex];
          // Only show label if the segment is large enough (>3%)
          if (percentage < 3) {
            return '';
          }
          // For smaller segments, only show percentage
          if (percentage < 8) {
            return `${percentage}%`;
          }
          // For larger segments, show both name and percentage
          return `${label}\n${percentage}%`;
        },
        textAlign: 'center',
        anchor: 'center',
        align: 'center',
        offset: 0,
        clamp: true,
        textShadowBlur: 6,
        textShadowColor: 'rgba(0, 0, 0, 0.7)',
      },
    },
    cutout: '50%',
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1200,
      easing: 'easeOutQuart',
    },
  };

  return (
    <div className="w-full mx-auto p-2 md:p-6 bg-white dark:bg-slate-800 shadow-xl rounded-xl border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center gap-1.5 md:gap-3 mb-3 md:mb-6">
        <div className="inline-flex items-center justify-center w-6 h-6 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
          <PieChart className="text-white w-3 h-3 md:w-6 md:h-6" />
        </div>
        <h1 className="text-sm md:text-3xl font-bold text-gray-800 dark:text-white">
          Current Budget
        </h1>
      </div>

      {/* Chart */}
      <div className="w-full">
        {groups.length > 0 ? (
          <div className="h-64 md:h-96 w-full flex items-center justify-center">
            <Doughnut data={data} options={options} plugins={[ChartDataLabels]} />
          </div>
        ) : (
          <div className="h-64 md:h-80 flex flex-col items-center justify-center gap-2 md:gap-4">
            <PieChart className="w-12 h-12 md:w-16 md:h-16 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-500 dark:text-gray-400 font-medium text-sm md:text-base">No budget groups to display</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs md:text-sm">Create budget groups to see the breakdown</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default CurrentBudget;
