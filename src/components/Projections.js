import React, { useState, useEffect, useCallback } from "react";
import { TrendingUp } from "lucide-react";
import { useAuth } from "../AuthContext";
import supabase from "../supabaseClient";
import { decryptValue } from "../utils/encryption";

function Projections() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [projectionMonths, setProjectionMonths] = useState(12);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

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
    const monthlyRate = annualRate / 100 / 12;
    const monthlyContribution = Number(account.montly_contribution) || 0;
    
    if (['credit', 'loan'].includes(account.account_type)) {
      let balance = presentValue;
      for (let i = 0; i < months; i++) {
        if (balance <= 0) return 0;
        balance = balance * (1 + monthlyRate);
        balance = balance - monthlyContribution;
      }
      return Math.max(0, balance);
    }
    
    if (monthlyRate === 0) {
      return presentValue + (monthlyContribution * months);
    }
    
    const compoundFactor = Math.pow(1 + monthlyRate, months);
    const futureValueFromPresent = presentValue * compoundFactor;
    const futureValueFromContributions = monthlyContribution * ((compoundFactor - 1) / monthlyRate);
    
    return futureValueFromPresent + futureValueFromContributions;
  };

  // Generate projection data
  const projectionData = React.useMemo(() => {
    if (!accounts || !Array.isArray(accounts)) {
      return [];
    }
    
    const projectableAccounts = accounts.filter(
      acc => acc.account_type === 'investment' || acc.account_type === 'loan'
    );
    
    let monthsToShow;
    if (projectionMonths <= 12) {
      monthsToShow = [1, 3, 6, 12];
    } else if (projectionMonths <= 36) {
      monthsToShow = [6, 12, 24, 36];
    } else if (projectionMonths <= 60) {
      monthsToShow = [12, 24, 36, 60];
    } else if (projectionMonths <= 120) {
      monthsToShow = [12, 36, 60, 120];
    } else if (projectionMonths <= 180) {
      monthsToShow = [12, 60, 120, 180];
    } else {
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
  }, [accounts, projectionMonths]);

  // Calculate totals
  const totals = React.useMemo(() => {
    if (!accounts || !Array.isArray(accounts)) {
      return {
        totalInvestments: 0,
        totalLoans: 0,
        netWorth: 0
      };
    }
    
    const investmentsTotal = accounts
      .filter(acc => !['credit', 'loan'].includes(acc.account_type))
      .reduce((sum, acc) => sum + (Number(acc.value) || 0), 0);
    
    const loansTotal = accounts
      .filter(acc => ['credit', 'loan'].includes(acc.account_type))
      .reduce((sum, acc) => sum + (Number(acc.value) || 0), 0);
    
    return {
      totalInvestments: investmentsTotal,
      totalLoans: loansTotal,
      netWorth: investmentsTotal - loansTotal
    };
  }, [accounts]);

  if (loading) {
    return (
      <div className="w-full mx-auto p-6 bg-white dark:bg-slate-800 shadow-lg rounded-lg">
        <div className="text-center text-gray-600 dark:text-gray-300">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Future Value Projections */}
      {projectionData.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white truncate">
                Account Projections
              </h2>
            </div>

            <select
              value={projectionMonths}
              onChange={(e) => setProjectionMonths(Number(e.target.value))}
              className="px-2 py-1 sm:px-4 sm:py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all cursor-pointer text-sm sm:text-base"
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

          {/* Desktop Table View */}
          <div className="hidden md:block bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
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
                        let totalContributions = monthlyContribution * proj.month;
                        
                        let totalInterest;
                        if (['credit', 'loan'].includes(item.account.account_type)) {
                          // For loans: if balance is 0, calculate interest differently
                          if (proj.value === 0) {
                            // Loan is paid off, calculate total interest paid and actual contributions
                            const monthlyPayment = Number(item.account.montly_contribution || 0);
                            const monthlyRate = Number(item.account.interest_rate || 0) / 100 / 12;
                            
                            let totalInterestPaid = 0;
                            let actualContributions = 0;
                            let balance = initialValue;
                            let monthsPaid = 0;
                            
                            for (let i = 0; i < proj.month; i++) {
                              if (balance <= 0) break;
                              
                              const interestPayment = balance * monthlyRate;
                              totalInterestPaid += interestPayment;
                              actualContributions += monthlyPayment;
                              balance = balance * (1 + monthlyRate) - monthlyPayment;
                              monthsPaid++;
                            }
                            
                            totalInterest = totalInterestPaid;
                            // Update totalContributions to actual contributions made
                            totalContributions = actualContributions;
                          } else {
                            // Loan not paid off yet, use simple calculation
                            const principalReduction = Math.max(0, initialValue - proj.value);
                            totalInterest = Math.max(0, totalContributions - principalReduction);
                          }
                          
                          console.log('Loan calc:', {
                            account: item.account.name,
                            initialValue,
                            projValue: proj.value,
                            totalContributions,
                            totalInterest
                          });
                        } else {
                          // For investments: interest = future value - current value - total contributions
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
                        ${formatCurrency(totals.netWorth)}
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
                          totalFuture -= projValue;
                          totalContributions += contributions;
                          const principalReduction = initialValue - projValue;
                          const interestPaid = contributions - principalReduction;
                          totalInterest -= interestPaid;
                        } else {
                          totalFuture += projValue;
                          totalContributions += contributions;
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

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {projectionData.map((item) => (
              <div key={item.account.id} className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800 dark:text-white">
                    {item.account.name}
                  </h3>
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Current: ${formatCurrency(Number(item.account.value || 0))}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {item.projections.map((proj) => {
                    const initialValue = Number(item.account.value || 0);
                    const monthlyContribution = Number(item.account.montly_contribution || 0);
                    const totalContributions = monthlyContribution * proj.month;
                    
                    let totalInterest;
                    if (['credit', 'loan'].includes(item.account.account_type)) {
                      const principalReduction = initialValue - proj.value;
                      totalInterest = totalContributions - principalReduction;
                    } else {
                      totalInterest = proj.value - initialValue - totalContributions;
                    }
                    
                    return (
                      <div key={proj.month} className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
                        <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          {proj.month} {proj.month === 1 ? "Month" : "Months"}
                        </div>
                        <div className="font-bold text-gray-800 dark:text-white mb-2">
                          ${formatCurrency(proj.value)}
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-blue-600 dark:text-blue-400">
                            Contrib: ${formatCurrency(totalContributions)}
                          </div>
                          <div className={`text-xs ${
                            ['credit', 'loan'].includes(item.account.account_type)
                              ? "text-red-600 dark:text-red-400"
                              : "text-green-600 dark:text-green-400"
                          }`}>
                            {['credit', 'loan'].includes(item.account.account_type) ? "Int Paid" : "Int Earned"}: ${formatCurrency(Math.abs(totalInterest))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 p-4">
              <h3 className="font-bold text-gray-800 dark:text-white mb-3">Total Net Worth Projection</h3>
              <div className="grid grid-cols-2 gap-3">
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
                      totalFuture -= projValue;
                      totalContributions += contributions;
                      const principalReduction = initialValue - projValue;
                      const interestPaid = contributions - principalReduction;
                      totalInterest -= interestPaid;
                    } else {
                      totalFuture += projValue;
                      totalContributions += contributions;
                      const interestEarned = projValue - initialValue - contributions;
                      totalInterest += interestEarned;
                    }
                  });
                  
                  return (
                    <div key={proj.month} className="text-center">
                      <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                        {proj.month} {proj.month === 1 ? "Month" : "Months"}
                      </div>
                      <div className="font-bold text-gray-800 dark:text-white mb-1">
                        ${formatCurrency(totalFuture)}
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-blue-600 dark:text-blue-400">
                          Contrib: ${formatCurrency(totalContributions)}
                        </div>
                        <div className={`text-xs ${
                          totalInterest >= 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}>
                          Net Int: ${formatCurrency(Math.abs(totalInterest))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {projectionData.length === 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
          <div className="text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="text-gray-400 dark:text-gray-500">
                <TrendingUp size={40} />
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-base">
                No investment or loan accounts found
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-sm">
                Add investment or loan accounts to see future value projections
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Projections;
