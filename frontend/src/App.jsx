// src/App.jsx
import { useEffect, useRef, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from "recharts";
import "./index.css";
import Processes from "./Processes";

const WARN = { cpu: 85, mem: 85, disk: 85 };
const CRIT = { cpu: 95, mem: 92, disk: 92 };

const fmtBytes = (n) => {
  if (n === undefined || n === null) return "-";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0, x = Number(n);
  while (x >= 1024 && i < u.length - 1) { x /= 1024; i++; }
  return `${x.toFixed(1)} ${u[i]}`;
};
const level = (v, w, c) => (v >= c ? "crit" : v >= w ? "warn" : "ok");

export default function App() {
  const [now, setNow] = useState("");
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [series, setSeries] = useState([]);   // { t, cpu, mem, disk }
  const tRef = useRef(null);

  async function pull() {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/metrics`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      setD(j); setErr("");
      const ts = new Date(j.timestamp);
      setNow(ts.toLocaleTimeString());
      const p = { t: ts.toLocaleTimeString(), cpu: j.cpu?.percent ?? 0, mem: j.memory?.percent ?? 0, disk: j.disk?.percent ?? 0 };
      setSeries(prev => {
        const a = [...prev, p];
        if (a.length > 60) a.shift();
        return a;
      });
    } catch (e) {
      setErr(String(e));
    }
  }

  useEffect(() => {
    pull();
    tRef.current = setInterval(pull, 2000);
    return () => clearInterval(tRef.current);
  }, []);

  const cpuLv = level(d?.cpu?.percent ?? 0, WARN.cpu, CRIT.cpu);
  const memLv = level(d?.memory?.percent ?? 0, WARN.mem, CRIT.mem);
  const dskLv = level(d?.disk?.percent ?? 0, WARN.disk, CRIT.disk);

  return (
    <div className="container">
      <div className="header">
        <h1>System Health Dashboard</h1>
        <span className="badge"><span className="dot live" style={{ background: "#38bdf8" }} />LIVE</span>
        <span className="badge">Source: {import.meta.env.VITE_API_URL}/api/metrics</span>
        {now && <span className="badge">Updated: {now}</span>}
      </div>

      {err && <div className="err">Error: {err}</div>}

      {!d ? <div>Loading...</div> : (
        <>
          <div className="grid">
            <Card label="Host" value={d.host} sub={now} />
            <Card label="CPU" value={`${d.cpu?.percent ?? "-"} %`} lvl={cpuLv} />
            <Card label="Memory" value={`${d.memory?.percent ?? "-"} %`}
              sub={`${fmtBytes(d.memory?.used)} / ${fmtBytes(d.memory?.total)}`} lvl={memLv} />
            <Card label="Disk" value={`${d.disk?.percent ?? "-"} %`}
              sub={`${fmtBytes(d.disk?.used)} / ${fmtBytes(d.disk?.total)}`} lvl={dskLv} />
            <Card label="Uptime" value={`${Math.floor((d.uptime_seconds || 0) / 3600)}h`}
              sub={`${Math.floor((d.uptime_seconds || 0) % 3600 / 60)}m`} />
          </div>

          <Section title="CPU % (son ~2 dk)">
            <Chart data={series} k="cpu" />
          </Section>
          <Section title="Memory % (son ~2 dk)">
            <Chart data={series} k="mem" />
          </Section>
          <Section title="Disk % (son ~2 dk)">
            <Chart data={series} k="disk" />
          </Section>

          {/* PROCESSES BÖLÜMÜ BURADA OLACAK */}
          <Section title="Processes">
            <Processes />
          </Section>

          <div className="footer">
            Thresholds: CPU {WARN.cpu}/{CRIT.cpu} • MEM {WARN.mem}/{CRIT.mem} • DISK {WARN.disk}/{CRIT.disk}
          </div>
        </>
      )}
    </div>
  );
}

function Card({ label, value, sub, lvl = "ok" }) {
  return (
    <div className={`card ${lvl}`}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginTop: 18 }}>
      <h3>{title}</h3>
      <div className="panel">{children}</div>
    </div>
  );
}

function Chart({ data, k }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="t" minTickGap={24} />
        <YAxis domain={[0, 100]} />
        <Tooltip />
        <Line type="monotone" dataKey={k} strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
