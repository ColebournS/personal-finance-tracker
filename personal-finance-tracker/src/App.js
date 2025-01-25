import React, { useState } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import NavBar from "./components/NavBar";
import Income from "./components/Income";
import Budget from "./components/Budget";
import Purchases from "./components/Purchases";
import Charts from "./components/Charts";

function App() {
  const [takeHomePay, setTakeHomePay] = useState(0);

  return (
    <Router>
      <NavBar />
      <div className="grid grid-cols-1 sm:grid-cols-3 bg-blue-100">
        <div>
          <Income onTakeHomePayUpdate={setTakeHomePay} />
        </div>
        <div>
          <Budget takeHomePay={takeHomePay} />
        </div>
        <div>
          <Purchases />
        </div>
      </div>
      <Routes>
        <Route path="/charts" element={<Charts />} />
      </Routes>
    </Router>
  );
}

export default App;
