import React, { useState, useEffect } from "react";
import { Bar } from "react-chartjs-2";
import ChartDataLabels from "chartjs-plugin-datalabels";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import supabase from "../../supabaseClient";
import { useData } from "../../DataContext";
import {
  Calendar,
  EyeOff,
  Eye,
  BarChart3,
  RefreshCw,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);


function BudgetVsSpentChart() {
  const { userId } = useData();
  const [isOpen, setIsOpen] = useState(false);
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [],
  });
  const [budgetItems, setBudgetItems] = useState([]);
  const [hiddenItems, setHiddenItems] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    fromDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
    toDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
      .toISOString()
      .split("T")[0],
  });

  const fetchBudgetData = async () => {
    if (!userId) return;

    setIsLoading(true);

    const { data: items, error: budgetError } = await supabase
      .from("budget_items")
      .select(
        `
        id, 
        name,
        budget,
        hidden,
        purchases (cost)
        `
      )
      .eq("user_id", userId)
      .gte("purchases.timestamp", dateRange.fromDate)
      .lte("purchases.timestamp", dateRange.toDate);

    if (budgetError) {
      console.error("Budget fetch error:", budgetError);
      setIsLoading(false);
      return;
    }

    setBudgetItems(items);

    // Update hiddenItems state based on database values
    const hiddenSet = new Set(
      items.filter((item) => item.hidden).map((item) => item.id)
    );
    setHiddenItems(hiddenSet);

    const visibleItems = items.filter((item) => !item.hidden);

    const budgetValues = visibleItems.map((item) => item.budget);
    const spentValues = visibleItems.map((item) =>
      item.purchases.reduce((sum, purchase) => sum + purchase.cost, 0)
    );
    
    const chartConfig = {
      labels: visibleItems.map((item) => item.name),
      datasets: [
        {
          label: "Budgeted",
          data: budgetValues,
          backgroundColor: "rgba(59, 130, 246, 0.6)",
          borderColor: "rgb(37, 99, 235)",
          borderWidth: 1,
          borderRadius: 6,
          hoverBackgroundColor: "rgba(59, 130, 246, 0.8)",
        },
        {
          label: "Spent",
          data: spentValues,
          backgroundColor: "rgba(239, 68, 68, 0.6)",
          borderColor: "rgb(220, 38, 38)",
          borderWidth: 1,
          borderRadius: 6,
          hoverBackgroundColor: "rgba(239, 68, 68, 0.8)",
        },
      ],
    };

    setChartData(chartConfig);
    setIsLoading(false);
    return chartConfig;
  };

  useEffect(() => {
    if (userId) {
      fetchBudgetData();

      const budgetItemsSubscription = supabase
        .channel(`budget_items_${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "budget_items",
            match: { user_id: userId },
          },
          fetchBudgetData
        )
        .subscribe();

      const purchasesSubscription = supabase
        .channel(`purchases_${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "purchases",
            match: { user_id: userId },
          },
          fetchBudgetData
        )
        .subscribe();

      return () => {
        supabase.removeChannel(budgetItemsSubscription);
        supabase.removeChannel(purchasesSubscription);
      };
    }
  }, [userId, dateRange]);

  const toggleItemVisibility = async (itemId) => {
    const item = budgetItems.find((item) => item.id === itemId);
    if (!item) return;

    // Update database
    const { error } = await supabase
      .from("budget_items")
      .update({ hidden: !item.hidden })
      .eq("id", itemId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error updating visibility:", error);
      return;
    }

    // Local state will be updated by the subscription callback
  };

  const handleDateChange = async (e) => {
    const { name, value } = e.target;
    setDateRange((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRefresh = () => {
    fetchBudgetData();
  };

  // Quick date preset functions
  const setCurrentMonth = () => {
    const now = new Date();
    setDateRange({
      fromDate: new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0],
      toDate: new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .split("T")[0],
    });
  };

  const setPreviousMonth = () => {
    const now = new Date();
    setDateRange({
      fromDate: new Date(now.getFullYear(), now.getMonth() - 1, 1)
        .toISOString()
        .split("T")[0],
      toDate: new Date(now.getFullYear(), now.getMonth(), 0)
        .toISOString()
        .split("T")[0],
    });
  };

  const setCurrentYear = () => {
    const now = new Date();
    setDateRange({
      fromDate: new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0],
      toDate: new Date(now.getFullYear(), 11, 31).toISOString().split("T")[0],
    });
  };
  
  const getFontSize = () => (window.innerWidth < 768 ? 8 : 12);
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        align: "center",
        labels: {
          usePointStyle: true,
          pointStyle: "circle",
          boxWidth: 8,
          boxHeight: 8,
          padding: 10,
          font: {
            family: "'Inter', sans-serif",
            size: 13,
            weight: "600",
          },
          color: "#4b5563",
        },
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
        boxWidth: 8,
        boxHeight: 8,
        usePointStyle: true,
        callbacks: {
          title: function (tooltipItems) {
            return tooltipItems[0].label;
          },
          label: function (context) {
            let label = context.dataset.label || "";
            if (label) {
              label += ": $";
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }).format(context.parsed.y);
            }
            return label;
          },
        },
      },
      datalabels: {
        anchor: "end",
        align: "bottom",
        formatter: (value) => (value < 10 ? "" : `${Math.round(value)}`),
        font: {
          family: "'Inter', sans-serif",
          weight: "600",
          size: getFontSize(),
        },
        color: (context) => {
          const colors = ["rgb(0, 0, 0)", "rgb(0, 0, 0)"];
          return colors[context.datasetIndex % colors.length];
        },
        offset: 0,
        textShadow: "0 1px 2px rgba(0, 0, 0, 0.2)",
      },
    },
    scales: {
      x: {
        grid: {
          display: true,
          color: "rgba(0, 0, 0, 0.03)",
          drawBorder: false,
        },
        ticks: {
          padding: 10,
          font: {
            family: "'Inter', sans-serif",
            size: 12,
            weight: "500",
          },
          color: "#6b7280",
        },
        border: {
          color: "rgba(0, 0, 0, 0.05)",
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(0, 0, 0, 0.04)",
          drawBorder: false,
        },
        border: {
          display: false,
        },
        ticks: {
          padding: 10,
          stepSize: Math.ceil(
            Math.max(...chartData.datasets.flatMap((d) => d.data)) / 5
          ),
          font: {
            family: "'Inter', sans-serif",
            size: 12,
          },
          color: "#6b7280",
          callback: function (value) {
            return (
              "$" +
              new Intl.NumberFormat("en-US", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(value)
            );
          },
        },
      },
    },
    animation: {
      duration: 1200,
      easing: "easeOutQuart",
    },
    elements: {
      bar: {
        borderRadius: 4,
        borderWidth: 0,
        borderSkipped: false,
      },
    },
    barPercentage: 0.9,
    categoryPercentage: 0.8,
  };
  

  // Calculate totals for the summary
  const totalBudgeted =
    chartData.datasets?.[0]?.data?.reduce((sum, value) => sum + value, 0) || 0;
  const totalSpent =
    chartData.datasets?.[1]?.data?.reduce((sum, value) => sum + value, 0) || 0;
  const percentOfBudgetUsed = totalBudgeted
    ? (totalSpent / totalBudgeted) * 100
    : 0;

  return (
    <div className="w-full mx-auto p-6 bg-white dark:bg-slate-800 shadow-lg rounded-lg">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center">
          <BarChart3 className="mr-2 text-blue-600 dark:text-blue-400" size={28} />
          Budget vs Spent
        </h1>
        <button
          onClick={handleRefresh}
          className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 p-2 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
          title="Refresh data"
        >
          <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>
      {/* Date selection card */}
      <div className="bg-white dark:bg-slate-700 rounded-lg p-6 mb-6 shadow border border-gray-100 dark:border-gray-600">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="text-blue-600 dark:text-blue-400" size={20} />
          <h2 className="font-semibold text-gray-800 dark:text-white text-lg">Date Range</h2>
        </div>

        <div className="space-y-5">
          {/* Date inputs */}
          <div className="grid grid-cols-2 gap-2 sm:gap-6">
            <div>
              <label
                htmlFor="fromDate"
                className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-1 sm:mb-2"
              >
                From Date
              </label>
              <input
                type="date"
                id="fromDate"
                name="fromDate"
                value={dateRange.fromDate}
                onChange={handleDateChange}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white dark:bg-slate-600 text-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label
                htmlFor="toDate"
                className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-1 sm:mb-2"
              >
                To Date
              </label>
              <input
                type="date"
                id="toDate"
                name="toDate"
                value={dateRange.toDate}
                onChange={handleDateChange}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white dark:bg-slate-600 text-gray-800 dark:text-white"
              />
            </div>
          </div>

          {/* Quick selection buttons - now always in one row */}
          <div className="flex gap-2 min-w-0">
            <button
              onClick={setCurrentMonth}
              className="bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded hover:bg-blue-600 hover:text-white dark:hover:bg-blue-700 transition-colors font-medium whitespace-nowrap flex-1 min-w-0 text-[min(2vw,12px)]"
            >
              Current Month
            </button>
            <button
              onClick={setPreviousMonth}
              className="bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded hover:bg-blue-600 hover:text-white dark:hover:bg-blue-700 transition-colors font-medium whitespace-nowrap flex-1 min-w-0 text-[min(2vw,12px)]"
            >
              Previous Month
            </button>
            <button
              onClick={setCurrentYear}
              className="bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded hover:bg-blue-600 hover:text-white dark:hover:bg-blue-700 transition-colors font-medium whitespace-nowrap flex-1 min-w-0 text-[min(2vw,12px)]"
            >
              Current Year
            </button>
          </div>
        </div>
      </div>
      {/* Budget summary card */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
        <div className="bg-blue-100 dark:bg-blue-900 rounded-lg p-2 sm:p-4 shadow-sm">
          <p className="text-xs sm:text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
            Total Budgeted
          </p>
          <p className="text-xs sm:text-sm font-bold text-blue-900 dark:text-blue-100">
            ${totalBudgeted.toFixed(2)}
          </p>
        </div>
        <div className="bg-red-100 dark:bg-red-900 rounded-lg p-2 sm:p-4 shadow-sm">
          <p className="text-xs sm:text-sm font-medium text-red-800 dark:text-red-300 mb-1">
            Total Spent
          </p>
          <p className="text-xs sm:text-sm font-bold text-red-900 dark:text-red-100">
            ${totalSpent.toFixed(2)}
          </p>
        </div>
        <div
          className={`${
            percentOfBudgetUsed > 100 ? "bg-red-100 dark:bg-red-900" : "bg-green-100 dark:bg-green-900"
          } rounded-lg p-2 sm:p-4 shadow-sm`}
        >
          <p className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
            Budget Usage
          </p>
          <p
            className={`text-xs sm:text-sm font-bold ${
              percentOfBudgetUsed > 100 ? "text-red-900 dark:text-red-100" : "text-green-900 dark:text-green-100"
            }`}
          >
            {percentOfBudgetUsed.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full bg-white dark:bg-slate-700 rounded-lg shadow p-5 mb-6 border border-gray-200 dark:border-gray-600">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          Budget vs. Spending
        </h3>
        <div className="h-80 md:h-96 w-full">
          {isLoading ? (
            <div className="h-full w-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <Bar
              data={chartData}
              options={chartOptions}
              plugins={[ChartDataLabels]}
            />
          )}
        </div>
      </div>

      {/* Category visibility controls */}
      <div
        className={`bg-white dark:bg-slate-700 rounded-lg p-4 shadow border border-gray-200 dark:border-gray-600 ${
          !isOpen ? "w-fit" : "w-full"
        }`}
      >
        <div
          className="flex items-center gap-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Eye className="text-blue-500 dark:text-blue-400" size={20} />
          <h2 className="font-semibold text-gray-800 dark:text-white text-lg">
            Category Visibility
          </h2>
          <div className="ml-2">
            {isOpen ? (
              <ChevronUp size={18} className="text-gray-500 dark:text-gray-400" />
            ) : (
              <ChevronDown size={18} className="text-gray-500 dark:text-gray-400" />
            )}
          </div>
        </div>

        {isOpen && (
          <div className="flex flex-wrap gap-2 items-center mt-4">
            {budgetItems.map((item) => (
              <button
                key={item.id}
                onClick={() => toggleItemVisibility(item.id)}
                className={`px-3 py-1.5 rounded-full flex items-center gap-2 text-sm font-medium transition-all ${
                  item.hidden
                    ? "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-800 dark:hover:text-gray-200"
                    : "bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800 hover:text-blue-700 dark:hover:text-blue-200 ring-1 ring-blue-200 dark:ring-blue-700"
                }`}
              >
                {item.hidden ? (
                  <EyeOff size={14} className="text-gray-500 dark:text-gray-400" />
                ) : (
                  <Eye size={14} className="text-blue-500 dark:text-blue-400" />
                )}
                <span>{item.name}</span>
              </button>
            ))}
            {budgetItems.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 italic px-2 py-4 w-full text-center">
                No budget items found
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default BudgetVsSpentChart;
