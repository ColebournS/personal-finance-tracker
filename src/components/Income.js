import React, { useState, useCallback, useRef } from "react";
import supabase from "../supabaseClient";
import { useData } from "../DataContext";
import { DollarSign, PiggyBank, Receipt, TrendingUp } from "lucide-react";

function Income() {
  const { income: incomeData, userId, refetchIncome } = useData();
  const [editableField, setEditableField] = useState(null);
  const [tempValue, setTempValue] = useState(null);
  const debounceTimers = useRef({});

  // Format number with commas and 2 decimal places
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

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


        const { error } = await supabase
          .from("income")
          .update({ [field]: updatedValue, monthlyTakeHome: monthlyTakeHomePay })
          .eq("id", incomeData.id)
          .eq("user_id", userId); // Ensure we're only updating this user's record

        if (error) {
          console.error("Error updating income data:", error);
        } else {
          setEditableField(null);
          await refetchIncome(); // Refresh data after update
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

  const calculateTaxes = (data = incomeData) => {
    const {
      yearlySalary = 0,
      retirementContribution = 0,
      employerMatch = 0,
      federalTaxRate = 0,
      medicareTaxRate = 0,
      socialSecurityTaxRate = 0,
      stateTaxRate = 0,
    } = data;

    const annualRetirementContribution =
      yearlySalary * (retirementContribution / 100);
    const employerMatchAmount = yearlySalary * (employerMatch / 100);
    const totalAnnual401K = annualRetirementContribution + employerMatchAmount;

    const federalTax = yearlySalary * (federalTaxRate / 100);
    const medicareTax = yearlySalary * (medicareTaxRate / 100);
    const socialSecurityTax = yearlySalary * (socialSecurityTaxRate / 100);
    const stateTax = yearlySalary * (stateTaxRate / 100);

    const totalTaxes = federalTax + medicareTax + socialSecurityTax + stateTax;
    const takeHomePay =
      yearlySalary - totalTaxes - annualRetirementContribution;

    return {
      totalAnnual401K: Number(totalAnnual401K.toFixed(2)),
      takeHomePay: Number(takeHomePay.toFixed(2)),
      monthlyTakeHomePay: Number((takeHomePay / 12).toFixed(4)),
      federalTax: Number(federalTax.toFixed(2)),
      medicareTax: Number(medicareTax.toFixed(2)),
      socialSecurityTax: Number(socialSecurityTax.toFixed(2)),
      stateTax: Number(stateTax.toFixed(2)),
    };
  };

  const {
    totalAnnual401K,
    takeHomePay,
    monthlyTakeHomePay,
    federalTax,
    medicareTax,
    socialSecurityTax,
    stateTax,
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-6 rounded-lg border-2 border-green-200 dark:border-green-700 shadow-sm">
          <div className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">
            Annual Take Home
          </div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
            ${formatCurrency(takeHomePay)}
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-lg border-2 border-blue-200 dark:border-blue-700 shadow-sm">
          <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
            Monthly Take Home
          </div>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            ${formatCurrency(monthlyTakeHomePay)}
          </div>
        </div>

        <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-800/20 p-6 rounded-lg border-2 border-cyan-200 dark:border-cyan-700 shadow-sm">
          <div className="text-sm font-medium text-cyan-700 dark:text-cyan-300 mb-1">
            Take Home ({incomeData.payFrequency})
          </div>
          <div className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
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

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-6 rounded-lg border-2 border-purple-200 dark:border-purple-700 shadow-sm">
          <div className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-1">
            Annual 401K
          </div>
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
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
                      await refetchIncome();
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
          <div className="flex items-center gap-2 mb-6">
            <Receipt className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Taxes</h2>
          </div>
          <div className="space-y-5">
            <div className="flex items-center space-x-2">
              <div className="flex-grow">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Federal Tax (%)
                </label>
                <input
                  type="number"
                  value={
                    editableField === "federalTaxRate"
                      ? tempValue
                      : incomeData.federalTaxRate
                  }
                  onChange={(e) => setTempValue(e.target.value)}
                  onBlur={() => handleInputChange("federalTaxRate")}
                  onClick={() => handleCellClick("federalTaxRate")}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-600 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all cursor-pointer"
                />
              </div>
              <div className="flex-grow mt-auto">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"></label>
                <input
                  type="text"
                  value={`$${formatCurrency(federalTax)}`}
                  readOnly
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-slate-600/50 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-white font-semibold"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex-grow">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Medicare Tax (%)
                </label>
                <input
                  type="number"
                  value={
                    editableField === "medicareTaxRate"
                      ? tempValue
                      : incomeData.medicareTaxRate
                  }
                  onChange={(e) => setTempValue(e.target.value)}
                  onBlur={() => handleInputChange("medicareTaxRate")}
                  onClick={() => handleCellClick("medicareTaxRate")}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-600 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all cursor-pointer"
                />
              </div>
              <div className="flex-grow mt-auto">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"></label>
                <input
                  type="text"
                  value={`$${formatCurrency(medicareTax)}`}
                  readOnly
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-slate-600/50 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-white font-semibold"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex-grow">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Social Security Tax (%)
                </label>
                <input
                  type="number"
                  value={
                    editableField === "socialSecurityTaxRate"
                      ? tempValue
                      : incomeData.socialSecurityTaxRate
                  }
                  onChange={(e) => setTempValue(e.target.value)}
                  onBlur={() => handleInputChange("socialSecurityTaxRate")}
                  onClick={() => handleCellClick("socialSecurityTaxRate")}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-600 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all cursor-pointer"
                />
              </div>
              <div className="flex-grow mt-auto">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"></label>
                <input
                  type="text"
                  value={`$${formatCurrency(socialSecurityTax)}`}
                  readOnly
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-slate-600/50 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-white font-semibold"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex-grow">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  State Tax (%)
                </label>
                <input
                  type="number"
                  value={
                    editableField === "stateTaxRate"
                      ? tempValue
                      : incomeData.stateTaxRate
                  }
                  onChange={(e) => setTempValue(e.target.value)}
                  onBlur={() => handleInputChange("stateTaxRate")}
                  onClick={() => handleCellClick("stateTaxRate")}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-600 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all cursor-pointer"
                />
              </div>
              <div className="flex-grow mt-auto">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"></label>
                <input
                  type="text"
                  value={`$${formatCurrency(stateTax)}`}
                  readOnly
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-slate-600/50 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-white font-semibold"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2 mt-6 pt-5 border-t-2 border-gray-300 dark:border-gray-600">
              <div className="flex-grow">
                <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">
                  Total Annual Taxes
                </label>
              </div>
              <div className="flex-grow">
                <input
                  type="text"
                  value={`$${formatCurrency(
                    federalTax +
                    medicareTax +
                    socialSecurityTax +
                    stateTax
                  )}`}
                  readOnly
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-slate-600/50 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-white font-semibold"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Income;
