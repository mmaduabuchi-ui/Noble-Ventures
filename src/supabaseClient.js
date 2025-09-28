import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient"; // 👈 your client

function App() {
  const [items, setItems] = useState([]);

  // Fetch items from Supabase and subscribe to Realtime updates
  useEffect(() => {
    // 1️⃣ Fetch initial items
    const fetchItems = async () => {
      const { data, error } = await supabase.from("items").select("*");
      if (error) {
        console.error("Error fetching items:", error);
      } else {
        setItems(data || []);
      }
    };
    fetchItems();

    // 2️⃣ Subscribe to Realtime updates
    const subscription = supabase
      .channel("public:items")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "items" },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload;
          setItems((prevItems) => {
            switch (eventType) {
              case "INSERT":
                return [...prevItems, newRow];
              case "UPDATE":
                return prevItems.map((item) =>
                  item.id === newRow.id ? newRow : item
                );
              case "DELETE":
                return prevItems.filter((item) => item.id !== oldRow.id);
              default:
                return prevItems;
            }
          });
        }
      )
      .subscribe();

    // 3️⃣ Cleanup on unmount
    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  // Add new item
  const addItem = async (newItem) => {
    const { data, error } = await supabase
      .from("items")
      .insert([newItem])
      .select();
    if (error) {
      console.error("Error adding item:", error);
    } else {
      setItems((prev) => [...prev, ...data]);
    }
  };

  // Delete item
  const deleteItem = async (id) => {
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) {
      console.error("Error deleting item:", error);
    } else {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  // Update item (e.g., mark sold/not sold)
  const updateItem = async (id, updates) => {
    const { data, error } = await supabase
      .from("items")
      .update(updates)
      .eq("id", id)
      .select();
    if (error) {
      console.error("Error updating item:", error);
    } else {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
      );
    }
  };

  // Your existing UI & Monthly Audit code stays the same
  return (
    <div>
      <h1>Noble Ventures</h1>
      {/* Example usage */}
      <button
        onClick={() =>
          addItem({ name: "New Item", sold: false, price: 100, created_at: new Date() })
        }
      >
        Add Item
      </button>

      {items.map((item) => (
        <div key={item.id}>
          <p>
            {item.name} - {item.sold ? "Sold" : "Not Sold"} - ₦{item.price}
          </p>
          <button onClick={() => updateItem(item.id, { sold: !item.sold })}>
            Toggle Sold
          </button>
          <button onClick={() => deleteItem(item.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}

export default App;