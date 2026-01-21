import OpenAI from 'openai';

// Check if API key is available
const apiKey = process.env.REACT_APP_OPENAI_API_KEY;

if (!apiKey) {
  console.error('OpenAI API key not found. Make sure REACT_APP_OPENAI_API_KEY is set in your .env file');
}

const openai = new OpenAI({
  apiKey: apiKey || 'dummy-key',
  dangerouslyAllowBrowser: true
});

const SYSTEM_PROMPT = `You are a helpful financial assistant for a personal finance tracking application. You have access to the user's actual financial data and can provide personalized advice.

You help users with:
- Budget planning and optimization based on their actual spending patterns
- Spending analysis and recommendations using their real transaction data
- Financial goal setting and tracking with their income information
- General financial advice and education
- Understanding their financial data and patterns

When providing advice, always reference their specific data when relevant. Be encouraging and supportive. If you need more specific financial data to give better advice, ask the user to check their Analytics, Budget, or Purchases sections in the app.

Keep responses concise and focused on helping the user improve their financial situation. Always provide actionable, practical advice based on their actual financial situation.

IMPORTANT: Format your responses using markdown for better readability. Use:
- **bold text** for emphasis
- Headers (##, ###) for sections
- Numbered or bulleted lists for recommendations
- Code blocks for specific numbers or calculations

This makes your advice easier to read and understand.`;

export const sendMessageToAI = async (message, conversationHistory = [], financialContext = null) => {
  try {
    let contextualSystemPrompt = SYSTEM_PROMPT;
    
    // Add financial context if available
    if (financialContext && financialContext.summary) {
      const { income, spending, budget, financialHealth } = financialContext.summary;
      
      // Safely access nested properties with fallbacks
      const safeIncome = income || {};
      const safeSpending = spending || { totalSpent: 0, topSpendingCategories: [], recentTransactions: [] };
      const safeBudget = budget || { totalBudget: 0, budgetUtilization: {}, overBudgetCategories: [] };
      const safeFinancialHealth = financialHealth || { disposableIncome: 0, savingsRate: 0 };
      
      contextualSystemPrompt = `${SYSTEM_PROMPT}

Here is the user's current financial situation:

INCOME:
- Monthly take-home: $${(safeIncome.monthlyTakeHome || 0).toFixed(2)}
- Yearly salary: $${(safeIncome.yearlySalary || 0).toFixed(2)}
- Retirement contribution rate: ${((safeIncome.retirementRate || 0)).toFixed(1)}%

SPENDING:
- Current month total spent: $${(safeSpending.totalSpent || 0).toFixed(2)}
- Top spending categories this month: ${(safeSpending.topSpendingCategories || []).map(cat => `${cat.category}: $${(cat.amount || 0).toFixed(2)}`).join(', ') || 'None'}
- Recent transactions this month: ${(safeSpending.recentTransactions || []).slice(0, 3).map(t => `${t.item_name || 'Unknown'}: $${(t.cost || 0)}`).join(', ') || 'None'}

BUDGET:
- Total budget: $${(safeBudget.totalBudget || 0).toFixed(2)}
- Budget utilization: ${Object.entries(safeBudget.budgetUtilization || {}).map(([cat, data]) => `${cat}: ${((data.utilization || 0)).toFixed(1)}%`).join(', ') || 'None'}
- Over budget categories: ${(safeBudget.overBudgetCategories || []).join(', ') || 'None'}

DETAILED BUDGET BREAKDOWN:
${(financialContext.rawData?.budgetGroups || []).map(group => 
  `## ${group.name} (Total: $${group.budget_items.reduce((sum, item) => sum + (item.budget || 0), 0).toFixed(2)})
${group.budget_items.map(item => `- ${item.name}: $${(item.budget || 0).toFixed(2)}`).join('\n')}`
).join('\n\n') || 'No budget data available'}

Use this information to provide personalized advice.`;
    }

    const messages = [
      { role: 'system', content: contextualSystemPrompt },
      ...conversationHistory.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    console.log('=== OpenAI API Request ===');
    console.log('System Prompt:', contextualSystemPrompt);
    console.log('Messages:', JSON.stringify(messages, null, 2));
    console.log('Financial Context:', JSON.stringify(financialContext, null, 2));
    console.log('========================');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw new Error('Failed to get response from AI assistant. Please try again.');
  }
};
