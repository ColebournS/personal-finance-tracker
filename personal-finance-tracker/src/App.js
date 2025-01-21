import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Finances from "./components/Finances";
import Budget from "./components/Budget";
import Purchases from "./components/Purchases";
import Charts from "./components/Charts";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Finances />} />
        <Route path="/budget" element={<Budget />} />
        <Route path="/purchases" element={<Purchases />} />
        <Route path="/charts" element={<Charts />} />
      </Routes>
    </Router>
  );
}

export default App;
