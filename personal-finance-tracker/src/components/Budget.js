import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  doc,
  updateDoc,
  query,
  where,
  writeBatch,
  getDocs,
  addDoc,
  deleteDoc,
  onSnapshot,
  collection,
} from "firebase/firestore";
import { Trash2, PlusCircle } from "lucide-react";

function Budget() {
  const [categories, setCategories] = useState([]);
  const [income, setIncome] = useState(2200);
  const [purchases, setPurchases] = useState([]);

  // Fetch categories and purchases in real-time
  useEffect(() => {
    const unsubscribeCategories = onSnapshot(
      collection(db, "categories"),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCategories(data);
      }
    );

    const unsubscribePurchases = onSnapshot(
      collection(db, "purchases"),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPurchases(data);
      }
    );

    return () => {
      unsubscribeCategories();
      unsubscribePurchases();
    };
  }, []);

  // Calculate total spent for a given budgetGroup (category name)
  const calculateSpent = (groupName) => {
    const filteredPurchases = purchases.filter(
      (purchase) => purchase.budgetGroup === groupName
    );

    return filteredPurchases.reduce(
      (sum, purchase) => sum + (purchase.cost || 0),
      0
    );
  };

  // Handle changes to category/group/item fields
  const handleInputChange = async (groupId, itemId, field, value) => {
    const groupRef = doc(db, "categories", groupId);

    if (itemId) {
      const category = categories.find((category) => category.id === groupId);
      if (!category) {
        console.error("Category not found for groupId:", groupId);
        return;
      }

      const item = category.items.find((item) => item.id === itemId);
      if (!item) {
        console.error("Item not found for itemId:", itemId);
        return;
      }

      const prevValue = item[field];
      const updatedItems = category.items.map((item) =>
        item.id === itemId
          ? { ...item, [field]: field === "name" ? value : Number(value) }
          : item
      );
      await updateDoc(groupRef, { items: updatedItems });

      if (field === "name") {
        if (!prevValue) {
          console.error("Category name is undefined for groupId:", groupId);
          return;
        }

        const purchasesRef = collection(db, "purchases");
        const purchasesQuery = query(
          purchasesRef,
          where("budgetGroup", "==", prevValue)
        );

        const purchasesSnapshot = await getDocs(purchasesQuery);
        const batch = writeBatch(db);
        purchasesSnapshot.forEach((doc) => {
          batch.update(doc.ref, { budgetGroup: value });
        });
        await batch.commit();
      }
    } else {
      await updateDoc(groupRef, { [field]: value });
    }
  };

  // Handle adding new item to a group
  const handleAddItem = async (groupId) => {
    const groupRef = doc(db, "categories", groupId);
    const newItem = {
      id: Date.now().toString(),
      name: "New Item",
      budget: 0,
      spent: 0,
    };

    const updatedItems = [
      ...categories.find((category) => category.id === groupId).items,
      newItem,
    ];

    await updateDoc(groupRef, { items: updatedItems });
  };

  // Handle adding a new group
  const handleAddGroup = async () => {
    const newGroup = { group: "New Group", items: [] };
    await addDoc(collection(db, "categories"), newGroup);
  };

  // Handle deleting an item
  const handleDeleteItem = async (groupId, itemId) => {
    const groupRef = doc(db, "categories", groupId);
    const updatedItems = categories
      .find((category) => category.id === groupId)
      .items.filter((item) => item.id !== itemId);

    await updateDoc(groupRef, { items: updatedItems });
  };

  // Handle deleting a group
  const handleDeleteGroup = async (groupId) => {
    await deleteDoc(doc(db, "categories", groupId));
  };

  // Calculate total budget, total spent, and remaining budget/spent
  const calculateTotals = () => {
    let totalBudget = 0;
    let totalSpent = 0;

    categories.forEach((category) => {
      category.items.forEach((item) => {
        totalBudget += item.budget;
        item.spent = calculateSpent(item.name);
        totalSpent += item.spent;
      });
    });

    return {
      totalBudget,
      totalSpent,
      remainingBudget: income - totalBudget,
      remainingSpent: income - totalSpent,
    };
  };

  const totals = calculateTotals();

  return (
    <div className="max-w-4xl mx-auto p-6 mx-5 my-5 bg-white shadow-lg rounded-lg">
      <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
        Budget Tracker
      </h1>

      <div className="flex justify-between items-center mb-6">
        <div className="text-xl font-semibold">Income: ${income}</div>
        <button
          onClick={handleAddGroup}
          className="flex items-center bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
        >
          <PlusCircle className="mr-2" size={20} /> Add Group
        </button>
      </div>

      {categories.map((category) => (
        <div
          key={category.id}
          className="mb-6 bg-gray-50 p-4 rounded-lg border"
        >
          <div className="flex justify-between items-center mb-4 ">
            <input
              type="text"
              value={category.group}
              onChange={(e) =>
                handleInputChange(category.id, null, "group", e.target.value)
              }
              className="text-xl font-semibold text-gray-700 bg-transparent border-b border-gray-300 focus:border-blue-500 w-full hover:bg-gray-200"
            />
            <div className="flex space-x-2">
              <button
                onClick={() => handleAddItem(category.id)}
                className="flex items-center ml-10 bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600 transition-colors"
              >
                <PlusCircle className="mr-2" size={40} />
                <span className="text-sm">Add Item</span>
              </button>
              <button
                onClick={() => handleDeleteGroup(category.id)}
                className="flex items-center bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition-colors"
              >
                <Trash2 className="mr-1" size={40} />
                <span className="text-sm">Delete {category.group}</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border bg-blue-50">
              <thead>
                <tr className="bg-blue-100">
                  <th className="w-full p-3 font-semibold text-gray-700">
                    Group
                  </th>
                  <th className="w-10 p-3 font-semibold text-gray-700">
                    Budget
                  </th>
                  <th className="w-10 p-3 font-semibold text-gray-700">
                    Spent
                  </th>
                </tr>
              </thead>
              <tbody>
                {category.items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b hover:bg-gray-200 transition-colors"
                  >
                    <td className="p-3">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) =>
                          handleInputChange(
                            category.id,
                            item.id,
                            "name",
                            e.target.value
                          )
                        }
                        className="w-full bg-transparent border-b border-gray-300 focus:border-blue-500"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        value={item.budget}
                        onChange={(e) =>
                          handleInputChange(
                            category.id,
                            item.id,
                            "budget",
                            e.target.value
                          )
                        }
                        className="w-10 bg-transparent border-b border-gray-300 focus:border-blue-500"
                      />
                    </td>
                    <td className="p-3 w-10">
                      <span
                        className={`font-semibold ${
                          calculateSpent(item.name) > item.budget
                            ? "text-red-500"
                            : "text-green-600"
                        }`}
                      >
                        ${calculateSpent(item.name)}
                      </span>
                    </td>
                    <td className="p-3 w-8 flex justify-center items-center">
                      <button
                        onClick={() => handleDeleteItem(category.id, item.id)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <Trash2 size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div className="bg-gray-100 p-4 rounded-lg mt-6">
        <h3 className="text-2xl font-bold mb-4 text-gray-800">
          Budget Summary
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600">
              Allocated Budget:{" "}
              <span className="font-semibold text-blue-600">
                ${totals.totalBudget}
              </span>
            </p>
            <p className="text-gray-600">
              Budget Remaining:{" "}
              <span
                className={`font-semibold ${
                  totals.remainingBudget < 0 ? "text-red-500" : "text-green-600"
                }`}
              >
                ${totals.remainingBudget}
              </span>
            </p>
          </div>
          <div>
            <p className="text-gray-600">
              Total Spent:{" "}
              <span className="font-semibold text-blue-600">
                ${totals.totalSpent}
              </span>
            </p>
            <p className="text-gray-600">
              Total Remaining:{" "}
              <span
                className={`font-semibold ${
                  totals.remainingSpent < 0 ? "text-red-500" : "text-green-600"
                }`}
              >
                ${totals.remainingSpent}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Budget;
