import React from "react";
import { Link, useLocation } from "react-router-dom";
import { DollarSign, CreditCard, ShoppingCart, Wallet } from "lucide-react";

const TopNav = () => {
  const location = useLocation();
  
  const isActive = (path) => {
    return location.pathname === path;
  };

  const navItems = [
    {
      path: "/personal-finance-tracker/income",
      label: "Income",
      icon: DollarSign,
    },
    {
      path: "/personal-finance-tracker/budget",
      label: "Budget",
      icon: CreditCard,
    },
    {
      path: "/personal-finance-tracker/purchases",
      label: "Purchases",
      icon: ShoppingCart,
    },
    {
      path: "/personal-finance-tracker/accounts",
      label: "Accounts",
      icon: Wallet,
    },
  ];

  return (
    <nav className="fixed top-0 left-0 w-full bg-white dark:bg-slate-800 shadow-md border-b dark:border-gray-600 z-40">
      <div className="flex justify-center items-center py-4 px-6">
        <div className="flex gap-8">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-colors ${
                  active
                    ? "bg-blue-500 dark:bg-blue-600 text-white"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default TopNav;

