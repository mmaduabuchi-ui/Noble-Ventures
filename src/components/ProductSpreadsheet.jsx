import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ProductSpreadsheet() {
  const [products, setProducts] = useState([]);

  // Fetch data from Supabase on load
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase.from("products").select("*");
    if (error) {
      console.error("Error fetching products:", error.message);
    } else {
      setProducts(data);
    }
  };

  const addRow = () => {
    setProducts([
      ...products,
      { id: Date.now(), name: "", original_price: 0, price_sold: 0, sold: false },
    ]);
  };

  const deleteRow = async (id) => {
    // Remove from DB
    await supabase.from("products").delete().eq("id", id);
    // Remove from UI
    setProducts(products.filter((p) => p.id !== id));
  };

  const updateField = (id, field, value) => {
    setProducts(
      products.map((p) =>
        p.id === id ? { ...p, [field]: value } : p
      )
    );
  };

  const saveData = async () => {
    for (let p of products) {
      // Insert or update product in Supabase
      const { error } = await supabase.from("products").upsert({
        id: p.id > 100000 ? null : p.id, // new rows use auto id
        name: p.name,
        original_price: p.original_price,
        price_sold: p.price_sold,
        sold: p.sold,
      });
      if (error) console.error("Save error:", error.message);
    }
    alert("✅ Products saved to Supabase!");
    fetchProducts();
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">📦 Product Spreadsheet</h1>

      {/* Search Bar */}
      <Input placeholder="🔍 Search product..." className="w-1/2" />

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>S/N</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>Original Price</TableHead>
              <TableHead>Price Sold</TableHead>
              <TableHead>Sold</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p, index) => (
              <TableRow key={p.id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>
                  <Input
                    value={p.name}
                    onChange={(e) => updateField(p.id, "name", e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={p.original_price}
                    onChange={(e) =>
                      updateField(p.id, "original_price", Number(e.target.value))
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={p.price_sold}
                    onChange={(e) =>
                      updateField(p.id, "price_sold", Number(e.target.value))
                    }
                  />
                </TableCell>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={p.sold}
                    onChange={(e) => updateField(p.id, "sold", e.target.checked)}
                  />
                </TableCell>
                <TableCell>
                  <Button variant="destructive" onClick={() => deleteRow(p.id)}>
                    🗑️
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2">
        <Button onClick={addRow}>➕ Add Row</Button>
        <Button onClick={saveData}>💾 Save</Button>
      </div>
    </div>
  );
}