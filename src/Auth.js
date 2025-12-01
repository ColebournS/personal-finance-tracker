import { useState } from "react";
import supabase from "./supabaseClient";
import { Mail, Lock, Wallet } from "lucide-react";

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  // Simplified email validation
  const isValidEmail = (email) => {
    return email.includes("@") && email.includes(".");
  };

  const handleAuth = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Try to sign in first
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // If sign in fails, try to create account
      if (signInError) {
        // Check if it's an invalid credentials error (user doesn't exist or wrong password)
        if (signInError.message.includes("Invalid login credentials") || 
            signInError.message.includes("Email not confirmed")) {
          
          // Try to sign up
          const { error: signUpError, data } = await supabase.auth.signUp({
            email,
            password,
          });

          if (signUpError) {
            // If sign up also fails, show the error
            throw signUpError;
          }

          // If sign up succeeds, automatically sign in
          if (data?.user) {
            const { error: autoSignInError } = await supabase.auth.signInWithPassword({
              email,
              password,
            });
            
            if (autoSignInError) throw autoSignInError;
          }
        } else {
          // If it's a different error, throw it
          throw signInError;
        }
      }
      
      // Success - reload the page
      window.location.reload();
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="p-8 text-center border-b border-gray-200 dark:border-gray-700">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-full mb-4 shadow-lg">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
              Budget Tracker
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Manage your finances with ease
            </p>
          </div>

          {/* Form */}
          <div className="p-8">
            <form className="space-y-5" onSubmit={handleAuth}>
              {/* Email Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                    <Mail size={20} />
                  </div>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                    <Lock size={20} />
                  </div>
                  <input
                    type="password"
                    placeholder="Minimum 6 characters"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-3 text-red-600 dark:text-red-400 text-sm font-medium">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 hover:from-blue-600 hover:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800 text-white px-6 py-3.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? "Loading..." : "Sign In / Create Account"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
