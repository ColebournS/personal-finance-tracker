import React, { useState } from "react";
import { db } from "../firebase"; // Adjust the path based on your file structure
import { collection, addDoc } from "firebase/firestore";

const PurchasesForm = () => {
  const [formData, setFormData] = useState({
    itemName: "",
    cost: "",
    budgetGroup: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Add the purchase to the Firestore database
      await addDoc(collection(db, "purchases"), {
        itemName: formData.itemName,
        cost: parseFloat(formData.cost), // Ensure cost is stored as a number
        budgetGroup: formData.budgetGroup,
        timestamp: new Date(), // Optional: add a timestamp
      });
      alert("Purchase added successfully!");
      setFormData({ itemName: "", cost: "", budgetGroup: "" });
    } catch (error) {
      console.error("Error adding purchase: ", error);
      alert("Failed to add purchase. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Item Name:
        <input
          type="text"
          name="itemName"
          value={formData.itemName}
          onChange={handleChange}
          required
        />
      </label>
      <label>
        Cost:
        <input
          type="number"
          name="cost"
          value={formData.cost}
          onChange={handleChange}
          required
        />
      </label>
      <label>
        Budget Group:
        <input
          type="text"
          name="budgetGroup"
          value={formData.budgetGroup}
          onChange={handleChange}
          required
        />
      </label>
      <button type="submit">Add Purchase</button>
    </form>
  );
};

export default PurchasesForm;
