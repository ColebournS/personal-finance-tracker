import React from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Home } from "lucide-react";

const NotFound = ({ isMobile }) => {
  const homeRoute = isMobile ? "/" : "/budget";

  return (
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center px-4">
      <div className="text-center">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <AlertCircle className="w-24 h-24 text-blue-500 dark:text-blue-400" />
        </div>
        
        {/* 404 Text */}
        <h1 className="text-6xl font-bold text-gray-800 dark:text-white mb-4">
          404
        </h1>
        
        {/* Message */}
        <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-200 mb-2">
          Page Not Found
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
          Oops! The page you're looking for doesn't exist. It might have been moved or deleted.
        </p>
        
        {/* Home Button */}
        <Link
          to={homeRoute}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors font-medium shadow-md hover:shadow-lg"
        >
          <Home size={20} />
          <span>Go to Home</span>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;

