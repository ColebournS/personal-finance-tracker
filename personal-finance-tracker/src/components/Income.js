import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";

function Income() {
  const [incomeData, setIncomeData] = useState({
    payFrequency: "Bi-Weekly",
    yearlySalary: 0,
    retirementContribution: 0,
    employerMatch: 0,
    federalTaxRate: 0,
    medicareTaxRate: 0,
    socialSecurityTaxRate: 0,
    stateTaxRate: 0,
  });

  useEffect(() => {
    const unsubscribeIncome = onSnapshot(
      doc(db, "income", "6fDvqsiVa12iasAeX9x3"),
      (snapshot) => {
        const data = snapshot.data() || incomeData;
        setIncomeData(data);
      }
    );

    return () => unsubscribeIncome();
  }, [incomeData]);

  const handleInputChange = async (field, value) => {
    const incomeRef = doc(db, "income", "6fDvqsiVa12iasAeX9x3");
    await updateDoc(incomeRef, {
      [field]: field === "payFrequency" ? value : Number(value),
    });
  };

  const calculateTaxes = () => {
    const {
      yearlySalary,
      retirementContribution,
      employerMatch,
      federalTaxRate,
      medicareTaxRate,
      socialSecurityTaxRate,
      stateTaxRate,
    } = incomeData;

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
      federalTax: Number(federalTax.toFixed(2)),
      medicareTax: Number(medicareTax.toFixed(2)),
      socialSecurityTax: Number(socialSecurityTax.toFixed(2)),
      stateTax: Number(stateTax.toFixed(2)),
    };
  };

  const {
    totalAnnual401K,
    takeHomePay,
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
                value={incomeData.payFrequency}
                onChange={(e) =>
                  handleInputChange("payFrequency", e.target.value)
                }
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
                value={incomeData.yearlySalary}
                onChange={(e) =>
                  handleInputChange("yearlySalary", e.target.value)
                }
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
                value={incomeData.retirementContribution}
                onChange={(e) =>
                  handleInputChange("retirementContribution", e.target.value)
                }
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-gray-600 mb-2">
                Employer Match (%)
              </label>
              <input
                type="number"
                value={incomeData.employerMatch}
                onChange={(e) =>
                  handleInputChange("employerMatch", e.target.value)
                }
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
                  value={incomeData.federalTaxRate}
                  onChange={(e) =>
                    handleInputChange("federalTaxRate", e.target.value)
                  }
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
                  value={incomeData.medicareTaxRate}
                  onChange={(e) =>
                    handleInputChange("medicareTaxRate", e.target.value)
                  }
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

            <div className="flex items-center space-x-2 ">
              <div className="flex-grow">
                <label className="block text-gray-600 mb-2">
                  Social Security Tax (%)
                </label>
                <input
                  type="number"
                  value={incomeData.socialSecurityTaxRate}
                  onChange={(e) =>
                    handleInputChange("socialSecurityTaxRate", e.target.value)
                  }
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
                  value={incomeData.stateTaxRate}
                  onChange={(e) =>
                    handleInputChange("stateTaxRate", e.target.value)
                  }
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
                  switch(incomeData.payFrequency) {
                    case 'Weekly':
                      return (takeHomePay / 52).toFixed(2);
                    case 'Bi-Weekly':
                      return (takeHomePay / 26).toFixed(2);
                    case 'Semi-Monthly':
                      return (takeHomePay / 24).toFixed(2);
                    case 'Monthly':
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
