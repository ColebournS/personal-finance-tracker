import React, { useState, useEffect } from "react";
import { db } from "../firebase"; // Adjust the path based on your file structure
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import PurchasesForm from "./purchasesForm"; // Import the PurchasesForm component

const Purchases = () => {
  const [purchases, setPurchases] = useState([]);

  useEffect(() => {
    // Query to fetch purchases from Firestore, ordered by timestamp
    const q = query(collection(db, "purchases"), orderBy("timestamp", "desc"));

    // Set up real-time listener for changes in the "purchases" collection
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const purchasesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPurchases(purchasesData);
    });

    // Clean up listener when component unmounts
    return () => unsubscribe();
  }, []);

  return (
    <div>
      <h1>Purchases</h1>

      {/* PurchasesForm to add new purchases */}
      <PurchasesForm />

      {/* Display the list of purchases */}
      <h2>Recent Purchases</h2>
      {purchases.length > 0 ? (
        <ul>
          {purchases.map((purchase) => (
            <li key={purchase.id}>
              <strong>{purchase.itemName}</strong> - ${purchase.cost.toFixed(2)}
              (Budget Group: {purchase.budgetGroup})
              <br />
              <small>
                {new Date(purchase.timestamp.seconds * 1000).toLocaleString()}
              </small>
            </li>
          ))}
        </ul>
      ) : (
        <p>No purchases found.</p>
      )}
    </div>
  );
};

export default Purchases;
