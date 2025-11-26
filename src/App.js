import React, { useState, useEffect, lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import {
  Loader2,
  DollarSign,
  PlusCircle,
  CreditCard,
  List,
  Settings,
} from "lucide-react";
import { AuthProvider } from "./AuthContext";
import { DataProvider, useData } from "./DataContext";
import ProtectedRoute from "./ProtectedRoute";
import { Link } from "react-router-dom";

// Lazy load components for code splitting
const Income = lazy(() => import("./components/Income"));
const Budget = lazy(() => import("./components/Budget"));
const AddPurchase = lazy(() => import("./components/AddPurchase"));
const PurchasesList = lazy(() => import("./components/Purchases"));
const RecomendedBudget = lazy(() => import("./components/Charts/RecomendedBudget"));
const CurrentBudget = lazy(() => import("./components/Charts/CurrentBudget"));
const BudgetVsSpent = lazy(() => import("./components/Charts/BudgetVsSpent"));
const SettingsButton = lazy(() => import("./components/SettingsButton"));
const SettingsMobile = lazy(() => import("./components/SettingsMobile"));
const ThemeToggle = lazy(() => import("./components/ThemeToggle"));
const TopNav = lazy(() => import("./components/TopNav"));
const Accounts = lazy(() => import("./components/Accounts"));

const BottomNav = () => {
  const location = window.location;
  const isActive = (path) => location.pathname === path;
  
  return (
    <div className="fixed bottom-0 left-0 w-full bg-white dark:bg-slate-800 shadow-md border-t dark:border-gray-600 flex justify-around py-3">
      <Link
        to="/personal-finance-tracker/Income"
        className={`flex flex-col items-center ${
          isActive("/personal-finance-tracker/Income")
            ? "text-blue-500 dark:text-blue-400"
            : "text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400"
        }`}
      >
        <DollarSign size={24} />
        <span className="text-xs">Income</span>
      </Link>
      <Link
        to="/personal-finance-tracker/Budget"
        className={`flex flex-col items-center ${
          isActive("/personal-finance-tracker/Budget")
            ? "text-blue-500 dark:text-blue-400"
            : "text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400"
        }`}
      >
        <CreditCard size={24} />
        <span className="text-xs">Budget</span>
      </Link>
      <Link
        to="/personal-finance-tracker"
        className={`flex flex-col items-center ${
          isActive("/personal-finance-tracker")
            ? "text-blue-500 dark:text-blue-400"
            : "text-blue-500 dark:text-blue-400"
        }`}
      >
        <PlusCircle size={32} className="text-blue-500 dark:text-blue-400" />
        <span className="text-xs">Add Purchase</span>
      </Link>
      <Link
        to="/personal-finance-tracker/Purchases"
        className={`flex flex-col items-center ${
          isActive("/personal-finance-tracker/Purchases")
            ? "text-blue-500 dark:text-blue-400"
            : "text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400"
        }`}
      >
        <List size={24} />
        <span className="text-xs">Purchases</span>
      </Link>
      <Link
        to="/personal-finance-tracker/Settings"
        className={`flex flex-col items-center ${
          isActive("/personal-finance-tracker/Settings")
            ? "text-blue-500 dark:text-blue-400"
            : "text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400"
        }`}
      >
        <Settings size={24} />
        <span className="text-xs">Settings</span>
      </Link>
    </div>
  );
};

const LoadingSpinner = () => (
  <div className="h-screen w-full flex items-center justify-center bg-white dark:bg-black">
    <Loader2 className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-spin" />
  </div>
);

function App() {
  const [takeHomePay, setTakeHomePay] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 890);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <AuthProvider>
        <DataProvider>
          <AppContent 
            isMobile={isMobile} 
            takeHomePay={takeHomePay} 
            setTakeHomePay={setTakeHomePay} 
          />
        </DataProvider>
      </AuthProvider>
    </div>
  );
}

function AppContent({ isMobile, takeHomePay, setTakeHomePay }) {
  const { loading: isLoading } = useData();

  return (
    <Router>
      <ProtectedRoute>
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <>
            {isMobile ? (
              <>
                <Routes>
                  <Route
                    path="/personal-finance-tracker"
                    element={
                      <div className="bg-white dark:bg-black pb-20">
                        <div className="flex flex-col gap-4 my-5 mx-4">
                          <Suspense fallback={<LoadingSpinner />}>
                            <AddPurchase />
                          </Suspense>
                        </div>
                      </div>
                    }
                  />
                  <Route
                    path="/personal-finance-tracker/Income"
                    element={
                      <div className="bg-white dark:bg-black pb-20">
                        <div className="flex flex-col gap-4 my-5 mx-4">
                          <Suspense fallback={<LoadingSpinner />}>
                            <Income onTakeHomePayUpdate={setTakeHomePay} />
                            <RecomendedBudget />
                          </Suspense>
                        </div>
                      </div>
                    }
                  />
                  <Route
                    path="/personal-finance-tracker/Budget"
                    element={
                      <div className="bg-white dark:bg-black pb-20">
                        <div className="flex flex-col gap-4 my-5 mx-4">
                          <Suspense fallback={<LoadingSpinner />}>
                            <Budget takeHomePay={takeHomePay} />
                            <CurrentBudget />
                          </Suspense>
                        </div>
                      </div>
                    }
                  />
                  <Route
                    path="/personal-finance-tracker/Purchases"
                    element={
                      <div className="bg-white dark:bg-black pb-20">
                        <div className="flex flex-col gap-4 my-5 mx-4">
                          <Suspense fallback={<LoadingSpinner />}>
                            <BudgetVsSpent />
                            <PurchasesList />
                          </Suspense>
                        </div>
                      </div>
                    }
                  />
                  <Route
                    path="/personal-finance-tracker/Settings"
                    element={
                      <div className="bg-white dark:bg-black pb-20">
                        <div className="flex flex-col gap-4 my-5 mx-4">
                          <Suspense fallback={<LoadingSpinner />}>
                            <SettingsMobile />
                          </Suspense>
                        </div>
                      </div>
                    }
                  />
                </Routes>
                <BottomNav />
              </>
            ) : (
              <>
                <Suspense fallback={<div />}>
                  <TopNav />
                </Suspense>
                <div className="fixed top-2 right-2 z-50 flex gap-2">
                  <Suspense fallback={<div />}>
                    <ThemeToggle />
                    <SettingsButton />
                  </Suspense>
                </div>
                <div className="pt-20 bg-white dark:bg-black min-h-screen">
                  <Routes>
                    <Route
                      path="/personal-finance-tracker"
                      element={<Navigate to="/personal-finance-tracker/budget" replace />}
                    />
                    <Route
                      path="/personal-finance-tracker/income"
                      element={
                        <div className="max-w-6xl mx-auto px-6">
                          <div className="flex flex-col gap-4 my-5">
                            <Suspense fallback={<LoadingSpinner />}>
                              <Income onTakeHomePayUpdate={setTakeHomePay} />
                              <RecomendedBudget />
                            </Suspense>
                          </div>
                        </div>
                      }
                    />
                    <Route
                      path="/personal-finance-tracker/budget"
                      element={
                        <div className="max-w-4xl mx-auto px-6">
                          <div className="flex flex-col gap-4 my-5">
                            <Suspense fallback={<LoadingSpinner />}>
                              <Budget takeHomePay={takeHomePay} />
                              <CurrentBudget />
                            </Suspense>
                          </div>
                        </div>
                      }
                    />
                    <Route
                      path="/personal-finance-tracker/purchases"
                      element={
                        <div className="max-w-4xl mx-auto px-6">
                          <div className="flex flex-col gap-4 my-5">
                            <Suspense fallback={<LoadingSpinner />}>
                              <AddPurchase />
                              <PurchasesList />
                              <BudgetVsSpent />
                            </Suspense>
                          </div>
                        </div>
                      }
                    />
                    <Route
                      path="/personal-finance-tracker/accounts"
                      element={
                        <div className="max-w-7xl mx-auto px-6">
                          <div className="flex flex-col gap-4 my-5">
                            <Suspense fallback={<LoadingSpinner />}>
                              <Accounts />
                            </Suspense>
                          </div>
                        </div>
                      }
                    />
                  </Routes>
                </div>
              </>
            )}
          </>
        )}
      </ProtectedRoute>
    </Router>
  );
}

export default App;
