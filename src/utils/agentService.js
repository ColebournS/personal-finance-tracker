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

const SYSTEM_PROMPT = `You are a helpful financial assistant for a personal finance tracking application. You have access to the user's financial data through various tools.

You help users with:
- Budget planning and optimization based on their actual spending patterns
- Spending analysis and recommendations using their real transaction data
- Financial goal setting and tracking with their income information
- General financial advice and education
- Understanding their financial data and patterns

CRITICAL RULES - ALWAYS FOLLOW THESE:
1. ALWAYS use tools to get financial data BEFORE providing any advice or analysis
2. NEVER ask the user for information that can be obtained through your available tools
3. If you need income, expenses, account values, budget data, or purchase history - USE THE TOOLS
4. Only ask clarifying questions when the requested information is NOT available through tools
5. Do NOT make assumptions about the user's financial situation - use the tools to get accurate data

When providing advice:
1. Use the tools to get relevant financial data first
2. Reference their specific data when providing advice
3. Be encouraging and supportive
4. Keep responses concise and focused on helping the user improve their financial situation
5. Format your responses using markdown for better readability (bold text, headers, lists, etc.)

Available tools:
- get_income_info: Get salary, take-home pay, retirement info
- get_accounts: Get investment, savings, and other financial accounts with values and interest rates
- get_budget_groups: Get all budget categories and items
- get_recent_purchases: Get recent transactions (can filter by category/time/date range)
- search_purchases_by_date: Search for purchases on specific date or within date range
- get_spending_analysis: Get spending breakdown by category and time period
- get_budget_utilization: See how much of each budget has been spent
- get_net_worth: Calculate total net worth and wealth distribution across account types
- get_spending_trends: Analyze spending patterns over time with month-over-month comparisons
- get_financial_summary: Get comprehensive financial overview with income, expenses, savings rate, and net worth

EXAMPLES OF WHAT TO DO:
- User asks "What's my net worth?" → Use get_net_worth tool
- User asks "How much do I spend monthly?" → Use get_spending_analysis or get_financial_summary
- User asks "What are my account balances?" → Use get_accounts tool
- User asks "How's my budget utilization?" → Use get_budget_utilization tool

EXAMPLES OF WHAT NOT TO DO:
- Do NOT ask "What's your monthly income?" → Use get_income_info tool
- Do NOT ask "How much do you have in savings?" → Use get_accounts tool
- Do NOT ask "What are your monthly expenses?" → Use get_spending_analysis tool

Choose the appropriate tools based on the user's question.`;

export const callAgent = async (message, conversationHistory = [], tools, executeTool) => {
  try {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    console.log('=== Agent Request ===');
    console.log('Message:', message);
    console.log('Available tools:', tools.map(t => t.function.name));

    // First call to OpenAI with tools
    const response = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages,
      tools: tools,
      tool_choice: 'auto',
      max_tokens: 500,
      temperature: 0.7,
    });

    const responseMessage = response.choices[0].message;
    console.log('Agent response:', responseMessage);

    // Check if model wants to call tools
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      console.log('Tool calls detected:', responseMessage.tool_calls);
      
      // Execute tool calls
      const toolResults = [];
      for (const toolCall of responseMessage.tool_calls) {
        try {
          const result = await executeTool(toolCall);
          console.log(`Tool ${toolCall.function.name} result:`, result);
          
          toolResults.push({
            tool_call_id: toolCall.id,
            result: result
          });
        } catch (error) {
          console.error(`Error executing tool ${toolCall.function.name}:`, error);
          toolResults.push({
            tool_call_id: toolCall.id,
            result: { error: error.message }
          });
        }
      }

      // Second call to OpenAI with tool results
      const finalResponse = await openai.chat.completions.create({
        model: 'gpt-5-mini',
        messages: [
          ...messages,
          responseMessage,
          ...toolResults.map(result => ({
            role: 'tool',
            tool_call_id: result.tool_call_id,
            content: JSON.stringify(result.result)
          }))
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      console.log('Final agent response:', finalResponse.choices[0].message.content);
      return finalResponse.choices[0].message.content;
    }

    // No tool calls, return the direct response
    console.log('No tool calls, returning direct response');
    return responseMessage.content;
  } catch (error) {
    console.error('Agent Error:', error);
    throw new Error('Failed to get response from AI agent. Please try again.');
  }
};

export const generateImprovedDisplayName = async (originalName, cost, category = null) => {
  try {
    const prompt = `You are helping to improve the display names of financial transactions. 
Please provide a clearer, more descriptive name for this transaction.

Original name: "${originalName}"
Amount: $${cost}
${category ? `Category: ${category}` : ''}

Rules:
1. Make the name more descriptive and user-friendly
2. Remove bank jargon, codes, or abbreviations
3. Keep it concise (under 50 characters if possible)
4. Focus on what was actually purchased
5. If the original name is already clear and descriptive, keep it as-is
6. Only return the improved name, nothing else

Examples:
- "SQ *COFFEE BEAN" → "Coffee Bean Coffee Shop"
- "TST*123456789" → "Gas Station Purchase"
- "AMZN MKTP US*123456789" → "Amazon Purchase"
- "WMT SUPERCENTER" → "Walmart Groceries"
- "Netflix Subscription" → "Netflix Subscription" (keep as-is)`;

    const response = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that improves transaction names to be more clear and user-friendly.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 50,
      temperature: 0.3,
    });

    const improvedName = response.choices[0].message.content.trim().replace(/^["']|["']$/g, '');
    
    // Only return improved name if it's actually different and reasonable
    if (improvedName && improvedName !== originalName && improvedName.length > 0) {
      return improvedName;
    }
    
    return null; // Return null if no improvement needed
  } catch (error) {
    console.error('Error generating improved display name:', error);
    return null;
  }
};

export const categorizePurchaseWithAI = async (purchaseName, cost, availableBudgetGroups) => {
  try {
    // Flatten all budget items from all groups with their group context
    const allBudgetItems = [];
    availableBudgetGroups.forEach(group => {
      if (group.budget_items) {
        group.budget_items.forEach(item => {
          allBudgetItems.push({
            id: item.id,
            name: item.name,
            group_name: group.name
          });
        });
      }
    });
    
    const budgetItemsList = allBudgetItems.map(item => `${item.name} (${item.group_name})`).join('\n');

    console.log('[AI Categorize] Budget item options:', allBudgetItems);
    console.log('[AI Categorize] Budget items list (prompt):\n' + budgetItemsList);
    
    const prompt = `You are helping to categorize a financial transaction into the appropriate budget item.

Transaction details:
- Name: "${purchaseName}"
- Amount: $${cost}

Available budget items (format: Item Name (Group Name)):
${budgetItemsList}

Rules:
1. Choose the most appropriate budget item from the available options
2. Consider the nature of the purchase (food, transportation, entertainment, etc.)
3. Return ONLY the exact name of the budget item, nothing else
4. If you're unsure or none fit well, return "Uncategorized"
5. Be specific - choose "Groceries" over just "Food" if available
6. Choose "Gas" over "Transportation" if available

Examples:
- "Coffee Shop" $5.50 → "Coffee" (if available)
- "Netflix Subscription" $15.99 → "Entertainment" (if available)
- "Gas Station" $45.00 → "Gas" (if available)
- "Restaurant Dinner" $75.00 → "Dining Out" (if available)`;

    const response = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that categorizes financial transactions into specific budget items.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 30,
      temperature: 0.2,
    });

    const suggestedItem = response.choices[0].message.content.trim().replace(/^["']|["']$/g, '');

    console.log('[AI Categorize] Purchase:', { purchaseName, cost });
    console.log('[AI Categorize] Suggested item (raw):', response.choices[0].message.content);
    console.log('[AI Categorize] Suggested item (clean):', suggestedItem);
    
    // Verify that suggested item exists in available budget items
    const matchingItem = allBudgetItems.find(item => 
      item.name.toLowerCase() === suggestedItem.toLowerCase()
    );

    console.log('[AI Categorize] Exact match:', matchingItem);
    
    if (matchingItem) {
      return matchingItem;
    }
    
    // If no exact match, try fuzzy matching
    const fuzzyMatch = allBudgetItems.find(item => 
      item.name.toLowerCase().includes(suggestedItem.toLowerCase()) ||
      suggestedItem.toLowerCase().includes(item.name.toLowerCase())
    );

    console.log('[AI Categorize] Fuzzy match:', fuzzyMatch);
    
    return fuzzyMatch || { name: 'Uncategorized', id: null, is_uncategorized: true }; // Return uncategorized marker instead of null
  } catch (error) {
    console.error('Error categorizing purchase with AI:', error);
    return null;
  }
};
