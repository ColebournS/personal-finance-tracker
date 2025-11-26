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
import { decryptValue } from "../../utils/encryption";
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

    // Decrypt budget values for each item
    const decryptedItems = items.map(item => ({
      ...item,
      budget: decryptValue(item.budget, userId),
    }));

    setBudgetItems(decryptedItems);

    // Update hiddenItems state based on database values
    const hiddenSet = new Set(
      decryptedItems.filter((item) => item.hidden).map((item) => item.id)
    );
    setHiddenItems(hiddenSet);

    const visibleItems = decryptedItems.filter((item) => !item.hidden);

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
    <div className="w-full mx-auto p-6 bg-white dark:bg-slate-800 shadow-xl rounded-xl border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
            <BarChart3 className="text-white" size={24} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
            Budget vs Spent
          </h1>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg transition-all shadow-md hover:shadow-lg font-medium"
          title="Refresh data"
        >
          <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>
      {/* Date Range Selector */}
      <div className="bg-white dark:bg-slate-700 rounded-xl p-6 mb-8 shadow-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-5">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 shadow-sm">
            <Calendar size={20} />
          </div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Date Range</h2>
        </div>

        <div className="space-y-5">
          {/* Date inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="fromDate"
                className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2"
              >
                From Date
              </label>
              <input
                type="date"
                id="fromDate"
                name="fromDate"
                value={dateRange.fromDate}
                onChange={handleDateChange}
                className="w-full rounded-lg border-2 border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white dark:bg-slate-600 text-gray-800 dark:text-white shadow-sm"
              />
            </div>
            <div>
              <label
                htmlFor="toDate"
                className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2"
              >
                To Date
              </label>
              <input
                type="date"
                id="toDate"
                name="toDate"
                value={dateRange.toDate}
                onChange={handleDateChange}
                className="w-full rounded-lg border-2 border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white dark:bg-slate-600 text-gray-800 dark:text-white shadow-sm"
              />
            </div>
          </div>

          {/* Quick selection buttons */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={setCurrentMonth}
              className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 text-blue-700 dark:text-blue-300 px-4 py-3 rounded-lg hover:from-blue-500 hover:to-blue-600 hover:text-white dark:hover:from-blue-600 dark:hover:to-blue-700 transition-all font-semibold shadow-sm hover:shadow-md border border-blue-200 dark:border-blue-700"
            >
              <span className="hidden sm:inline">Current Month</span>
              <span className="sm:hidden">This Month</span>
            </button>
            <button
              onClick={setPreviousMonth}
              className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 text-blue-700 dark:text-blue-300 px-4 py-3 rounded-lg hover:from-blue-500 hover:to-blue-600 hover:text-white dark:hover:from-blue-600 dark:hover:to-blue-700 transition-all font-semibold shadow-sm hover:shadow-md border border-blue-200 dark:border-blue-700"
            >
              <span className="hidden sm:inline">Previous Month</span>
              <span className="sm:hidden">Last Month</span>
            </button>
            <button
              onClick={setCurrentYear}
              className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 text-blue-700 dark:text-blue-300 px-4 py-3 rounded-lg hover:from-blue-500 hover:to-blue-600 hover:text-white dark:hover:from-blue-600 dark:hover:to-blue-700 transition-all font-semibold shadow-sm hover:shadow-md border border-blue-200 dark:border-blue-700"
            >
              <span className="hidden sm:inline">Current Year</span>
              <span className="sm:hidden">This Year</span>
            </button>
          </div>
        </div>
      </div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-xl border-2 border-blue-200 dark:border-blue-700 shadow-sm">
          <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
            Total Budgeted
          </div>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            ${new Intl.NumberFormat('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(totalBudgeted)}
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-6 rounded-xl border-2 border-orange-200 dark:border-orange-700 shadow-sm">
          <div className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-2">
            Total Spent
          </div>
          <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
            ${new Intl.NumberFormat('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(totalSpent)}
          </div>
        </div>
        
        <div className={`bg-gradient-to-br ${
          percentOfBudgetUsed > 100 
            ? 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-700' 
            : 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700'
        } p-6 rounded-xl border-2 shadow-sm`}>
          <div className={`text-sm font-medium mb-2 ${
            percentOfBudgetUsed > 100 
              ? 'text-red-700 dark:text-red-300' 
              : 'text-green-700 dark:text-green-300'
          }`}>
            Budget Usage
          </div>
          <div className={`text-3xl font-bold ${
            percentOfBudgetUsed > 100 
              ? 'text-red-600 dark:text-red-400' 
              : 'text-green-600 dark:text-green-400'
          }`}>
            {percentOfBudgetUsed.toFixed(1)}%
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
              <div 
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  percentOfBudgetUsed > 100 
                    ? 'bg-red-600 dark:bg-red-500' 
                    : 'bg-green-600 dark:bg-green-500'
                }`}
                style={{ width: `${Math.min(percentOfBudgetUsed, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full bg-white dark:bg-slate-700 rounded-xl shadow-xl p-6 mb-8 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-5">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 shadow-sm">
            <BarChart3 size={20} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">
            Budget vs. Spending Comparison
          </h3>
        </div>
        <div className="h-80 md:h-96 w-full">
          {isLoading ? (
            <div className="h-full w-full flex flex-col items-center justify-center gap-4">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 dark:border-blue-800 dark:border-t-blue-400"></div>
              <p className="text-gray-500 dark:text-gray-400 font-medium">Loading chart data...</p>
            </div>
          ) : chartData.labels.length === 0 ? (
            <div className="h-full w-full flex flex-col items-center justify-center gap-4">
              <BarChart3 className="w-16 h-16 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">No budget data to display</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm">Add budget items to see the comparison</p>
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

      {/* Category Visibility Controls */}
      <div className="bg-white dark:bg-slate-700 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button
          className="w-full flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 shadow-sm">
              <Eye size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              Category Visibility
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              ({budgetItems.filter(item => !item.hidden).length} of {budgetItems.length} visible)
            </span>
          </div>
          <div className="p-2 rounded-lg bg-gray-100 dark:bg-slate-600">
            {isOpen ? (
              <ChevronUp size={20} className="text-gray-600 dark:text-gray-300" />
            ) : (
              <ChevronDown size={20} className="text-gray-600 dark:text-gray-300" />
            )}
          </div>
        </button>

        {isOpen && (
          <div className="px-6 pb-6 border-t border-gray-200 dark:border-gray-600 pt-5">
            {budgetItems.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {budgetItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => toggleItemVisibility(item.id)}
                    className={`px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold transition-all shadow-sm hover:shadow-md ${
                      item.hidden
                        ? "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border-2 border-gray-300 dark:border-gray-600"
                        : "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 text-blue-700 dark:text-blue-300 hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-800/40 dark:hover:to-blue-700/40 border-2 border-blue-300 dark:border-blue-600"
                    }`}
                  >
                    {item.hidden ? (
                      <EyeOff size={16} className="text-gray-500 dark:text-gray-400" />
                    ) : (
                      <Eye size={16} className="text-blue-600 dark:text-blue-400" />
                    )}
                    <span>{item.name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 dark:bg-slate-600 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-500">
                <BarChart3 className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">No budget items found</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Create budget items to track spending</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default BudgetVsSpentChart;
