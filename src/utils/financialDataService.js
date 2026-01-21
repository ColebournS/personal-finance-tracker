import { useData } from '../DataContext';

// Financial data analysis utilities
export const analyzeSpendingPatterns = (purchases, budgetGroups) => {
  const analysis = {
    totalSpent: 0,
    spendingByCategory: {},
    recentTransactions: [],
    topSpendingCategories: [],
    budgetUtilization: {},
    monthlyTrends: {}
  };

  // Get current month's date range
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // Filter purchases to current month only
  const currentMonthPurchases = purchases.filter(purchase => {
    const purchaseDate = new Date(purchase.timestamp);
    return purchaseDate.getMonth() === currentMonth && purchaseDate.getFullYear() === currentYear;
  });

  // Calculate total spending and by category for current month
  currentMonthPurchases.forEach(purchase => {
    const cost = parseFloat(purchase.cost) || 0;
    analysis.totalSpent += cost;
    
    const categoryName = purchase.budget_items?.budget_groups?.name || 'Uncategorized';
    analysis.spendingByCategory[categoryName] = (analysis.spendingByCategory[categoryName] || 0) + cost;
  });

  // Get recent transactions from current month (last 10)
  analysis.recentTransactions = currentMonthPurchases.slice(0, 10);

  // Sort categories by spending
  analysis.topSpendingCategories = Object.entries(analysis.spendingByCategory)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([category, amount]) => ({ category, amount }));

  // Calculate budget utilization
  budgetGroups.forEach(group => {
    const groupBudget = group.budget_items.reduce((sum, item) => sum + (item.budget || 0), 0);
    const groupSpending = analysis.spendingByCategory[group.name] || 0;
    analysis.budgetUtilization[group.name] = {
      budget: groupBudget,
      spent: groupSpending,
      utilization: groupBudget > 0 ? (groupSpending / groupBudget) * 100 : 0
    };
  });

  // Debug budget utilization
  console.log('Budget Utilization Debug:', {
    spendingByCategory: analysis.spendingByCategory,
    budgetUtilization: analysis.budgetUtilization,
    budgetGroups: budgetGroups.map(g => ({ name: g.name, items: g.budget_items.length }))
  });

  return analysis;
};

export const analyzeIncomeHealth = (income) => {
  if (!income) return null;

  const monthlyTakeHome = parseFloat(income.monthlyTakeHome) || 0;
  const yearlySalary = parseFloat(income.yearlySalary) || 0;
  const retirementContribution = parseFloat(income.retirementContribution) || 0;

  console.log('Income Analysis Debug:', {
    monthlyTakeHome,
    yearlySalary,
    retirementContribution,
    retirementRate: yearlySalary > 0 ? (retirementContribution / yearlySalary) * 100 : 0
  });

  return {
    monthlyTakeHome,
    yearlySalary,
    retirementContribution,
    retirementRate: yearlySalary > 0 ? (retirementContribution / yearlySalary) * 100 : 0,
    monthlyToYearlyRatio: yearlySalary > 0 ? (monthlyTakeHome * 12) / yearlySalary : 0
  };
};

export const generateFinancialSummary = (income, budgetGroups, purchases) => {
  const spendingAnalysis = analyzeSpendingPatterns(purchases, budgetGroups);
  const incomeAnalysis = analyzeIncomeHealth(income);

  const totalBudget = budgetGroups.reduce((sum, group) => 
    sum + group.budget_items.reduce((itemSum, item) => itemSum + (item.budget || 0), 0), 0
  );

  const budgetStatus = {
    totalBudget,
    totalSpent: spendingAnalysis.totalSpent,
    remaining: totalBudget - spendingAnalysis.totalSpent,
    overBudgetCategories: Object.entries(spendingAnalysis.budgetUtilization)
      .filter(([, data]) => data.utilization > 100)
      .map(([category]) => category)
  };

  return {
    income: incomeAnalysis,
    spending: spendingAnalysis,
    budget: budgetStatus,
    financialHealth: {
      disposableIncome: incomeAnalysis ? incomeAnalysis.monthlyTakeHome - spendingAnalysis.totalSpent : 0,
      savingsRate: incomeAnalysis ? ((incomeAnalysis.monthlyTakeHome - spendingAnalysis.totalSpent) / incomeAnalysis.monthlyTakeHome) * 100 : 0
    }
  };
};

// Custom hook for AI Assistant to get user financial data
export const useFinancialDataForAI = () => {
  const { income, budgetGroups, purchases, loading, error } = useData();
  
  const getFinancialContext = () => {
    if (loading || error) return null;
    
    const summary = generateFinancialSummary(income, budgetGroups, purchases);
    
    return {
      summary,
      rawData: {
        income,
        budgetGroups,
        purchases: purchases.slice(0, 50) // Limit to recent 50 purchases for context
      }
    };
  };

  return {
    financialData: getFinancialContext(),
    loading,
    error
  };
};
