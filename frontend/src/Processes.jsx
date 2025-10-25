// src/Processes.jsx
import { useEffect, useState } from "react";

export default function Processes() {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("cpu");
  const [sortAsc, setSortAsc] = useState(false);
  const [open, setOpen] = useState(null);

  async function load() {
    const url = new URL(`${import.meta.env.VITE_API_URL}/api/processes`);
    url.searchParams.set("q", query);
    const res = await fetch(url);
    const j = await res.json();
    if (j.ok) setRows(j.rows || []);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [query]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const sorted = [...rows].sort((a, b) => {
    const va = a[sortKey] ?? 0;
    const vb = b[sortKey] ?? 0;
    return sortAsc ? va - vb : vb - va;
  });

  async function terminate(pid) {
    await fetch(`${import.meta.env.VITE_API_URL}/api/process/${pid}/terminate`, { method: "POST" });
    load();
  }

  return (
    <div className="panel" style={{ padding: 12 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input
          placeholder="Search name / cmdline"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            flex: 1,
            padding: 8,
            borderRadius: 8,
            border: "1px solid #2a3242",
            background: "#0c1118",
            color: "#eef2f8",
          }}
        />
      </div>

      <div style={{ overflow: "auto", maxHeight: 480 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", position: "sticky", top: 0, background: "#0e141e" }}>
              <th onClick={() => toggleSort("name")}>Name</th>
              <th onClick={() => toggleSort("count")}>Count</th>
              <th onClick={() => toggleSort("cpu")}>CPU%</th>
              <th onClick={() => toggleSort("mem")}>Mem%</th>
              <th onClick={() => toggleSort("rss")}>RSS</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((app) => (
              <>
                <tr
                  key={app.name}
                  onClick={() => setOpen(open === app.name ? null : app.name)}
                  style={{ cursor: "pointer", borderTop: "1px solid #252b36" }}
                >
                  <td>{app.name}</td>
                  <td>{app.count}</td>
                  <td>{app.cpu}</td>
                  <td>{app.mem}</td>
                  <td>{fmtBytes(app.rss)}</td>
                  <td>{app.children?.length > 0 ? (open === app.name ? "▼" : "▶") : ""}</td>
                </tr>

                {open === app.name &&
                  app.children?.map((p) => (
                    <tr key={p.pid} style={{ background: "#1e293b" }}>
                      <td style={{ paddingLeft: 24 }}>{p.pid}</td>
                      <td colSpan={3}>{p.name}</td>
                      <td>{fmtBytes(p.rss)}</td>
                      <td>
                        <button onClick={() => terminate(p.pid)}>Görevi Sonlandır</button>
                      </td>
                    </tr>
                  ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function fmtBytes(n) {
  if (!n && n !== 0) return "-";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0,
    x = Number(n);
  while (x >= 1024 && i < u.length - 1) {
    x /= 1024;
    i++;
  }
  return `${x.toFixed(1)} ${u[i]}`;
}
