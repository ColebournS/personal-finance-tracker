import React, { useState, useEffect, lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import {
  Loader2,
  DollarSign,
  CreditCard,
  List,
  Settings,
  BarChart3,
  Wallet,
} from "lucide-react";
import { AuthProvider } from "./AuthContext";
import { DataProvider, useData } from "./DataContext";
import ProtectedRoute from "./ProtectedRoute";
import { Link } from "react-router-dom";

// Lazy load components for code splitting
const Income = lazy(() => import("./components/Income"));
const Budget = lazy(() => import("./components/Budget"));
const PurchasesList = lazy(() => import("./components/Purchases"));
const RecomendedBudget = lazy(() => import("./components/Charts/RecomendedBudget"));
const CurrentBudget = lazy(() => import("./components/Charts/CurrentBudget"));
const BudgetVsSpent = lazy(() => import("./components/Charts/BudgetVsSpent"));
const SettingsButton = lazy(() => import("./components/SettingsButton"));
const SettingsMobile = lazy(() => import("./components/SettingsMobile"));
const TopNav = lazy(() => import("./components/TopNav"));
const Accounts = lazy(() => import("./components/Accounts"));
const NotFound = lazy(() => import("./components/NotFound"));

const BottomNav = () => {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;
  
  return (
    <div className="fixed bottom-0 left-0 w-full bg-white dark:bg-slate-800 shadow-md border-t dark:border-gray-600 flex justify-around py-3">
      <Link
        to="/income"
        className={`flex flex-col items-center ${
          isActive("/income")
            ? "text-blue-500 dark:text-blue-400"
            : "text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400"
        }`}
      >
        <DollarSign size={24} />
        <span className="text-xs">Income</span>
      </Link>
      <Link
        to="/budget"
        className={`flex flex-col items-center ${
          isActive("/budget")
            ? "text-blue-500 dark:text-blue-400"
            : "text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400"
        }`}
      >
        <CreditCard size={24} />
        <span className="text-xs">Budget</span>
      </Link>
      <Link
        to="/purchases"
        className={`flex flex-col items-center ${
          isActive("/purchases")
            ? "text-blue-500 dark:text-blue-400"
            : "text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400"
        }`}
      >
        <List size={24} />
        <span className="text-xs">Purchases</span>
      </Link>
      <Link
        to="/analytics"
        className={`flex flex-col items-center ${
          isActive("/analytics")
            ? "text-blue-500 dark:text-blue-400"
            : "text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400"
        }`}
      >
        <BarChart3 size={24} />
        <span className="text-xs">Analytics</span>
      </Link>
      <Link
        to="/accounts"
        className={`flex flex-col items-center ${
          isActive("/accounts")
            ? "text-blue-500 dark:text-blue-400"
            : "text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400"
        }`}
      >
        <Wallet size={24} />
        <span className="text-xs">Accounts</span>
      </Link>
      <Link
        to="/settings"
        className={`flex flex-col items-center ${
          isActive("/settings")
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
                    path="/"
                    element={<Navigate to="/Purchases" replace />}
                  />
                  {/* Capitalized routes (primary for mobile) */}
                  <Route
                    path="/Income"
                    element={
                      <div className="bg-white dark:bg-black min-h-[calc(100vh-56px)] pb-24">
                        <div className="flex flex-col gap-2 pt-5 px-4">
                          <Suspense fallback={<LoadingSpinner />}>
                            <Income onTakeHomePayUpdate={setTakeHomePay} />
                            <RecomendedBudget />
                          </Suspense>
                        </div>
                      </div>
                    }
                  />
                  <Route
                    path="/Budget"
                    element={
                      <div className="bg-white dark:bg-black min-h-[calc(100vh-56px)] pb-24">
                        <div className="flex flex-col gap-2 pt-5 px-4">
                          <Suspense fallback={<LoadingSpinner />}>
                            <Budget takeHomePay={takeHomePay} />
                            <CurrentBudget />
                          </Suspense>
                        </div>
                      </div>
                    }
                  />
                  <Route
                    path="/Purchases"
                    element={
                      <div className="bg-white dark:bg-black min-h-[calc(100vh-56px)] pb-24">
                        <div className="flex flex-col gap-4 pt-5 px-4">
                          <Suspense fallback={<LoadingSpinner />}>
                            <PurchasesList />
                          </Suspense>
                        </div>
                      </div>
                    }
                  />
                  <Route
                    path="/Analytics"
                    element={
                      <div className="bg-white dark:bg-black min-h-[calc(100vh-56px)] pb-24">
                        <div className="flex flex-col gap-4 pt-5 px-4">
                          <Suspense fallback={<LoadingSpinner />}>
                            <BudgetVsSpent />
                          </Suspense>
                        </div>
                      </div>
                    }
                  />
                  <Route
                    path="/Settings"
                    element={
                      <div className="bg-white dark:bg-black min-h-[calc(100vh-56px)] pb-24">
                        <div className="flex flex-col gap-4 pt-5 px-4">
                          <Suspense fallback={<LoadingSpinner />}>
                            <SettingsMobile />
                          </Suspense>
                        </div>
                      </div>
                    }
                  />
                  {/* Lowercase routes (redirects for desktop compatibility) */}
                  <Route
                    path="/income"
                    element={<Navigate to="/Income" replace />}
                  />
                  <Route
                    path="/budget"
                    element={<Navigate to="/Budget" replace />}
                  />
                  <Route
                    path="/purchases"
                    element={<Navigate to="/Purchases" replace />}
                  />
                  <Route
                    path="/analytics"
                    element={<Navigate to="/Analytics" replace />}
                  />
                  <Route
                    path="/accounts"
                    element={
                      <div className="bg-white dark:bg-black min-h-[calc(100vh-56px)] pb-24">
                        <div className="flex flex-col gap-4 pt-5 px-4">
                          <Suspense fallback={<LoadingSpinner />}>
                            <Accounts />
                          </Suspense>
                        </div>
                      </div>
                    }
                  />
                  {/* Catch all */}
                  <Route
                    path="*"
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        <NotFound isMobile={true} />
                      </Suspense>
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
                <div className="fixed top-2 right-2 z-50">
                  <Suspense fallback={<div />}>
                    <SettingsButton />
                  </Suspense>
                </div>
                <div className="pt-20 bg-white dark:bg-black min-h-screen">
                  <Routes>
                    <Route
                      path="/"
                      element={<Navigate to="/budget" replace />}
                    />
                    {/* Lowercase routes (primary) */}
                    <Route
                      path="/income"
                      element={
                        <div className="max-w-6xl mx-auto px-6">
                          <div className="flex flex-col gap-6 my-5">
                            <Suspense fallback={<LoadingSpinner />}>
                              <Income onTakeHomePayUpdate={setTakeHomePay} />
                              <RecomendedBudget />
                            </Suspense>
                          </div>
                        </div>
                      }
                    />
                    <Route
                      path="/budget"
                      element={
                        <div className="max-w-4xl mx-auto px-6">
                          <div className="flex flex-col gap-6 my-5">
                            <Suspense fallback={<LoadingSpinner />}>
                              <Budget takeHomePay={takeHomePay} />
                              <CurrentBudget />
                            </Suspense>
                          </div>
                        </div>
                      }
                    />
                    <Route
                      path="/purchases"
                      element={
                        <div className="max-w-4xl mx-auto px-6">
                          <div className="flex flex-col gap-4 my-5">
                            <Suspense fallback={<LoadingSpinner />}>
                              <PurchasesList />
                            </Suspense>
                          </div>
                        </div>
                      }
                    />
                    <Route
                      path="/analytics"
                      element={
                        <div className="max-w-6xl mx-auto px-6">
                          <div className="flex flex-col gap-4 my-5">
                            <Suspense fallback={<LoadingSpinner />}>
                              <BudgetVsSpent />
                            </Suspense>
                          </div>
                        </div>
                      }
                    />
                    <Route
                      path="/accounts"
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
                    {/* Capitalized routes (redirects for mobile compatibility) */}
                    <Route
                      path="/Income"
                      element={<Navigate to="/income" replace />}
                    />
                    <Route
                      path="/Budget"
                      element={<Navigate to="/budget" replace />}
                    />
                    <Route
                      path="/Purchases"
                      element={<Navigate to="/purchases" replace />}
                    />
                    <Route
                      path="/Analytics"
                      element={<Navigate to="/analytics" replace />}
                    />
                    <Route
                      path="/Settings"
                      element={<Navigate to="/budget" replace />}
                    />
                    {/* Catch all */}
                    <Route
                      path="*"
                      element={
                        <Suspense fallback={<LoadingSpinner />}>
                          <NotFound isMobile={false} />
                        </Suspense>
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
