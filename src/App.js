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
  TrendingUp,
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
const Projections = lazy(() => import("./components/Projections"));
const NotFound = lazy(() => import("./components/NotFound"));

const BottomNav = () => {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;
  const [isVisible, setIsVisible] = React.useState(true);
  const [lastScrollY, setLastScrollY] = React.useState(0);
  
  React.useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < lastScrollY || currentScrollY < 10) {
        // Scrolling up or at top - show navbar
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 50) {
        // Scrolling down and past threshold - hide navbar
        setIsVisible(false);
      }
      
      setLastScrollY(currentScrollY);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Scroll active button to center of screen
  React.useEffect(() => {
    const activeButton = document.querySelector('[data-active="true"]');
    if (activeButton) {
      const container = activeButton.parentElement;
      if (container) {
        const containerWidth = container.offsetWidth;
        const buttonLeft = activeButton.offsetLeft;
        const buttonWidth = activeButton.offsetWidth;
        
        // Calculate scroll position to put button in center
        const scrollLeft = buttonLeft - (containerWidth / 2) + (buttonWidth / 2);
        
        container.scrollTo({
          left: scrollLeft,
          behavior: 'smooth'
        });
      }
    }
  }, [location.pathname]);
  
  return (
    <div className={`fixed top-0 left-0 w-full overflow-x-auto flex justify-around py-3 z-50 gap-2 px-2 ml-4 transition-transform duration-300 ${
      isVisible ? 'translate-y-0' : '-translate-y-full'
    }`}>
      <Link
        to="/income"
        data-active={isActive("/income")}
        className={`flex items-center justify-center px-3 py-1 rounded-full border border-gray-400/30 dark:border-gray-500/30 ${
          isActive("/income")
            ? "bg-black dark:bg-white text-white dark:text-black"
            : "bg-white dark:bg-black text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400"
        }`}
      >
        <span className="text-sm font-medium whitespace-nowrap">Income</span>
      </Link>
      <Link
        to="/budget"
        data-active={isActive("/budget")}
        className={`flex items-center justify-center px-3 py-1 rounded-full border border-gray-400/30 dark:border-gray-500/30 ${
          isActive("/budget")
            ? "bg-black dark:bg-white text-white dark:text-black"
            : "bg-white dark:bg-black text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400"
        }`}
      >
        <span className="text-sm font-medium whitespace-nowrap">Budget</span>
      </Link>
      <Link
        to="/purchases"
        data-active={isActive("/purchases")}
        className={`flex items-center justify-center px-3 py-1 rounded-full border border-gray-400/30 dark:border-gray-500/30 ${
          isActive("/purchases")
            ? "bg-black dark:bg-white text-white dark:text-black"
            : "bg-white dark:bg-black text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400"
        }`}
      >
        <span className="text-sm font-medium whitespace-nowrap">Purchases</span>
      </Link>
      <Link
        to="/analytics"
        data-active={isActive("/analytics")}
        className={`flex items-center justify-center px-3 py-1 rounded-full border border-gray-400/30 dark:border-gray-500/30 ${
          isActive("/analytics")
            ? "bg-black dark:bg-white text-white dark:text-black"
            : "bg-white dark:bg-black text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400"
        }`}
      >
        <span className="text-sm font-medium whitespace-nowrap">Analytics</span>
      </Link>
      <Link
        to="/accounts"
        data-active={isActive("/accounts")}
        className={`flex items-center justify-center px-3 py-1 rounded-full border border-gray-400/30 dark:border-gray-500/30 ${
          isActive("/accounts")
            ? "bg-black dark:bg-white text-white dark:text-black"
            : "bg-white dark:bg-black text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400"
        }`}
      >
        <span className="text-sm font-medium whitespace-nowrap">Accounts</span>
      </Link>
      <Link
        to="/Projections"
        data-active={isActive("/Projections")}
        className={`flex items-center justify-center px-3 py-1 rounded-full border border-gray-400/30 dark:border-gray-500/30 ${
          isActive("/Projections")
            ? "bg-black dark:bg-white text-white dark:text-black"
            : "bg-white dark:bg-black text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400"
        }`}
      >
        <span className="text-sm font-medium whitespace-nowrap">Projections</span>
      </Link>
      <Link
        to="/settings"
        data-active={isActive("/settings")}
        className={`flex items-center justify-center px-3 py-1 rounded-full border border-gray-400/30 dark:border-gray-500/30 mr-6 md:mr-0 ${
          isActive("/settings")
            ? "bg-black dark:bg-white text-white dark:text-black"
            : "bg-white dark:bg-black text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400"
        }`}
      >
        <span className="text-sm font-medium whitespace-nowrap">Settings</span>
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
                      <div className="bg-white dark:bg-black min-h-screen pt-14 pb-5">
                        <div className="flex flex-col gap-2 px-4">
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
                      <div className="bg-white dark:bg-black min-h-screen pt-14 pb-5">
                        <div className="flex flex-col gap-2 px-4">
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
                      <div className="bg-white dark:bg-black min-h-screen pt-14 pb-5">
                        <div className="flex flex-col gap-4 px-4">
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
                      <div className="bg-white dark:bg-black min-h-screen pt-14 pb-5">
                        <div className="flex flex-col gap-4 px-4">
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
                      <div className="bg-white dark:bg-black min-h-screen pt-14 pb-5">
                        <div className="flex flex-col gap-4 px-4">
                          <Suspense fallback={<LoadingSpinner />}>
                            <SettingsMobile />
                          </Suspense>
                        </div>
                      </div>
                    }
                  />
                  <Route
                    path="/Projections"
                    element={
                      <div className="bg-white dark:bg-black min-h-screen pt-14 pb-5">
                        <div className="flex flex-col gap-4 px-4">
                          <Suspense fallback={<LoadingSpinner />}>
                            <Projections />
                          </Suspense>
                        </div>
                      </div>
                    }
                  />
                  {/* Lowercase routes (redirects for desktop compatibility) */}
                  <Route
                    path="/budget"
                    element={<Navigate to="/Budget" replace />}
                  />
                  <Route
                    path="/income"
                    element={<Navigate to="/Income" replace />}
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
                    path="/projections"
                    element={<Navigate to="/Projections" replace />}
                  />
                  {/* Mobile Accounts and Projections routes (no redirect) */}
                  <Route
                    path="/accounts"
                    element={
                      <div className="bg-white dark:bg-black min-h-screen pt-14 pb-5">
                        <div className="flex flex-col gap-4 px-4">
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
                    <Route
                      path="/projections"
                      element={
                        <div className="max-w-7xl mx-auto px-6">
                          <div className="flex flex-col gap-4 my-5">
                            <Suspense fallback={<LoadingSpinner />}>
                              <Projections />
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
                      path="/Projections"
                      element={<Navigate to="/projections" replace />}
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
