import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import NavBar from "./components/NavBar";
import Finances from "./components/Finances";
import Budget from "./components/Budget";
import Purchases from "./components/Purchases";
import Charts from "./components/Charts";

function App() {
  return (
    <Router>
      <NavBar />
      <div className="grid grid-cols-1 sm:grid-cols-3 bg-blue-100">
        <div>
          <Finances />
        </div>
        <div>
          <Budget />
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
