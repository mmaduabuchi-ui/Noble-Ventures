import React, { useState } from "react";

export default function App() {
  const [pages, setPages] = useState([
    { id: 1, date: "23/06/2025", rows: [] },
    { id: 2, date: "28/09/2025", rows: [] },
  ]);
  const [activePageId, setActivePageId] = useState(1);
  const [search, setSearch] = useState("");
  const [showAudit, setShowAudit] = useState(false);

  const styles = {
    tabBar: {
      display: "flex",
      flexDirection: "row",
      gap: 8,
      alignItems: "center",
      paddingBottom: 8,
      overflowX: "auto",
      whiteSpace: "nowrap",
    },
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
      boxSizing: "border-box",
    }),
    tabInput: {
      background: "transparent",
      border: "none",
      borderBottom: "1px solid rgba(0,0,0,0.2)",
      outline: "none",
      width: "100%",
      textAlign: "center",
      color: "inherit",
    },
    iconButton: {
      background: "transparent",
      border: "none",
      cursor: "pointer",
      fontSize: 16,
      color: "inherit",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      marginTop: 12,
    },
    th: { border: "1px solid #D1D5DB", padding: 8, background: "#F3F4F6" },
    td: { border: "1px solid #D1D5DB", padding: 8 },
  };

  const addPage = () => {
    const newId = Date.now();
    const today = new Date().toLocaleDateString("en-GB");
    const newPage = { id: newId, date: today, rows: [] };
    setPages((s) => [...s, newPage]);
    setActivePageId(newId);
  };

  const deletePage = (id) => {
    setPages((prev) => {
      const remaining = prev.filter((p) => p.id !== id);
      if (remaining.length === 0) {
        const freshId = Date.now();
        const fresh = { id: freshId, date: new Date().toLocaleDateString("en-GB"), rows: [] };
        setActivePageId(freshId);
        return [fresh];
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
                  productName: "",
                  originalPrice: "",
                  priceSold: "",
                  sold: false,
                },
              ],
            }
          : p
      )
    );
  };

  const deleteRow = (rowId) => {
    setPages((prev) =>
      prev.map((p) =>
        p.id === activePageId ? { ...p, rows: p.rows.filter((r) => r.id !== rowId) } : p
      )
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
    ? activePage.rows.filter((r) =>
        (r.productName || "").toString().toLowerCase().includes(search.toLowerCase())
      )
    : [];

  // --- Audit calculations ---
  const auditSummary = () => {
    if (!activePage) return { soldCount: 0, notSoldCount: 0, profit: 0 };

    const soldRows = activePage.rows.filter((r) => r.sold);
    const notSoldRows = activePage.rows.filter((r) => !r.sold);

    const totalSold = soldRows.reduce((sum, r) => sum + Number(r.priceSold || 0), 0);
    const totalOriginal = soldRows.reduce((sum, r) => sum + Number(r.originalPrice || 0), 0);

    return {
      soldCount: soldRows.length,
      notSoldCount: notSoldRows.length,
      profit: totalSold - totalOriginal,
    };
  };

  const { soldCount, notSoldCount, profit } = auditSummary();

  return (
    <div style={{ padding: 18, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 20, marginBottom: 12 }}>📦 Product Spreadsheet</h1>

      {/* Tabs */}
      <div style={styles.tabBar}>
        {pages.map((page) => {
          const active = page.id === activePageId;
          return (
            <div
              key={page.id}
              style={styles.tab(active)}
              onClick={() => setActivePageId(page.id)}
            >
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
          style={{
            padding: "6px 10px",
            borderRadius: 6,
            background: "#10B981",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
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
      {activePage ? (
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
                      <input
                        value={row.productName}
                        onChange={(e) => updateRow(row.id, "productName", e.target.value)}
                        style={{ width: "100%", border: "none", outline: "none" }}
                      />
                    </td>
                    <td style={styles.td}>
                      <input
                        type="number"
                        value={row.originalPrice}
                        onChange={(e) => updateRow(row.id, "originalPrice", e.target.value)}
                        style={{ width: "100%", border: "none", outline: "none" }}
                      />
                    </td>
                    <td style={styles.td}>
                      <input
                        type="number"
                        value={row.priceSold}
                        onChange={(e) => updateRow(row.id, "priceSold", e.target.value)}
                        style={{ width: "100%", border: "none", outline: "none" }}
                      />
                    </td>
                    <td style={{ ...styles.td, textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={row.sold}
                        onChange={(e) => updateRow(row.id, "sold", e.target.checked)}
                      />
                    </td>
                    <td style={{ ...styles.td, textAlign: "center" }}>
                      <button
                        onClick={() => deleteRow(row.id)}
                        style={{
                          cursor: "pointer",
                          color: "#DC2626",
                          background: "transparent",
                          border: "none",
                          fontSize: 16,
                        }}
                      >
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
            <button
              onClick={addRow}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                background: "#2563EB",
                color: "#fff",
                border: "none",
                cursor: "pointer",
              }}
            >
              ➕ Add Row
            </button>
          </div>

          {/* Audit Section */}
          <div style={{ marginTop: 20 }}>
            <button
              onClick={() => setShowAudit((s) => !s)}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                background: "#F59E0B",
                color: "#fff",
                border: "none",
                cursor: "pointer",
              }}
            >
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
      ) : (
        <div>No page selected</div>
      )}
    </div>
  );
}