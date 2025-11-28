import React, { useState } from "react";
import { X, Link as LinkIcon, AlertCircle, CheckCircle, Loader } from "lucide-react";
import { claimAccessUrl } from "../utils/simplefinService";
import { encryptValue } from "../utils/encryption";
import supabase from "../supabaseClient";

function SimpleFinSetup({ isOpen, onClose, onSuccess, userId }) {
  const [setupToken, setSetupToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!setupToken.trim()) {
      setError("Please enter your SimpleFin setup token");
      return;
    }

    if (!userId) {
      setError("User not authenticated. Please refresh and try again.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      // Claim the access URL from SimpleFin
      const accessUrl = await claimAccessUrl(setupToken);
      
      // Encrypt the access URL before storing
      const encryptedAccessUrl = encryptValue(accessUrl, userId);

      // Check if profile exists first
      const { data: profileExists } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .single();

      let updateError;
      
      if (profileExists) {
        // Update existing profile
        const { error } = await supabase
          .from("profiles")
          .update({ simplefin_access_url: encryptedAccessUrl })
          .eq("id", userId);
        updateError = error;
      } else {
        // Create new profile row
        const { error } = await supabase
          .from("profiles")
          .insert([{ 
            id: userId, 
            simplefin_access_url: encryptedAccessUrl 
          }]);
        updateError = error;
      }

      if (updateError) {
        throw new Error(`Failed to save access URL: ${updateError.message}`);
      }

      setSuccess(true);
      setSetupToken("");
      
      // Wait a moment to show success message, then close and pass access URL
      setTimeout(() => {
        onSuccess(accessUrl); // Pass the decrypted access URL
        onClose();
      }, 1500);

    } catch (err) {
      console.error("SimpleFin setup error:", err);
      
      if (err.message.includes('RATE_LIMIT')) {
        setError("Rate limit reached. Please wait a moment and try again.");
      } else if (err.message.includes('Invalid setup token')) {
        setError("Invalid setup token. Please check and try again.");
      } else {
        setError(err.message || "Failed to connect to SimpleFin. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setSetupToken("");
      setError("");
      setSuccess(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <LinkIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              Connect SimpleFin
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 dark:text-white mb-2">
              Getting Started
            </h3>
            <ol className="text-sm text-gray-700 dark:text-gray-300 space-y-2 list-decimal list-inside">
              <li>
                Go to{" "}
                <a
                  href="https://beta-bridge.simplefin.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300"
                >
                  SimpleFin Bridge
                </a>
              </li>
              <li>Create an account or log in</li>
              <li>Connect your financial institutions</li>
              <li>Generate a Setup Token from your user page</li>
              <li>Paste the token below</li>
            </ol>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Setup Token <span className="text-red-500">*</span>
              </label>
              <textarea
                value={setupToken}
                onChange={(e) => setSetupToken(e.target.value)}
                disabled={loading || success}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all resize-none font-mono text-sm disabled:opacity-50"
                placeholder="Paste your SimpleFin setup token here..."
                rows="4"
                required
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                The setup token is a long Base64-encoded string from SimpleFin Bridge
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <AlertCircle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="flex items-start gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <CheckCircle size={20} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-700 dark:text-green-300">
                  Successfully connected to SimpleFin! Syncing your accounts...
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || success}
                className="flex-1 px-4 py-3 bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg font-medium transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader size={20} className="animate-spin" />
                    Connecting...
                  </>
                ) : success ? (
                  <>
                    <CheckCircle size={20} />
                    Connected
                  </>
                ) : (
                  "Connect SimpleFin"
                )}
              </button>
            </div>
          </form>

          {/* Security Note */}
          <div className="text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-600 pt-4">
            <strong>Security:</strong> Your SimpleFin access URL is encrypted before being stored in the database. 
            Only you can access your financial data.
          </div>
        </div>
      </div>
    </div>
  );
}

export default SimpleFinSetup;

