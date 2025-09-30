import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function App() {
  const [pages, setPages] = useState([]);
  const [activePageId, setActivePageId] = useState(null);
  const [search, setSearch] = useState("");
  const [showAudit, setShowAudit] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  const styles = {
    tableContainer: {
      maxHeight: "50vh", // Table scrolls inside container
      overflowY: "auto",
      marginBottom: 12,
      border: "1px solid #D1D5DB",
      borderRadius: 6,
    },
    table: { width: "100%", borderCollapse: "collapse" },
    th: { border: "1px solid #D1D5DB", padding: 8, background: "#F3F4F6", fontSize: 14 },
    td: { border: "1px solid #D1D5DB", padding: 8, fontSize: 14 },
  };

  const loadAllPages = async () => {
    try {
      const { data: pagesData, error } = await supabase.from("pages").select("*");
      if (error) throw error;
      const pagesWithRows = await Promise.all(
        pagesData.map(async (p) => {
          const { data: rowsData } = await supabase.from("products").select("*").eq("page_id", p.id);
          const sortedRows = (rowsData || []).sort((a, b) => (a.product_name || "").localeCompare(b.product_name || ""));
          return { ...p, rows: sortedRows.map((r) => ({ ...r, id: Date.now() + Math.random() })) };
        })
      );
      setPages(pagesWithRows);
      if (pagesWithRows.length > 0) setActivePageId(pagesWithRows[0].id);
    } catch (err) {
      console.error(err);
      alert("❌ Error loading pages!");
    }
  };

  useEffect(() => { loadAllPages(); }, []);

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

  const updatePageDate = (id, newDate) => setPages((prev) => prev.map((p) => (p.id === id ? { ...p, date: newDate } : p)));

  const addRow = () => {
    setPages((prev) =>
      prev.map((p) =>
        p.id === activePageId
          ? { ...p, rows: [...p.rows, { id: Date.now() + Math.random(), product_name: "", original_price: "", price_sold: "", sold: false }].sort((a,b)=> (a.product_name||"").localeCompare(b.product_name||"")) }
          : p
      )
    );
  };

  const deleteRow = (rowId) => {
    if (!window.confirm("Are you sure you want to delete this row?")) return;
    setPages((prev) => prev.map((p) => (p.id === activePageId ? { ...p, rows: p.rows.filter((r) => r.id !== rowId) } : p)));
  };

  const updateRow = (rowId, field, value) => {
    setPages((prev) =>
      prev.map((p) =>
        p.id === activePageId
          ? { ...p, rows: p.rows.map((r) => (r.id === rowId ? { ...r, [field]: value } : r)).sort((a,b)=> (a.product_name||"").localeCompare(b.product_name||"")) }
          : p
      )
    );
  };

  const activePage = pages.find((p) => p.id === activePageId) || null;
  const filteredRows = activePage ? activePage.rows.filter((r) => (r.product_name || "").toLowerCase().includes(search.toLowerCase())) : [];

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
      const { error: pageError } = await supabase.from("pages").upsert([{ id: activePage.id, date: activePage.date, title: activePage.title || "" }]);
      if (pageError) throw pageError;
      await supabase.from("products").delete().eq("page_id", activePage.id);
      const { error } = await supabase.from("products").insert(activePage.rows.map((r) => ({ page_id: activePage.id, product_name: r.product_name || "", original_price: Number(r.original_price) || 0, price_sold: Number(r.price_sold) || 0, sold: Boolean(r.sold) })));
      if (error) throw error;
      alert("✅ Page saved successfully!");
      loadAllPages();
    } catch (err) { console.error(err); alert("❌ Error saving products!"); }
  };

  const loadPage = async () => {
    if (!activePage) return;
    try {
      const { data, error } = await supabase.from("products").select("*").eq("page_id", activePage.id);
      if (error) throw error;
      const sortedData = (data || []).sort((a,b)=> (a.product_name||"").localeCompare(b.product_name||""));
      setPages((prev) => prev.map((p) => p.id===activePage.id ? { ...p, rows: sortedData.map((d) => ({ ...d, id: Date.now() + Math.random() })) } : p));
    } catch (err) { console.error(err); alert("❌ Error loading products!"); }
  };

  useEffect(() => {
    const beforeInstallHandler = (e) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener("beforeinstallprompt", beforeInstallHandler);
    window.addEventListener("appinstalled", () => { setIsInstalled(true); setDeferredPrompt(null); });
    return () => { window.removeEventListener("beforeinstallprompt", beforeInstallHandler); };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setDeferredPrompt(null);
  };

  return (
    <div style={{ padding: 12, width: "100%", maxWidth: 600, margin: "0 auto", fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 12 }}>🏢 Noble Ventures</h1>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 12 }}>
        {pages.map((page) => {
          const active = page.id === activePageId;
          return (
            <div key={page.id} style={{ minWidth: 100, flexShrink: 0 }}>
              <input value={page.date} onChange={(e)=>updatePageDate(page.id, e.target.value)} style={{ width: "100%", fontSize:12, textAlign:"center", marginBottom:2 }}/>
              <div onClick={()=>setActivePageId(page.id)} style={{ padding:6, borderRadius:6, background:active?"#2563EB":"#E5E7EB", color:active?"#fff":"#111827", textAlign:"center" }}>
                <input value={page.title||""} onChange={(e)=>setPages(prev=>prev.map(p=>p.id===page.id?{...p,title:e.target.value}:p))} style={{ width:"100%", border:"none", background:"transparent", textAlign:"center", color:active?"#fff":"#111827" }}/>
              </div>
            </div>
          );
        })}
        <button onClick={addPage} style={{ padding:"6px 12px", borderRadius:6, background:"#10B981", color:"#fff", border:"none" }}>➕ New Page</button>
      </div>

      {/* Search */}
      <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="🔍 Search product..." style={{ width:"100%", padding:6, borderRadius:4, marginBottom:8, border:"1px solid #D1D5DB" }}/>

      {activePage && (
        <>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>S/N</th>
                  <th style={styles.th}>Product</th>
                  <th style={styles.th}>Original</th>
                  <th style={styles.th}>Sold Price</th>
                  <th style={styles.th}>Sold</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length===0 ? <tr><td style={styles.td} colSpan={6}>No rows</td></tr> :
                  filteredRows.map((row,idx)=>(
                    <tr key={row.id}>
                      <td style={styles.td}>{idx+1}</td>
                      <td style={styles.td}><input value={row.product_name} onChange={e=>updateRow(row.id,"product_name",e.target.value)} style={{width:"100%",border:"none",outline:"none"}}/></td>
                      <td style={styles.td}><input type="number" value={row.original_price} onChange={e=>updateRow(row.id,"original_price",e.target.value)} style={{width:"100%",border:"none",outline:"none"}}/></td>
                      <td style={styles.td}><input type="number" value={row.price_sold} onChange={e=>updateRow(row.id,"price_sold",e.target.value)} style={{width:"100%",border:"none",outline:"none"}}/></td>
                      <td style={{...styles.td,textAlign:"center"}}><input type="checkbox" checked={row.sold} onChange={e=>updateRow(row.id,"sold",e.target.checked)}/></td>
                      <td style={{...styles.td,textAlign:"center"}}><button onClick={()=>deleteRow(row.id)} style={{color:"#DC2626",border:"none",background:"transparent"}}>🗑️</button></td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>

          {/* Buttons */}
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:8 }}>
            <button onClick={addRow} style={{flex:1, padding:6, background:"#2563EB", color:"#fff", border:"none", borderRadius:4}}>➕ Add Row</button>
            <button onClick={savePage} style={{flex:1, padding:6, background:"#2563EB", color:"#fff", border:"none", borderRadius:4}}>💾 Save</button>
            <button onClick={loadPage} style={{flex:1, padding:6, background:"#F59E0B", color:"#fff", border:"none", borderRadius:4}}>📥 Load</button>
          </div>

          {/* Install button */}
          {!isInstalled && deferredPrompt && <div style={{textAlign:"center", marginBottom:8}}><button onClick={installApp} style={{padding:"8px 16px",borderRadius:6,background:"#2563EB",color:"#fff",border:"none"}}>📲 Install App</button></div>}

          {/* Audit */}
          <div>
            <button onClick={()=>setShowAudit(s=>!s)} style={{padding:6, background:"#F59E0B", color:"#fff", border:"none", borderRadius:4}}>{showAudit?"Hide Audit":"Show Audit"}</button>
            {showAudit && <div style={{marginTop:6, padding:6, border:"1px solid #D1D5DB", borderRadius:4}}>
              <p>✅ Sold: {soldCount}</p>
              <p>❌ Not Sold: {notSoldCount}</p>
              <p>💰 Profit/Loss: {profit}</p>
            </div>}
          </div>
        </>
      )}
    </div>
  );
}