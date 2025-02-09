import React, { useState, useEffect } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import supabase from "../../supabaseClient";

ChartJS.register(ArcElement, Tooltip, Legend);

function CurrentBudget() {
  const [income, setIncome] = useState(0);
  const [groups, setGroups] = useState([]);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    // Get the current user's ID when component mounts
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

  const fetchData = async () => {
    if (userId) {
      fetchIncomeData();

      const { data: groupsData, error: groupsError } = await supabase
        .from("budget_groups")
        .select(
          `
          id,
          name,
          budget_items (
            id,
            name,
            budget
          )
        `
        )
        .eq("user_id", userId)
        .order("name");

      if (groupsError) {
        console.error("Error fetching budget groups:", groupsError);
      } else {
        setGroups(groupsData);
      }
    }
  };

  useEffect(() => {
    if (userId) {
      fetchData();

      const budgetGroupsSubscription = supabase
        .channel(`budget_groups_${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "budget_groups",
            match: { user_id: userId },
          },
          fetchData
        )
        .subscribe();

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
          fetchData
        )
        .subscribe();

      const incomeChannel = supabase
        .channel(`income_changes_${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "income",
            match: { user_id: userId },
          },
          (payload) => {
            if (payload.new?.monthlyTakeHome !== undefined) {
              setIncome(payload.new.monthlyTakeHome || 0);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(budgetGroupsSubscription);
        supabase.removeChannel(budgetItemsSubscription);
        supabase.removeChannel(incomeChannel);
      };
    }
  }, [userId]);

  const fetchIncomeData = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("income")
        .select("monthlyTakeHome")
        .eq("user_id", userId)
        .single();
      if (error) {
        console.error("Error fetching income data:", error);
        return;
      }
      if (data?.monthlyTakeHome !== undefined) {
        setIncome(data.monthlyTakeHome || 0);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    }
  };

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
