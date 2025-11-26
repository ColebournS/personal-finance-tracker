import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import supabase from "../supabaseClient";
import { Trash2, PlusCircle, X, Search, ArrowUpDown, ArrowUp, ArrowDown, TrendingUp } from "lucide-react";
import { useAuth } from "../AuthContext";

function Accounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newAccount, setNewAccount] = useState({
    name: "",
    type: "Investment",
    value: "",
    interest_rate: "",
    montly_contribution: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [sortConfig, setSortConfig] = useState({
    key: "name",
    direction: "asc",
  });
  const [tempNames, setTempNames] = useState({});
  const [tempValues, setTempValues] = useState({});
  const [tempInterestRates, setTempInterestRates] = useState({});
  const [tempTypes, setTempTypes] = useState({});
  const [tempMonthlyContributions, setTempMonthlyContributions] = useState({});
  const [projectionMonths, setProjectionMonths] = useState(12);
  const debounceTimers = useRef({});

  // Fetch accounts from Supabase
  const fetchAccounts = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error("Error fetching accounts:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Debounced update function
  const debounceUpdate = useCallback((key, callback, delay = 500) => {
    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key]);
    }
    debounceTimers.current[key] = setTimeout(callback, delay);
  }, []);

  // Handle name change
  const handleNameChange = (accountId, value) => {
    setTempNames((prev) => ({ ...prev, [accountId]: value }));
    
    // Update local state immediately
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === accountId ? { ...acc, name: value } : acc))
    );
    
    debounceUpdate(`name-${accountId}`, async () => {
      const { error } = await supabase
        .from("accounts")
        .update({ name: value })
        .eq("id", accountId);
      
      if (error) {
        console.error("Error updating name:", error);
        // Revert on error
        fetchAccounts();
      }
    });
  };

  // Handle value change
  const handleValueChange = (accountId, value) => {
    setTempValues((prev) => ({ ...prev, [accountId]: value }));
    
    const numericValue = parseFloat(value) || 0;
    // Update local state immediately
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === accountId ? { ...acc, value: numericValue } : acc))
    );
    
    debounceUpdate(`value-${accountId}`, async () => {
      const { error } = await supabase
        .from("accounts")
        .update({ value: numericValue })
        .eq("id", accountId);
      
      if (error) {
        console.error("Error updating value:", error);
        // Revert on error
        fetchAccounts();
      }
    });
  };

  // Handle interest rate change
  const handleInterestRateChange = (accountId, value) => {
    setTempInterestRates((prev) => ({ ...prev, [accountId]: value }));
    
    const numericValue = parseFloat(value) || 0;
    // Update local state immediately
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === accountId ? { ...acc, interest_rate: numericValue } : acc
      )
    );
    
    debounceUpdate(`interest-${accountId}`, async () => {
      const { error } = await supabase
        .from("accounts")
        .update({ interest_rate: numericValue })
        .eq("id", accountId);
      
      if (error) {
        console.error("Error updating interest rate:", error);
        // Revert on error
        fetchAccounts();
      }
    });
  };

  // Handle type change
  const handleTypeChange = (accountId, value) => {
    setTempTypes((prev) => ({ ...prev, [accountId]: value }));
    
    // Update local state immediately
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === accountId ? { ...acc, type: value } : acc))
    );
    
    debounceUpdate(`type-${accountId}`, async () => {
      const { error } = await supabase
        .from("accounts")
        .update({ type: value })
        .eq("id", accountId);
      
      if (error) {
        console.error("Error updating type:", error);
        // Revert on error
        fetchAccounts();
      }
    });
  };

  // Handle monthly contribution change
  const handleMonthlyContributionChange = (accountId, value) => {
    setTempMonthlyContributions((prev) => ({ ...prev, [accountId]: value }));
    
    const numericValue = parseFloat(value) || 0;
    // Update local state immediately
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === accountId ? { ...acc, montly_contribution: numericValue } : acc
      )
    );
    
    debounceUpdate(`monthly-${accountId}`, async () => {
      const { error } = await supabase
        .from("accounts")
        .update({ montly_contribution: numericValue })
        .eq("id", accountId);
      
      if (error) {
        console.error("Error updating monthly contribution:", error);
        // Revert on error
        fetchAccounts();
      }
    });
  };

  // Open modal to add new account
  const handleAddAccount = () => {
    setShowModal(true);
  };

  // Close modal and reset form
  const handleCloseModal = () => {
    setShowModal(false);
    setNewAccount({
      name: "",
      type: "Investment",
      value: "",
      interest_rate: "",
      montly_contribution: "",
    });
  };

  // Submit new account form
  const handleSubmitNewAccount = async (e) => {
    e.preventDefault();
    
    if (!user?.id) {
      alert("Error: User not found. Please refresh the page and try again.");
      return;
    }

    if (!newAccount.name.trim()) {
      alert("Please enter an account name.");
      return;
    }

    if (adding) return; // Prevent double-submitting
    
    setAdding(true);
    
    const accountData = {
      name: newAccount.name.trim(),
      value: parseFloat(newAccount.value) || 0,
      interest_rate: parseFloat(newAccount.interest_rate) || 0,
      montly_contribution: parseFloat(newAccount.montly_contribution) || 0,
      type: newAccount.type,
      user_id: user.id,
    };

    try {
      const { error } = await supabase
        .from("accounts")
        .insert([accountData])
        .select();
      
      if (error) {
        console.error("Error adding account:", error);
        alert(`Error adding account: ${error.message}`);
      } else {
        // Refetch to get the new account with its ID
        await fetchAccounts();
        handleCloseModal();
      }
    } catch (error) {
      console.error("Error adding account:", error);
      alert(`Error adding account: ${error.message || "Unknown error"}`);
    } finally {
      setAdding(false);
    }
  };

  // Delete account
  const handleDeleteAccount = async (accountId) => {
    try {
      // Update local state immediately (optimistic update)
      setAccounts((prev) => prev.filter((acc) => acc.id !== accountId));
      
      const { error } = await supabase.from("accounts").delete().eq("id", accountId);
      
      if (error) {
        console.error("Error deleting account:", error);
        alert(`Error deleting account: ${error.message}`);
        // Revert on error
        fetchAccounts();
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      alert(`Error deleting account: ${error.message || "Unknown error"}`);
      // Revert on error
      fetchAccounts();
    }
  };

  // Sorting function
  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Filter and sort accounts
  const filteredAndSortedAccounts = useMemo(() => {
    let filtered = [...accounts];

    // Apply type filter
    if (filterType !== "All") {
      filtered = filtered.filter((account) => account.type === filterType);
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((account) =>
        account.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle numeric values
      if (sortConfig.key === "value" || sortConfig.key === "interest_rate" || sortConfig.key === "montly_contribution") {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      }

      // Handle string values
      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });

    return filtered;
  }, [accounts, filterType, searchTerm, sortConfig]);

  // Calculate totals (using all accounts, not filtered)
  const totals = accounts.reduce(
    (acc, account) => {
      const value = Number(account.value) || 0;
      if (account.type === "Loan") {
        acc.totalLoans += value;
      } else {
        acc.totalInvestments += value;
      }
      return acc;
    },
    { totalLoans: 0, totalInvestments: 0 }
  );

  const netWorth = totals.totalInvestments - totals.totalLoans;

  // Format number with commas and 2 decimal places
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Calculate future value for an account at a given month
  const calculateFutureValue = (account, months) => {
    const presentValue = Number(account.value) || 0;
    const annualRate = Number(account.interest_rate) || 0;
    const monthlyRate = annualRate / 100 / 12; // Convert percentage to decimal and annual to monthly
    const monthlyContribution = Number(account.montly_contribution) || 0;
    
    // For loans, we need to calculate month by month to stop at zero
    if (account.type === "Loan") {
      let balance = presentValue;
      
      for (let i = 0; i < months; i++) {
        if (balance <= 0) {
          return 0; // Loan is paid off
        }
        
        // Add interest
        balance = balance * (1 + monthlyRate);
        
        // Subtract payment
        balance = balance - monthlyContribution;
      }
      
      // Loan can't go negative - it's paid off at 0
      return Math.max(0, balance);
    }
    
    // For investments, contributions add to the balance (positive growth)
    if (monthlyRate === 0) {
      // Simple calculation without interest
      return presentValue + (monthlyContribution * months);
    }
    
    // Compound interest formula with regular contributions
    // FV = PV * (1 + r)^n + PMT * [((1 + r)^n - 1) / r]
    const compoundFactor = Math.pow(1 + monthlyRate, months);
    const futureValueFromPresent = presentValue * compoundFactor;
    const futureValueFromContributions = monthlyContribution * ((compoundFactor - 1) / monthlyRate);
    
    return futureValueFromPresent + futureValueFromContributions;
  };

  // Generate projection data for the selected accounts
  const projectionData = useMemo(() => {
    let monthsToShow;
    
    if (projectionMonths <= 12) {
      // For up to 1 year: show 1, 3, 6, 12 months
      monthsToShow = [1, 3, 6, 12];
    } else if (projectionMonths <= 36) {
      // For up to 3 years: show 6, 12, 24, 36 months
      monthsToShow = [6, 12, 24, 36];
    } else if (projectionMonths <= 60) {
      // For up to 5 years: show 12, 24, 36, 60 months
      monthsToShow = [12, 24, 36, 60];
    } else if (projectionMonths <= 120) {
      // For up to 10 years: show 1yr, 3yr, 5yr, 10yr
      monthsToShow = [12, 36, 60, 120];
    } else if (projectionMonths <= 180) {
      // For up to 15 years: show 1yr, 5yr, 10yr, 15yr
      monthsToShow = [12, 60, 120, 180];
    } else {
      // For 20 years: show 1yr, 5yr, 10yr, 15yr, 20yr
      monthsToShow = [12, 60, 120, 180, 240];
    }
    
    const relevantMonths = monthsToShow.filter(m => m <= projectionMonths);
    if (!relevantMonths.includes(projectionMonths)) {
      relevantMonths.push(projectionMonths);
      relevantMonths.sort((a, b) => a - b);
    }
    
    return filteredAndSortedAccounts.map(account => ({
      account,
      projections: relevantMonths.map(months => ({
        month: months,
        value: calculateFutureValue(account, months)
      }))
    }));
  }, [filteredAndSortedAccounts, projectionMonths]);

  // Sort icon component
  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown size={16} className="opacity-40" />;
    }
    return sortConfig.direction === "asc" ? (
      <ArrowUp size={16} />
    ) : (
      <ArrowDown size={16} />
    );
  };

  if (loading) {
    return (
      <div className="w-full mx-auto p-6 bg-white dark:bg-slate-800 shadow-lg rounded-lg">
        <div className="text-center text-gray-600 dark:text-gray-300">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto p-6 bg-white dark:bg-slate-800 shadow-lg rounded-lg">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
          Accounts
        </h1>
        <button
          onClick={handleAddAccount}
          className="flex items-center gap-2 bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 hover:shadow-lg text-white px-5 py-2.5 rounded-lg transition-all font-medium"
        >
          <PlusCircle size={20} />
          Add Account
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-6 rounded-lg border-2 border-green-200 dark:border-green-700 shadow-sm">
          <div className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">
            Total Investments
          </div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
            ${formatCurrency(totals.totalInvestments)}
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-6 rounded-lg border-2 border-red-200 dark:border-red-700 shadow-sm">
          <div className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">
            Total Loans
          </div>
          <div className="text-3xl font-bold text-red-600 dark:text-red-400">
            ${formatCurrency(totals.totalLoans)}
          </div>
        </div>
        
        <div className={`bg-gradient-to-br ${
          netWorth >= 0 
            ? 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700' 
            : 'from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-700'
        } p-6 rounded-lg border-2 shadow-sm`}>
          <div className={`text-sm font-medium mb-1 ${
            netWorth >= 0 
              ? 'text-blue-700 dark:text-blue-300' 
              : 'text-orange-700 dark:text-orange-300'
          }`}>
            Net Worth
          </div>
          <div className={`text-3xl font-bold ${
            netWorth >= 0 
              ? 'text-blue-600 dark:text-blue-400' 
              : 'text-orange-600 dark:text-orange-400'
          }`}>
            ${formatCurrency(netWorth)}
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search Bar */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search accounts..."
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
          />
        </div>

        {/* Type Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilterType("All")}
            className={`px-4 py-3 rounded-lg font-medium transition-all ${
              filterType === "All"
                ? "bg-blue-500 dark:bg-blue-600 text-white shadow-md"
                : "bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-slate-600"
            }`}
          >
            All ({accounts.length})
          </button>
          <button
            onClick={() => setFilterType("Investment")}
            className={`px-4 py-3 rounded-lg font-medium transition-all ${
              filterType === "Investment"
                ? "bg-green-500 dark:bg-green-600 text-white shadow-md"
                : "bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-slate-600"
            }`}
          >
            💰 Investments ({accounts.filter(a => a.type === "Investment").length})
          </button>
          <button
            onClick={() => setFilterType("Loan")}
            className={`px-4 py-3 rounded-lg font-medium transition-all ${
              filterType === "Loan"
                ? "bg-red-500 dark:bg-red-600 text-white shadow-md"
                : "bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-slate-600"
            }`}
          >
            🏦 Loans ({accounts.filter(a => a.type === "Loan").length})
          </button>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="bg-gray-200 dark:bg-slate-600 border-b-2 border-gray-300 dark:border-gray-500">
                <th 
                  onClick={() => handleSort("name")}
                  className="px-4 py-4 font-semibold text-left text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wider cursor-pointer hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-2">
                    Account Name
                    <SortIcon columnKey="name" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort("type")}
                  className="px-4 py-4 font-semibold text-left text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wider cursor-pointer hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-2">
                    Type
                    <SortIcon columnKey="type" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort("value")}
                  className="px-4 py-4 font-semibold text-left text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wider cursor-pointer hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-2">
                    Value
                    <SortIcon columnKey="value" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort("interest_rate")}
                  className="px-4 py-4 font-semibold text-left text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wider cursor-pointer hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-2">
                    Interest Rate
                    <SortIcon columnKey="interest_rate" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort("montly_contribution")}
                  className="px-4 py-4 font-semibold text-left text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wider cursor-pointer hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-2">
                    Monthly Contribution
                    <SortIcon columnKey="montly_contribution" />
                  </div>
                </th>
                <th className="px-4 py-4 font-semibold text-center text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wider whitespace-nowrap w-24">
                  
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-700">
              {filteredAndSortedAccounts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="text-gray-400 dark:text-gray-500">
                        {accounts.length === 0 ? (
                          <PlusCircle size={48} />
                        ) : (
                          <Search size={48} />
                        )}
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 text-lg">
                        {accounts.length === 0 
                          ? "No accounts yet" 
                          : "No accounts found"}
                      </p>
                      <p className="text-gray-400 dark:text-gray-500 text-sm">
                        {accounts.length === 0 
                          ? "Click \"Add Account\" above to get started tracking your loans and investments"
                          : "Try adjusting your search or filter"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndSortedAccounts.map((account, index) => (
                  <tr 
                    key={account.id} 
                    className={`border-b border-gray-200 dark:border-gray-600 transition-colors hover:bg-gray-50 dark:hover:bg-slate-600/50 ${
                      index % 2 === 0 ? 'bg-white dark:bg-slate-700' : 'bg-gray-50/50 dark:bg-slate-700/50'
                    }`}
                  >
                    <td className="px-4 py-3" style={{ minWidth: "200px" }}>
                      <input
                        type="text"
                        value={tempNames[account.id] ?? account.name}
                        onChange={(e) => handleNameChange(account.id, e.target.value)}
                        className="w-full min-w-0 px-3 py-2 bg-white dark:bg-slate-600 hover:bg-gray-50 dark:hover:bg-slate-500 rounded-md text-gray-800 dark:text-white border border-gray-300 dark:border-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                        placeholder="Account name"
                      />
                    </td>
                    <td className="px-4 py-3" style={{ minWidth: "150px" }}>
                      <select
                        value={tempTypes[account.id] ?? account.type ?? "Investment"}
                        onChange={(e) => handleTypeChange(account.id, e.target.value)}
                        className="w-full min-w-0 px-3 py-2 bg-white dark:bg-slate-600 hover:bg-gray-50 dark:hover:bg-slate-500 rounded-md text-gray-800 dark:text-white border border-gray-300 dark:border-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all cursor-pointer"
                      >
                        <option value="Investment" className="bg-white dark:bg-slate-700">
                          💰 Investment
                        </option>
                        <option value="Loan" className="bg-white dark:bg-slate-700">
                          🏦 Loan
                        </option>
                      </select>
                    </td>
                    <td className="px-4 py-3" style={{ minWidth: "140px" }}>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">
                          $
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          value={tempValues[account.id] ?? account.value ?? 0}
                          onChange={(e) => handleValueChange(account.id, e.target.value)}
                          className="w-full min-w-0 pl-7 pr-3 py-2 bg-white dark:bg-slate-600 hover:bg-gray-50 dark:hover:bg-slate-500 rounded-md text-gray-800 dark:text-white border border-gray-300 dark:border-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                          placeholder="0.00"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3" style={{ minWidth: "140px" }}>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          value={tempInterestRates[account.id] ?? account.interest_rate ?? 0}
                          onChange={(e) => handleInterestRateChange(account.id, e.target.value)}
                          className="w-full min-w-0 px-3 py-2 pr-8 bg-white dark:bg-slate-600 hover:bg-gray-50 dark:hover:bg-slate-500 rounded-md text-gray-800 dark:text-white border border-gray-300 dark:border-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                          placeholder="0.00"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">
                          %
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3" style={{ minWidth: "180px" }}>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">
                          $
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          value={tempMonthlyContributions[account.id] ?? account.montly_contribution ?? 0}
                          onChange={(e) => handleMonthlyContributionChange(account.id, e.target.value)}
                          className="w-full min-w-0 pl-7 pr-3 py-2 bg-white dark:bg-slate-600 hover:bg-gray-50 dark:hover:bg-slate-500 rounded-md text-gray-800 dark:text-white border border-gray-300 dark:border-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                          placeholder="0.00"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete "${account.name}"?`)) {
                            handleDeleteAccount(account.id);
                          }
                        }}
                        className="inline-flex items-center justify-center p-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all hover:scale-110"
                        title="Delete account"
                      >
                        <Trash2 size={20} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Future Value Projections */}
      {filteredAndSortedAccounts.length > 0 && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                  Future Value Projections
                </h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 ml-14">
                Projected account values based on interest rates and monthly contributions
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Project up to:
              </label>
              <select
                value={projectionMonths}
                onChange={(e) => setProjectionMonths(Number(e.target.value))}
                className="px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all cursor-pointer"
              >
                <option value={6}>6 months</option>
                <option value={12}>1 year</option>
                <option value={24}>2 years</option>
                <option value={36}>3 years</option>
                <option value={60}>5 years</option>
                <option value={120}>10 years</option>
                <option value={180}>15 years</option>
                <option value={240}>20 years</option>
              </select>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-200 dark:bg-slate-600 border-b-2 border-gray-300 dark:border-gray-500">
                    <th className="px-4 py-4 font-semibold text-left text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wider whitespace-nowrap sticky left-0 bg-gray-200 dark:bg-slate-600">
                      Account
                    </th>
                    <th className="px-4 py-4 font-semibold text-center text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wider whitespace-nowrap">
                      Current Value
                    </th>
                    {projectionData[0]?.projections.map((proj) => (
                      <th
                        key={proj.month}
                        className="px-4 py-4 font-semibold text-center text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wider whitespace-nowrap"
                      >
                        {proj.month} {proj.month === 1 ? "Month" : "Months"}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-700">
                  {projectionData.map((item, index) => (
                    <tr
                      key={item.account.id}
                      className={`border-b border-gray-200 dark:border-gray-600 transition-colors hover:bg-gray-50 dark:hover:bg-slate-600/50 ${
                        index % 2 === 0
                          ? "bg-white dark:bg-slate-700"
                          : "bg-gray-50/50 dark:bg-slate-700/50"
                      }`}
                    >
                      <td className={`px-4 py-3 font-medium text-gray-800 dark:text-white whitespace-nowrap sticky left-0 ${
                        index % 2 === 0
                          ? "bg-white dark:bg-slate-700"
                          : "bg-gray-50 dark:bg-slate-700/80"
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {item.account.type === "Investment" ? "💰" : "🏦"}
                          </span>
                          {item.account.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="font-semibold text-gray-800 dark:text-white">
                          ${formatCurrency(Number(item.account.value || 0))}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Principal
                        </div>
                      </td>
                      {item.projections.map((proj) => {
                        const initialValue = Number(item.account.value || 0);
                        const monthlyContribution = Number(item.account.montly_contribution || 0);
                        const totalContributions = monthlyContribution * proj.month;
                        
                        // Calculate interest differently for loans vs investments
                        let totalInterest;
                        if (item.account.type === "Loan") {
                          // For loans: interest is what was paid beyond the principal reduction
                          // Total paid = contributions, Principal reduction = initial - final
                          // Interest = Total paid - Principal reduction
                          const principalReduction = initialValue - proj.value;
                          totalInterest = totalContributions - principalReduction;
                        } else {
                          // For investments: interest is the growth beyond contributions
                          totalInterest = proj.value - initialValue - totalContributions;
                        }
                        
                        return (
                          <td
                            key={proj.month}
                            className="px-4 py-3 text-center whitespace-nowrap"
                          >
                            <div className="font-semibold text-gray-800 dark:text-white mb-1">
                              ${formatCurrency(proj.value)}
                            </div>
                            <div className="text-xs space-y-0.5">
                              <div className="text-blue-600 dark:text-blue-400">
                                Contributions: ${formatCurrency(totalContributions)}
                              </div>
                              <div className={`${
                                item.account.type === "Loan"
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-green-600 dark:text-green-400"
                              }`}>
                                {item.account.type === "Loan" ? "Interest Paid" : "Interest Earned"}: ${formatCurrency(Math.abs(totalInterest))}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  
                  {/* Total Row */}
                  <tr className="bg-blue-50 dark:bg-blue-900/20 border-t-2 border-blue-300 dark:border-blue-700 font-bold">
                    <td className="px-4 py-4 text-gray-800 dark:text-white whitespace-nowrap sticky left-0 bg-blue-50 dark:bg-blue-900/20">
                      Total Net Worth
                    </td>
                    <td className="px-4 py-4 text-center text-gray-800 dark:text-white whitespace-nowrap">
                      <div className="font-bold">
                        ${formatCurrency(netWorth)}
                      </div>
                    </td>
                    {projectionData[0]?.projections.map((proj) => {
                      let totalFuture = 0;
                      let totalContributions = 0;
                      let totalInterest = 0;
                      
                      projectionData.forEach((item) => {
                        const projValue = item.projections.find(p => p.month === proj.month)?.value || 0;
                        const monthlyContribution = Number(item.account.montly_contribution || 0);
                        const contributions = monthlyContribution * proj.month;
                        const initialValue = Number(item.account.value || 0);
                        
                        if (item.account.type === "Loan") {
                          // Loans subtract from net worth
                          totalFuture -= projValue;
                          totalContributions += contributions;
                          // Interest paid on loan
                          const principalReduction = initialValue - projValue;
                          const interestPaid = contributions - principalReduction;
                          totalInterest -= interestPaid; // Negative because it's a cost
                        } else {
                          // Investments add to net worth
                          totalFuture += projValue;
                          totalContributions += contributions;
                          // Interest earned on investment
                          const interestEarned = projValue - initialValue - contributions;
                          totalInterest += interestEarned;
                        }
                      });
                      
                      return (
                        <td
                          key={proj.month}
                          className="px-4 py-4 text-center whitespace-nowrap"
                        >
                          <div className="font-bold text-gray-800 dark:text-white mb-1">
                            ${formatCurrency(totalFuture)}
                          </div>
                          <div className="text-xs space-y-0.5">
                            <div className="text-blue-600 dark:text-blue-400">
                              Contributions: ${formatCurrency(totalContributions)}
                            </div>
                            <div className={`${
                              totalInterest >= 0
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            }`}>
                              Net Interest: ${formatCurrency(Math.abs(totalInterest))}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-600">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                Add New Account
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitNewAccount} className="p-6 space-y-5">
              {/* Account Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Account Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newAccount.name}
                  onChange={(e) =>
                    setNewAccount({ ...newAccount, name: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                  placeholder="e.g., Savings Account, Student Loan"
                  required
                />
              </div>

              {/* Account Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Account Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={newAccount.type}
                  onChange={(e) =>
                    setNewAccount({ ...newAccount, type: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all cursor-pointer"
                  required
                >
                  <option value="Investment">💰 Investment</option>
                  <option value="Loan">🏦 Loan</option>
                </select>
              </div>

              {/* Account Value */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Current Value
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium text-lg">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={newAccount.value}
                    onChange={(e) =>
                      setNewAccount({ ...newAccount, value: e.target.value })
                    }
                    className="w-full pl-9 pr-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Interest Rate */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Interest Rate
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={newAccount.interest_rate}
                    onChange={(e) =>
                      setNewAccount({
                        ...newAccount,
                        interest_rate: e.target.value,
                      })
                    }
                    className="w-full px-4 pr-9 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                    placeholder="0.00"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium text-lg">
                    %
                  </span>
                </div>
              </div>

              {/* Monthly Contribution */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Monthly Contribution
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium text-lg">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={newAccount.montly_contribution}
                    onChange={(e) =>
                      setNewAccount({
                        ...newAccount,
                        montly_contribution: e.target.value,
                      })
                    }
                    className="w-full pl-9 pr-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                    placeholder="0.00"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Amount added or paid monthly
                </p>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-3 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                    adding
                      ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed text-white"
                      : "bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white hover:shadow-lg"
                  }`}
                >
                  {adding ? "Adding..." : "Add Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Accounts;

