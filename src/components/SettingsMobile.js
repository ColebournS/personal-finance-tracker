import React, { useState, useEffect } from "react";
import { LogOut, Moon, Sun, RefreshCw, X as XIcon } from "lucide-react";
import supabase from "../supabaseClient";
import { useTheme } from "next-themes";
import { decryptString, encryptValue, decryptValue } from "../utils/encryption";
import { syncAccounts, syncTransactions } from "../utils/simplefinService";

const SettingsMobile = () => {
  const [userId, setUserId] = useState(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [simpleFinAccessUrl, setSimpleFinAccessUrl] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        
        // Fetch SimpleFin access URL
        const { data: profileData } = await supabase
          .from("profiles")
          .select("simplefin_access_url")
          .eq("id", user.id)
          .single();
        
        if (profileData?.simplefin_access_url) {
          try {
            const decryptedUrl = decryptString(profileData.simplefin_access_url, user.id);
            if (decryptedUrl && decryptedUrl.startsWith('http')) {
              setSimpleFinAccessUrl(decryptedUrl);
            }
          } catch (error) {
            console.error('Error decrypting SimpleFin URL:', error);
          }
        }
      }
    };
    getCurrentUser();
  }, []);

  const handleSimpleFinSync = async () => {
    if (!simpleFinAccessUrl || !userId) return;
    
    setSyncing(true);
    
    try {
      const { data: accountsData } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", userId);
      
      const decryptedAccounts = (accountsData || []).map(account => ({
        ...account,
        value: decryptValue(account.value, userId),
        interest_rate: decryptValue(account.interest_rate, userId),
        montly_contribution: decryptValue(account.montly_contribution, userId)
      }));
      
      const { accountsToCreate, accountsToUpdate } = await syncAccounts(
        simpleFinAccessUrl,
        decryptedAccounts
      );

      console.log('Sync results:', {
        toCreate: accountsToCreate.length,
        toUpdate: accountsToUpdate.length,
        newAccounts: accountsToCreate
      });

      const newlyCreatedAccounts = [];

      for (const newAccount of accountsToCreate) {
        console.log('Creating new account:', newAccount);
        const encryptedValue = encryptValue(newAccount.value, userId);
        const encryptedInterestRate = encryptValue(newAccount.interest_rate, userId);
        const encryptedMonthlyContribution = encryptValue(newAccount.montly_contribution, userId);
        
        const { data, error } = await supabase.from("accounts").insert([{
          ...newAccount,
          value: encryptedValue,
          interest_rate: encryptedInterestRate,
          montly_contribution: encryptedMonthlyContribution,
          user_id: userId,
        }]).select();
        
        if (error) {
          console.error('Error inserting account:', error);
          throw error;
        }
        console.log('Account created successfully:', data);
        if (data && data[0]) {
          newlyCreatedAccounts.push({
            ...data[0],
            value: newAccount.value,
            interest_rate: newAccount.interest_rate,
            montly_contribution: newAccount.montly_contribution
          });
        }
      }

      for (const updatedAccount of accountsToUpdate) {
        const encryptedValue = encryptValue(updatedAccount.value, userId);
        const encryptedInterestRate = encryptValue(updatedAccount.interest_rate, userId);
        const encryptedMonthlyContribution = encryptValue(updatedAccount.montly_contribution, userId);
        
        await supabase
          .from("accounts")
          .update({
            value: encryptedValue,
            interest_rate: encryptedInterestRate,
            montly_contribution: encryptedMonthlyContribution,
            account_type: updatedAccount.account_type,
            type: updatedAccount.type,
            last_synced: updatedAccount.last_synced,
            is_simplefin_synced: true,
          })
          .eq("id", updatedAccount.id);
      }

      // Sync transactions after accounts are synced
      const allAccounts = [...decryptedAccounts, ...newlyCreatedAccounts];
      await syncTransactionsFromSettings(allAccounts);

      setLastSyncTime(new Date());
      
    } catch (error) {
      console.error("SimpleFin sync error:", error);
      alert("Failed to sync accounts. Please try again.");
    } finally {
      setSyncing(false);
    }
  };

  const syncTransactionsFromSettings = async (currentAccounts) => {
    try {
      // Fetch ALL existing purchases (including deleted ones) for duplicate detection
      // Deleted purchases prevent re-syncing transactions that were manually removed
      const { data: purchasesData } = await supabase
        .from("purchases")
        .select("simplefin_transaction_id, simplefin_account_id, is_deleted")
        .eq("user_id", userId);

      // Sync transactions
      const { transactionsToCreate } = await syncTransactions(
        simpleFinAccessUrl,
        currentAccounts,
        purchasesData || []
      );

      if (transactionsToCreate.length === 0) {
        console.log("No new transactions to sync");
        return;
      }

      console.log(`Syncing ${transactionsToCreate.length} new transactions`);

      // Create new purchases from transactions
      for (const transaction of transactionsToCreate) {
        await supabase.from("purchases").insert([{
          ...transaction,
          user_id: userId,
        }]);
      }

      console.log(`Successfully synced ${transactionsToCreate.length} transactions`);
      
    } catch (error) {
      console.error("Transaction sync error:", error);
      // Don't show error to user as this is secondary to account sync
    }
  };

  const handleDisconnectSimpleFin = async () => {
    try {
      await supabase
        .from("profiles")
        .update({ simplefin_access_url: null })
        .eq("id", userId);

      setSimpleFinAccessUrl(null);
      setLastSyncTime(null);
      setShowDisconnectConfirm(false);
    } catch (error) {
      console.error("Error disconnecting SimpleFin:", error);
      alert("Failed to disconnect SimpleFin.");
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // The page will likely need to refresh or redirect after sign out
      window.location.href = "/";
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };



  return (
    <div className="w-full mx-auto p-6 bg-white dark:bg-slate-800 shadow-lg rounded-lg">
      <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-6">
        Settings
      </h1>
      <div className="space-y-4">
        {mounted && (
          <div className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-md">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Dark Mode
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Toggle dark/light theme
              </p>
            </div>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5 text-gray-700 dark:text-gray-200" />
              ) : (
                <Moon className="w-5 h-5 text-gray-700 dark:text-gray-200" />
              )}
            </button>
          </div>
        )}

        {/* SimpleFin Controls */}
        {simpleFinAccessUrl && (
          <div className="border-t border-gray-200 dark:border-gray-600 pt-4 pb-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              SimpleFin Sync
            </h3>
            <button
              onClick={handleSimpleFinSync}
              disabled={syncing}
              className="w-full flex items-center justify-center gap-2 p-3 text-sm font-medium text-white bg-green-600 dark:bg-green-700 hover:bg-green-700 dark:hover:bg-green-800 rounded-md transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Accounts Now'}
            </button>
            {lastSyncTime && (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Last synced: {lastSyncTime.toLocaleTimeString()}
              </p>
            )}
            <button
              onClick={() => setShowDisconnectConfirm(true)}
              className="w-full flex items-center justify-center gap-2 p-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md transition-colors"
            >
              <XIcon className="w-4 h-4" />
              Disconnect SimpleFin
            </button>
          </div>
        )}

        <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 p-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
      
      {/* Disconnect Confirmation Modal */}
      {showDisconnectConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
              Disconnect SimpleFin?
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Your synced accounts will remain, but they will no longer automatically update. You can reconnect SimpleFin anytime from the Accounts page.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDisconnectConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDisconnectSimpleFin}
                className="flex-1 px-4 py-2.5 bg-red-500 dark:bg-red-600 hover:bg-red-600 dark:hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsMobile;
