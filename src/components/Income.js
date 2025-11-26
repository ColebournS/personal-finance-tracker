import React, { useState, useCallback, useRef } from "react";
import supabase from "../supabaseClient";
import { useData } from "../DataContext";

function Income() {
  const { income: incomeData, userId, refetchIncome } = useData();
  const [editableField, setEditableField] = useState(null);
  const [tempValue, setTempValue] = useState(null);
  const debounceTimers = useRef({});

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
    <div className="w-full mx-auto p-6 bg-white dark:bg-slate-800 shadow-lg rounded-lg">
      <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-6">
        Income
      </h1>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg border dark:border-gray-600">
          <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">Earnings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-600 dark:text-gray-300 mb-2">Pay Frequency</label>
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
                className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-slate-600 text-gray-800 dark:text-white"
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
              <label className="block text-gray-600 dark:text-gray-300 mb-2">Yearly Salary</label>
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
                className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-slate-600 text-gray-800 dark:text-white"
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg border dark:border-gray-600">
          <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">
            Retirement
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-600 dark:text-gray-300 mb-2">
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
                className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-slate-600 text-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-gray-600 dark:text-gray-300 mb-2">
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
                className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-slate-600 text-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-gray-600 dark:text-gray-300 mb-2">
                Total Annual 401K
              </label>
              <input
                type="text"
                value={`$${totalAnnual401K}`}
                readOnly
                className="w-full p-2 border dark:border-gray-600 rounded-md bg-gray-200 dark:bg-slate-600 text-gray-800 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg border dark:border-gray-600">
          <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">Taxes</h2>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="flex-grow">
                <label className="block text-gray-600 dark:text-gray-300 mb-2">
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
                  className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-slate-600 text-gray-800 dark:text-white"
                />
              </div>
              <div className="flex-grow mt-auto">
                <label className="block text-gray-600 dark:text-gray-300 mb-2"></label>
                <input
                  type="text"
                  value={`$${federalTax}`}
                  readOnly
                  className="w-full p-2 border dark:border-gray-600 rounded-md bg-gray-200 dark:bg-slate-600 text-gray-800 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex-grow">
                <label className="block text-gray-600 dark:text-gray-300 mb-2">
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
                  className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-slate-600 text-gray-800 dark:text-white"
                />
              </div>
              <div className="flex-grow mt-auto">
                <label className="block text-gray-600 dark:text-gray-300 mb-2"></label>
                <input
                  type="text"
                  value={`$${medicareTax}`}
                  readOnly
                  className="w-full p-2 border dark:border-gray-600 rounded-md bg-gray-200 dark:bg-slate-600 text-gray-800 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex-grow">
                <label className="block text-gray-600 dark:text-gray-300 mb-2">
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
                  className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-slate-600 text-gray-800 dark:text-white"
                />
              </div>
              <div className="flex-grow mt-auto">
                <label className="block text-gray-600 dark:text-gray-300 mb-2"></label>
                <input
                  type="text"
                  value={`$${socialSecurityTax}`}
                  readOnly
                  className="w-full p-2 border dark:border-gray-600 rounded-md bg-gray-200 dark:bg-slate-600 text-gray-800 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex-grow">
                <label className="block text-gray-600 dark:text-gray-300 mb-2">
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
                  className="w-full p-2 border dark:border-gray-600 rounded-md bg-white dark:bg-slate-600 text-gray-800 dark:text-white"
                />
              </div>
              <div className="flex-grow mt-auto">
                <label className="block text-gray-600 dark:text-gray-300 mb-2"></label>
                <input
                  type="text"
                  value={`$${stateTax}`}
                  readOnly
                  className="w-full p-2 border dark:border-gray-600 rounded-md bg-gray-200 dark:bg-slate-600 text-gray-800 dark:text-white"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2 mt-4 pt-4 border-t dark:border-gray-600">
              <div className="flex-grow">
                <label className="block text-gray-600 dark:text-gray-300 mb-2 font-semibold">
                  Total Annual Taxes
                </label>
              </div>
              <div className="flex-grow">
                <input
                  type="text"
                  value={`$${(
                    federalTax +
                    medicareTax +
                    socialSecurityTax +
                    stateTax
                  ).toFixed(2)}`}
                  readOnly
                  className="w-full p-2 border dark:border-gray-600 rounded-md bg-gray-200 dark:bg-slate-600 text-gray-800 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg border dark:border-gray-600">
          <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">
            Income Summary
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-600 dark:text-gray-300 mb-2">
                Take Home Pay ({incomeData.payFrequency})
              </label>
              <input
                type="text"
                value={`$${(() => {
                  switch (incomeData.payFrequency) {
                    case "Weekly":
                      return (takeHomePay / 52).toFixed(2);
                    case "Bi-Weekly":
                      return (takeHomePay / 26).toFixed(2);
                    case "Semi-Monthly":
                      return (takeHomePay / 24).toFixed(2);
                    case "Monthly":
                    default:
                      return (takeHomePay / 12).toFixed(2);
                  }
                })()}`}
                readOnly
                className="w-full p-2 border dark:border-gray-600 rounded-md bg-gray-200 dark:bg-slate-600 text-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-gray-600 dark:text-gray-300 mb-2">
                Annual Take Home Pay
              </label>
              <input
                type="text"
                value={`$${takeHomePay}`}
                readOnly
                className="w-full p-2 border dark:border-gray-600 rounded-md bg-gray-200 dark:bg-slate-600 text-gray-800 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Income;
