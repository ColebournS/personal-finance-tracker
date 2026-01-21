// Database tool functions for the AI agent
import { decryptValue } from '../utils/encryption';

// Define asset and liability types once at module level
const ASSET_TYPES = ['investment', 'savings', 'checking', 'retirement', 'other'];
const LIABILITY_TYPES = ['loan', 'credit_card', 'mortgage', 'debt'];

export const createAgentTools = (income, budgetGroups, purchases, userId, accounts) => {
  const tools = [
    {
      type: "function",
      function: {
        name: "get_income_info",
        description: "Get the user's income information including salary, take-home pay, and retirement contributions",
        parameters: {
          type: "object",
          properties: {},
          required: []
        }
      }
    },
    {
      type: "function", 
      function: {
        name: "get_budget_groups",
        description: "Get all budget groups and their budget items with amounts",
        parameters: {
          type: "object",
          properties: {},
          required: []
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_accounts",
        description: "Get all user accounts including investment accounts, savings accounts, and other financial accounts with their values and interest rates",
        parameters: {
          type: "object",
          properties: {
            account_type: {
              type: "string",
              description: "Filter by account type (optional): 'investment', 'savings', 'checking', 'credit_card', 'loan', etc."
            },
            sort_by: {
              type: "string",
              description: "Sort accounts by field (optional): 'name', 'value', 'interest_rate', 'created_at'"
            },
            sort_direction: {
              type: "string",
              enum: ["asc", "desc"],
              description: "Sort direction (optional): 'asc' or 'desc' (default: 'asc')"
            }
          },
          required: []
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_recent_purchases",
        description: "Get recent purchases, optionally filtered by category or date range",
        parameters: {
          type: "object",
          properties: {
            category: {
              type: "string",
              description: "Filter by budget group name (optional)"
            },
            limit: {
              type: "number", 
              description: "Maximum number of purchases to return (default: 10)"
            },
            days_back: {
              type: "number",
              description: "Get purchases from last N days (optional)"
            },
            start_date: {
              type: "string",
              description: "Start date in YYYY-MM-DD format (optional)"
            },
            end_date: {
              type: "string",
              description: "End date in YYYY-MM-DD format (optional)"
            }
          },
          required: []
        }
      }
    },
    {
      type: "function",
      function: {
        name: "search_purchases_by_date",
        description: "Search for purchases on a specific date or within a date range",
        parameters: {
          type: "object",
          properties: {
            date: {
              type: "string",
              description: "Specific date in YYYY-MM-DD format to search for purchases"
            },
            start_date: {
              type: "string",
              description: "Start date in YYYY-MM-DD format for date range search"
            },
            end_date: {
              type: "string",
              description: "End date in YYYY-MM-DD format for date range search"
            },
            category: {
              type: "string",
              description: "Filter by budget group name (optional)"
            },
            limit: {
              type: "number",
              description: "Maximum number of purchases to return (default: 50)"
            }
          },
          required: []
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_spending_analysis",
        description: "Get spending analysis including totals by category and trends",
        parameters: {
          type: "object",
          properties: {
            period: {
              type: "string",
              enum: ["current_month", "last_30_days", "last_90_days"],
              description: "Time period for analysis (default: current_month)"
            }
          },
          required: []
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_budget_utilization",
        description: "Get budget utilization showing how much of each budget has been spent",
        parameters: {
          type: "object",
          properties: {
            group_name: {
              type: "string",
              description: "Specific budget group to analyze (optional)"
            }
          },
          required: []
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_budget_utilization",
        description: "See how much of each budget has been spent",
        parameters: {
          type: "object",
          properties: {
            group_name: {
              type: "string",
              description: "Specific budget group to analyze (optional)"
            }
          },
          required: []
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_net_worth",
        description: "Calculate total net worth by combining all account values and analyzing wealth distribution",
        parameters: {
          type: "object",
          properties: {
            include_breakdown: {
              type: "boolean",
              description: "Include detailed breakdown by account type (default: true)"
            }
          },
          required: []
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_spending_trends",
        description: "Analyze spending trends over time with month-over-month comparisons and patterns",
        parameters: {
          type: "object",
          properties: {
            months: {
              type: "number",
              description: "Number of months to analyze (default: 6)"
            },
            category: {
              type: "string",
              description: "Specific category to analyze trends for (optional)"
            }
          },
          required: []
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_financial_summary",
        description: "Get comprehensive financial overview including income, expenses, savings rate, and key metrics",
        parameters: {
          type: "object",
          properties: {
            period: {
              type: "string",
              enum: ["current_month", "last_30_days", "last_90_days"],
              description: "Time period for analysis (default: current_month)"
            }
          },
          required: []
        }
      }
    },
  ];

  // Tool execution functions
  const executeTool = async (toolCall) => {
    const { name, arguments: args } = toolCall.function;
    
    switch (name) {
      case "get_income_info":
        return {
          monthly_take_home: income?.monthlyTakeHome || 0,
          yearly_salary: income?.yearlySalary || 0,
          retirement_contribution: income?.retirementContribution || 0,
          retirement_rate: income?.yearlySalary ? ((income.retirementContribution / income.yearlySalary) * 100) : 0,
          pay_frequency: income?.payFrequency || 'Unknown'
        };

      case "get_accounts":
        let filteredAccounts = [...(accounts || [])];
        
        if (args.account_type) {
          filteredAccounts = filteredAccounts.filter(account => 
            account.account_type === args.account_type
          );
        }
        
        if (args.sort_by) {
          filteredAccounts.sort((a, b) => {
            let aValue = a[args.sort_by];
            let bValue = b[args.sort_by];
            
            // Handle numeric values
            if (args.sort_by === 'value' || args.sort_by === 'interest_rate') {
              aValue = parseFloat(aValue) || 0;
              bValue = parseFloat(bValue) || 0;
            }
            
            if (args.sort_direction === 'desc') {
              return bValue > aValue ? 1 : -1;
            }
            return aValue > bValue ? 1 : -1;
          });
        }
        
        return filteredAccounts.map(account => ({
          id: account.id,
          name: account.name,
          value: parseFloat(decryptValue(account.value, userId)) || 0,
          interest_rate: parseFloat(decryptValue(account.interest_rate, userId)) || 0,
          monthly_contribution: parseFloat(decryptValue(account.montly_contribution, userId)) || 0,
          account_type: account.account_type,
          created_at: account.created_at,
          updated_at: account.updated_at
        }));

      case "get_budget_groups":
        return budgetGroups.map(group => ({
          id: group.id,
          name: group.name,
          total_budget: group.budget_items.reduce((sum, item) => sum + (item.budget || 0), 0),
          items: group.budget_items.map(item => ({
            id: item.id,
            name: item.name,
            budget: item.budget || 0,
            is_active: item.is_active
          }))
        }));

      case "get_recent_purchases":
        let filteredPurchases = [...purchases];
        
        if (args.category) {
          filteredPurchases = filteredPurchases.filter(p => 
            p.budget_items?.budget_groups?.name === args.category
          );
        }
        
        if (args.days_back) {
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - args.days_back);
          filteredPurchases = filteredPurchases.filter(p => 
            new Date(p.timestamp) >= cutoffDate
          );
        }
        
        if (args.start_date && args.end_date) {
          const startDate = new Date(args.start_date);
          const endDate = new Date(args.end_date);
          filteredPurchases = filteredPurchases.filter(p => {
            const purchaseDate = new Date(p.timestamp);
            return purchaseDate >= startDate && purchaseDate <= endDate;
          });
        }
        
        const limit = args.limit || 10;
        return filteredPurchases.slice(0, limit).map(p => ({
          id: p.id,
          item_name: p.item_name,
          display_name: p.display_name,
          cost: p.cost,
          timestamp: p.timestamp,
          category: p.budget_items?.budget_groups?.name || 'Uncategorized',
          budget_item: p.budget_items?.name || 'Unknown'
        }));

      case "search_purchases_by_date":
        let searchPurchases = [...purchases];
        
        if (args.date) {
          // Handle specific date search
          const targetDate = new Date(args.date);
          const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
          const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);
          
          searchPurchases = searchPurchases.filter(p => {
            const purchaseDate = new Date(p.timestamp);
            return purchaseDate >= startOfDay && purchaseDate < endOfDay;
          });
        }
        
        if (args.start_date && args.end_date) {
          // Handle date range search
          const startDate = new Date(args.start_date);
          const endDate = new Date(args.end_date);
          const endOfDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() + 1);
          
          searchPurchases = searchPurchases.filter(p => {
            const purchaseDate = new Date(p.timestamp);
            return purchaseDate >= startDate && purchaseDate < endOfDay;
          });
        }
        
        if (args.category) {
          searchPurchases = searchPurchases.filter(p => 
            p.budget_items?.budget_groups?.name === args.category
          );
        }
        
        const searchLimit = args.limit || 50;
        return searchPurchases.slice(0, searchLimit).map(p => ({
          id: p.id,
          item_name: p.item_name,
          display_name: p.display_name,
          cost: p.cost,
          timestamp: p.timestamp,
          category: p.budget_items?.budget_groups?.name || 'Uncategorized',
          budget_item: p.budget_items?.name || 'Unknown'
        }));

      case "get_spending_analysis":
        const period = args.period || "current_month";
        let periodPurchases = [...purchases];
        
        if (period === "current_month") {
          const now = new Date();
          periodPurchases = periodPurchases.filter(p => {
            const date = new Date(p.timestamp);
            return date.getMonth() === now.getMonth() && 
                   date.getFullYear() === now.getFullYear();
          });
        } else if (period === "last_30_days") {
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - 30);
          periodPurchases = periodPurchases.filter(p => 
            new Date(p.timestamp) >= cutoffDate
          );
        } else if (period === "last_90_days") {
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - 90);
          periodPurchases = periodPurchases.filter(p => 
            new Date(p.timestamp) >= cutoffDate
          );
        }
        
        const spendingByCategory = {};
        periodPurchases.forEach(p => {
          const category = p.budget_items?.budget_groups?.name || 'Uncategorized';
          spendingByCategory[category] = (spendingByCategory[category] || 0) + (p.cost || 0);
        });
        
        return {
          period,
          total_spent: periodPurchases.reduce((sum, p) => sum + (p.cost || 0), 0),
          transaction_count: periodPurchases.length,
          spending_by_category: spendingByCategory,
          top_categories: Object.entries(spendingByCategory)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([cat, amount]) => ({ category: cat, amount }))
        };

      case "get_budget_utilization":
        const utilization = {};
        const targetPeriod = args.period || "current_month";
        let budgetPeriodPurchases = [...purchases];
        
        if (targetPeriod === "current_month") {
          const now = new Date();
          budgetPeriodPurchases = budgetPeriodPurchases.filter(p => {
            const date = new Date(p.timestamp);
            return date.getMonth() === now.getMonth() && 
                   date.getFullYear() === now.getFullYear();
          });
        }
        
        const budgetSpendingByCategory = {};
        budgetPeriodPurchases.forEach(p => {
          const category = p.budget_items?.budget_groups?.name || 'Uncategorized';
          budgetSpendingByCategory[category] = (budgetSpendingByCategory[category] || 0) + (p.cost || 0);
        });
        
        budgetGroups.forEach(group => {
          if (args.group_name && group.name !== args.group_name) return;
          
          const groupBudget = group.budget_items.reduce((sum, item) => sum + (item.budget || 0), 0);
          const groupSpending = budgetSpendingByCategory[group.name] || 0;
          
          utilization[group.name] = {
            budget: groupBudget,
            spent: groupSpending,
            remaining: groupBudget - groupSpending,
            utilization_percent: groupBudget > 0 ? (groupSpending / groupBudget) * 100 : 0,
            items: group.budget_items.map(item => ({
              name: item.name,
              budget: item.budget || 0,
              spent: budgetSpendingByCategory[item.name] || 0
            }))
          };
        });
        
        return utilization;

      case "get_net_worth":
        const includeBreakdown = args.include_breakdown !== false;
        
        let netWorthTotalAssets = 0;
        let netWorthTotalLiabilities = 0;
        const netWorthAssetBreakdown = {};
        const netWorthLiabilityBreakdown = {};
        
        (accounts || []).forEach(account => {
          const type = account.account_type || 'Other';
          const value = parseFloat(decryptValue(account.value, userId)) || 0;
          
          if (ASSET_TYPES.includes(type.toLowerCase())) {
            netWorthTotalAssets += value;
            netWorthAssetBreakdown[type] = (netWorthAssetBreakdown[type] || 0) + value;
          } else if (LIABILITY_TYPES.includes(type.toLowerCase())) {
            netWorthTotalLiabilities += value;
            netWorthLiabilityBreakdown[type] = (netWorthLiabilityBreakdown[type] || 0) + value;
          } else {
            // Default to treating unknown types as assets
            netWorthTotalAssets += value;
            netWorthAssetBreakdown[type] = (netWorthAssetBreakdown[type] || 0) + value;
          }
        });
        
        const totalNetWorth = netWorthTotalAssets - netWorthTotalLiabilities;
        
        if (!includeBreakdown) {
          return { 
            total_net_worth: totalNetWorth,
            total_assets: netWorthTotalAssets,
            total_liabilities: netWorthTotalLiabilities
          };
        }
        
        return {
          total_net_worth: totalNetWorth,
          total_assets: netWorthTotalAssets,
          total_liabilities: netWorthTotalLiabilities,
          asset_breakdown: netWorthAssetBreakdown,
          liability_breakdown: netWorthLiabilityBreakdown,
          account_count: accounts?.length || 0,
          asset_account_count: Object.keys(netWorthAssetBreakdown).reduce((sum, type) => sum + (accounts?.filter(a => (a.account_type || 'Other') === type).length || 0), 0),
          liability_account_count: Object.keys(netWorthLiabilityBreakdown).reduce((sum, type) => sum + (accounts?.filter(a => (a.account_type || 'Other') === type).length || 0), 0)
        };

      case "get_spending_trends":
        const trendMonths = args.months || 6;
        const trendCategory = args.category;
        const now = new Date();
        const trends = [];
        
        for (let i = 0; i < trendMonths; i++) {
          const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
          
          let monthPurchases = purchases.filter(p => {
            const purchaseDate = new Date(p.timestamp);
            return purchaseDate >= monthDate && purchaseDate <= monthEnd;
          });
          
          if (trendCategory) {
            monthPurchases = monthPurchases.filter(p => 
              p.budget_items?.budget_groups?.name === trendCategory
            );
          }
          
          const monthTotal = monthPurchases.reduce((sum, p) => sum + (p.cost || 0), 0);
          
          trends.push({
            month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            total_spent: monthTotal,
            transaction_count: monthPurchases.length,
            average_transaction: monthPurchases.length > 0 ? monthTotal / monthPurchases.length : 0
          });
        }
        
        return {
          period_months: trendMonths,
          category: trendCategory || 'All Categories',
          trends: trends.reverse(),
          month_over_month_change: trends.length > 1 ? 
            ((trends[trends.length - 1].total_spent - trends[0].total_spent) / trends[0].total_spent * 100) : 0
        };

      case "get_financial_summary":
        const summaryPeriod = args.period || "current_month";
        let summaryPurchases = [...purchases];
        
        if (summaryPeriod === "current_month") {
          const now = new Date();
          summaryPurchases = summaryPurchases.filter(p => {
            const date = new Date(p.timestamp);
            return date.getMonth() === now.getMonth() && 
                   date.getFullYear() === now.getFullYear();
          });
        } else if (summaryPeriod === "last_30_days") {
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - 30);
          summaryPurchases = summaryPurchases.filter(p => 
            new Date(p.timestamp) >= cutoffDate
          );
        } else if (summaryPeriod === "last_90_days") {
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - 90);
          summaryPurchases = summaryPurchases.filter(p => 
            new Date(p.timestamp) >= cutoffDate
          );
        }
        
        const totalExpenses = summaryPurchases.reduce((sum, p) => sum + (p.cost || 0), 0);
        const monthlyIncome = parseFloat(income?.monthlyTakeHome) || 0;
        
        // Calculate net worth properly (assets - liabilities)
        let summaryTotalAssets = 0;
        let summaryTotalLiabilities = 0;
        
        (accounts || []).forEach(account => {
          const type = account.account_type || 'Other';
          const value = parseFloat(decryptValue(account.value, userId)) || 0;
          
          if (ASSET_TYPES.includes(type.toLowerCase())) {
            summaryTotalAssets += value;
          } else if (LIABILITY_TYPES.includes(type.toLowerCase())) {
            summaryTotalLiabilities += value;
          } else {
            // Default to treating unknown types as assets
            summaryTotalAssets += value;
          }
        });
        
        const netWorth = summaryTotalAssets - summaryTotalLiabilities;
        
        const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - totalExpenses) / monthlyIncome * 100) : 0;
        
        return {
          period: summaryPeriod,
          income: monthlyIncome,
          expenses: totalExpenses,
          net_cash_flow: monthlyIncome - totalExpenses,
          savings_rate: savingsRate,
          net_worth: netWorth,
          transaction_count: summaryPurchases.length,
          average_transaction: summaryPurchases.length > 0 ? totalExpenses / summaryPurchases.length : 0
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  };

  return { tools, executeTool };
};
