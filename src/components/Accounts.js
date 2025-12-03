import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import supabase from "../supabaseClient";
import { Trash2, PlusCircle, X, Search, ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, Link as LinkIcon, AlertCircle } from "lucide-react";
import { useAuth } from "../AuthContext";
import { useData } from "../DataContext";
import { encryptValue, decryptValue, decryptString } from "../utils/encryption";
import SimpleFinSetup from "./SimpleFinSetup";
import { syncAccounts, syncTransactions } from "../utils/simplefinService";

function Accounts() {
  const { user } = useAuth();
  const { purchases, refetchPurchases } = useData();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newAccount, setNewAccount] = useState({
    name: "",
    value: "",
    interest_rate: "",
    montly_contribution: "",
    account_type: "investment",
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
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const debounceTimers = useRef({});
  
  // SimpleFin state
  const [showSimpleFinSetup, setShowSimpleFinSetup] = useState(false);
  const [simpleFinAccessUrl, setSimpleFinAccessUrl] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [syncingTransactions, setSyncingTransactions] = useState(false);
  const [transactionSyncStatus, setTransactionSyncStatus] = useState("");

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
      
      // Decrypt account values
      const decryptedAccounts = (data || []).map(account => ({
        ...account,
        value: decryptValue(account.value, user.id),
        interest_rate: decryptValue(account.interest_rate, user.id),
        montly_contribution: decryptValue(account.montly_contribution, user.id)
      }));
      
      setAccounts(decryptedAccounts);
    } catch (error) {
      console.error("Error fetching accounts:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Fetch SimpleFin access URL from profile
  const fetchSimpleFinProfile = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("simplefin_access_url")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching SimpleFin profile:", error);
        return;
      }
      
      if (data?.simplefin_access_url) {
        try {
          const decryptedUrl = decryptString(data.simplefin_access_url, user.id);
          if (decryptedUrl && decryptedUrl.startsWith('http')) {
            setSimpleFinAccessUrl(decryptedUrl);
          }
        } catch (decryptError) {
          console.error('Decryption error:', decryptError);
        }
      }
    } catch (error) {
      console.error("Error fetching SimpleFin profile:", error);
    }
  }, [user?.id]);

  // Sync transactions from SimpleFin
  const handleTransactionSync = useCallback(async (currentAccounts) => {
    if (!simpleFinAccessUrl || !user?.id) return 0;
    
    setSyncingTransactions(true);
    setTransactionSyncStatus("Syncing transactions...");
    
    try {
      // Fetch ALL existing purchases (including deleted ones) for duplicate detection
      const { data: allPurchases } = await supabase
        .from("purchases")
        .select("simplefin_transaction_id, simplefin_account_id, is_deleted")
        .eq("user_id", user.id);
      
      // Sync transactions
      const { transactionsToCreate } = await syncTransactions(
        simpleFinAccessUrl,
        currentAccounts,
        allPurchases || []
      );

      console.log('Transaction sync results:', {
        toCreate: transactionsToCreate.length,
      });

      if (transactionsToCreate.length === 0) {
        setTransactionSyncStatus("No new transactions to sync");
        return 0;
      }

      // Create new purchases from transactions
      for (const transaction of transactionsToCreate) {
        const { error } = await supabase.from("purchases").insert([{
          ...transaction,
          user_id: user.id,
        }]);
        
        if (error) {
          console.error('Error inserting transaction as purchase:', error);
          throw error;
        }
      }

      // Refresh purchases list
      await refetchPurchases();
      
      setTransactionSyncStatus(`Synced ${transactionsToCreate.length} new transaction${transactionsToCreate.length !== 1 ? 's' : ''}`);
      return transactionsToCreate.length;
      
    } catch (error) {
      console.error("SimpleFin transaction sync error:", error);
      setTransactionSyncStatus("Failed to sync transactions");
      throw error;
    } finally {
      setSyncingTransactions(false);
      // Clear status after 5 seconds
      setTimeout(() => setTransactionSyncStatus(""), 5000);
    }
  }, [simpleFinAccessUrl, user?.id, purchases, refetchPurchases]);

  // Sync accounts from SimpleFin
  const handleSimpleFinSync = useCallback(async (syncTransactionsAfter = true) => {
    if (!simpleFinAccessUrl || !user?.id) return;
    
    setSyncing(true);
    setSyncError("");
    
    try {
      // Fetch fresh accounts directly to avoid stale closure
      const { data: accountsData } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id);
      
      const currentAccounts = (accountsData || []).map(account => ({
        ...account,
        value: decryptValue(account.value, user.id),
        interest_rate: decryptValue(account.interest_rate, user.id),
        montly_contribution: decryptValue(account.montly_contribution, user.id)
      }));
      
      // Sync with SimpleFin
      const { accountsToCreate, accountsToUpdate } = await syncAccounts(
        simpleFinAccessUrl,
        currentAccounts
      );

      console.log('Sync results:', {
        toCreate: accountsToCreate.length,
        toUpdate: accountsToUpdate.length,
        newAccounts: accountsToCreate
      });

      // Create new accounts
      const newlyCreatedAccounts = [];
      for (const newAccount of accountsToCreate) {
        console.log('Creating new account:', newAccount);
        const encryptedValue = encryptValue(newAccount.value, user.id);
        const encryptedInterestRate = encryptValue(newAccount.interest_rate, user.id);
        const encryptedMonthlyContribution = encryptValue(newAccount.montly_contribution, user.id);
        
        const { data, error } = await supabase.from("accounts").insert([{
          ...newAccount,
          value: encryptedValue,
          interest_rate: encryptedInterestRate,
          montly_contribution: encryptedMonthlyContribution,
          user_id: user.id,
        }]).select();
        
        if (error) {
          console.error('Error inserting account:', error);
          throw error;
        }
        console.log('Account created successfully:', data);
        if (data && data[0]) {
          newlyCreatedAccounts.push({
            ...data[0],
            value: newAccount.value,
            interest_rate: newAccount.interest_rate,
            montly_contribution: newAccount.montly_contribution
          });
        }
      }

      // Update existing accounts
      for (const updatedAccount of accountsToUpdate) {
        const encryptedValue = encryptValue(updatedAccount.value, user.id);
        const encryptedInterestRate = encryptValue(updatedAccount.interest_rate, user.id);
        const encryptedMonthlyContribution = encryptValue(updatedAccount.montly_contribution, user.id);
        
        // Don't update account_type during sync - preserve user's manual changes
        const { error } = await supabase
          .from("accounts")
          .update({
            value: encryptedValue,
            interest_rate: encryptedInterestRate,
            montly_contribution: encryptedMonthlyContribution,
            last_synced: updatedAccount.last_synced,
            is_simplefin_synced: true,
          })
          .eq("id", updatedAccount.id);
        
        if (error) {
          console.error('Error updating account:', error);
          throw error;
        }
      }

      // Refresh accounts list
      await fetchAccounts();
      
      // Sync transactions after accounts are synced
      if (syncTransactionsAfter) {
        const updatedAccounts = [...currentAccounts, ...newlyCreatedAccounts];
        await handleTransactionSync(updatedAccounts);
      }
      
    } catch (error) {
      console.error("SimpleFin sync error:", error);
      
      if (error.message.includes('RATE_LIMIT')) {
        setSyncError("Rate limit reached. Please wait a moment and try again.");
      } else if (error.message.includes('UNAUTHORIZED')) {
        setSyncError("SimpleFin connection expired. Please reconnect.");
        setSimpleFinAccessUrl(null);
      } else {
        setSyncError(error.message || "Failed to sync accounts");
      }
    } finally {
      setSyncing(false);
    }
  }, [simpleFinAccessUrl, user?.id, fetchAccounts, handleTransactionSync]);


  useEffect(() => {
    fetchAccounts();
    fetchSimpleFinProfile();
  }, [fetchAccounts, fetchSimpleFinProfile]);

  // Auto-sync on page load if SimpleFin is connected (only once)
  const hasAutoSynced = useRef(false);
  
  useEffect(() => {
    if (simpleFinAccessUrl && !syncing && !hasAutoSynced.current) {
      hasAutoSynced.current = true;
      handleSimpleFinSync();
    }
  }, [simpleFinAccessUrl]); // Only run when access URL changes, not when handleSimpleFinSync changes

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

  // Handle value change (only for manual accounts)
  const handleValueChange = (accountId, value) => {
    // Check if account is SimpleFin synced
    const account = accounts.find(acc => acc.id === accountId);
    if (account?.is_simplefin_synced) {
      // Don't allow editing SimpleFin account values
      return;
    }
    
    setTempValues((prev) => ({ ...prev, [accountId]: value }));
    
    const numericValue = parseFloat(value) || 0;
    // Update local state immediately with decrypted value
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === accountId ? { ...acc, value: numericValue } : acc))
    );
    
    debounceUpdate(`value-${accountId}`, async () => {
      // Encrypt value before saving to database
      const encryptedValue = encryptValue(numericValue, user?.id);
      
      const { error } = await supabase
        .from("accounts")
        .update({ value: encryptedValue })
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
    // Update local state immediately with decrypted value
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === accountId ? { ...acc, interest_rate: numericValue } : acc
      )
    );
    
    debounceUpdate(`interest-${accountId}`, async () => {
      // Encrypt interest rate before saving to database
      const encryptedValue = encryptValue(numericValue, user?.id);
      
      const { error } = await supabase
        .from("accounts")
        .update({ interest_rate: encryptedValue })
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
      prev.map((acc) => (acc.id === accountId ? { ...acc, account_type: value } : acc))
    );
    
    debounceUpdate(`type-${accountId}`, async () => {
      const { error } = await supabase
        .from("accounts")
        .update({ 
          account_type: value
        })
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
    // Update local state immediately with decrypted value
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === accountId ? { ...acc, montly_contribution: numericValue } : acc
      )
    );
    
    debounceUpdate(`monthly-${accountId}`, async () => {
      // Encrypt monthly contribution before saving to database
      const encryptedValue = encryptValue(numericValue, user?.id);
      
      const { error } = await supabase
        .from("accounts")
        .update({ montly_contribution: encryptedValue })
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
      value: "",
      interest_rate: "",
      montly_contribution: "",
      account_type: "investment",
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
    
    const numericValue = parseFloat(newAccount.value) || 0;
    const numericInterestRate = parseFloat(newAccount.interest_rate) || 0;
    const numericMonthlyContribution = parseFloat(newAccount.montly_contribution) || 0;
    
    // Encrypt all sensitive numeric fields
    const encryptedValue = encryptValue(numericValue, user.id);
    const encryptedInterestRate = encryptValue(numericInterestRate, user.id);
    const encryptedMonthlyContribution = encryptValue(numericMonthlyContribution, user.id);
    
    const accountData = {
      name: newAccount.name.trim(),
      value: encryptedValue,
      interest_rate: encryptedInterestRate,
      montly_contribution: encryptedMonthlyContribution,
      account_type: newAccount.account_type,
      is_simplefin_synced: false,
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
      if (filterType === "Investment") {
        filtered = filtered.filter((account) => 
          ['checking', 'savings', 'investment', 'other'].includes(account.account_type)
        );
      } else if (filterType === "Loan") {
        filtered = filtered.filter((account) => 
          ['credit', 'loan'].includes(account.account_type)
        );
      }
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
      if (['credit', 'loan'].includes(account.account_type)) {
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
    if (['credit', 'loan'].includes(account.account_type)) {
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

  // Generate projection data for investment and loan accounts only
  const projectionData = useMemo(() => {
    // Filter to only investment and loan accounts
    const projectableAccounts = filteredAndSortedAccounts.filter(
      acc => acc.account_type === 'investment' || acc.account_type === 'loan'
    );
    
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
    
    return projectableAccounts.map(account => ({
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
    <div className="space-y-2 md:space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <div className="bg-green-50/50 dark:bg-green-900/10 p-2 md:p-4 rounded-lg">
          <div className="text-[10px] md:text-xs font-medium text-green-600 dark:text-green-400 mb-0.5 md:mb-1 uppercase tracking-wide">
            Total Investments
          </div>
          <div className="text-sm md:text-2xl font-bold text-green-700 dark:text-green-300">
            ${formatCurrency(totals.totalInvestments)}
          </div>
        </div>
        
        <div className="bg-red-50/50 dark:bg-red-900/10 p-2 md:p-4 rounded-lg">
          <div className="text-[10px] md:text-xs font-medium text-red-600 dark:text-red-400 mb-0.5 md:mb-1 uppercase tracking-wide">
            Total Loans
          </div>
          <div className="text-sm md:text-2xl font-bold text-red-700 dark:text-red-300">
            ${formatCurrency(totals.totalLoans)}
          </div>
        </div>
        
        <div className={`${
          netWorth >= 0 
            ? 'bg-blue-50/50 dark:bg-blue-900/10' 
            : 'bg-orange-50/50 dark:bg-orange-900/10'
        } p-2 md:p-4 rounded-lg`}>
          <div className={`text-[10px] md:text-xs font-medium mb-0.5 md:mb-1 uppercase tracking-wide ${
            netWorth >= 0 
              ? 'text-blue-600 dark:text-blue-400' 
              : 'text-orange-600 dark:text-orange-400'
          }`}>
            Net Worth
          </div>
          <div className={`text-sm md:text-2xl font-bold ${
            netWorth >= 0 
              ? 'text-blue-700 dark:text-blue-300' 
              : 'text-orange-700 dark:text-orange-300'
          }`}>
            ${formatCurrency(netWorth)}
          </div>
        </div>
      </div>

      {/* Main Accounts Card */}
      <div className="w-full mx-auto p-4 md:p-6 bg-white dark:bg-slate-800 shadow-xl rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col gap-4 mb-2">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
              Accounts
            </h1>
            <div className="flex items-center gap-2 md:gap-3">
              {!simpleFinAccessUrl && (
                <button
                  onClick={() => setShowSimpleFinSetup(true)}
                  className="flex items-center gap-1 md:gap-2 bg-purple-500 dark:bg-purple-600 hover:bg-purple-600 dark:hover:bg-purple-700 hover:shadow-lg text-white px-3 md:px-4 py-2 md:py-2.5 rounded-lg transition-all font-medium text-sm md:text-base"
                >
                  <LinkIcon size={18} className="md:w-5 md:h-5" />
                  <span className="hidden sm:inline">Connect SimpleFin</span>
                  <span className="sm:hidden">Connect</span>
                </button>
              )}
              <button
                onClick={handleAddAccount}
                className="flex items-center gap-1 md:gap-2 bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 hover:shadow-lg text-white px-3 md:px-5 py-2 md:py-2.5 rounded-lg transition-all font-medium text-sm md:text-base"
              >
                <PlusCircle size={18} className="md:w-5 md:h-5" />
                <span className="hidden sm:inline">Add Manually</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          </div>
        </div>

      {/* Filter and Search Controls */}
      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Mobile search icon (left) */}
          <button
            onClick={() => setShowMobileSearch((prev) => !prev)}
            className="sm:hidden p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-200"
            aria-label="Toggle search"
          >
            <Search size={16} />
          </button>

          {/* Desktop search bar (left) */}
          <div className="hidden sm:flex flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search accounts..."
              className="w-full pl-10 pr-4 p-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
            />
          </div>

          <div className="flex flex-1 gap-1 min-w-0">
            <button
              onClick={() => setFilterType("All")}
              className={`flex-shrink-0 sm:flex-none px-2 p-2 rounded-lg font-medium text-[11px] sm:text-base transition-all ${
                filterType === "All"
                  ? "bg-blue-500 dark:bg-blue-600 text-white shadow-md"
                  : "bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-slate-600"
              }`}
            >
              All ({accounts.length})
            </button>
            <button
              onClick={() => setFilterType("Investment")}
              className={`flex-shrink-0 sm:flex-none px-3 p-2 rounded-lg font-medium text-[11px] sm:text-base transition-all ${
                filterType === "Investment"
                  ? "bg-green-500 dark:bg-green-600 text-white shadow-md"
                  : "bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-slate-600"
              }`}
            >
              Investments ({accounts.filter(a => ['checking', 'savings', 'investment', 'other'].includes(a.account_type)).length})
            </button>
            <button
              onClick={() => setFilterType("Loan")}
              className={`flex-shrink-0 sm:flex-none px-2 p-2 rounded-lg font-medium text-[11px] sm:text-base transition-all ${
                filterType === "Loan"
                  ? "bg-red-500 dark:bg-red-600 text-white shadow-md"
                  : "bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-slate-600"
              }`}
            >
              Loans ({accounts.filter(a => ['credit', 'loan'].includes(a.account_type)).length})
            </button>
          </div>
        </div>
        {showMobileSearch && (
          <div className="sm:hidden relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search accounts..."
              className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none text-sm transition-all"
            />
          </div>
        )}
      </div>

      {/* Accounts Table - Desktop */}
      <div className="hidden md:block bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
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
                  onClick={() => handleSort("account_type")}
                  className="px-4 py-4 font-semibold text-left text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wider cursor-pointer hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-2">
                    Type
                    <SortIcon columnKey="account_type" />
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
                <th className="px-4 py-4 font-semibold text-left text-gray-700 dark:text-gray-200 text-sm uppercase tracking-wider whitespace-nowrap">
                  Interest Rate / Monthly Contribution
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
                      <div className="flex items-center gap-2">
                        {account.is_simplefin_synced && (
                          <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full" title="Synced from SimpleFin"></div>
                        )}
                        <input
                          type="text"
                          value={tempNames[account.id] ?? account.name}
                          onChange={(e) => handleNameChange(account.id, e.target.value)}
                          className="w-full min-w-0 px-3 py-2 bg-white dark:bg-slate-600 hover:bg-gray-50 dark:hover:bg-slate-500 rounded-md text-gray-800 dark:text-white border border-gray-300 dark:border-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                          placeholder="Account name"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3" style={{ minWidth: "150px" }}>
                      <select
                        value={tempTypes[account.id] ?? account.account_type ?? "investment"}
                        onChange={(e) => handleTypeChange(account.id, e.target.value)}
                        className="w-full min-w-0 px-3 py-2 bg-white dark:bg-slate-600 hover:bg-gray-50 dark:hover:bg-slate-500 rounded-md text-gray-800 dark:text-white border border-gray-300 dark:border-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all cursor-pointer"
                      >
                        <option value="checking" className="bg-white dark:bg-slate-700">
                          Checking
                        </option>
                        <option value="savings" className="bg-white dark:bg-slate-700">
                          Savings
                        </option>
                        <option value="credit" className="bg-white dark:bg-slate-700">
                          Credit Card
                        </option>
                        <option value="investment" className="bg-white dark:bg-slate-700">
                          Investment
                        </option>
                        <option value="loan" className="bg-white dark:bg-slate-700">
                          Loan
                        </option>
                        <option value="other" className="bg-white dark:bg-slate-700">
                          Other
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
                          disabled={account.is_simplefin_synced}
                          readOnly={account.is_simplefin_synced}
                          className={`w-full min-w-0 pl-7 pr-3 py-2 rounded-md text-gray-800 dark:text-white border transition-all ${
                            account.is_simplefin_synced 
                              ? 'bg-gray-100 dark:bg-slate-700 border-gray-200 dark:border-gray-600 cursor-not-allowed'
                              : 'bg-white dark:bg-slate-600 hover:bg-gray-50 dark:hover:bg-slate-500 border-gray-300 dark:border-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none'
                          }`}
                          placeholder="0.00"
                          title={account.is_simplefin_synced ? "Value is synced from SimpleFin" : ""}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3" style={{ minWidth: "300px" }}>
                      {(account.account_type === 'investment' || account.account_type === 'loan') ? (
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <input
                              type="number"
                              step="0.01"
                              value={tempInterestRates[account.id] ?? account.interest_rate ?? 0}
                              onChange={(e) => handleInterestRateChange(account.id, e.target.value)}
                              className="w-full px-3 py-2 pr-8 bg-white dark:bg-slate-600 hover:bg-gray-50 dark:hover:bg-slate-500 rounded-md text-gray-800 dark:text-white border border-gray-300 dark:border-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                              placeholder="Rate %"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">
                              %
                            </span>
                          </div>
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">
                              $
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              value={tempMonthlyContributions[account.id] ?? account.montly_contribution ?? 0}
                              onChange={(e) => handleMonthlyContributionChange(account.id, e.target.value)}
                              className="w-full pl-7 pr-3 py-2 bg-white dark:bg-slate-600 hover:bg-gray-50 dark:hover:bg-slate-500 rounded-md text-gray-800 dark:text-white border border-gray-300 dark:border-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                              placeholder="Monthly"
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 text-sm italic">N/A</span>
                      )}
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

      {/* Accounts List - Mobile */}
      <div className="md:hidden space-y-2">
        {filteredAndSortedAccounts.length === 0 ? (
          <div className="text-center py-8 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col items-center gap-3">
              <div className="text-gray-400 dark:text-gray-500">
                {accounts.length === 0 ? (
                  <PlusCircle size={40} />
                ) : (
                  <Search size={40} />
                )}
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-base">
                {accounts.length === 0 
                  ? "No accounts yet" 
                  : "No accounts found"}
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-xs px-4">
                {accounts.length === 0 
                  ? "Tap \"Add\" above to start tracking your loans and investments."
                  : "Try adjusting your search or filter."}
              </p>
            </div>
          </div>
        ) : (
          filteredAndSortedAccounts.map((account) => (
            <div
              key={account.id}
              className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  {account.is_simplefin_synced && (
                    <div
                      className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full"
                      title="Synced from SimpleFin"
                    ></div>
                  )}
                  <input
                    type="text"
                    value={tempNames[account.id] ?? account.name}
                    onChange={(e) => handleNameChange(account.id, e.target.value)}
                    className="w-full min-w-0 px-2 py-1.5 bg-gray-50 dark:bg-slate-700 rounded text-gray-800 dark:text-white border border-gray-300 dark:border-gray-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none text-sm"
                    placeholder="Account name"
                  />
                </div>
                <button
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete "${account.name}"?`)) {
                      handleDeleteAccount(account.id);
                    }
                  }}
                  className="p-1.5 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors flex-shrink-0"
                  aria-label="Delete account"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <select
                  value={tempTypes[account.id] ?? account.account_type ?? "investment"}
                  onChange={(e) => handleTypeChange(account.id, e.target.value)}
                  className="flex-1 min-w-0 px-2 py-1.5 bg-gray-50 dark:bg-slate-700 rounded text-gray-800 dark:text-white border border-gray-300 dark:border-gray-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none text-xs"
                >
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                  <option value="credit">Credit Card</option>
                  <option value="investment">Investment</option>
                  <option value="loan">Loan</option>
                  <option value="other">Other</option>
                </select>
                <div className="relative w-28">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-xs">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={tempValues[account.id] ?? account.value ?? 0}
                    onChange={(e) => handleValueChange(account.id, e.target.value)}
                    disabled={account.is_simplefin_synced}
                    readOnly={account.is_simplefin_synced}
                    className={`w-full pl-4 pr-2 py-1.5 rounded text-gray-800 dark:text-white border text-xs ${
                      account.is_simplefin_synced
                        ? "bg-gray-100 dark:bg-slate-700 border-gray-200 dark:border-gray-600 cursor-not-allowed"
                        : "bg-gray-50 dark:bg-slate-700 border-gray-300 dark:border-gray-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none"
                    }`}
                    placeholder="0.00"
                    title={account.is_simplefin_synced ? "Value is synced from SimpleFin" : ""}
                  />
                </div>
              </div>

              {(account.account_type === "investment" ||
                account.account_type === "loan") && (
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={tempInterestRates[account.id] ?? account.interest_rate ?? 0}
                      onChange={(e) =>
                        handleInterestRateChange(account.id, e.target.value)
                      }
                      className="w-full px-2 py-1.5 pr-6 bg-gray-50 dark:bg-slate-700 rounded text-gray-800 dark:text-white border border-gray-300 dark:border-gray-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none text-xs"
                      placeholder="Rate"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-xs">
                      %
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-xs">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={
                        tempMonthlyContributions[account.id] ??
                        account.montly_contribution ??
                        0
                      }
                      onChange={(e) =>
                        handleMonthlyContributionChange(account.id, e.target.value)
                      }
                      className="w-full pl-4 pr-2 py-1.5 bg-gray-50 dark:bg-slate-700 rounded text-gray-800 dark:text-white border border-gray-300 dark:border-gray-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none text-xs"
                      placeholder="Monthly"
                    />
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Future Value Projections */}
      {filteredAndSortedAccounts.filter(acc => acc.account_type === 'investment' || acc.account_type === 'loan').length > 0 && (
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
                          : "bg-gray-50 dark:bg-slate-700"
                      }`}>
                        <div className="flex items-center gap-2">
                          {item.account.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="font-semibold text-gray-800 dark:text-white">
                          ${formatCurrency(Number(item.account.value || 0))}
                        </div>
                      </td>
                      {item.projections.map((proj) => {
                        const initialValue = Number(item.account.value || 0);
                        const monthlyContribution = Number(item.account.montly_contribution || 0);
                        const totalContributions = monthlyContribution * proj.month;
                        
                        // Calculate interest differently for loans vs investments
                        let totalInterest;
                        if (['credit', 'loan'].includes(item.account.account_type)) {
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
                                ['credit', 'loan'].includes(item.account.account_type)
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-green-600 dark:text-green-400"
                              }`}>
                                {['credit', 'loan'].includes(item.account.account_type) ? "Interest Paid" : "Interest Earned"}: ${formatCurrency(Math.abs(totalInterest))}
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
                        
                        if (['credit', 'loan'].includes(item.account.account_type)) {
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

      </div>

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
                  value={newAccount.account_type}
                  onChange={(e) => {
                    setNewAccount({ 
                      ...newAccount, 
                      account_type: e.target.value
                    });
                  }}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all cursor-pointer"
                  required
                >
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                  <option value="credit">Credit Card</option>
                  <option value="investment">Investment</option>
                  <option value="loan">Loan</option>
                  <option value="other">Other</option>
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

              {/* Interest Rate & Monthly Contribution - Only for Investment/Loan */}
              {(newAccount.account_type === 'investment' || newAccount.account_type === 'loan') && (
                <>
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
                      Monthly {newAccount.account_type === 'loan' ? 'Payment' : 'Contribution'}
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
                      {newAccount.account_type === 'loan' ? 'Amount paid monthly' : 'Amount added monthly'}
                    </p>
                  </div>
                </>
              )}

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

      {/* SimpleFin Setup Modal */}
      <SimpleFinSetup
        isOpen={showSimpleFinSetup}
        onClose={() => setShowSimpleFinSetup(false)}
        onSuccess={(accessUrl) => {
          setSimpleFinAccessUrl(accessUrl);
          hasAutoSynced.current = false;
        }}
        userId={user?.id}
      />

    </div>
  );
}

export default Accounts;

