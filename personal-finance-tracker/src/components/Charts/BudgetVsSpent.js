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
      return;
    }

    setBudgetItems(items);

    // Update hiddenItems state based on database values
    const hiddenSet = new Set(
      items.filter((item) => item.hidden).map((item) => item.id)
    );
    setHiddenItems(hiddenSet);

    const visibleItems = items.filter((item) => !item.hidden);

    const chartConfig = {
      labels: visibleItems.map((item) => item.name),
      datasets: [
        {
          label: "Budgeted",
          data: visibleItems.map((item) => item.budget),
          backgroundColor: "#60a5fa",
        },
        {
          label: "Spent",
          data: visibleItems.map((item) =>
            item.purchases.reduce((sum, purchase) => sum + purchase.cost, 0)
          ),
          backgroundColor: "#f87171",
        },
      ],
    };

    setChartData(chartConfig);
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
  }, [userId]);

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
    const data = await fetchBudgetData();
    setChartData(data);
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      datalabels: {
        anchor: "end",
        align: "bottom",
        formatter: (value) => (value === 0 ? "" : Math.round(value)),
        font: {
          weight: "bold",
        },
      },
    },
  };

  return (
    <div className="w-full mx-auto p-6 bg-white shadow-lg rounded-lg">
      <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
        Budget vs Spent
      </h1>

      <div className="flex items-center space-x-4 mb-4">
        <div>
          <label
            htmlFor="fromDate"
            className="block text-sm font-medium text-gray-700"
          >
            From Date
          </label>
          <input
            type="date"
            id="fromDate"
            name="fromDate"
            value={dateRange.fromDate}
            onChange={handleDateChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          />
        </div>
        <div>
          <label
            htmlFor="toDate"
            className="block text-sm font-medium text-gray-700"
          >
            To Date
          </label>
          <input
            type="date"
            id="toDate"
            name="toDate"
            value={dateRange.toDate}
            onChange={handleDateChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          />
        </div>
      </div>
      <div className="w-full max-w-screen overflow-x-auto">
        <Bar data={chartData} options={chartOptions} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <div className={`px-3 py-1 rounded text-gray-600`}>Hide Groups:</div>
        {budgetItems.map((item) => (
          <button
            key={item.id}
            onClick={() => toggleItemVisibility(item.id)}
            className={`px-3 py-1 rounded ${
              item.hidden
                ? "bg-gray-200 text-gray-600"
                : "bg-blue-500 text-white"
            }`}
          >
            {item.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export default BudgetVsSpentChart;
