import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://YOUR-PROJECT.supabase.co",
  "YOUR-ANON-KEY"
);

export default function App() {
  const [pages, setPages] = useState([]);
  const [currentPageId, setCurrentPageId] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Load all pages + products
  const loadAllPages = async () => {
    setLoading(true);
    try {
      const { data: pagesData, error: pagesError } = await supabase
        .from("pages")
        .select("*")
        .order("date", { ascending: false });

      if (pagesError) throw pagesError;

      const pagesWithProducts = await Promise.all(
        pagesData.map(async (page) => {
          const { data: productsData, error: productsError } = await supabase
            .from("products")
            .select("*")
            .eq("page_id", page.id)
            .order("id");

          if (productsError) throw productsError;

          return { ...page, products: productsData || [] };
        })
      );

      setPages(pagesWithProducts);
      if (pagesWithProducts.length > 0) {
        setCurrentPageId(pagesWithProducts[0].id);
      }
    } catch (error) {
      console.error("Error loading pages:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllPages();
  }, []);

  const createNewPage = async () => {
    const { data, error } = await supabase
      .from("pages")
      .insert([{ title: "Untitled Page" }])
      .select();

    if (error) {
      console.error(error);
    } else {
      setPages([{ ...data[0], products: [] }, ...pages]);
      setCurrentPageId(data[0].id);
    }
  };

  const addRow = async () => {
    if (!currentPageId) return;

    const { data, error } = await supabase
      .from("products")
      .insert([
        {
          page_id: currentPageId,
          product_name: "",
          original_price: 0,
          price_sold: 0,
          sold: false,
        },
      ])
      .select();

    if (error) console.error(error);
    else {
      setPages(
        pages.map((p) =>
          p.id === currentPageId
            ? { ...p, products: [...p.products, ...data] }
            : p
        )
      );
    }
  };

  const savePage = async () => {
    const currentPage = pages.find((p) => p.id === currentPageId);
    if (!currentPage) return;

    for (let row of currentPage.products) {
      const { error } = await supabase
        .from("products")
        .update({
          product_name: row.product_name,
          original_price: row.original_price,
          price_sold: row.price_sold,
          sold: row.sold,
        })
        .eq("id", row.id);

      if (error) console.error(error);
    }

    alert("Page saved!");
  };

  const deleteRow = async (id) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) console.error("Delete failed:", error);
    else {
      setPages(
        pages.map((p) =>
          p.id === currentPageId
            ? { ...p, products: p.products.filter((r) => r.id !== id) }
            : p
        )
      );
    }
  };

  const handleChange = (id, field, value) => {
    setPages(
      pages.map((p) =>
        p.id === currentPageId
          ? {
              ...p,
              products: p.products.map((r) =>
                r.id === id ? { ...r, [field]: value } : r
              ),
            }
          : p
      )
    );
  };

  return (
    <div style={{ padding: 12 }}>
      <h1>🏢 Noble Ventures</h1>

      {loading ? (
        <p>⏳ Loading data...</p>
      ) : pages.length === 0 ? (
        <p>No pages found. ➕ Create a new page to get started.</p>
      ) : (
        <>
          {/* Page List */}
          <div style={{ marginBottom: 12 }}>
            {pages.map((p) => (
              <div key={p.id}>
                {new Date(p.date).toLocaleDateString()} {p.title}
                <button onClick={() => setCurrentPageId(p.id)}>📄</button>
                <button
                  onClick={async () => {
                    await supabase.from("pages").delete().eq("id", p.id);
                    setPages(pages.filter((page) => page.id !== p.id));
                  }}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>

          {/* Search Bar */}
          <input
            type="text"
            placeholder="🔍 Search product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", marginBottom: 12 }}
          />

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
              }}
            >
              <thead style={{ background: "#f3f4f6" }}>
                <tr>
                  <th>S/N</th>
                  <th>Product</th>
                  <th>Original</th>
                  <th>Sold Price</th>
                  <th>Sold</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pages
                  .find((p) => p.id === currentPageId)
                  ?.products.filter((row) =>
                    row.product_name
                      ?.toLowerCase()
                      .includes(search.toLowerCase())
                  )
                  .map((row, index) => (
                    <tr key={row.id}>
                      <td>{index + 1}</td>
                      <td>
                        <input
                          value={row.product_name || ""}
                          onChange={(e) =>
                            handleChange(row.id, "product_name", e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={row.original_price || 0}
                          onChange={(e) =>
                            handleChange(
                              row.id,
                              "original_price",
                              e.target.value
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={row.price_sold || 0}
                          onChange={(e) =>
                            handleChange(row.id, "price_sold", e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={row.sold || false}
                          onChange={(e) =>
                            handleChange(row.id, "sold", e.target.checked)
                          }
                        />
                      </td>
                      <td>
                        <button onClick={() => deleteRow(row.id)}>🗑️</button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Action Buttons */}
      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={createNewPage}>➕ New Page</button>
        <button onClick={addRow}>➕ Add Row</button>
        <button onClick={savePage}>💾 Save</button>
        <button onClick={loadAllPages}>📥 Load</button>
        <button onClick={() => alert("Audit not yet implemented")}>
          Show Audit
        </button>
        <button onClick={() => alert("Install App triggered")}>
          📲 Install App
        </button>
      </div>
    </div>
  );
}