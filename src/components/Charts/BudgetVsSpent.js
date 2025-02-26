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
import { Calendar, EyeOff, Eye, BarChart3, RefreshCw } from "lucide-react";

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
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [],
  });
  const [userId, setUserId] = useState(null);
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

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          usePointStyle: true,
          font: {
            size: 14,
            weight: "bold",
          },
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleFont: {
          size: 16,
        },
        bodyFont: {
          size: 14,
        },
        padding: 12,
        displayColors: true,
        callbacks: {
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
        align: "top",
        formatter: (value) => (value === 0 ? "" : `$${value.toFixed(2)}`),
        font: {
          weight: "bold",
          size: 12,
        },
        color: (context) =>
          context.datasetIndex === 0 ? "#1e40af" : "#b91c1c",
        padding: 6,
      },
    },
    scales: {
      x: {
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
        ticks: {
          font: {
            weight: "bold",
          },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
        ticks: {
          callback: function (value) {
            return "$" + value;
          },
        },
      },
    },
    animation: {
      duration: 1000,
      easing: "easeOutQuart",
    },
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
    <div className="w-full mx-auto p-6 bg-white shadow-lg rounded-lg">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center">
          <BarChart3 className="mr-2 text-blue-600" size={28} />
          Budget vs Spent
        </h1>
        <button
          onClick={handleRefresh}
          className="bg-blue-100 text-blue-600 p-2 rounded-full hover:bg-blue-200 transition-colors"
          title="Refresh data"
        >
          <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Date selection card */}
      <div className="bg-white rounded-lg p-6 mb-6 shadow border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="text-blue-600" size={20} />
          <h2 className="font-semibold text-gray-800 text-lg">Date Range</h2>
        </div>

        <div className="space-y-5">
          {/* Date inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="fromDate"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                From Date
              </label>
              <input
                type="date"
                id="fromDate"
                name="fromDate"
                value={dateRange.fromDate}
                onChange={handleDateChange}
                className="w-full rounded-md border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label
                htmlFor="toDate"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                To Date
              </label>
              <input
                type="date"
                id="toDate"
                name="toDate"
                value={dateRange.toDate}
                onChange={handleDateChange}
                className="w-full rounded-md border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Quick selection buttons - now always in one row */}
          <div className="flex gap-2 min-w-0">
              <button
                onClick={setCurrentMonth}
                className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded hover:bg-blue-600 hover:text-white transition-colors font-medium whitespace-nowrap flex-1 min-w-0 text-[min(2vw,12px)]"
              >
                Current Month
              </button>
              <button
                onClick={setPreviousMonth}
                className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded hover:bg-blue-600 hover:text-white transition-colors font-medium whitespace-nowrap flex-1 min-w-0 text-[min(2vw,12px)]"
              >
                Previous Month
              </button>
              <button
                onClick={setCurrentYear}
                className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded hover:bg-blue-600 hover:text-white transition-colors font-medium whitespace-nowrap flex-1 min-w-0 text-[min(2vw,12px)]"
              >
                Current Year
              </button>
            </div>
        </div>
      </div>

      {/* Budget summary card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-100 rounded-lg p-4 shadow-sm">
          <p className="text-sm font-medium text-blue-800 mb-1">
            Total Budgeted
          </p>
          <p className="text-2xl font-bold text-blue-900">
            ${totalBudgeted.toFixed(2)}
          </p>
        </div>
        <div className="bg-red-100 rounded-lg p-4 shadow-sm">
          <p className="text-sm font-medium text-red-800 mb-1">Total Spent</p>
          <p className="text-2xl font-bold text-red-900">
            ${totalSpent.toFixed(2)}
          </p>
        </div>
        <div
          className={`${
            percentOfBudgetUsed > 100 ? "bg-red-100" : "bg-green-100"
          } rounded-lg p-4 shadow-sm`}
        >
          <p className="text-sm font-medium text-gray-800 mb-1">Budget Usage</p>
          <p
            className={`text-2xl font-bold ${
              percentOfBudgetUsed > 100 ? "text-red-900" : "text-green-900"
            }`}
          >
            {percentOfBudgetUsed.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-100">
        <div className="h-80 w-full max-w-screen overflow-x-auto">
          {isLoading ? (
            <div className="h-full w-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <Bar data={chartData} options={chartOptions} />
          )}
        </div>
      </div>

      {/* Category visibility controls */}
      <div className="bg-gray-50 rounded-lg p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Eye className="text-gray-600" size={20} />
          <h2 className="font-bold text-gray-700">Category Visibility</h2>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {budgetItems.map((item) => (
            <button
              key={item.id}
              onClick={() => toggleItemVisibility(item.id)}
              className={`px-3 py-1.5 rounded-full flex items-center gap-1 transition-all ${
                item.hidden
                  ? "bg-gray-200 text-gray-600 hover:bg-gray-300"
                  : "bg-blue-100 text-blue-700 hover:bg-blue-200"
              }`}
            >
              {item.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
              {item.name}
            </button>
          ))}
          {budgetItems.length === 0 && (
            <p className="text-gray-500 italic">No budget items found</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default BudgetVsSpentChart;
