import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
} from "firebase/firestore";
import { Trash2, Save } from "lucide-react";

const Purchases = () => {
  const [formData, setFormData] = useState({
    itemName: "",
    cost: "",
    budgetGroup: "",
    selectedItem: "",
    timestamp: "",
  });
  const [purchases, setPurchases] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editableField, setEditableField] = useState(null);

  useEffect(() => {
    const fetchCategories = async () => {
      const categoriesSnapshot = await getDocs(collection(db, "categories"));
      const categoriesData = categoriesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCategories(categoriesData);
    };

    fetchCategories();

    const unsubscribe = onSnapshot(collection(db, "purchases"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setPurchases(data);
    });

    return () => unsubscribe();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        const purchaseRef = doc(db, "purchases", editingId);
        await updateDoc(purchaseRef, {
          itemName: formData.itemName,
          cost: parseFloat(formData.cost),
          budgetGroup: formData.budgetGroup,
          timestamp: new Date(formData.timestamp + "T00:00:00Z"),
        });
      } else {
        await addDoc(collection(db, "purchases"), {
          itemName: formData.itemName,
          cost: parseFloat(formData.cost),
          budgetGroup: formData.budgetGroup,
          timestamp: new Date(formData.timestamp + "T00:00:00Z"),
        });
      }

      setFormData({
        itemName: "",
        cost: "",
        budgetGroup: "",
        selectedItem: "",
        timestamp: "",
      });
      setEditingId(null);
    } catch (error) {
      console.error("Error adding/updating purchase: ", error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "purchases", id));
    } catch (error) {
      console.error("Error deleting purchase: ", error);
    }
  };

  const handleCellClick = (field, purchase) => {
    setEditableField(field);
    setFormData({
      itemName: purchase.itemName,
      cost: purchase.cost.toString(),
      budgetGroup: purchase.budgetGroup,
      selectedItem: purchase.itemName,
      timestamp: purchase.timestamp
        ? purchase.timestamp.toDate().toISOString().split("T")[0]
        : "",
    });
    setEditingId(purchase.id);
  };

  const handleFieldBlur = async (field) => {
    if (editingId && editableField === field) {
      const purchaseRef = doc(db, "purchases", editingId);
      const updatedValue =
        field === "cost"
          ? parseFloat(formData[field])
          : field === "timestamp"
          ? new Date(formData[field] + "T00:00:00Z")
          : formData[field];

      await updateDoc(purchaseRef, {
        [field]: updatedValue,
      });
      setEditableField(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 mx-5 my-5 bg-white shadow-lg rounded-lg">
      <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
        Purchases
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 mb-2">Item Name</label>
            <input
              type="text"
              name="itemName"
              value={formData.itemName}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Cost</label>
            <input
              type="number"
              name="cost"
              value={formData.cost}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Budget Group</label>
            <select
              name="budgetGroup"
              value={formData.budgetGroup}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a group</option>
              {categories.map((category) => (
                <optgroup key={category.id} label={category.group}>
                  {category.items.map((item) => (
                    <option key={item.id} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Date</label>
            <input
              type="date"
              name="timestamp"
              value={formData.timestamp}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition-colors flex items-center justify-center"
        >
          <Save className="mr-2" />{" "}
          {editingId ? "Update Purchase" : "Add Purchase"}
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full border bg-blue-50">
          <thead>
            <tr className="bg-blue-100">
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Item Name</th>
              <th className="p-3 text-left">Cost</th>
              <th className="p-3 text-left">Budget Group</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((purchase) => (
              <tr
                key={purchase.id}
                className="border-b hover:bg-blue-200 transition-colors"
              >
                <td
                  onClick={() => handleCellClick("timestamp", purchase)}
                  className="p-3 cursor-pointer hover:bg-blue-300 hover:text-blue-900 transition-colors"
                >
                  {editableField === "timestamp" &&
                  editingId === purchase.id ? (
                    <input
                      type="date"
                      name="timestamp"
                      value={formData.timestamp}
                      onChange={handleChange}
                      onBlur={() => handleFieldBlur("timestamp")}
                      className="w-full"
                      autoFocus
                    />
                  ) : (
                    new Date(
                      purchase.timestamp.seconds * 1000
                    ).toLocaleDateString()
                  )}
                </td>
                <td
                  onClick={() => handleCellClick("itemName", purchase)}
                  className="p-3 cursor-pointer hover:bg-blue-300 hover:text-blue-900 transition-colors"
                >
                  {editableField === "itemName" && editingId === purchase.id ? (
                    <input
                      type="text"
                      name="itemName"
                      value={formData.itemName}
                      onChange={handleChange}
                      onBlur={() => handleFieldBlur("itemName")}
                      className="w-full"
                      autoFocus
                    />
                  ) : (
                    purchase.itemName
                  )}
                </td>
                <td
                  onClick={() => handleCellClick("cost", purchase)}
                  className="p-3 cursor-pointer hover:bg-blue-300 hover:text-blue-900 transition-colors"
                >
                  {editableField === "cost" && editingId === purchase.id ? (
                    <input
                      type="number"
                      name="cost"
                      value={formData.cost}
                      onChange={handleChange}
                      onBlur={() => handleFieldBlur("cost")}
                      className="w-full"
                      autoFocus
                    />
                  ) : (
                    `$${purchase.cost.toFixed(2)}`
                  )}
                </td>
                <td
                  onClick={() => handleCellClick("budgetGroup", purchase)}
                  className="p-3 cursor-pointer hover:bg-blue-300 hover:text-blue-900 transition-colors"
                >
                  {editableField === "budgetGroup" &&
                  editingId === purchase.id ? (
                    <select
                      name="budgetGroup"
                      value={formData.budgetGroup}
                      onChange={handleChange}
                      onBlur={() => handleFieldBlur("budgetGroup")}
                      className="w-full"
                      autoFocus
                    >
                      <option value="">Select a group</option>
                      {categories.map((category) => (
                        <optgroup key={category.id} label={category.group}>
                          {category.items.map((item) => (
                            <option key={item.id} value={item.name}>
                              {item.name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  ) : (
                    purchase.budgetGroup
                  )}
                </td>
                <td className="p-3">
                  <button
                    onClick={() => handleDelete(purchase.id)}
                    className="text-red-500 hover:text-red-700 mr-2"
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
  );
};

export default Purchases;
