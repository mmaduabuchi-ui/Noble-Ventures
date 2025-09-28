import React, { useState } from "react";
import { supabase } from "./supabaseClient";

export default function App() {
  const [pages, setPages] = useState([
    { id: "1", date: "23/06/2025", rows: [] },
    { id: "2", date: "28/09/2025", rows: [] },
  ]);
  const [activePageId, setActivePageId] = useState("1");
  const [search, setSearch] = useState("");
  const [showAudit, setShowAudit] = useState(false);

  const styles = {
    tabBar: { display: "flex", gap: 8, paddingBottom: 8, overflowX: "auto", whiteSpace: "nowrap" },
    tab: (active) => ({
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "6px 10px",
      borderRadius: 6,
      cursor: "pointer",
      background: active ? "#2563EB" : "#E5E7EB",
      color: active ? "#fff" : "#111827",
      minWidth: 100,
    }),
    tabInput: { background: "transparent", border: "none", borderBottom: "1px solid rgba(0,0,0,0.2)", outline: "none", width: "100%", textAlign: "center", color: "inherit" },
    iconButton: { background: "transparent", border: "none", cursor: "pointer", fontSize: 16, color: "inherit" },
    table: { width: "100%", borderCollapse: "collapse", marginTop: 12 },
    th: { border: "1px solid #D1D5DB", padding: 8, background: "#F3F4F6" },
    td: { border: "1px solid #D1D5DB", padding: 8 },
  };

  const addPage = () => {
    const newId = Date.now().toString();
    const today = new Date().toLocaleDateString("en-GB");
    const newPage = { id: newId, date: today, rows: [] };
    setPages((s) => [...s, newPage]);
    setActivePageId(newId);
  };

  const deletePage = (id) => {
    if (!window.confirm("Are you sure you want to delete this page?")) return;

    setPages((prev) => {
      const remaining = prev.filter((p) => p.id !== id);
      if (remaining.length === 0) {
        const freshId = Date.now().toString();
        setActivePageId(freshId);
        return [{ id: freshId, date: new Date().toLocaleDateString("en-GB"), rows: [] }];
      }
      if (activePageId === id) {
        const idx = prev.findIndex((p) => p.id === id);
        const next = remaining[idx - 1] || remaining[0];
        setActivePageId(next.id);
      }
      return remaining;
    });
  };

  const updatePageDate = (id, newDate) => {
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, date: newDate } : p)));
  };

  const addRow = () => {
    setPages((prev) =>
      prev.map((p) =>
        p.id === activePageId
          ? {
              ...p,
              rows: [
                ...p.rows,
                {
                  id: Date.now() + Math.random(),
                  product_name: "",
                  original_price: "",
                  price_sold: "",
                  sold: false,
                },
              ],
            }
          : p
      )
    );
  };

  const deleteRow = (rowId) => {
    if (!window.confirm("Are you sure you want to delete this row?")) return;

    setPages((prev) =>
      prev.map((p) => (p.id === activePageId ? { ...p, rows: p.rows.filter((r) => r.id !== rowId) } : p))
    );
  };

  const updateRow = (rowId, field, value) => {
    setPages((prev) =>
      prev.map((p) =>
        p.id === activePageId
          ? { ...p, rows: p.rows.map((r) => (r.id === rowId ? { ...r, [field]: value } : r)) }
          : p
      )
    );
  };

  const activePage = pages.find((p) => p.id === activePageId) || null;

  const filteredRows = activePage
    ? activePage.rows.filter((r) => (r.product_name || "").toLowerCase().includes(search.toLowerCase()))
    : [];

  const auditSummary = () => {
    if (!activePage) return { soldCount: 0, notSoldCount: 0, profit: 0 };
    const soldRows = activePage.rows.filter((r) => r.sold);
    const notSoldRows = activePage.rows.filter((r) => !r.sold);
    const totalSold = soldRows.reduce((sum, r) => sum + Number(r.price_sold || 0), 0);
    const totalOriginal = soldRows.reduce((sum, r) => sum + Number(r.original_price || 0), 0);
    return { soldCount: soldRows.length, notSoldCount: notSoldRows.length, profit: totalSold - totalOriginal };
  };

  const { soldCount, notSoldCount, profit } = auditSummary();

  const savePage = async () => {
    if (!activePage) return;
    try {
      await supabase.from("products").delete().eq("page_id", activePage.id);

      const { error } = await supabase.from("products").insert(
        activePage.rows.map((r) => ({
          page_id: activePage.id,
          product_name: r.product_name || "",
          original_price: Number(r.original_price) || 0,
          price_sold: Number(r.price_sold) || 0,
          sold: Boolean(r.sold),
        }))
      );
      if (error) throw error;
      alert("✅ Page saved successfully!");
    } catch (err) {
      console.error(err);
      alert("❌ Error saving products!");
    }
  };

  const loadPage = async () => {
    if (!activePage) return;
    try {
      const { data, error } = await supabase.from("products").select("*").eq("page_id", activePage.id);
      if (error) throw error;
      setPages((prev) =>
        prev.map((p) => (p.id === activePage.id ? { ...p, rows: data.map((d) => ({ ...d, id: Date.now() + Math.random() })) } : p))
      );
    } catch (err) {
      console.error(err);
      alert("❌ Error loading products!");
    }
  };

  return (
    <div style={{ padding: 18, maxWidth: 1100, margin: "0 auto" }}>
      {/* Company Name */}
      <h1 style={{ fontSize: 28, fontWeight: "bold", marginBottom: 12 }}>🏢 Noble Ventures</h1>

      {/* Tabs */}
      <div style={styles.tabBar}>
        {pages.map((page) => {
          const active = page.id === activePageId;
          return (
            <div key={page.id} style={styles.tab(active)} onClick={() => setActivePageId(page.id)}>
              <input
                style={styles.tabInput}
                value={page.date}
                onChange={(e) => updatePageDate(page.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
              <button
                style={styles.iconButton}
                onClick={(e) => {
                  e.stopPropagation();
                  deletePage(page.id);
                }}
              >
                🗑️
              </button>
            </div>
          );
        })}
        <button
          onClick={addPage}
          style={{ padding: "6px 10px", borderRadius: 6, background: "#10B981", color: "#fff", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}
        >
          ➕ New Page
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 12 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search product..."
          style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #D1D5DB" }}
        />
      </div>

      {/* Table */}
      {activePage && (
        <>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>S/N</th>
                <th style={styles.th}>Product Name</th>
                <th style={styles.th}>Original Price</th>
                <th style={styles.th}>Price Sold</th>
                <th style={styles.th}>Sold</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td style={styles.td} colSpan={6}>
                    No rows — click "➕ Add Row"
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr key={row.id}>
                    <td style={styles.td}>{idx + 1}</td>
                    <td style={styles.td}>
                      <input value={row.product_name} onChange={(e) => updateRow(row.id, "product_name", e.target.value)} style={{ width: "100%", border: "none", outline: "none" }} />
                    </td>
                    <td style={styles.td}>
                      <input type="number" value={row.original_price} onChange={(e) => updateRow(row.id, "original_price", e.target.value)} style={{ width: "100%", border: "none", outline: "none" }} />
                    </td>
                    <td style={styles.td}>
                      <input type="number" value={row.price_sold} onChange={(e) => updateRow(row.id, "price_sold", e.target.value)} style={{ width: "100%", border: "none", outline: "none" }} />
                    </td>
                    <td style={{ ...styles.td, textAlign: "center" }}>
                      <input type="checkbox" checked={row.sold} onChange={(e) => updateRow(row.id, "sold", e.target.checked)} />
                    </td>
                    <td style={{ ...styles.td, textAlign: "center" }}>
                      <button onClick={() => deleteRow(row.id)} style={{ cursor: "pointer", color: "#DC2626", background: "transparent", border: "none", fontSize: 16 }}>
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Add Row */}
          <div style={{ marginTop: 12 }}>
            <button onClick={addRow} style={{ padding: "8px 12px", borderRadius: 6, background: "#2563EB", color: "#fff", border: "none", cursor: "pointer" }}>
              ➕ Add Row
            </button>
          </div>

          {/* Save / Load Buttons */}
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button onClick={savePage} style={{ padding: "8px 12px", borderRadius: 6, background: "#2563EB", color: "#fff", border: "none", cursor: "pointer" }}>
              💾 Save
            </button>
            <button onClick={loadPage} style={{ padding: "8px 12px", borderRadius: 6, background: "#F59E0B", color: "#fff", border: "none", cursor: "pointer" }}>
              📥 Load
            </button>
          </div>

          {/* Audit Section */}
          <div style={{ marginTop: 20 }}>
            <button onClick={() => setShowAudit((s) => !s)} style={{ padding: "8px 12px", borderRadius: 6, background: "#F59E0B", color: "#fff", border: "none", cursor: "pointer" }}>
              {showAudit ? "Hide Audit" : "Show Audit"}
            </button>

            {showAudit && (
              <div style={{ marginTop: 12, padding: 12, border: "1px solid #D1D5DB", borderRadius: 6 }}>
                <h2 style={{ fontSize: 16, marginBottom: 8 }}>📊 Monthly Audit Summary</h2>
                <p>✅ Sold Items: {soldCount}</p>
                <p>❌ Not Sold Items: {notSoldCount}</p>
                <p>💰 Profit/Loss: {profit}</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}