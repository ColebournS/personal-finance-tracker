import React, { useState, useEffect } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import Income from "./components/Income";
import Budget from "./components/Budget";
import Purchases from "./components/Purchases";
import RecomendedBudget from "./components/Charts/RecomendedBudget";
import CurrentBudget from "./components/Charts/CurrentBudget";
import BudgetVsSpent from "./components/Charts/BudgetVsSpent";

function App() {
  const [takeHomePay, setTakeHomePay] = useState(0);
  const [columns, setColumns] = useState(3);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 890) {
        setColumns(1);
      } else if (width < 1100) {
        setColumns(2);
      } else if (width < 2000) {
        setColumns(3);
      } else {
        setColumns(4);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const gridClasses = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  };

  return (
    <Router>
      <div className={`grid ${gridClasses[columns]} bg-blue-100`}>
        <div className="flex flex-col gap-4 my-5 mx-4">
          <Income onTakeHomePayUpdate={setTakeHomePay} />
          <RecomendedBudget />
        </div>

        <div className="flex flex-col gap-4 my-5 mx-4">
          <Budget takeHomePay={takeHomePay} />
          <CurrentBudget />
        </div>

        <div className="flex flex-col gap-4 my-5 mx-4">
          <Purchases />
          <BudgetVsSpent />
        </div>
      </div>
    </Router>
  );
}

export default App;
