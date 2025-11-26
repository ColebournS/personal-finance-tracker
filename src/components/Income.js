import React, { useState, useCallback, useRef, useEffect } from "react";
import supabase from "../supabaseClient";
import { useData } from "../DataContext";
import { DollarSign, PiggyBank, Receipt, TrendingUp, PlusCircle, Trash2 } from "lucide-react";
import { encryptValue, decryptValue } from "../utils/encryption";

function Income() {
  const { income: incomeData, userId, refetchIncome } = useData();
  const [editableField, setEditableField] = useState(null);
  const [tempValue, setTempValue] = useState(null);
  const [taxes, setTaxes] = useState([]);
  const [loadingTaxes, setLoadingTaxes] = useState(true);
  const debounceTimers = useRef({});

  // Format number with commas and 2 decimal places
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Initialize default taxes for new users
  const initializeDefaultTaxes = useCallback(async () => {
    if (!userId) return false;
    
    const defaultTaxes = [
      { user_id: userId, tax_name: "Federal Tax", percent: 0 },
      { user_id: userId, tax_name: "Medicare", percent: 0 },
      { user_id: userId, tax_name: "Social Security Tax", percent: 0 },
      { user_id: userId, tax_name: "State Tax", percent: 0 },
    ];

    try {
      const { error } = await supabase
        .from("taxes")
        .insert(defaultTaxes);

      if (error) {
        console.error("Error initializing default taxes:", error);
        return false;
      }
      return true;
    } catch (error) {
      console.error("Error initializing default taxes:", error);
      return false;
    }
  }, [userId]);

  // Fetch taxes from the database
  const fetchTaxes = useCallback(async () => {
    if (!userId) return;
    
    setLoadingTaxes(true);
    try {
      const { data, error } = await supabase
        .from("taxes")
        .select("*")
        .eq("user_id", userId)
        .order("tax_name", { ascending: true });

      if (error) throw error;
      
      // If no taxes exist, initialize default taxes for new users
      if (!data || data.length === 0) {
        const initialized = await initializeDefaultTaxes();
        if (initialized) {
          // Re-fetch taxes after initialization
          const { data: newData, error: newError } = await supabase
            .from("taxes")
            .select("*")
            .eq("user_id", userId)
            .order("tax_name", { ascending: true });
          
          if (!newError) {
            setTaxes(newData || []);
          }
        }
      } else {
        setTaxes(data);
      }
    } catch (error) {
      console.error("Error fetching taxes:", error);
      setTaxes([]);
    } finally {
      setLoadingTaxes(false);
    }
  }, [userId, initializeDefaultTaxes]);

  useEffect(() => {
    fetchTaxes();
  }, [fetchTaxes]);

  // Debounced update function
  const debounceUpdate = useCallback((key, callback, delay = 500) => {
    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key]);
    }
    debounceTimers.current[key] = setTimeout(callback, delay);
  }, []);

  const handleInputChange = (field) => {
    if (!userId) return;

    debounceUpdate(`income-${field}`, async () => {
      try {
        const updatedValue =
          field === "payFrequency" ? tempValue : Number(tempValue);
        
        const updatedIncomeData = { ...incomeData, [field]: updatedValue };
        const { monthlyTakeHomePay } = calculateTaxes(updatedIncomeData);

        // Encrypt sensitive fields before saving
        let valueToSave = updatedValue;
        if (field === "yearlySalary" || field === "retirementContribution" || field === "employerMatch") {
          valueToSave = encryptValue(updatedValue, userId);
        }

        const encryptedMonthlyTakeHome = encryptValue(monthlyTakeHomePay, userId);

        const { error } = await supabase
          .from("income")
          .update({ [field]: valueToSave, monthlyTakeHome: encryptedMonthlyTakeHome })
          .eq("id", incomeData.id)
          .eq("user_id", userId);

        if (error) {
          console.error("Error updating income data:", error);
        } else {
          setEditableField(null);
          await refetchIncome();
        }
      } catch (err) {
        console.error("Unexpected error:", err);
      }
    });
  };

  const handleCellClick = (field) => {
    setTempValue(incomeData[field]);
    setEditableField(field);

  };

  // Handle tax rate changes
  const handleTaxChange = (taxId, value) => {
    const numericValue = parseFloat(value) || 0;
    
    // Update local state immediately
    setTaxes((prev) =>
      prev.map((tax) => (tax.id === taxId ? { ...tax, percent: numericValue } : tax))
    );
    
    debounceUpdate(`tax-${taxId}`, async () => {
      const { error } = await supabase
        .from("taxes")
        .update({ percent: numericValue })
        .eq("id", taxId);
      
      if (error) {
        console.error("Error updating tax:", error);
        fetchTaxes();
      }
    });
  };

  // Handle tax name changes
  const handleTaxNameChange = (taxId, value) => {
    // Update local state immediately
    setTaxes((prev) =>
      prev.map((tax) => (tax.id === taxId ? { ...tax, tax_name: value } : tax))
    );
    
    debounceUpdate(`tax-name-${taxId}`, async () => {
      const { error } = await supabase
        .from("taxes")
        .update({ tax_name: value })
        .eq("id", taxId);
      
      if (error) {
        console.error("Error updating tax name:", error);
        fetchTaxes();
      }
    });
  };

  // Add new tax
  const handleAddTax = async () => {
    if (!userId) return;

    const newTax = {
      user_id: userId,
      tax_name: "New Tax",
      percent: 0,
    };

    try {
      const { error } = await supabase.from("taxes").insert([newTax]);
      
      if (error) {
        console.error("Error adding tax:", error);
        alert(`Error adding tax: ${error.message}`);
      } else {
        await fetchTaxes();
      }
    } catch (error) {
      console.error("Error adding tax:", error);
    }
  };

  // Delete tax
  const handleDeleteTax = async (taxId) => {
    // Update local state immediately
    setTaxes((prev) => prev.filter((tax) => tax.id !== taxId));
    
    try {
      const { error } = await supabase.from("taxes").delete().eq("id", taxId);
      
      if (error) {
        console.error("Error deleting tax:", error);
        alert(`Error deleting tax: ${error.message}`);
        fetchTaxes();
      }
    } catch (error) {
      console.error("Error deleting tax:", error);
      fetchTaxes();
    }
  };

  const calculateTaxes = (data = incomeData) => {
    const {
      yearlySalary = 0,
      retirementContribution = 0,
      employerMatch = 0,
    } = data;

    const annualRetirementContribution =
      yearlySalary * (retirementContribution / 100);
    const employerMatchAmount = yearlySalary * (employerMatch / 100);
    const totalAnnual401K = annualRetirementContribution + employerMatchAmount;

    // Calculate total taxes from taxes table
    const totalTaxes = taxes.reduce((sum, tax) => {
      return sum + (yearlySalary * (tax.percent / 100));
    }, 0);

    const takeHomePay =
      yearlySalary - totalTaxes - annualRetirementContribution;

    // Calculate individual tax amounts
    const taxAmounts = taxes.reduce((acc, tax) => {
      acc[tax.id] = yearlySalary * (tax.percent / 100);
      return acc;
    }, {});

    return {
      totalAnnual401K: Number(totalAnnual401K.toFixed(2)),
      takeHomePay: Number(takeHomePay.toFixed(2)),
      monthlyTakeHomePay: Number((takeHomePay / 12).toFixed(4)),
      totalTaxes: Number(totalTaxes.toFixed(2)),
      taxAmounts,
    };
  };

  const {
    totalAnnual401K,
    takeHomePay,
    monthlyTakeHomePay,
    totalTaxes,
    taxAmounts,
  } = calculateTaxes();

  return (
    <div className="w-full mx-auto p-8 bg-white dark:bg-slate-800 shadow-xl rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-center mb-8">
        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full mr-4">
          <DollarSign className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
          Income & Taxes
        </h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-3 md:p-6 rounded-lg border-2 border-green-200 dark:border-green-700 shadow-sm">
          <div className="text-xs md:text-sm font-medium text-green-700 dark:text-green-300 mb-1">
            Annual Take Home
          </div>
          <div className="text-lg md:text-3xl font-bold text-green-600 dark:text-green-400">
            ${formatCurrency(takeHomePay)}
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-3 md:p-6 rounded-lg border-2 border-blue-200 dark:border-blue-700 shadow-sm">
          <div className="text-xs md:text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
            Monthly Take Home
          </div>
          <div className="text-lg md:text-3xl font-bold text-blue-600 dark:text-blue-400">
            ${formatCurrency(monthlyTakeHomePay)}
          </div>
        </div>

        <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-800/20 p-3 md:p-6 rounded-lg border-2 border-cyan-200 dark:border-cyan-700 shadow-sm">
          <div className="text-xs md:text-sm font-medium text-cyan-700 dark:text-cyan-300 mb-1">
            <span className="hidden sm:inline">Take Home ({incomeData.payFrequency})</span>
            <span className="sm:hidden">Pay Period</span>
          </div>
          <div className="text-lg md:text-3xl font-bold text-cyan-600 dark:text-cyan-400">
            ${formatCurrency((() => {
              switch (incomeData.payFrequency) {
                case "Weekly":
                  return (takeHomePay / 52);
                case "Bi-Weekly":
                  return (takeHomePay / 26);
                case "Semi-Monthly":
                  return (takeHomePay / 24);
                case "Monthly":
                default:
                  return (takeHomePay / 12);
              }
            })())}
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-3 md:p-6 rounded-lg border-2 border-purple-200 dark:border-purple-700 shadow-sm">
          <div className="text-xs md:text-sm font-medium text-purple-700 dark:text-purple-300 mb-1">
            Annual 401K
          </div>
          <div className="text-lg md:text-3xl font-bold text-purple-600 dark:text-purple-400">
            ${formatCurrency(totalAnnual401K)}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gray-50 dark:bg-slate-700/50 p-6 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Earnings</h2>
          </div>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Pay Frequency</label>
              <select
                value={
                  editableField === "payFrequency"
                    ? tempValue
                    : incomeData.payFrequency
                }
                onChange={async (e) => {
                  const value = e.target.value;
                  setEditableField("payFrequency");
                  setTempValue(value);
                  // Immediate update for select dropdown (no debounce)
                  try {
                    const updatedIncomeData = { ...incomeData, payFrequency: value };
                    const { monthlyTakeHomePay } = calculateTaxes(updatedIncomeData);
                    const { error } = await supabase
                      .from("income")
                      .update({ payFrequency: value, monthlyTakeHome: monthlyTakeHomePay })
                      .eq("id", incomeData.id)
                      .eq("user_id", userId);
                    if (!error) {
                      setEditableField(null);
                      // Update incomeData directly without refetch to avoid race condition
                      incomeData.payFrequency = value;
                    }
                  } catch (err) {
                    console.error("Error updating payFrequency:", err);
                  }
                }}
                className="w-full px-4 py-3 bg-white dark:bg-slate-600 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all cursor-pointer"
              >
                {["Weekly", "Bi-Weekly", "Monthly", "Semi-Monthly"].map(
                  (freq) => (
                    <option key={freq} value={freq}>
                      {freq}
                    </option>
                  )
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Yearly Salary</label>
              <input
                type="number"
                value={
                  editableField === "yearlySalary"
                    ? tempValue
                    : incomeData.yearlySalary
                }
                onChange={(e) => setTempValue(e.target.value)}
                onBlur={() => handleInputChange("yearlySalary")}
                onClick={() => handleCellClick("yearlySalary")}
                className="w-full px-4 py-3 bg-white dark:bg-slate-600 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-slate-700/50 p-6 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-2 mb-6">
            <PiggyBank className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">
              Retirement
            </h2>
          </div>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                401K Contribution (%)
              </label>
              <input
                type="number"
                value={
                  editableField === "retirementContribution"
                    ? tempValue
                    : incomeData.retirementContribution
                }
                onChange={(e) => setTempValue(e.target.value)}
                onBlur={() => handleInputChange("retirementContribution")}
                onClick={() => handleCellClick("retirementContribution")}
                className="w-full px-4 py-3 bg-white dark:bg-slate-600 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Employer Match (%)
              </label>
              <input
                type="number"
                value={
                  editableField === "employerMatch"
                    ? tempValue
                    : incomeData.employerMatch
                }
                onChange={(e) => setTempValue(e.target.value)}
                onBlur={() => handleInputChange("employerMatch")}
                onClick={() => handleCellClick("employerMatch")}
                className="w-full px-4 py-3 bg-white dark:bg-slate-600 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="bg-gray-50 dark:bg-slate-700/50 p-6 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-gray-200">Taxes</h2>
            </div>
            <button
              onClick={handleAddTax}
              className="flex items-center justify-center gap-2 bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all font-medium w-full sm:w-auto"
            >
              <PlusCircle size={18} />
              Add Tax
            </button>
          </div>
          
          {loadingTaxes ? (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              Loading taxes...
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {taxes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <p className="mb-2">No taxes configured yet.</p>
                    <p className="text-sm">Click "Add Tax" to add tax rates.</p>
                  </div>
                ) : (
                  taxes.map((tax) => (
                    <div key={tax.id} className="bg-gray-50 dark:bg-slate-700/50 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                      {/* Mobile Layout */}
                      <div className="flex flex-col sm:hidden gap-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={tax.tax_name}
                            onChange={(e) => handleTaxNameChange(tax.id, e.target.value)}
                            className="flex-1 min-w-0 px-3 py-2 bg-white dark:bg-slate-600 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all text-sm"
                            placeholder="Tax name"
                          />
                          <button
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete "${tax.tax_name}"?`)) {
                                handleDeleteTax(tax.id);
                              }
                            }}
                            className="p-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all flex-shrink-0"
                            title="Delete tax"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Rate</label>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.01"
                                value={tax.percent}
                                onChange={(e) => handleTaxChange(tax.id, e.target.value)}
                                className="w-full px-3 py-2 pr-7 bg-white dark:bg-slate-600 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all text-sm"
                                placeholder="0.00"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm font-medium">
                                %
                              </span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Annual Amount</label>
                            <input
                              type="text"
                              value={`$${formatCurrency(taxAmounts[tax.id] || 0)}`}
                              readOnly
                              className="w-full px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg text-gray-800 dark:text-white font-semibold text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Desktop Layout */}
                      <div className="hidden sm:flex items-center gap-2">
                        <div className="flex-grow">
                          <input
                            type="text"
                            value={tax.tax_name}
                            onChange={(e) => handleTaxNameChange(tax.id, e.target.value)}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-600 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                            placeholder="Tax name"
                          />
                        </div>
                        <div className="w-32">
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              value={tax.percent}
                              onChange={(e) => handleTaxChange(tax.id, e.target.value)}
                              className="w-full px-3 py-3 pr-8 bg-white dark:bg-slate-600 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                              placeholder="0.00"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">
                              %
                            </span>
                          </div>
                        </div>
                        <div className="w-40">
                          <input
                            type="text"
                            value={`$${formatCurrency(taxAmounts[tax.id] || 0)}`}
                            readOnly
                            className="w-full px-4 py-3 bg-gray-100 dark:bg-slate-600/50 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-white font-semibold text-center"
                          />
                        </div>
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete "${tax.tax_name}"?`)) {
                              handleDeleteTax(tax.id);
                            }
                          }}
                          className="p-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                          title="Delete tax"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {taxes.length > 0 && (
                <div className="mt-6 pt-5 border-t-2 border-gray-300 dark:border-gray-600">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <label className="text-sm sm:text-base font-bold text-gray-800 dark:text-gray-200 flex-grow">
                      Total Annual Taxes
                    </label>
                    <div className="w-full sm:w-48">
                      <input
                        type="text"
                        value={`$${formatCurrency(totalTaxes)}`}
                        readOnly
                        className="w-full px-4 py-3 bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-300 dark:border-blue-700 rounded-lg text-gray-800 dark:text-white font-bold text-center"
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Income;
