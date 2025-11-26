import { useState } from "react";
import supabase from "./supabaseClient";

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
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
      <div className={`grid 1 bg-white dark:bg-black pb-20`}>
        <div className="flex flex-col gap-4 my-5 mx-4">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-md w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-white">
              Welcome to Budget Tracker
            </h2>
            <form className="space-y-4" onSubmit={handleAuth}>
              <div>
                <input
                  type="email"
                  placeholder="Email"
                  className="w-full p-2 border dark:border-gray-600 rounded bg-white dark:bg-slate-700 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Password (minimum 6 characters)"
                  className="w-full p-2 border dark:border-gray-600 rounded bg-white dark:bg-slate-700 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <div className="text-red-500 dark:text-red-400 text-sm">{error}</div>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-500 dark:bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
              >
                {loading ? "Loading..." : "Sign In / Create Account"}
              </button>
              <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
                Enter your email and password to sign in or create a new account
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
