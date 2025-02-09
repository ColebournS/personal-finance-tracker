import React, { useState, useEffect } from "react";
import supabase from "../supabaseClient";

function Income() {
  const [incomeData, setIncomeData] = useState({});
  const [editableField, setEditableField] = useState(null);
  const [tempValue, setTempValue] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    // Get the current user's ID when component mounts
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        await checkAndCreateIncomeRecord(user.id);
      }
    };
    getCurrentUser();
  }, []);

  // Check if user has an income record, create one if they don't
  const checkAndCreateIncomeRecord = async (uid) => {
    const { error } = await supabase
      .from("income")
      .select("*")
      .eq("user_id", uid)
      .single();
    
    if (error && error.code === "PGRST116") {
      // no rows returned
      // Create default income record for new user
      const defaultIncomeData = {
        user_id: uid,
        yearlySalary: 50000,
        retirementContribution: 3,
        employerMatch: 3,
        federalTaxRate: 10.59,
        medicareTaxRate: 1.45,
        socialSecurityTaxRate: 6.2,
        stateTaxRate: 5,
        monthlyTakeHome: 3073.33,
      };

      const { error: insertError } = await supabase
        .from("income")
        .insert([defaultIncomeData]);

      if (insertError) {
        console.error("Error creating income record:", insertError);
      }
    }
  };

  useEffect(() => {
    if (userId) {
      fetchIncomeData();

      const incomeChannel = supabase
        .channel(`income_changes_${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "income",
            match: { user_id: userId },
          },
          () => fetchIncomeData()
        )
        .subscribe();

      return () => {
        incomeChannel.unsubscribe();
      };
    }
  }, [userId]);

  const fetchIncomeData = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("income")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) {
        console.error("Error fetching income data:", error);
      } else if (data) {
        setIncomeData(data);
      }
    } catch (err) {
      console.error("Error:", err);
    }
  };

  const handleInputChange = async (field) => {
    if (!userId) return;

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
        await fetchIncomeData(); // Refresh data after update
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    }
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
    <div className="w-full mx-auto p-6 bg-white shadow-lg rounded-lg">
      <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
        Income
      </h1>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gray-50 p-4 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Earnings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-600 mb-2">Pay Frequency</label>
              <select
                value={
                  editableField === "payFrequency"
                    ? tempValue
                    : incomeData.payFrequency
                }
                onChange={(e) => {
                  setEditableField("payFrequency");
                  setTempValue(e.target.value);
                  handleInputChange("payFrequency");
                }}
                className="w-full p-2 border rounded-md"
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
              <label className="block text-gray-600 mb-2">Yearly Salary</label>
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
                className="w-full p-2 border rounded-md"
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">
            Retirement
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-600 mb-2">
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
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-gray-600 mb-2">
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
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-gray-600 mb-2">
                Total Annual 401K
              </label>
              <input
                type="text"
                value={`$${totalAnnual401K}`}
                readOnly
                className="w-full p-2 border rounded-md bg-gray-200"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <div className="bg-gray-50 p-4 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Taxes</h2>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="flex-grow">
                <label className="block text-gray-600 mb-2">
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
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <div className="flex-grow mt-auto">
                <label className="block text-gray-600 mb-2"></label>
                <input
                  type="text"
                  value={`$${federalTax}`}
                  readOnly
                  className="w-full p-2 border rounded-md bg-gray-200"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex-grow">
                <label className="block text-gray-600 mb-2">
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
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <div className="flex-grow mt-auto">
                <label className="block text-gray-600 mb-2"></label>
                <input
                  type="text"
                  value={`$${medicareTax}`}
                  readOnly
                  className="w-full p-2 border rounded-md bg-gray-200"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex-grow">
                <label className="block text-gray-600 mb-2">
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
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <div className="flex-grow mt-auto">
                <label className="block text-gray-600 mb-2"></label>
                <input
                  type="text"
                  value={`$${socialSecurityTax}`}
                  readOnly
                  className="w-full p-2 border rounded-md bg-gray-200"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex-grow">
                <label className="block text-gray-600 mb-2">
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
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <div className="flex-grow mt-auto">
                <label className="block text-gray-600 mb-2"></label>
                <input
                  type="text"
                  value={`$${stateTax}`}
                  readOnly
                  className="w-full p-2 border rounded-md bg-gray-200"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2 mt-4 pt-4 border-t">
              <div className="flex-grow">
                <label className="block text-gray-600 mb-2 font-semibold">
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
                  className="w-full p-2 border rounded-md bg-gray-200"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">
            Income Summary
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-600 mb-2">
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
                className="w-full p-2 border rounded-md bg-gray-200"
              />
            </div>
            <div>
              <label className="block text-gray-600 mb-2">
                Annual Take Home Pay
              </label>
              <input
                type="text"
                value={`$${takeHomePay}`}
                readOnly
                className="w-full p-2 border rounded-md bg-gray-200"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Income;
