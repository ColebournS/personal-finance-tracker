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

    // Try direct connection first (SimpleFin may allow CORS for claim URL)
    try {
      const directResponse = await fetch(claimUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (directResponse.ok) {
        const data = await directResponse.text();
        if (data && data.startsWith('http')) {
          return data.trim();
        }
      }
    } catch (directError) {
      // Direct connection failed, use Edge Function
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
 * @returns {Promise<Object>} - Account data from SimpleFin
 */
export async function fetchAccounts(accessUrl) {
  try {
    if (!accessUrl || !accessUrl.startsWith('http')) {
      throw new Error('Invalid access URL');
    }

    // Append /accounts to the access URL
    const accountsUrl = `${accessUrl}/accounts`;
    console.log('Fetching from SimpleFin, URL (masked):', accessUrl.substring(0, 30) + '...');

    // Try direct connection first
    try {
      const directResponse = await fetch(accountsUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (directResponse.ok) {
        const data = await directResponse.json();
        console.log('Got response from direct connection, accounts:', data?.accounts?.length);
        return data;
      }
    } catch (directError) {
      console.log('Direct connection failed, using Edge Function');
      // Direct connection failed, use Edge Function
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

    console.log('Edge Function response status:', response.status);

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
    console.log('Got response from Edge Function, accounts:', data?.accounts?.length);
    console.log('Raw SimpleFin data:', data);
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
    type: (accountType === 'credit' || accountType === 'loan') ? 'Loan' : 'Investment',
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
 * Syncs SimpleFin accounts with local database
 * @param {string} accessUrl - SimpleFin access URL
 * @param {Array} existingAccounts - Current accounts from database
 * @returns {Promise<Object>} - Object with accounts to create and update
 */
export async function syncAccounts(accessUrl, existingAccounts = []) {
  try {
    // Fetch accounts from SimpleFin with retry logic
    const data = await retryWithBackoff(() => fetchAccounts(accessUrl));
    
    console.log('SimpleFin API returned:', data);
    console.log('Number of accounts from SimpleFin:', data?.accounts?.length);
    console.log('Existing accounts in database:', existingAccounts.length);
    
    if (!data || !data.accounts || !Array.isArray(data.accounts)) {
      throw new Error('Invalid response format from SimpleFin');
    }

    const accountsToCreate = [];
    const accountsToUpdate = [];

    // Process each SimpleFin account
    for (const sfAccount of data.accounts) {
      console.log('Processing SimpleFin account:', sfAccount.name, 'ID:', sfAccount.id);
      
      const mappedAccount = mapSimpleFinAccount(sfAccount);
      console.log('Mapped to:', mappedAccount);
      
      // Check if account already exists
      const existingAccount = existingAccounts.find(
        acc => acc.simplefin_id === mappedAccount.simplefin_id
      );

      if (existingAccount) {
        console.log('Account exists, will update:', existingAccount.name);
        // Update existing account
        accountsToUpdate.push({
          id: existingAccount.id,
          ...mappedAccount,
          interest_rate: existingAccount.interest_rate,
          montly_contribution: existingAccount.montly_contribution,
          name: existingAccount.name || mappedAccount.name,
        });
      } else {
        console.log('New account detected:', mappedAccount.name);
        // New account to create
        accountsToCreate.push(mappedAccount);
      }
    }

    console.log('Final sync summary:', {
      fromSimpleFin: data.accounts.length,
      inDatabase: existingAccounts.length,
      toCreate: accountsToCreate.length,
      toUpdate: accountsToUpdate.length
    });

    return {
      accountsToCreate,
      accountsToUpdate,
      totalSynced: data.accounts.length,
    };
  } catch (error) {
    throw error;
  }
}

