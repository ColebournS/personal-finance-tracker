import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import {
  Loader2,
  DollarSign,
  PlusCircle,
  CreditCard,
  List,
  Settings,
} from "lucide-react";
import { AuthProvider } from "./AuthContext";
import ProtectedRoute from "./ProtectedRoute";
import Income from "./components/Income";
import Budget from "./components/Budget";
import AddPurchase from "./components/AddPurchase";
import PurchasesList from "./components/Purchases";
import RecomendedBudget from "./components/Charts/RecomendedBudget";
import CurrentBudget from "./components/Charts/CurrentBudget";
import BudgetVsSpent from "./components/Charts/BudgetVsSpent";
import SettingsButton from "./components/SettingsButton";
import SettingsMobile from "./components/SettingsMobile";
import supabase from "./supabaseClient";
import { Link } from "react-router-dom";

const BottomNav = () => (
  <div className="fixed bottom-0 left-0 w-full bg-white shadow-md border-t flex justify-around py-3">
    <Link
      to="/personal-finance-tracker/Income"
      className="flex flex-col items-center text-gray-600 hover:text-blue-500"
    >
      <DollarSign size={24} />
      <span className="text-xs">Income</span>
    </Link>
    <Link
      to="/personal-finance-tracker/Budget"
      className="flex flex-col items-center text-gray-600 hover:text-blue-500"
    >
      <CreditCard size={24} />
      <span className="text-xs">Budget</span>
    </Link>
    <Link
      to="/personal-finance-tracker"
      className="flex flex-col items-center text-blue-500"
    >
      <PlusCircle size={32} className="text-blue-500" />
      <span className="text-xs">Add Purchase</span>
    </Link>
    <Link
      to="/personal-finance-tracker/Purchases"
      className="flex flex-col items-center text-gray-600 hover:text-blue-500"
    >
      <List size={24} />
      <span className="text-xs">Purchases</span>
    </Link>
    <Link
      to="/personal-finance-tracker/Settings"
      className="flex flex-col items-center text-gray-600 hover:text-blue-500"
    >
      <Settings size={24} />
      <span className="text-xs">Settings</span>
    </Link>
  </div>
);

const LoadingSpinner = () => (
  <div className="h-screen w-full flex items-center justify-center bg-blue-100">
    <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
  </div>
);

function App() {
  const [takeHomePay, setTakeHomePay] = useState(0);
  const [columns, setColumns] = useState(3);
  const [hideIncome, setHideIncome] = useState(true);
  const [hideRecommendedBudget, setHideRecommendedBudget] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState(null);

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
  }, []);

  useEffect(() => {
    if (!userId) return;

    const fetchProfileSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("hide_income, hide_recommended_budget")
          .eq("id", userId)
          .single();

        if (error) throw error;

        if (data) {
          // Use nullish coalescing to properly handle boolean values
          setHideIncome(data.hide_income ?? true);
          setHideRecommendedBudget(data.hide_recommended_budget ?? true);
        }
      } catch (err) {
        console.error("Error fetching profile settings:", err);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchProfileSettings();

    // Set up real-time subscription
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
        (payload) => {
          console.log("Profile change received:", payload);
          const newData = payload.new;
          if (newData) {
            setHideIncome(newData.hide_income ?? true);
            setHideRecommendedBudget(newData.hide_recommended_budget ?? true);
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("Successfully subscribed to profile changes");
        } else {
          console.error("Failed to subscribe to profile changes:", status);
        }
      });

    return () => {
      profileChannel.unsubscribe();
    };
  }, [userId]);


  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setColumns(width < 890 ? 1 : width < 1100 ? 2 : 3);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const gridClasses = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
  };
  
  return (
    <div className="min-h-screen bg-blue-100">
      <AuthProvider>
        <Router>
          <ProtectedRoute>
            {isLoading ? (
              <LoadingSpinner />
            ) : (
              <>
                {columns === 1 ? (
                  <>
                    <Routes>
                      <Route
                        path="/personal-finance-tracker"
                        element={
                          <div className={`grid 1 bg-blue-100 pb-20`}>
                            <div className="flex flex-col gap-4 my-5 mx-4">
                              <AddPurchase />
                            </div>
                          </div>
                        }
                      />
                      <Route
                        path="/personal-finance-tracker/Income"
                        element={
                          <div className={`grid 1 bg-blue-100 pb-20`}>
                            <div className="flex flex-col gap-4 my-5 mx-4">
                              <Income onTakeHomePayUpdate={setTakeHomePay} />
                              <RecomendedBudget />
                            </div>
                          </div>
                        }
                      />
                      <Route
                        path="/personal-finance-tracker/Budget"
                        element={
                          <div className={`grid 1 bg-blue-100 pb-20`}>
                            <div className="flex flex-col gap-4 my-5 mx-4">
                              <Budget takeHomePay={takeHomePay} />
                              <CurrentBudget />
                            </div>
                          </div>
                        }
                      />
                      <Route
                        path="/personal-finance-tracker/Purchases"
                        element={
                          <div className={`grid 1 bg-blue-100 pb-20`}>
                            <div className="flex flex-col gap-4 my-5 mx-4">
                              <PurchasesList />
                              <BudgetVsSpent />
                            </div>
                          </div>
                        }
                      />
                      <Route
                        path="/personal-finance-tracker/Settings"
                        element={
                          <div className={`grid 1 bg-blue-100 pb-20`}>
                            <div className="flex flex-col gap-4 my-5 mx-4">
                              <SettingsMobile />
                            </div>
                          </div>
                        }
                      />
                    </Routes>
                    <BottomNav />
                  </>
                ) : (
                  <>
                    <SettingsButton />
                    <div className={`grid ${gridClasses[columns]} bg-blue-100`}>
                      {(!hideIncome || !hideRecommendedBudget) && (
                        <div className="flex flex-col gap-4 my-5 mx-4">
                          {!hideIncome && (
                            <Income onTakeHomePayUpdate={setTakeHomePay} />
                          )}
                          {!hideRecommendedBudget && <RecomendedBudget />}
                        </div>
                      )}
                      <div className="flex flex-col gap-4 my-5 mx-4">
                        <Budget takeHomePay={takeHomePay} />
                        <CurrentBudget />
                      </div>

                      <div className="flex flex-col gap-4 my-5 mx-4">
                        <AddPurchase />
                        <PurchasesList />
                        <BudgetVsSpent />
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </ProtectedRoute>
        </Router>
      </AuthProvider>
    </div>
  );
}

export default App;
