import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function App() {
  const [pages, setPages] = useState([]);
  const [activePageId, setActivePageId] = useState(null);
  const [search, setSearch] = useState("");
  const [showAudit, setShowAudit] = useState(false);

  // 👉 PWA Install state
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  const styles = {
    table: { width: "100%", borderCollapse: "collapse", marginTop: 12 },
    th: { border: "1px solid #D1D5DB", padding: 8, background: "#F3F4F6" },
    td: { border: "1px solid #D1D5DB", padding: 8 },
  };

  // Load all pages and their rows from Supabase
  const loadAllPages = async () => {
    try {
      const { data: pagesData, error } = await supabase.from("pages").select("*");
      if (error) throw error;

      const pagesWithRows = await Promise.all(
        pagesData.map(async (p) => {
          const { data: rowsData } = await supabase
            .from("products")
            .select("*")
            .eq("page_id", p.id);

          // ✅ Sort alphabetically
          const sortedRows = (rowsData || []).sort((a, b) =>
            (a.product_name || "").localeCompare(b.product_name || "")
          );

          return {
            ...p,
            rows: sortedRows.map((r) => ({ ...r, id: Date.now() + Math.random() })),
          };
        })
      );

      setPages(pagesWithRows);
      if (pagesWithRows.length > 0) setActivePageId(pagesWithRows[0].id);
    } catch (err) {
      console.error(err);
      alert("❌ Error loading pages!");
    }
  };

  useEffect(() => {
    loadAllPages();
  }, []);

  const addPage = () => {
    const newId = Date.now().toString();
    const today = new Date().toLocaleDateString("en-GB");
    const newPage = { id: newId, date: today, title: "Untitled Page", rows: [] };
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
        return [{ id: freshId, date: new Date().toLocaleDateString("en-GB"), title: "Untitled Page", rows: [] }];
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
              rows: [...p.rows, {
                id: Date.now() + Math.random(),
                product_name: "",
                original_price: "",
                price_sold: "",
                sold: false,
              }].sort((a, b) => (a.product_name || "").localeCompare(b.product_name || "")), // ✅ Keep sorted
            }
          : p
      )
    );
  };

  const deleteRow = (rowId) => {
    if (!window.confirm("Are you sure you want to delete this row?")) return;

    setPages((prev) =>
      prev.map((p) =>
        p.id === activePageId
          ? { ...p, rows: p.rows.filter((r) => r.id !== rowId) }
          : p
      )
    );
  };

  const updateRow = (rowId, field, value) => {
    setPages((prev) =>
      prev.map((p) =>
        p.id === activePageId
          ? {
              ...p,
              rows: p.rows
                .map((r) => (r.id === rowId ? { ...r, [field]: value } : r))
                .sort((a, b) => (a.product_name || "").localeCompare(b.product_name || "")), // ✅ Resort after update
            }
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
      const { error: pageError } = await supabase
        .from("pages")
        .upsert([{ id: activePage.id, date: activePage.date, title: activePage.title || "" }]);
      if (pageError) throw pageError;

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
      loadAllPages();
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

      const sortedData = (data || []).sort((a, b) =>
        (a.product_name || "").localeCompare(b.product_name || "")
      );

      setPages((prev) =>
        prev.map((p) =>
          p.id === activePage.id
            ? { ...p, rows: sortedData.map((d) => ({ ...d, id: Date.now() + Math.random() })) }
            : p
        )
      );
    } catch (err) {
      console.error(err);
      alert("❌ Error loading products!");
    }
  };

  // 👉 Handle PWA install prompt
  useEffect(() => {
    const beforeInstallHandler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", beforeInstallHandler);

    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstallHandler);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  return (
    <div style={{ padding: 18, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: "bold", marginBottom: 12 }}>🏢 Noble Ventures</h1>

      {/* Tabs sorted alphabetically */}
      <div style={{ display: "flex", gap: 12, paddingBottom: 12, overflowX: "auto", whiteSpace: "nowrap" }}>
        {pages
          .slice()
          .sort((a, b) => (a.title || "").localeCompare(b.title || "")) // ✅ Sort page tabs alphabetically
          .map((page) => {
            const active = page.id === activePageId;
            return (
              <div
                key={page.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  borderRadius: 8,
                  cursor: "pointer",
                  minWidth: 130,
                  flexShrink: 0,
                  gap: 4,
                }}
              >
                <input
                  style={{
                    width: "100%",
                    border: "none",
                    borderBottom: "1px solid rgba(0,0,0,0.2)",
                    outline: "none",
                    background: "transparent",
                    color: "#111827",
                    padding: 2,
                    fontSize: 14,
                    textAlign: "center",
                  }}
                  value={page.date}
                  onChange={(e) => updatePageDate(page.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div
                  onClick={() => setActivePageId(page.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 12px",
                    borderRadius: 8,
                    background: active ? "#2563EB" : "#E5E7EB",
                    color: active ? "#fff" : "#111827",
                  }}
                >
                  <input
                    value={page.title || ""}
                    onChange={(e) =>
                      setPages((prev) =>
                        prev.map((p) => (p.id === page.id ? { ...p, title: e.target.value } : p))
                      )
                    }
                    style={{
                      flex: 1,
                      textAlign: "center",
                      fontSize: 14,
                      border: "none",
                      background: "transparent",
                      outline: "none",
                      color: active ? "#fff" : "#111827",
                    }}
                  />
                  <button
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#DC2626",
                      cursor: "pointer",
                      fontSize: 16,
                      padding: 4,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePage(page.id);
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        <button
          onClick={addPage}
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            background: "#10B981",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          ➕ New Page
        </button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search product..."
          style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #D1D5DB" }}
        />
      </div>

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
                  <td style={styles.td} colSpan={6}>No rows — click "➕ Add Row"</td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr key={row.id}>
                    <td style={styles.td}>{idx + 1}</td>
                    <td style={styles.td}>
                      <input
                        value={row.product_name}
                        onChange={(e) => updateRow(row.id, "product_name", e.target.value)}
                        style={{ width: "100%", border: "none", outline: "none" }}
                      />
                    </td>
                    <td style={styles.td}>
                      <input
                        type="number"
                        value={row.original_price}
                        onChange={(e) => updateRow(row.id, "original_price", e.target.value)}
                        style={{ width: "100%", border: "none", outline: "none" }}
                      />
                    </td>
                    <td style={styles.td}>
                      <input
                        type="number"
                        value={row.price_sold}
                        onChange={(e) => updateRow(row.id, "price_sold", e.target.value)}
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

          <div style={{ marginTop: 12 }}>
            <button
              onClick={addRow}
              style={{ padding: "8px 12px", borderRadius: 6, background: "#2563EB", color: "#fff", border: "none", cursor: "pointer" }}
            >
              ➕ Add Row
            </button>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button
              onClick={savePage}
              style={{ padding: "8px 12px", borderRadius: 6, background: "#2563EB", color: "#fff", border: "none", cursor: "pointer" }}
            >
              💾 Save
            </button>
            <button
              onClick={loadPage}
              style={{ padding: "8px 12px", borderRadius: 6, background: "#F59E0B", color: "#fff", border: "none", cursor: "pointer" }}
            >
              📥 Load
            </button>
          </div>

          <div style={{ marginTop: 20 }}>
            <button
              onClick={() => setShowAudit((s) => !s)}
              style={{ padding: "8px 12px", borderRadius: 6, background: "#F59E0B", color: "#fff", border: "none", cursor: "pointer" }}
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
      )}

      {/* 📲 Floating Install Button */}
      {!isInstalled && deferredPrompt && (
        <button
          onClick={installApp}
          className="fixed-install-btn"
          style={{
            position: "fixed",
            bottom: 20,
            right: 20,
            padding: "12px 16px",
            borderRadius: "50%",
            background: "#2563EB",
            color: "#fff",
            fontSize: 20,
            border: "none",
            cursor: "pointer",
            boxShadow: "0px 4px 6px rgba(0,0,0,0.2)",
          }}
        >
          📲
        </button>
      )}
    </div>
  );
}