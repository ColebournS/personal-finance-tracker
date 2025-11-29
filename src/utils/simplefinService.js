/**
 * SimpleFin API Service
 * Handles all interactions with the SimpleFin API
 */

/**
 * Claims an access URL from a SimpleFin setup token
 * @param {string} setupToken - Base64-encoded setup token from SimpleFin Bridge
 * @returns {Promise<string>} - The access URL for future API calls
 */
export async function claimAccessUrl(setupToken) {
  try {
    // Decode the Base64 setup token to get the claim URL
    const claimUrl = atob(setupToken.trim());
    
    if (!claimUrl.startsWith('http')) {
      throw new Error('Invalid setup token format');
    }

    // Use Supabase Edge Function
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
    const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
    
    const response = await fetch(`${supabaseUrl}/functions/v1/simplefin-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ url: claimUrl, method: 'POST' }),
    });
    
    const responseText = await response.text();

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('RATE_LIMIT: Too many requests. Please wait a moment and try again.');
      }
      throw new Error(`Edge Function error (${response.status}): ${responseText}`);
    }

    const data = responseText;
    
    // The response should be the access URL
    if (!data || !data.startsWith('http')) {
      throw new Error('Invalid response from SimpleFin');
    }

    return data.trim();
  } catch (error) {
    if (error.message === 'RATE_LIMIT') {
      throw error;
    }
    if (error.name === 'InvalidCharacterError') {
      throw new Error('Invalid setup token. Please check and try again.');
    }
    throw new Error(`Failed to claim access URL: ${error.message}`);
  }
}

/**
 * Fetches account data from SimpleFin API
 * @param {string} accessUrl - The access URL obtained from claiming
 * @param {Object} options - Optional parameters for the request
 * @param {number} options.startDate - Unix timestamp for transaction start date
 * @param {number} options.endDate - Unix timestamp for transaction end date
 * @returns {Promise<Object>} - Account data from SimpleFin
 */
export async function fetchAccounts(accessUrl, options = {}) {
  try {
    if (!accessUrl || !accessUrl.startsWith('http')) {
      throw new Error('Invalid access URL');
    }

    // Append /accounts to the access URL
    let accountsUrl = `${accessUrl}/accounts`;
    
    // Add date range parameters if provided
    const params = [];
    if (options.startDate) {
      params.push(`start-date=${options.startDate}`);
    }
    if (options.endDate) {
      params.push(`end-date=${options.endDate}`);
    }
    if (params.length > 0) {
      accountsUrl += `?${params.join('&')}`;
    }
    
    // Use Supabase Edge Function
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
    const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
    
    const response = await fetch(`${supabaseUrl}/functions/v1/simplefin-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ url: accountsUrl, method: 'GET' }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        // Extract retry-after header if available
        const retryAfter = response.headers.get('Retry-After');
        throw new Error(`RATE_LIMIT:${retryAfter || '60'}`);
      }
      if (response.status === 401 || response.status === 403) {
        throw new Error('UNAUTHORIZED: Access URL is invalid or expired. Please reconnect SimpleFin.');
      }
      throw new Error(`Failed to fetch accounts: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error.message.startsWith('RATE_LIMIT') || error.message.startsWith('UNAUTHORIZED')) {
      throw error;
    }
    throw new Error(`Failed to fetch accounts: ${error.message}`);
  }
}

/**
 * Maps a SimpleFin account object to our app's account format
 * @param {Object} sfAccount - SimpleFin account object
 * @returns {Object} - Mapped account object for our app
 */
export function mapSimpleFinAccount(sfAccount) {
  // Extract balance first
  let balance = 0;
  if (sfAccount.balance !== undefined && sfAccount.balance !== null) {
    balance = parseFloat(sfAccount.balance);
  }
  
  // Check for available balance if balance is missing/zero
  if (balance === 0 && sfAccount.available_balance !== undefined && sfAccount.available_balance !== null) {
    balance = parseFloat(sfAccount.available_balance);
  }
  
  // Determine account type based on SimpleFin data
  let accountType = 'other';
  const accountName = sfAccount.name?.toLowerCase() || '';
  
  // Map based on account name patterns
  if (accountName.includes('checking') || accountName.includes('debit')) {
    accountType = 'checking';
  } else if (accountName.includes('savings')) {
    accountType = 'savings';
  } else if (accountName.includes('credit') || balance < 0) {
    accountType = 'credit';
  } else if (accountName.includes('loan') || accountName.includes('mortgage')) {
    accountType = 'loan';
  } else if (accountName.includes('investment') || accountName.includes('brokerage') || 
             accountName.includes('401k') || accountName.includes('ira')) {
    accountType = 'investment';
  }

  // For credit cards and loans, balance should be positive (represents debt)
  // SimpleFin returns credit card balances as negative
  if (accountType === 'credit' || accountType === 'loan') {
    balance = Math.abs(balance);
  }

  return {
    simplefin_id: sfAccount.id,
    name: sfAccount.name || 'Unnamed Account',
    account_type: accountType,
    value: balance,
    is_simplefin_synced: true,
    last_synced: new Date().toISOString(),
    interest_rate: 0,
    montly_contribution: 0,
  };
}

/**
 * Retry wrapper for API calls with exponential backoff
 * @param {Function} apiCall - The API call function to retry
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Promise<any>} - Result of the API call
 */
export async function retryWithBackoff(apiCall, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;
      
      // Don't retry on these errors
      if (error.message.startsWith('UNAUTHORIZED') || 
          error.message.includes('Invalid setup token') ||
          error.message.includes('Invalid access URL')) {
        throw error;
      }
      
      // Handle rate limiting
      if (error.message.startsWith('RATE_LIMIT')) {
        const parts = error.message.split(':');
        const retryAfter = parts.length > 1 ? parseInt(parts[1]) : 60;
        
        if (attempt < maxRetries - 1) {
          // Wait for the retry-after period
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          continue;
        }
        throw error;
      }
      
      // Exponential backoff for other errors
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Maps a SimpleFin transaction to our app's purchase format
 * @param {Object} sfTransaction - SimpleFin transaction object
 * @param {string} accountId - Local account ID
 * @param {string} simpleFinAccountId - SimpleFin account ID
 * @returns {Object} - Mapped purchase object for our app
 */
export function mapSimpleFinTransaction(sfTransaction, accountId, simpleFinAccountId) {
  // SimpleFin transactions have negative amounts for purchases/debits
  // We store purchases as positive amounts
  const amount = Math.abs(parseFloat(sfTransaction.amount) || 0);
  
  // Skip transactions with zero amount or positive amounts (deposits/credits)
  // We only want to import purchases (negative amounts in SimpleFin)
  if (sfTransaction.amount >= 0 || amount === 0) {
    return null;
  }
  
  // Parse transaction date (SimpleFin uses Unix timestamp in seconds)
  let transactionDate = new Date();
  if (sfTransaction.posted) {
    transactionDate = new Date(sfTransaction.posted * 1000);
  } else if (sfTransaction.transacted_at) {
    transactionDate = new Date(sfTransaction.transacted_at * 1000);
  }
  
  return {
    simplefin_transaction_id: sfTransaction.id,
    simplefin_account_id: simpleFinAccountId,
    item_name: sfTransaction.description || sfTransaction.payee || 'Unknown Transaction',
    cost: amount,
    timestamp: transactionDate.toISOString(),
    is_simplefin_synced: true,
    budget_item_id: null, // User will categorize manually
  };
}

/**
 * Syncs SimpleFin accounts with local database
 * @param {string} accessUrl - SimpleFin access URL
 * @param {Array} existingAccounts - Current accounts from database
 * @returns {Promise<Object>} - Object with accounts to create and update
 */
export async function syncAccounts(accessUrl, existingAccounts = []) {
  try {
    // Fetch accounts from SimpleFin with retry logic
    const data = await retryWithBackoff(() => fetchAccounts(accessUrl));
    
    if (!data || !data.accounts || !Array.isArray(data.accounts)) {
      throw new Error('Invalid response format from SimpleFin');
    }

    const accountsToCreate = [];
    const accountsToUpdate = [];

    // Process each SimpleFin account
    for (const sfAccount of data.accounts) {
      const mappedAccount = mapSimpleFinAccount(sfAccount);
      
      // Check if account already exists
      const existingAccount = existingAccounts.find(
        acc => acc.simplefin_id === mappedAccount.simplefin_id
      );

      if (existingAccount) {
        // Update existing account
        accountsToUpdate.push({
          id: existingAccount.id,
          ...mappedAccount,
          interest_rate: existingAccount.interest_rate,
          montly_contribution: existingAccount.montly_contribution,
          name: existingAccount.name || mappedAccount.name,
        });
      } else {
        // New account to create
        accountsToCreate.push(mappedAccount);
      }
    }

    return {
      accountsToCreate,
      accountsToUpdate,
      totalSynced: data.accounts.length,
      rawData: data, // Include raw data for transaction processing
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Syncs SimpleFin transactions with local purchases table
 * @param {string} accessUrl - SimpleFin access URL
 * @param {Array} localAccounts - Current accounts from database (with local IDs)
 * @param {Array} existingPurchases - Current purchases from database
 * @returns {Promise<Object>} - Object with transactions to create
 */
export async function syncTransactions(accessUrl, localAccounts = [], existingPurchases = []) {
  try {
    // Request transactions from the last 90 days
    const endDate = Math.floor(Date.now() / 1000); // Current time in Unix timestamp
    const startDate = endDate - (90 * 24 * 60 * 60); // 90 days ago
    
    // Fetch accounts from SimpleFin with retry logic (includes transactions)
    const data = await retryWithBackoff(() => fetchAccounts(accessUrl, { startDate, endDate }));
    
    if (!data || !data.accounts || !Array.isArray(data.accounts)) {
      throw new Error('Invalid response format from SimpleFin');
    }

    const transactionsToCreate = [];
    
    // Get set of existing SimpleFin transaction IDs for duplicate detection
    // Include both active and deleted purchases to prevent re-importing deleted transactions
    const existingTransactionIds = new Set(
      existingPurchases
        .filter(p => p.simplefin_transaction_id)
        .map(p => p.simplefin_transaction_id)
    );

    // Process each SimpleFin account
    for (const sfAccount of data.accounts) {
      // Find the corresponding local account
      const localAccount = localAccounts.find(
        acc => acc.simplefin_id === sfAccount.id
      );
      
      if (!localAccount) {
        continue;
      }

      // Process transactions if they exist
      if (sfAccount.transactions && Array.isArray(sfAccount.transactions)) {
        for (const sfTransaction of sfAccount.transactions) {
          // Skip if we've already imported this transaction
          if (existingTransactionIds.has(sfTransaction.id)) {
            continue;
          }
          
          // Map transaction to purchase format
          const mappedTransaction = mapSimpleFinTransaction(
            sfTransaction,
            localAccount.id,
            sfAccount.id
          );
          
          // Only add if it's a valid purchase (not a deposit/credit)
          if (mappedTransaction) {
            transactionsToCreate.push(mappedTransaction);
          }
        }
      }
    }

    return {
      transactionsToCreate,
      totalSynced: transactionsToCreate.length,
    };
  } catch (error) {
    throw error;
  }
}

