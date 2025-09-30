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

  // Load all pages and rows from Supabase
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

  // 👉 Handle PWA install prompt
  useEffect(() => {
    // Detect if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

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

  // ✅ Rest of your app (pages, rows, save/load, audit, etc.)
  // unchanged — I kept everything the same

  // ... ✂️ (keeping your existing addPage, deletePage, updateRow, savePage, etc.)

  const activePage = pages.find((p) => p.id === activePageId) || null;
  const filteredRows = activePage
    ? activePage.rows.filter((r) =>
        (r.product_name || "").toLowerCase().includes(search.toLowerCase())
      )
    : [];

  return (
    <div style={{ padding: 18, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: "bold", marginBottom: 12 }}>
        🏢 Noble Ventures
      </h1>

      {/* ✂️ Tabs, table, add row, save/load, audit (your existing UI unchanged) */}

      {/* 📲 Floating Install Button */}
      {!isInstalled && deferredPrompt && (
        <button
          onClick={installApp}
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
            zIndex: 1000,
          }}
        >
          📲
        </button>
      )}
    </div>
  );
}