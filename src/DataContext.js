import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "./AuthContext";
import supabase from "./supabaseClient";
import { decryptValue } from "./utils/encryption";

const DataContext = createContext({});

export const DataProvider = ({ children }) => {
  const { user } = useAuth();
  const [userId, setUserId] = useState(null);
  const [income, setIncome] = useState({});
  const [budgetGroups, setBudgetGroups] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [profileSettings, setProfileSettings] = useState({
    hideIncome: true,
    hideRecommendedBudget: true,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Retry wrapper for database queries
  const retryQuery = useCallback(async (queryFn, maxRetries = 3, delay = 1000) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await queryFn();
      } catch (err) {
        if (attempt === maxRetries) {
          throw err;
        }
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }, []);

  // Get userId from authenticated user
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();
        if (error) throw error;
        if (user) {
          setUserId(user.id);
        }
      } catch (err) {
        console.error("Error getting user:", err);
      }
    };
    getCurrentUser();
  }, [user]);

  // Fetch functions with useCallback to prevent stale closures
  const fetchIncome = useCallback(async () => {
    if (!userId) return;

    try {
      await retryQuery(async () => {
        const { data, error } = await supabase
          .from("income")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (error) {
          console.error("Error fetching income data:", error);
          throw new Error(error.message);
        } else if (data) {
          // Decrypt sensitive income fields
          const decryptedIncome = {
            ...data,
            yearlySalary: decryptValue(data.yearlySalary, userId),
            retirementContribution: decryptValue(data.retirementContribution, userId),
            employerMatch: decryptValue(data.employerMatch, userId),
            monthlyTakeHome: decryptValue(data.monthlyTakeHome, userId),
          };
          setIncome(decryptedIncome);
        }
      });
    } catch (err) {
      console.error("Error:", err);
      setError(err.message);
    }
  }, [userId, retryQuery]);

  const fetchBudgetGroups = useCallback(async () => {
    if (!userId) return;

    try {
      await retryQuery(async () => {
        const { data, error } = await supabase
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

        if (error) {
          console.error("Error fetching budget groups:", error);
          throw new Error(error.message);
        } else {
          // Decrypt budget values for each budget item
          const decryptedBudgetGroups = (data || []).map(group => ({
            ...group,
            budget_items: (group.budget_items || []).map(item => ({
              ...item,
              budget: decryptValue(item.budget, userId),
            })),
          }));
          setBudgetGroups(decryptedBudgetGroups);
        }
      });
    } catch (err) {
      console.error("Error:", err);
      setError(err.message);
    }
  }, [userId, retryQuery]);

  const fetchPurchases = useCallback(async () => {
    if (!userId) return;

    try {
      await retryQuery(async () => {
        const { data, error } = await supabase
          .from("purchases")
          .select(
            `
            id,
            item_name,
            cost,
            timestamp,
            budget_item_id,
            budget_items (
              id,
              name,
              budget,
              budget_groups (
                id,
                name
              )
            )
          `
          )
          .eq("user_id", userId)
          .order("timestamp", { ascending: false });

        if (error) {
          console.error("Error fetching purchases:", error);
          throw new Error(error.message);
        } else {
          // Decrypt budget values in nested budget_items
          const decryptedPurchases = (data || []).map(purchase => ({
            ...purchase,
            budget_items: purchase.budget_items ? {
              ...purchase.budget_items,
              budget: decryptValue(purchase.budget_items.budget, userId),
            } : null,
          }));
          setPurchases(decryptedPurchases);
        }
      });
    } catch (err) {
      console.error("Error:", err);
      setError(err.message);
    }
  }, [userId, retryQuery]);

  const fetchProfileSettings = useCallback(async () => {
    if (!userId) return;

    try {
      await retryQuery(async () => {
        const { data, error } = await supabase
          .from("profiles")
          .select("hide_income, hide_recommended_budget")
          .eq("id", userId)
          .single();

        if (error) {
          console.error("Error fetching profile settings:", error);
          throw new Error(error.message);
        } else if (data) {
          setProfileSettings({
            hideIncome: data.hide_income ?? true,
            hideRecommendedBudget: data.hide_recommended_budget ?? true,
          });
        }
      });
    } catch (err) {
      console.error("Error:", err);
      setError(err.message);
    }
  }, [userId, retryQuery]);

  // Fetch all data when userId is available
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchAllData = async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([
          fetchIncome(),
          fetchBudgetGroups(),
          fetchPurchases(),
          fetchProfileSettings(),
        ]);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [userId, fetchIncome, fetchBudgetGroups, fetchPurchases, fetchProfileSettings]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!userId) return;

    // Income subscription
    const incomeChannel = supabase
      .channel(`income_changes_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "income",
          filter: `user_id=eq.${userId}`,
        },
        fetchIncome
      )
      .subscribe();

    // Budget groups subscription
    const budgetGroupsChannel = supabase
      .channel(`budget_groups_changes_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "budget_groups",
          filter: `user_id=eq.${userId}`,
        },
        fetchBudgetGroups
      )
      .subscribe();

    // Budget items subscription
    const budgetItemsChannel = supabase
      .channel(`budget_items_changes_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "budget_items",
          filter: `user_id=eq.${userId}`,
        },
        fetchBudgetGroups
      )
      .subscribe();

    // Purchases subscription
    const purchasesChannel = supabase
      .channel(`purchases_changes_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "purchases",
          filter: `user_id=eq.${userId}`,
        },
        fetchPurchases
      )
      .subscribe();

    // Profile settings subscription
    const profileChannel = supabase
      .channel(`profiles_changes_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`,
        },
        fetchProfileSettings
      )
      .subscribe();

    return () => {
      incomeChannel.unsubscribe();
      budgetGroupsChannel.unsubscribe();
      budgetItemsChannel.unsubscribe();
      purchasesChannel.unsubscribe();
      profileChannel.unsubscribe();
    };
  }, [userId, fetchIncome, fetchBudgetGroups, fetchPurchases, fetchProfileSettings]);

  // Refetch function for manual updates
  const refetchAll = useCallback(async () => {
    setError(null);
    await Promise.all([
      fetchIncome(),
      fetchBudgetGroups(),
      fetchPurchases(),
      fetchProfileSettings(),
    ]);
  }, [fetchIncome, fetchBudgetGroups, fetchPurchases, fetchProfileSettings]);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      userId,
      income,
      budgetGroups,
      purchases,
      profileSettings,
      loading,
      error,
      refetchIncome: fetchIncome,
      refetchBudgetGroups: fetchBudgetGroups,
      refetchPurchases: fetchPurchases,
      refetchAll,
    }),
    [
      userId,
      income,
      budgetGroups,
      purchases,
      profileSettings,
      loading,
      error,
      fetchIncome,
      fetchBudgetGroups,
      fetchPurchases,
      refetchAll,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
  return useContext(DataContext);
};

