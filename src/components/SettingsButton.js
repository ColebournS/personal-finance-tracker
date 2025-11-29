import React, { useState, useEffect, useRef } from "react";
import { Settings, LogOut, Moon, Sun, RefreshCw, X as XIcon } from "lucide-react";
import supabase from "../supabaseClient";
import { useTheme } from "next-themes";
import { decryptString } from "../utils/encryption";
import { syncAccounts, syncTransactions } from "../utils/simplefinService";
import { encryptValue, decryptValue } from "../utils/encryption";

const SettingsButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const popupRef = useRef(null);
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
      setIsOpen(false);
    } catch (error) {
      console.error("Error disconnecting SimpleFin:", error);
      alert("Failed to disconnect SimpleFin.");
    }
  };


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-4 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-800 hover:from-gray-200 hover:to-gray-300 dark:hover:from-slate-600 dark:hover:to-slate-700 shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-300 dark:border-gray-600 group"
        aria-label="Settings"
      >
        <Settings className="w-6 h-6 text-gray-700 dark:text-gray-200 group-hover:rotate-45 transition-transform duration-300" />
      </button>

      {isOpen && (
        <div
          ref={popupRef}
          className="absolute right-0 mt-3 w-96 rounded-xl bg-white dark:bg-slate-800 shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">Settings</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-all duration-200"
                aria-label="Close settings"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-5 space-y-4 max-h-[600px] overflow-y-auto">
            {/* Appearance Section */}
            {mounted && (
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-700/50 dark:to-slate-700/30 rounded-xl p-4 border border-gray-200/50 dark:border-gray-600/50 shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white dark:bg-slate-600 rounded-lg shadow-sm">
                      {theme === "dark" ? (
                        <Moon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      ) : (
                        <Sun className="w-5 h-5 text-amber-500" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        Appearance
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                        {theme === "dark" ? "Dark" : "Light"} mode
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 bg-gray-300 dark:bg-indigo-600"
                    aria-label="Toggle theme"
                  >
                    <span
                      className={`${
                        theme === "dark" ? "translate-x-7" : "translate-x-1"
                      } inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform duration-200`}
                    />
                  </button>
                </div>
              </div>
            )}

            {/* SimpleFin Section */}
            {simpleFinAccessUrl && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-200/50 dark:border-green-700/50 shadow-sm space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-green-100 dark:bg-green-800/50 rounded-lg">
                    <RefreshCw className="w-4 h-4 text-green-700 dark:text-green-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    SimpleFin Integration
                  </h3>
                </div>
                
                <button
                  onClick={handleSimpleFinSync}
                  disabled={syncing}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 dark:from-green-700 dark:to-emerald-700 dark:hover:from-green-800 dark:hover:to-emerald-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-md"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing Accounts...' : 'Sync Accounts Now'}
                </button>
                
                {lastSyncTime && (
                  <div className="flex items-center justify-center gap-1.5 text-xs text-green-700 dark:text-green-400 bg-green-100/50 dark:bg-green-800/30 rounded-lg py-1.5 px-3">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    <span>Last synced: {lastSyncTime.toLocaleTimeString()}</span>
                  </div>
                )}
                
                <button
                  onClick={() => setShowDisconnectConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-all duration-200 border border-red-200/50 dark:border-red-800/50"
                >
                  <XIcon className="w-4 h-4" />
                  Disconnect SimpleFin
                </button>
              </div>
            )}

            {/* Account Section */}
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md border border-red-200/50 dark:border-red-800/50 group"
              >
                <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Disconnect Confirmation Modal */}
      {showDisconnectConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-red-500 to-orange-600 dark:from-red-600 dark:to-orange-700 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <XIcon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">
                  Disconnect SimpleFin?
                </h3>
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
                Your synced accounts will remain, but they will <strong>no longer automatically update</strong>. You can reconnect SimpleFin anytime from the Accounts page.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDisconnectConfirm(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-slate-600 transition-all duration-200 shadow-sm hover:shadow-md border border-gray-300 dark:border-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDisconnectSimpleFin}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 dark:from-red-600 dark:to-red-700 dark:hover:from-red-700 dark:hover:to-red-800 text-white rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsButton;
