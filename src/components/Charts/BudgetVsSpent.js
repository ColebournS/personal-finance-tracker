import React, { useState, useEffect, useCallback } from "react";
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
  X,
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
  const [isCategoryVisibilityOpen, setIsCategoryVisibilityOpen] = useState(false);
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
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

  const fetchBudgetData = useCallback(async () => {
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
        is_active,
        purchases!inner (cost, timestamp, is_deleted)
        `
      )
      .eq("user_id", userId)
      .eq("purchases.is_deleted", false)
      .gte("purchases.timestamp", dateRange.fromDate)
      .lte("purchases.timestamp", dateRange.toDate);

    if (budgetError) {
      console.error("Budget fetch error:", budgetError);
      setIsLoading(false);
      return;
    }

    // Filter out inactive budget items and decrypt budget values
    const activeItems = (items || []).filter(item => item.is_active !== false);
    const decryptedItems = activeItems.map(item => ({
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
  }, [userId, dateRange]);

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
  }, [userId, dateRange, fetchBudgetData]);

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
    <div className="w-full mx-auto space-y-3 md:space-y-4">

      {/* Date Range Popup Modal */}
      {isDateRangeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm" onClick={() => setIsDateRangeOpen(false)}>
          <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-xl p-4 md:p-6 shadow-2xl border border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 md:mb-5">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="inline-flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 shadow-sm">
                  <Calendar size={16} className="md:w-5 md:h-5" />
                </div>
                <h2 className="text-base md:text-xl font-bold text-gray-800 dark:text-white">Date Range</h2>
              </div>
              <button
                onClick={() => setIsDateRangeOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3 md:space-y-4">
              {/* Date inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label
                    htmlFor="fromDate"
                    className="block text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2"
                  >
                    From Date
                  </label>
                  <input
                    type="date"
                    id="fromDate"
                    name="fromDate"
                    value={dateRange.fromDate}
                    onChange={handleDateChange}
                    className="w-full rounded-lg border-2 border-gray-300 dark:border-gray-600 px-3 py-2 md:px-4 md:py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white dark:bg-slate-700 text-gray-800 dark:text-white shadow-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="toDate"
                    className="block text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2"
                  >
                    To Date
                  </label>
                  <input
                    type="date"
                    id="toDate"
                    name="toDate"
                    value={dateRange.toDate}
                    onChange={handleDateChange}
                    className="w-full rounded-lg border-2 border-gray-300 dark:border-gray-600 px-3 py-2 md:px-4 md:py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white dark:bg-slate-700 text-gray-800 dark:text-white shadow-sm"
                  />
                </div>
              </div>

              {/* Quick selection buttons */}
              <div className="grid grid-cols-3 gap-2 md:gap-3">
                <button
                  onClick={() => {
                    setCurrentMonth();
                    setIsDateRangeOpen(false);
                  }}
                  className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 text-blue-700 dark:text-blue-300 px-3 py-2.5 md:px-4 md:py-3 rounded-lg hover:from-blue-500 hover:to-blue-600 hover:text-white dark:hover:from-blue-600 dark:hover:to-blue-700 transition-all font-semibold shadow-sm hover:shadow-md border border-blue-200 dark:border-blue-700 text-xs md:text-base"
                >
                  Current Month
                </button>
                <button
                  onClick={() => {
                    setPreviousMonth();
                    setIsDateRangeOpen(false);
                  }}
                  className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 text-blue-700 dark:text-blue-300 px-3 py-2.5 md:px-4 md:py-3 rounded-lg hover:from-blue-500 hover:to-blue-600 hover:text-white dark:hover:from-blue-600 dark:hover:to-blue-700 transition-all font-semibold shadow-sm hover:shadow-md border border-blue-200 dark:border-blue-700 text-xs md:text-base"
                >
                  Previous Month
                </button>
                <button
                  onClick={() => {
                    setCurrentYear();
                    setIsDateRangeOpen(false);
                  }}
                  className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 text-blue-700 dark:text-blue-300 px-3 py-2.5 md:px-4 md:py-3 rounded-lg hover:from-blue-500 hover:to-blue-600 hover:text-white dark:hover:from-blue-600 dark:hover:to-blue-700 transition-all font-semibold shadow-sm hover:shadow-md border border-blue-200 dark:border-blue-700 text-xs md:text-base"
                >
                  Current Year
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-3 md:mb-4">
        <div className="bg-blue-50/50 dark:bg-blue-900/10 p-2 md:p-4 rounded-lg">
          <div className="text-[10px] md:text-xs font-medium text-blue-600 dark:text-blue-400 mb-0.5 md:mb-1 uppercase tracking-wide">
            Budgeted
          </div>
          <div className="text-sm md:text-2xl font-bold text-blue-700 dark:text-blue-300">
            ${new Intl.NumberFormat('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(totalBudgeted)}
          </div>
        </div>
        
        <div className="bg-orange-50/50 dark:bg-orange-900/10 p-2 md:p-4 rounded-lg">
          <div className="text-[10px] md:text-xs font-medium text-orange-600 dark:text-orange-400 mb-0.5 md:mb-1 uppercase tracking-wide">
            Spent
          </div>
          <div className="text-sm md:text-2xl font-bold text-orange-700 dark:text-orange-300">
            ${new Intl.NumberFormat('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(totalSpent)}
          </div>
        </div>
        
        <div className={`p-2 md:p-4 rounded-lg ${
          percentOfBudgetUsed > 100 
            ? 'bg-red-50/50 dark:bg-red-900/10' 
            : 'bg-green-50/50 dark:bg-green-900/10'
        }`}>
          <div className={`text-[10px] md:text-xs font-medium mb-0.5 md:mb-1 uppercase tracking-wide ${
            percentOfBudgetUsed > 100 
              ? 'text-red-600 dark:text-red-400' 
              : 'text-green-600 dark:text-green-400'
          }`}>
            Usage
          </div>
          <div className={`text-sm md:text-2xl font-bold ${
            percentOfBudgetUsed > 100 
              ? 'text-red-700 dark:text-red-300' 
              : 'text-green-700 dark:text-green-300'
          }`}>
            {percentOfBudgetUsed.toFixed(1)}%
          </div>
          <div className="mt-1 md:mt-2">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 md:h-1.5 overflow-hidden">
              <div 
                className={`h-1 md:h-1.5 rounded-full transition-all duration-500 ${
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

      {/* Budget vs. Spending Comparison Chart Card */}
      <div className="w-full bg-white dark:bg-slate-800 rounded-xl shadow-xl p-3 md:p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3 md:mb-5">
          <div className="flex items-center gap-1.5 md:gap-3">
            <div className="inline-flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-lg bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 shadow-sm">
              <BarChart3 size={16} className="md:w-5 md:h-5" />
            </div>
            <h3 className="text-sm md:text-xl font-bold text-gray-800 dark:text-white">
              Budget vs. Spending
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDateRangeOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-all border border-blue-200 dark:border-blue-700 shadow-sm hover:shadow-md"
              title="Change date range"
            >
              <Calendar size={14} className="md:w-4 md:h-4" />
              <span className="text-xs md:text-sm font-medium">Date</span>
            </button>
            <button
              onClick={() => setIsCategoryVisibilityOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg transition-all border border-indigo-200 dark:border-indigo-700 shadow-sm hover:shadow-md"
              title="Toggle category visibility"
            >
              <Eye size={14} className="md:w-4 md:h-4" />
              <span className="text-xs md:text-sm font-medium">Categories</span>
            </button>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 md:p-4">
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
      </div>
      
      {/* Category Visibility Popup Modal */}
      {isCategoryVisibilityOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm" onClick={() => setIsCategoryVisibilityOpen(false)}>
          <div className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-xl p-4 md:p-6 shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 md:mb-5">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="inline-flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 shadow-sm">
                  <Eye size={16} className="md:w-5 md:h-5" />
                </div>
                <div>
                  <h2 className="text-base md:text-xl font-bold text-gray-800 dark:text-white">
                    Category Visibility
                  </h2>
                  <span className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium">
                    {budgetItems.filter(item => !item.hidden).length} of {budgetItems.length} visible
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsCategoryVisibilityOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>
            
            {budgetItems.length > 0 ? (
                <div className="flex flex-wrap gap-2 md:gap-3">
                  {budgetItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => toggleItemVisibility(item.id)}
                      className={`px-3 py-2 md:px-4 md:py-2.5 rounded-lg flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-semibold transition-all shadow-sm hover:shadow-md ${
                        item.hidden
                          ? "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border-2 border-gray-300 dark:border-gray-600"
                          : "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 text-blue-700 dark:text-blue-300 hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-800/40 dark:hover:to-blue-700/40 border-2 border-blue-300 dark:border-blue-600"
                      }`}
                    >
                      {item.hidden ? (
                        <EyeOff size={14} className="md:w-4 md:h-4 text-gray-500 dark:text-gray-400" />
                      ) : (
                        <Eye size={14} className="md:w-4 md:h-4 text-blue-600 dark:text-blue-400" />
                      )}
                      <span>{item.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 md:py-8 bg-gray-50 dark:bg-slate-700 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-500">
                  <BarChart3 className="w-10 h-10 md:w-12 md:h-12 mx-auto text-gray-400 dark:text-gray-500 mb-2 md:mb-3" />
                  <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 font-medium">No budget items found</p>
                  <p className="text-xs md:text-sm text-gray-400 dark:text-gray-500 mt-1">Create budget items to track spending</p>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
}

export default BudgetVsSpentChart;
