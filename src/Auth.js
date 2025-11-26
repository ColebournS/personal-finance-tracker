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

  const handleSignIn = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
      window.location.reload();
    }
  };

  const handleSignUp = async (e) => {
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
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;

      if (data?.user) {
        alert("Check your email for the confirmation link!");
      }
    } catch (error) {
      setError(error.message);
    } finally {
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
            <form className="space-y-4" onSubmit={handleSignIn}>
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
                  placeholder="Password"
                  className="w-full p-2 border dark:border-gray-600 rounded bg-white dark:bg-slate-700 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <div className="text-red-500 dark:text-red-400 text-sm">{error}</div>}
              <div className="space-x-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-500 dark:bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Loading..." : "Sign In"}
                </button>
                <button
                  type="button"
                  onClick={handleSignUp}
                  disabled={loading}
                  className="bg-white dark:bg-slate-700 text-blue-500 dark:text-blue-400 px-4 py-2 rounded border border-blue-500 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-slate-600 disabled:opacity-50"
                >
                  Sign Up
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
