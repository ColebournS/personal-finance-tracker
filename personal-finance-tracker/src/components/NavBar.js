import React from "react";
import { Link } from "react-router-dom";
import { db } from "../firebase"; // Adjust based on your project structure
import { collection, getDocs } from "firebase/firestore";
import * as XLSX from "xlsx";

function NavBar() {
  const exportToExcel = async () => {
    try {
      // Fetch data from Firestore
      const categoriesSnapshot = await getDocs(collection(db, "categories"));
      const purchasesSnapshot = await getDocs(collection(db, "purchases"));

      // Prepare categories data
      const categoriesData = [];
      categoriesSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.items) {
          data.items.forEach((item) => {
            categoriesData.push({
              Group: data.group || "Unknown",
              ItemName: item.name,
              Budget: item.budget,
              Spent: item.spent,
              ItemID: item.id,
            });
          });
        }
      });

      // Prepare purchases data
      const purchasesData = [];
      purchasesSnapshot.forEach((doc) => {
        const data = doc.data();
        purchasesData.push({
          ItemName: data.itemName,
          Cost: data.cost,
          BudgetGroup: data.budgetGroup,
          Timestamp: data.timestamp?.toDate().toLocaleString() || "N/A",
        });
      });

      // Create a workbook
      const workbook = XLSX.utils.book_new();

      // Add categories sheet
      const categoriesSheet = XLSX.utils.json_to_sheet(categoriesData);
      XLSX.utils.book_append_sheet(workbook, categoriesSheet, "Categories");

      // Add purchases sheet
      const purchasesSheet = XLSX.utils.json_to_sheet(purchasesData);
      XLSX.utils.book_append_sheet(workbook, purchasesSheet, "Purchases");

      // Write the workbook and trigger a download
      XLSX.writeFile(workbook, "FinancialData.xlsx");
    } catch (error) {
      console.error("Error exporting data to Excel: ", error);
    }
  };

  return (
    <nav
      style={{
        padding: "1rem",
        background: "#f8f9fa",
        borderBottom: "1px solid #ddd",
      }}
    >
      <ul style={{ display: "flex", listStyle: "none", margin: 0, padding: 0 }}>
        <li style={{ marginRight: "1rem" }}>
          <Link to="/charts">Charts</Link>
        </li>
        <li>
          <button
            onClick={exportToExcel}
            style={{
              padding: "0.5rem 1rem",
              background: "#007bff",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Export to Excel
          </button>
        </li>
      </ul>
    </nav>
  );
}

export default NavBar;
