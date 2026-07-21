import { clipboard as Ks, screen as Zn, app as ce, ipcMain as Dt, session as js, powerMonitor as Bn, shell as ho, globalShortcut as mr, BrowserWindow as gr, Menu as xo } from "electron";
import { fileURLToPath as yo } from "node:url";
import He from "node:path";
import je from "os";
import Ne from "fs";
import ps from "path";
import ee from "child_process";
import So from "util";
import Co from "https";
import wo from "http";
import Lo from "net";
import { execFile as Io } from "node:child_process";
import { promisify as _o } from "node:util";
const Ti = {
  RUN_ALL: "system-checks:run-all",
  GET_DEFINITIONS: "system-checks:get-definitions"
}, si = [
  { id: "webcam", label: "Webcam available", severity: "block", timeoutMs: 12e3 },
  { id: "microphone", label: "Mic available", severity: "block", timeoutMs: 12e3 },
  { id: "internet_speed", label: "Internet speed", severity: "block", timeoutMs: 15e3 },
  { id: "screen_resolution", label: "Screen resolution", severity: "block", timeoutMs: 3e3 },
  { id: "ram", label: "RAM", severity: "block", timeoutMs: 5e3 },
  { id: "cpu", label: "CPU", severity: "block", timeoutMs: 5e3 },
  { id: "battery", label: "Battery", severity: "warn", timeoutMs: 5e3 },
  { id: "vpn", label: "VPN detection", severity: "block", timeoutMs: 8e3 },
  { id: "virtual_machine", label: "Virtual machine detection", severity: "block", timeoutMs: 8e3 },
  { id: "multiple_monitors", label: "Multiple monitors", severity: "block", timeoutMs: 3e3 },
  { id: "screen_recording", label: "Screen recording software", severity: "block", timeoutMs: 1e4 },
  { id: "running_applications", label: "Running applications", severity: "warn", timeoutMs: 1e4 },
  { id: "remote_desktop", label: "Remote desktop", severity: "block", timeoutMs: 1e4 },
  { id: "obs", label: "OBS", severity: "block", timeoutMs: 8e3 },
  { id: "teamviewer", label: "TeamViewer", severity: "block", timeoutMs: 8e3 },
  { id: "anydesk", label: "AnyDesk", severity: "block", timeoutMs: 8e3 },
  { id: "clipboard", label: "Clipboard state", severity: "warn", timeoutMs: 2e3 },
  { id: "browser_version", label: "Browser version", severity: "block", timeoutMs: 2e3 }
], an = 4, cn = 2, kn = 1280, Fn = 720, Et = 1.5, Rn = 20, Oo = [
  "tun",
  "tap",
  "ppp",
  "vpn",
  "wireguard",
  "nordlynx",
  "proton",
  "mullvad",
  "utun",
  "wg"
], ii = [
  "teamviewer",
  "anydesk",
  "rustdesk",
  "parsec",
  "vnc",
  "vncviewer",
  "splashtop",
  "logmein",
  "msrdc",
  "mstsc",
  "chrome remote",
  "remotedesktop",
  "sunlogin"
], ri = [
  "obs",
  "obs64",
  "obs studio",
  "streamlabs",
  "camtasia",
  "snagit",
  "screenflow",
  "quicktime player",
  "loom",
  "screencapture",
  "screencaptureui",
  "screenshot",
  "replaykit",
  "xboxgamebar",
  "sharex",
  "captura",
  "bandicam",
  "fraps",
  "nvidia shadowplay",
  "geforce experience"
], oi = ["obs", "obs64", "obs studio", "streamlabs"], ai = ["teamviewer", "teamviewer_service", "teamviewer_desktop"], ci = ["anydesk", "anydesk.exe"];
function te(t, n, e, s, r) {
  return {
    id: t.id,
    label: t.label,
    status: n,
    severity: t.severity,
    message: e,
    details: r,
    durationMs: Date.now() - s
  };
}
function Po(t) {
  return t.toLowerCase().replace(/\.exe$/i, "").trim();
}
function hr(t, n) {
  const e = Po(t);
  return n.some((s) => e.includes(s.toLowerCase()));
}
function vo(t, n, e) {
  return new Promise((s, r) => {
    const i = setTimeout(() => r(new Error(`${e} timed out after ${n}ms`)), n);
    t.then((o) => {
      clearTimeout(i), s(o);
    }).catch((o) => {
      clearTimeout(i), r(o);
    });
  });
}
function Mo() {
  return `run_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
function Ao(t) {
  const n = Date.now(), e = Ks.availableFormats();
  return e.length > 0 || Ks.readText().trim().length > 0 ? te(
    t,
    "warning",
    "Clipboard contains data — clear clipboard before starting the exam",
    n,
    { formatCount: e.length, formats: e.slice(0, 5) }
  ) : te(t, "passed", "Clipboard is empty", n, {
    formatCount: e.length
  });
}
function Eo(t) {
  const n = Date.now(), e = Zn.getPrimaryDisplay(), { width: s, height: r } = e.size, i = e.scaleFactor;
  return s >= kn && r >= Fn ? te(
    t,
    "passed",
    `${s}×${r} @ ${i}x scale`,
    n,
    { width: s, height: r, scaleFactor: i, minWidth: kn, minHeight: Fn }
  ) : te(
    t,
    "failed",
    `Resolution ${s}×${r} is below minimum ${kn}×${Fn}`,
    n,
    { width: s, height: r, scaleFactor: i, minWidth: kn, minHeight: Fn }
  );
}
function To(t) {
  const n = Date.now(), e = Zn.getAllDisplays(), s = e.length;
  return s <= 1 ? te(t, "passed", "Single monitor detected", n, {
    count: s,
    displays: e.map((r) => ({
      id: r.id,
      width: r.size.width,
      height: r.size.height
    }))
  }) : te(
    t,
    "failed",
    `${s} monitors detected — disconnect additional displays before continuing`,
    n,
    {
      count: s,
      displays: e.map((r) => ({
        id: r.id,
        width: r.size.width,
        height: r.size.height
      }))
    }
  );
}
function Do(t, n) {
  const e = Date.now(), s = n.mem.total / 1024 ** 3;
  return s >= an ? te(
    t,
    "passed",
    `${s.toFixed(1)} GB available (minimum ${an} GB)`,
    e,
    { totalGb: Number(s.toFixed(2)), minGb: an }
  ) : te(
    t,
    "failed",
    `Insufficient RAM: ${s.toFixed(1)} GB (minimum ${an} GB required)`,
    e,
    { totalGb: Number(s.toFixed(2)), minGb: an }
  );
}
function bo(t, n) {
  const e = Date.now(), s = n.cpu.cores;
  return s >= cn ? te(
    t,
    "passed",
    `${s} cores detected (minimum ${cn})`,
    e,
    { cores: s, model: n.cpu.brand, minCores: cn }
  ) : te(
    t,
    "failed",
    `Insufficient CPU cores: ${s} (minimum ${cn} required)`,
    e,
    { cores: s, model: n.cpu.brand, minCores: cn }
  );
}
function Vo(t, n) {
  const e = Date.now(), { hasBattery: s, isCharging: r, percent: i } = n.battery;
  return s ? r ? te(t, "passed", `Battery charging at ${i}%`, e, {
    hasBattery: !0,
    isCharging: r,
    percent: i
  }) : i >= Rn ? te(
    t,
    "passed",
    `Battery at ${i}% (minimum ${Rn}% on battery)`,
    e,
    { hasBattery: !0, isCharging: r, percent: i, minPercent: Rn }
  ) : te(
    t,
    "warning",
    `Low battery: ${i}% — connect charger before starting the exam`,
    e,
    { hasBattery: !0, isCharging: r, percent: i, minPercent: Rn }
  ) : te(t, "passed", "Desktop power source detected", e, {
    hasBattery: !1
  });
}
function No(t) {
  return Array.isArray(t) ? t : [t];
}
const Bo = 256e3, ko = ["https://www.gstatic.com/generate_204", "https://cloudflare.com/cdn-cgi/trace"], Fo = [
  `https://speed.cloudflare.com/__down?bytes=${Bo}`
];
async function Di(t, n, e) {
  const s = new AbortController(), r = setTimeout(() => s.abort(), e);
  try {
    return await fetch(t, { ...n, signal: s.signal, cache: "no-store" });
  } finally {
    clearTimeout(r);
  }
}
async function Ro(t) {
  const n = Date.now();
  try {
    const e = performance.now();
    let s = null;
    for (const a of ko)
      try {
        if (s = await Di(a, { method: "HEAD" }, 4e3), s.ok || s.status === 204 || s.status === 405) break;
      } catch {
        s = null;
      }
    if (!s)
      return te(t, "failed", "Internet unavailable — connect to a stable network and try again", n);
    if (!s.ok && s.status !== 204 && s.status !== 405)
      return te(t, "failed", `Network probe failed (${s.status})`, n);
    const r = performance.now() - e;
    let i = 0, o = 0;
    for (const a of Fo)
      try {
        const c = performance.now(), u = await (await Di(a, { method: "GET" }, t.timeoutMs - 1e3)).arrayBuffer(), d = Math.max(performance.now() - c, 1);
        if (o = u.byteLength, o === 0) continue;
        i = u.byteLength * 8 / (d / 1e3) / 1e6;
        break;
      } catch {
        i = 0;
      }
    return o === 0 ? te(
      t,
      "failed",
      "Unable to measure download speed — check captive portal, firewall, or unstable network",
      n,
      { latencyMs: Math.round(r), minMbps: Et }
    ) : r > 3e3 ? te(
      t,
      "failed",
      `Unstable connection: ${Math.round(r)}ms latency — use a stable network before starting`,
      n,
      { latencyMs: Math.round(r), minMbps: Et }
    ) : i >= Et ? te(
      t,
      "passed",
      `${i.toFixed(1)} Mbps download (minimum ${Et} Mbps)`,
      n,
      { mbps: Number(i.toFixed(2)), latencyMs: Math.round(r), minMbps: Et, bytes: o }
    ) : te(
      t,
      "failed",
      `Slow connection: ${i.toFixed(1)} Mbps (minimum ${Et} Mbps required)`,
      n,
      { mbps: Number(i.toFixed(2)), latencyMs: Math.round(r), minMbps: Et, bytes: o }
    );
  } catch {
    return te(
      t,
      "failed",
      "Unable to verify internet speed — check your connection and try again",
      n
    );
  }
}
function Go(t, n) {
  const e = Date.now(), s = No(n.networkInterfaces).filter((i) => i.operstate === "up"), r = s.filter((i) => {
    const o = `${i.iface} ${i.ifaceName ?? ""}`.toLowerCase();
    return Oo.some((a) => o.includes(a));
  });
  return r.length === 0 ? te(t, "passed", "No VPN interface detected", e, {
    interfaces: s.map((i) => i.iface)
  }) : te(
    t,
    "failed",
    `VPN detected on ${r.map((i) => i.iface).join(", ")} — disable VPN before continuing`,
    e,
    {
      vpnInterfaces: r.map((i) => ({
        iface: i.iface,
        ifaceName: i.ifaceName,
        type: i.type
      }))
    }
  );
}
function xr(t, n) {
  return t.processes.list.filter((e) => hr(e.name, n)).map((e) => ({
    name: e.name,
    pid: e.pid,
    path: typeof e.path == "string" ? e.path : void 0
  }));
}
function Dn(t, n, e, s, r) {
  const i = Date.now(), o = xr(n, e);
  return o.length === 0 ? te(t, "passed", s, i) : te(t, "failed", r(o), i, { processes: o });
}
function Wo(t, n) {
  return Dn(
    t,
    n,
    oi,
    "OBS not running",
    (e) => `OBS detected: ${e.map((s) => s.name).join(", ")}`
  );
}
function zo(t, n) {
  return Dn(
    t,
    n,
    ai,
    "TeamViewer not running",
    (e) => `TeamViewer detected: ${e.map((s) => s.name).join(", ")}`
  );
}
function Uo(t, n) {
  return Dn(
    t,
    n,
    ci,
    "AnyDesk not running",
    (e) => `AnyDesk detected: ${e.map((s) => s.name).join(", ")}`
  );
}
function $o(t, n) {
  return Dn(
    t,
    n,
    ii,
    "No remote desktop software detected",
    (e) => `Remote access software is running (${e.map((r) => r.name).join(", ")}). Close it and re-run checks.`
  );
}
function Ho(t, n) {
  return Dn(
    t,
    n,
    ri,
    "No screen recording software detected",
    (e) => `Screen recording software detected: ${e.map((s) => s.name).join(", ")}`
  );
}
function Xo(t, n) {
  const e = Date.now(), s = xr(n, [
    ...ii,
    ...ri,
    ...oi,
    ...ai,
    ...ci
  ]), r = n.processes.running;
  return s.length === 0 ? te(
    t,
    "passed",
    `${r} processes running — no flagged applications`,
    e,
    { runningCount: r }
  ) : te(
    t,
    "warning",
    `${s.length} flagged application(s) running`,
    e,
    { runningCount: r, flagged: s }
  );
}
const As = 120;
function Ko(t) {
  const n = Date.now(), e = process.versions.chrome ?? "", s = process.versions.electron ?? "";
  return Number.parseInt(e.split(".")[0] ?? "0", 10) >= As ? te(
    t,
    "passed",
    `Chromium ${e} (Electron ${s}, app ${ce.getVersion()})`,
    n,
    {
      chromium: e,
      electron: s,
      appVersion: ce.getVersion(),
      minChromiumMajor: As
    }
  ) : te(
    t,
    "failed",
    `Unsupported runtime Chromium ${e} — update the application`,
    n,
    {
      chromium: e,
      electron: s,
      appVersion: ce.getVersion(),
      minChromiumMajor: As
    }
  );
}
const jo = [
  "vmware",
  "virtualbox",
  "qemu",
  "kvm",
  "xen",
  "parallels",
  "microsoft corporation",
  "innotek",
  "bochs"
], qo = ["virtual", "vmware", "virtualbox", "qemu", "kvm", "hyper-v", "parallels"];
function Yo(t, n) {
  const e = Date.now(), { manufacturer: s, model: r, virtual: i } = n.system, o = s.toLowerCase(), a = r.toLowerCase(), c = jo.some((u) => o.includes(u)), l = qo.some((u) => a.includes(u));
  return i || c || l ? te(
    t,
    "failed",
    "Virtual machine environment detected — use a physical device for the exam",
    e,
    { manufacturer: s, model: r, virtual: i }
  ) : te(t, "passed", "Physical device detected", e, {
    manufacturer: s,
    model: r,
    virtual: i
  });
}
function Jo(t) {
  return t && t.__esModule && Object.prototype.hasOwnProperty.call(t, "default") ? t.default : t;
}
var yr = {};
const Qo = "5.31.15", Zo = {
  version: Qo
};
var D = {};
const nt = je, Xe = Ne, ea = ps, li = ee.spawn, ta = ee.exec, Mn = ee.execSync, na = So, kt = process.platform, ui = kt === "linux" || kt === "android", Sr = kt === "darwin", ds = kt === "win32", Cr = kt === "freebsd", wr = kt === "openbsd", Lr = kt === "netbsd";
let Es = 0, Be = "", Ze = null, Ge = null;
const Ir = process.env.WINDIR || "C:\\Windows";
let de, zt = "";
const mn = [];
let pi = !1, es = "";
const Ts = "$OutputEncoding = [System.Console]::OutputEncoding = [System.Console]::InputEncoding = [System.Text.Encoding]::UTF8 ; ", qs = "--###START###--", bi = "--ERROR--", ts = "--###ENDCMD###--", Ys = "--##ID##--", fs = {
  windowsHide: !0,
  maxBuffer: 1024 * 102400,
  encoding: "UTF-8",
  env: Object.assign({}, process.env, { LANG: "en_US.UTF-8" })
}, ms = {
  maxBuffer: 1024 * 102400,
  encoding: "UTF-8",
  stdio: ["pipe", "pipe", "ignore"]
};
function sa(t) {
  let n = parseInt(t, 10);
  return isNaN(n) && (n = 0), n;
}
function ia(t) {
  let n = !1, e = "", s = "";
  for (const r of t)
    r >= "0" && r <= "9" || n ? (n = !0, e += r) : s += r;
  return [s, e];
}
const jn = new String(), Js = new String().replace, Qs = new String().toLowerCase, _r = new String().toString, Or = new String().substr, Pr = new String().substring, vr = new String().trim, Mr = new String().startsWith, di = Math.min;
function ra(t) {
  return t && {}.toString.call(t) === "[object Function]";
}
function oa(t) {
  const n = [], e = {};
  for (let s = 0; s < t.length; s++) {
    let r = Object.keys(t[s]);
    r.sort((o, a) => o - a);
    let i = "";
    for (let o = 0; o < r.length; o++)
      i += JSON.stringify(r[o]), i += JSON.stringify(t[s][r[o]]);
    ({}).hasOwnProperty.call(e, i) || (n.push(t[s]), e[i] = !0);
  }
  return n;
}
function aa(t, n) {
  return t.sort((e, s) => {
    let r = "", i = "";
    return n.forEach((o) => {
      r = r + e[o], i = i + s[o];
    }), r < i ? -1 : r > i ? 1 : 0;
  });
}
function ca() {
  return Es === 0 && (Es = nt.cpus().length), Es;
}
function st(t, n, e, s, r) {
  e = e || ":", n = n.toLowerCase(), s = s || !1, r = r || !1;
  let i = "";
  return t.some((o) => {
    let a = o.toLowerCase().replace(/\t/g, "");
    if (s && (a = a.trim()), a.startsWith(n) && (!r || a.match(n + e) || a.match(n + " " + e))) {
      const c = s ? o.trim().split(e) : o.split(e);
      if (c.length >= 2)
        return c.shift(), i = c.join(e).trim(), !0;
    }
    return !1;
  }), i;
}
function la(t, n) {
  return n = n || 16, t.replace(/\\x([0-9A-Fa-f]{2})/g, function() {
    return String.fromCharCode(parseInt(arguments[1], n));
  });
}
function ua(t) {
  let n = "", e = 0;
  return t.split("").forEach((s) => {
    s >= "0" && s <= "9" ? e === 1 && e++ : (e === 0 && e++, e === 1 && (n += s));
  }), n;
}
function pa(t, n) {
  n = n || "", t = t.toUpperCase();
  let e = 0, s = 0;
  const r = ua(t), i = t.split(r);
  if (i.length >= 2) {
    i[2] && (i[1] += i[2]);
    let o = i[1] && i[1].toLowerCase().indexOf("pm") > -1 || i[1].toLowerCase().indexOf("p.m.") > -1 || i[1].toLowerCase().indexOf("p. m.") > -1 || i[1].toLowerCase().indexOf("n") > -1 || i[1].toLowerCase().indexOf("ch") > -1 || i[1].toLowerCase().indexOf("ös") > -1 || n && i[1].toLowerCase().indexOf(n) > -1;
    return e = parseInt(i[0], 10), s = parseInt(i[1], 10), e = o && e < 12 ? e + 12 : e, ("0" + e).substr(-2) + ":" + ("0" + s).substr(-2);
  }
}
function da(t, n) {
  const e = {
    date: "",
    time: ""
  };
  n = n || {};
  const s = (n.dateFormat || "").toLowerCase(), r = n.pmDesignator || "", i = t.split(" ");
  if (i[0]) {
    if (i[0].indexOf("/") >= 0) {
      const o = i[0].split("/");
      o.length === 3 && (o[0].length === 4 ? e.date = o[0] + "-" + ("0" + o[1]).substr(-2) + "-" + ("0" + o[2]).substr(-2) : o[2].length === 2 ? (s.indexOf("/d/") > -1 || s.indexOf("/dd/") > -1, e.date = "20" + o[2] + "-" + ("0" + o[1]).substr(-2) + "-" + ("0" + o[0]).substr(-2)) : (t.toLowerCase().indexOf("pm") > -1 || t.toLowerCase().indexOf("p.m.") > -1 || t.toLowerCase().indexOf("p. m.") > -1 || t.toLowerCase().indexOf("am") > -1 || t.toLowerCase().indexOf("a.m.") > -1 || t.toLowerCase().indexOf("a. m.") > -1 || s.indexOf("/d/") > -1 || s.indexOf("/dd/") > -1) && s.indexOf("dd/") !== 0 ? e.date = o[2] + "-" + ("0" + o[0]).substr(-2) + "-" + ("0" + o[1]).substr(-2) : e.date = o[2] + "-" + ("0" + o[1]).substr(-2) + "-" + ("0" + o[0]).substr(-2));
    }
    if (i[0].indexOf(".") >= 0) {
      const o = i[0].split(".");
      o.length === 3 && (s.indexOf(".d.") > -1 || s.indexOf(".dd.") > -1 ? e.date = o[2] + "-" + ("0" + o[0]).substr(-2) + "-" + ("0" + o[1]).substr(-2) : e.date = o[2] + "-" + ("0" + o[1]).substr(-2) + "-" + ("0" + o[0]).substr(-2));
    }
    if (i[0].indexOf("-") >= 0) {
      const o = i[0].split("-");
      o.length === 3 && (e.date = o[0] + "-" + ("0" + o[1]).substr(-2) + "-" + ("0" + o[2]).substr(-2));
    }
  }
  if (i[1]) {
    i.shift();
    const o = i.join(" ");
    e.time = pa(o, r);
  }
  return e;
}
function fa(t, n) {
  let e = n > 0, s = 1, r = 0, i = 0;
  const o = [];
  for (let c = 0; c < t.length; c++)
    s <= n ? (/\s/.test(t[c]) && !e && (i = c - 1, o.push({
      from: r,
      to: i + 1,
      cap: t.substring(r, i + 1)
    }), r = i + 2, s++), e = t[c] === " ") : (!/\s/.test(t[c]) && e && (i = c - 1, r < i && o.push({
      from: r,
      to: i,
      cap: t.substring(r, i)
    }), r = i + 1, s++), e = t[c] === " ");
  i = 5e3, o.push({
    from: r,
    to: i,
    cap: t.substring(r, i)
  });
  let a = o.length;
  for (let c = 0; c < a; c++)
    o[c].cap.replace(/\s/g, "").length === 0 && c + 1 < a && (o[c].to = o[c + 1].to, o[c].cap = o[c].cap + o[c + 1].cap, o.splice(c + 1, 1), a = a - 1);
  return o;
}
function ma(t, n, e) {
  for (let s = 0; s < t.length; s++)
    if (t[s][n] === e)
      return s;
  return -1;
}
function ga() {
  if (es = "powershell.exe", ds) {
    const t = `${Ir}\\system32\\WindowsPowerShell\\v1.0\\powershell.exe`;
    Xe.existsSync(t) && (es = t);
  }
}
function ha() {
  return ds ? `"${process.env.VBOX_INSTALL_PATH || process.env.VBOX_MSI_INSTALL_PATH}\\VBoxManage.exe"` : "vboxmanage";
}
function Ds(t) {
  let n = "", e, s = "";
  if (t.indexOf(qs) >= 0) {
    e = t.split(qs);
    const i = e[1].split(Ys);
    n = i[0], i.length > 1 && (t = i.slice(1).join(Ys));
  }
  t.indexOf(ts) >= 0 && (e = t.split(ts), s = e[0]);
  let r = -1;
  for (let i = 0; i < mn.length; i++)
    mn[i].id === n && (r = i, mn[i].callback(s));
  r >= 0 && mn.splice(r, 1);
}
function xa() {
  de || (de = li(es, ["-NoProfile", "-NoLogo", "-InputFormat", "Text", "-NoExit", "-Command", "-"], {
    stdio: "pipe",
    windowsHide: !0,
    maxBuffer: 1024 * 102400,
    encoding: "UTF-8",
    env: Object.assign({}, process.env, { LANG: "en_US.UTF-8" })
  }), de && de.pid && (pi = !0, de.stdout.on("data", (t) => {
    zt = zt + t.toString("utf8"), t.indexOf(ts) >= 0 && (Ds(zt), zt = "");
  }), de.stderr.on("data", () => {
    Ds(zt + bi);
  }), de.on("error", () => {
    Ds(zt + bi);
  }), de.on("close", () => {
    de && de.kill();
  })));
}
function ya() {
  try {
    de && (de.stdin.write("exit" + nt.EOL), de.stdin.end());
  } catch {
    de && de.kill();
  }
  pi = !1, de = null;
}
function Sa(t) {
  if (pi) {
    const n = Math.random().toString(36).substring(2, 12);
    return new Promise((e) => {
      process.nextTick(() => {
        function s(r) {
          e(r);
        }
        mn.push({
          id: n,
          cmd: t,
          callback: s,
          start: /* @__PURE__ */ new Date()
        });
        try {
          de && de.pid && de.stdin.write(Ts + "echo " + qs + n + Ys + "; " + nt.EOL + t + nt.EOL + "echo " + ts + nt.EOL);
        } catch {
          e("");
        }
      });
    });
  } else {
    let n = "";
    return new Promise((e) => {
      process.nextTick(() => {
        try {
          const s = nt.release().split(".").map(Number), r = s[0] < 10 ? ["-NoProfile", "-NoLogo", "-InputFormat", "Text", "-NoExit", "-ExecutionPolicy", "Unrestricted", "-Command", "-"] : ["-NoProfile", "-NoLogo", "-InputFormat", "Text", "-ExecutionPolicy", "Unrestricted", "-Command", Ts + t], i = li(es, r, {
            stdio: "pipe",
            windowsHide: !0,
            maxBuffer: 1024 * 102400,
            encoding: "UTF-8",
            env: Object.assign({}, process.env, { LANG: "en_US.UTF-8" })
          });
          if (i && !i.pid && i.on("error", () => {
            e(n);
          }), i && i.pid) {
            if (i.stdout.on("data", (o) => {
              n = n + o.toString("utf8");
            }), i.stderr.on("data", () => {
              i.kill(), e(n);
            }), i.on("close", () => {
              i.kill(), e(n);
            }), i.on("error", () => {
              i.kill(), e(n);
            }), s[0] < 10)
              try {
                i.stdin.write(Ts + t + nt.EOL), i.stdin.write("exit" + nt.EOL), i.stdin.end();
              } catch {
                i.kill(), e(n);
              }
          } else
            e(n);
        } catch {
          e(n);
        }
      });
    });
  }
}
function Ca(t, n, e) {
  let s = "";
  return e = e || {}, new Promise((r) => {
    process.nextTick(() => {
      try {
        const i = li(t, n, e);
        i && !i.pid && i.on("error", () => {
          r(s);
        }), i && i.pid ? (i.stdout.on("data", (o) => {
          s += o.toString();
        }), i.on("close", () => {
          i.kill(), r(s);
        }), i.on("error", () => {
          i.kill(), r(s);
        })) : r(s);
      } catch {
        r(s);
      }
    });
  });
}
function wa() {
  if (ds) {
    if (!Be)
      try {
        const e = Mn("chcp", fs).toString().split(`\r
`)[0].split(":");
        Be = e.length > 1 ? e[1].replace(".", "").trim() : "";
      } catch {
        Be = "437";
      }
    return Be;
  }
  if (ui || Sr || Cr || wr || Lr) {
    if (!Be)
      try {
        const e = Mn("echo $LANG", ms).toString().split(`\r
`)[0].split(".");
        Be = e.length > 1 ? e[1].trim() : "", Be || (Be = "UTF-8");
      } catch {
        Be = "UTF-8";
      }
    return Be;
  }
}
function La() {
  if (Ze !== null)
    return Ze;
  if (Ze = !1, ds)
    try {
      const t = Mn("WHERE smartctl 2>nul", fs).toString().split(`\r
`);
      t && t.length ? Ze = t[0].indexOf(":\\") >= 0 : Ze = !1;
    } catch {
      Ze = !1;
    }
  if (ui || Sr || Cr || wr || Lr)
    try {
      Ze = Mn("which smartctl 2>/dev/null", ms).toString().split(`\r
`).length > 0;
    } catch {
      na.noop();
    }
  return Ze;
}
function Ia(t) {
  const n = ["BCM2708", "BCM2709", "BCM2710", "BCM2711", "BCM2712", "BCM2835", "BCM2836", "BCM2837", "BCM2837B0"];
  if (Ge !== null)
    t = Ge;
  else if (t === void 0)
    try {
      t = Xe.readFileSync("/proc/cpuinfo", { encoding: "utf8" }).toString().split(`
`), Ge = t;
    } catch {
      return !1;
    }
  const e = st(t, "hardware"), s = st(t, "model");
  return e && n.indexOf(e) > -1 || s && s.indexOf("Raspberry Pi") > -1;
}
function _a() {
  let t = [];
  try {
    t = Xe.readFileSync("/etc/os-release", { encoding: "utf8" }).toString().split(`
`);
  } catch {
    return !1;
  }
  const n = st(t, "id", "=");
  return n && n.indexOf("raspbian") > -1;
}
function Oa(t, n, e) {
  e || (e = n, n = fs);
  let s = "chcp 65001 > nul && cmd /C " + t + " && chcp " + Be + " > nul";
  ta(s, n, (r, i) => {
    e(r, i);
  });
}
function Pa() {
  const t = Xe.existsSync("/Library/Developer/CommandLineTools/usr/bin/"), n = Xe.existsSync("/Applications/Xcode.app/Contents/Developer/Tools"), e = Xe.existsSync("/Library/Developer/Xcode/");
  return t || e || n;
}
function va() {
  const t = process.hrtime();
  return !Array.isArray(t) || t.length !== 2 ? 0 : +t[0] * 1e9 + +t[1];
}
function Ma(t, n) {
  n = n || "";
  const e = [];
  return t.forEach((s) => {
    s.startsWith(n) && e.indexOf(s) === -1 && e.push(s);
  }), e.length;
}
function Aa(t, n) {
  n = n || "";
  const e = [];
  return t.forEach((s) => {
    s.startsWith(n) && e.push(s);
  }), e.length;
}
function Ar(t, n) {
  typeof n > "u" && (n = !1);
  const e = t || "";
  let s = "";
  const r = di(e.length, 2e3);
  for (let i = 0; i <= r; i++)
    e[i] === void 0 || e[i] === ">" || e[i] === "<" || e[i] === "*" || e[i] === "?" || e[i] === "[" || e[i] === "]" || e[i] === "|" || e[i] === "˚" || e[i] === "$" || e[i] === ";" || e[i] === "&" || e[i] === "]" || e[i] === "#" || e[i] === "\\" || e[i] === "	" || e[i] === `
` || e[i] === "\r" || e[i] === "'" || e[i] === "`" || e[i] === '"' || e[i].length > 1 || n && e[i] === "(" || n && e[i] === ")" || n && e[i] === "@" || n && e[i] === " " || n && e[i] === "{" || n && e[i] === ";" || n && e[i] === "}" || (s = s + e[i]);
  return s;
}
function Er() {
  const t = "1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let n = !0, e = "";
  try {
    e.__proto__.replace = Js, e.__proto__.toLowerCase = Qs, e.__proto__.toString = _r, e.__proto__.substr = Or, e.__proto__.substring = Pr, e.__proto__.trim = vr, e.__proto__.startsWith = Mr;
  } catch {
    Object.setPrototypeOf(e, jn);
  }
  n = n || t.length !== 62;
  const s = Date.now();
  if (typeof s == "number" && s > 16e11) {
    const r = s % 100 + 15;
    for (let l = 0; l < r; l++) {
      const u = Math.random() * 61.99999999 + 1, d = parseInt(Math.floor(u).toString(), 10), p = parseInt(u.toString().split(".")[0], 10), f = Math.random() * 61.99999999 + 1, m = parseInt(Math.floor(f).toString(), 10), h = parseInt(f.toString().split(".")[0], 10);
      n = n && u !== f, n = n && d === p && m === h, e += t[d - 1];
    }
    n = n && e.length === r;
    let i = Math.random() * r * 0.9999999999, o = e.substr(0, i) + " " + e.substr(i, 2e3);
    try {
      o.__proto__.replace = Js;
    } catch {
      Object.setPrototypeOf(o, jn);
    }
    let a = o.replace(/ /g, "");
    n = n && e === a, i = Math.random() * r * 0.9999999999, o = e.substr(0, i) + "{" + e.substr(i, 2e3), a = o.replace(/{/g, ""), n = n && e === a, i = Math.random() * r * 0.9999999999, o = e.substr(0, i) + "*" + e.substr(i, 2e3), a = o.replace(/\*/g, ""), n = n && e === a, i = Math.random() * r * 0.9999999999, o = e.substr(0, i) + "$" + e.substr(i, 2e3), a = o.replace(/\$/g, ""), n = n && e === a;
    const c = e.toLowerCase();
    n = n && c.length === r && c[r - 1] && !c[r];
    for (let l = 0; l < r; l++) {
      const u = e[l];
      try {
        u.__proto__.toLowerCase = Qs;
      } catch {
        Object.setPrototypeOf(e, jn);
      }
      const d = c ? c[l] : "", p = u.toLowerCase();
      n = n && p[0] === d && p[0] && !p[1];
    }
  }
  return !n;
}
function Ea(t, n) {
  typeof n > "u" && (n = !1);
  let e = "";
  const s = Er() ? "---" : Ar(t, n), r = di(s.length, 2e3);
  for (let i = 0; i <= r; i++)
    s[i] !== void 0 && (e = e + s[i]);
  return e;
}
function Ta(t) {
  return ("00000000" + parseInt(t, 16).toString(2)).substr(-8);
}
function Da(t) {
  const n = Xe.lstatSync, e = Xe.readdirSync, s = ea.join;
  function r(l) {
    return n(l).isDirectory();
  }
  function i(l) {
    return n(l).isFile();
  }
  function o(l) {
    return e(l).map((u) => s(l, u)).filter(r);
  }
  function a(l) {
    return e(l).map((u) => s(l, u)).filter(i);
  }
  function c(l) {
    try {
      return o(l).map((p) => c(p)).reduce((p, f) => p.concat(f), []).concat(a(l));
    } catch {
      return [];
    }
  }
  return Xe.existsSync(t) ? c(t) : [];
}
function Tr(t) {
  Ge === null ? Ge = t : t === void 0 && (t = Ge);
  const n = {
    "0002": {
      type: "B",
      revision: "1.0",
      memory: 256,
      manufacturer: "Egoman",
      processor: "BCM2835"
    },
    "0003": {
      type: "B",
      revision: "1.0",
      memory: 256,
      manufacturer: "Egoman",
      processor: "BCM2835"
    },
    "0004": {
      type: "B",
      revision: "2.0",
      memory: 256,
      manufacturer: "Sony UK",
      processor: "BCM2835"
    },
    "0005": {
      type: "B",
      revision: "2.0",
      memory: 256,
      manufacturer: "Qisda",
      processor: "BCM2835"
    },
    "0006": {
      type: "B",
      revision: "2.0",
      memory: 256,
      manufacturer: "Egoman",
      processor: "BCM2835"
    },
    "0007": {
      type: "A",
      revision: "2.0",
      memory: 256,
      manufacturer: "Egoman",
      processor: "BCM2835"
    },
    "0008": {
      type: "A",
      revision: "2.0",
      memory: 256,
      manufacturer: "Sony UK",
      processor: "BCM2835"
    },
    "0009": {
      type: "A",
      revision: "2.0",
      memory: 256,
      manufacturer: "Qisda",
      processor: "BCM2835"
    },
    "000d": {
      type: "B",
      revision: "2.0",
      memory: 512,
      manufacturer: "Egoman",
      processor: "BCM2835"
    },
    "000e": {
      type: "B",
      revision: "2.0",
      memory: 512,
      manufacturer: "Sony UK",
      processor: "BCM2835"
    },
    "000f": {
      type: "B",
      revision: "2.0",
      memory: 512,
      manufacturer: "Egoman",
      processor: "BCM2835"
    },
    "0010": {
      type: "B+",
      revision: "1.2",
      memory: 512,
      manufacturer: "Sony UK",
      processor: "BCM2835"
    },
    "0011": {
      type: "CM1",
      revision: "1.0",
      memory: 512,
      manufacturer: "Sony UK",
      processor: "BCM2835"
    },
    "0012": {
      type: "A+",
      revision: "1.1",
      memory: 256,
      manufacturer: "Sony UK",
      processor: "BCM2835"
    },
    "0013": {
      type: "B+",
      revision: "1.2",
      memory: 512,
      manufacturer: "Embest",
      processor: "BCM2835"
    },
    "0014": {
      type: "CM1",
      revision: "1.0",
      memory: 512,
      manufacturer: "Embest",
      processor: "BCM2835"
    },
    "0015": {
      type: "A+",
      revision: "1.1",
      memory: 256,
      manufacturer: "512MB	Embest",
      processor: "BCM2835"
    }
  }, e = ["BCM2835", "BCM2836", "BCM2837", "BCM2711", "BCM2712"], s = ["Sony UK", "Egoman", "Embest", "Sony Japan", "Embest", "Stadium"], r = {
    "00": "A",
    "01": "B",
    "02": "A+",
    "03": "B+",
    "04": "2B",
    "05": "Alpha (early prototype)",
    "06": "CM1",
    "08": "3B",
    "09": "Zero",
    "0a": "CM3",
    "0c": "Zero W",
    "0d": "3B+",
    "0e": "3A+",
    "0f": "Internal use only",
    10: "CM3+",
    11: "4B",
    12: "Zero 2 W",
    13: "400",
    14: "CM4",
    15: "CM4S",
    16: "Internal use only",
    17: "5",
    18: "CM5",
    19: "500/500+",
    "1a": "CM5 Lite"
  }, i = st(t, "revision", ":", !0), o = st(t, "model:", ":", !0), a = st(t, "serial", ":", !0);
  let c = {};
  if ({}.hasOwnProperty.call(n, i))
    c = {
      model: o,
      serial: a,
      revisionCode: i,
      memory: n[i].memory,
      manufacturer: n[i].manufacturer,
      processor: n[i].processor,
      type: n[i].type,
      revision: n[i].revision
    };
  else {
    const l = ("00000000" + st(t, "revision", ":", !0).toLowerCase()).substr(-8), u = parseInt(Ta(l.substr(2, 1)).substr(5, 3), 2) || 0, d = s[parseInt(l.substr(3, 1), 10)], p = e[parseInt(l.substr(4, 1), 10)], f = l.substr(5, 2);
    c = {
      model: o,
      serial: a,
      revisionCode: i,
      memory: 256 * Math.pow(2, u),
      manufacturer: d,
      processor: p,
      type: {}.hasOwnProperty.call(r, f) ? r[f] : "",
      revision: "1." + l.substr(7, 1)
    };
  }
  return c;
}
function ba(t) {
  if (Ge === null && t !== void 0)
    Ge = t;
  else if (t === void 0 && Ge !== null)
    t = Ge;
  else
    try {
      t = Xe.readFileSync("/proc/cpuinfo", { encoding: "utf8" }).toString().split(`
`), Ge = t;
    } catch {
      return !1;
    }
  const n = Tr(t);
  return n.type === "4B" || n.type === "CM4" || n.type === "CM4S" || n.type === "400" ? "VideoCore VI" : n.type === "5" || n.type === "500" ? "VideoCore VII" : "VideoCore IV";
}
function Va(t) {
  const n = t.map(
    (r) => new Promise((i) => {
      const o = new Array(2);
      r.then((a) => {
        o[0] = a;
      }).catch((a) => {
        o[1] = a;
      }).then(() => {
        i(o);
      });
    })
  ), e = [], s = [];
  return Promise.all(n).then((r) => (r.forEach((i) => {
    i[1] ? (e.push(i[1]), s.push(null)) : (e.push(null), s.push(i[0]));
  }), {
    errors: e,
    results: s
  }));
}
function Na(t) {
  return function() {
    const n = Array.prototype.slice.call(arguments);
    return new Promise((e, s) => {
      n.push((r, i) => {
        r ? s(r) : e(i);
      }), t.apply(null, n);
    });
  };
}
function Ba(t) {
  return function() {
    const n = Array.prototype.slice.call(arguments);
    return new Promise((e) => {
      n.push((s, r) => {
        e(r);
      }), t.apply(null, n);
    });
  };
}
function ka() {
  let t = "";
  if (ui)
    try {
      t = Mn("uname -v", ms).toString();
    } catch {
      t = "";
    }
  return t;
}
function Fa(t) {
  const n = ["array", "dict", "key", "string", "integer", "date", "real", "data", "boolean", "arrayEmpty"];
  let s = t.indexOf("<plist version"), r = t.length;
  for (; t[s] !== ">" && s < r; )
    s++;
  let i = 0, o = !1, a = !1, c = !1, l = [{ tagStart: "", tagEnd: "", tagContent: "", key: "", data: null }], u = "", d = t[s];
  for (; s < r; )
    u = d, s + 1 < r && (d = t[s + 1]), u === "<" ? (a = !1, d === "/" ? c = !0 : l[i].tagStart ? (l[i].tagContent = "", l[i].data || (l[i].data = l[i].tagStart === "array" ? [] : {}), i++, l.push({ tagStart: "", tagEnd: "", tagContent: "", key: null, data: null }), o = !0, a = !1) : o || (o = !0)) : u === ">" ? (l[i].tagStart === "true/" && (o = !1, c = !0, l[i].tagStart = "", l[i].tagEnd = "/boolean", l[i].data = !0), l[i].tagStart === "false/" && (o = !1, c = !0, l[i].tagStart = "", l[i].tagEnd = "/boolean", l[i].data = !1), l[i].tagStart === "array/" && (o = !1, c = !0, l[i].tagStart = "", l[i].tagEnd = "/arrayEmpty", l[i].data = []), a && (a = !1), o && (o = !1, a = !0, l[i].tagStart === "array" && (l[i].data = []), l[i].tagStart === "dict" && (l[i].data = {})), c && (c = !1, l[i].tagEnd && n.indexOf(l[i].tagEnd.substr(1)) >= 0 && (l[i].tagEnd === "/dict" || l[i].tagEnd === "/array" ? (i > 1 && l[i - 2].tagStart === "array" && l[i - 2].data.push(l[i - 1].data), i > 1 && l[i - 2].tagStart === "dict" && (l[i - 2].data[l[i - 1].key] = l[i - 1].data), i--, l.pop(), l[i].tagContent = "", l[i].tagStart = "", l[i].tagEnd = "") : (l[i].tagEnd === "/key" && l[i].tagContent ? l[i].key = l[i].tagContent : (l[i].tagEnd === "/real" && l[i].tagContent && (l[i].data = parseFloat(l[i].tagContent) || 0), l[i].tagEnd === "/integer" && l[i].tagContent && (l[i].data = parseInt(l[i].tagContent) || 0), l[i].tagEnd === "/string" && l[i].tagContent && (l[i].data = l[i].tagContent || ""), l[i].tagEnd === "/boolean" && (l[i].data = l[i].tagContent || !1), l[i].tagEnd === "/arrayEmpty" && (l[i].data = l[i].tagContent || []), i > 0 && l[i - 1].tagStart === "array" && l[i - 1].data.push(l[i].data), i > 0 && l[i - 1].tagStart === "dict" && (l[i - 1].data[l[i].key] = l[i].data)), l[i].tagContent = "", l[i].tagStart = "", l[i].tagEnd = "")), l[i].tagEnd = "", o = !1, a = !1)) : (o && (l[i].tagStart += u), c && (l[i].tagEnd += u), a && (l[i].tagContent += u)), s++;
  return l[0].data;
}
function Vi(t) {
  return typeof t == "string" && !isNaN(t) && !isNaN(parseFloat(t));
}
function Ra(t) {
  const n = t.split(`
`);
  for (let s = 0; s < n.length; s++) {
    if (n[s].indexOf(" = ") >= 0) {
      const r = n[s].split(" = ");
      if (r[0] = r[0].trim(), r[0].startsWith('"') || (r[0] = '"' + r[0] + '"'), r[1] = r[1].trim(), r[1].indexOf('"') === -1 && r[1].endsWith(";")) {
        const i = r[1].substring(0, r[1].length - 1);
        Vi(i) || (r[1] = `"${i}";`);
      }
      if (r[1].indexOf('"') >= 0 && r[1].endsWith(";")) {
        const i = r[1].substring(0, r[1].length - 1).replace(/"/g, "");
        Vi(i) && (r[1] = `${i};`);
      }
      n[s] = r.join(" : ");
    }
    n[s] = n[s].replace(/\(/g, "[").replace(/\)/g, "]").replace(/;/g, ",").trim(), n[s].startsWith("}") && n[s - 1] && n[s - 1].endsWith(",") && (n[s - 1] = n[s - 1].substring(0, n[s - 1].length - 1));
  }
  t = n.join("");
  let e = {};
  try {
    e = JSON.parse(t);
  } catch {
  }
  return e;
}
function Ga(t, n) {
  let e = 0;
  const s = t.split("."), r = n.split(".");
  return s[0] < r[0] ? e = 1 : s[0] > r[0] ? e = -1 : s[0] === r[0] && s.length >= 2 && r.length >= 2 && (s[1] < r[1] ? e = 1 : s[1] > r[1] ? e = -1 : s[1] === r[1] && (s.length >= 3 && r.length >= 3 ? s[2] < r[2] ? e = 1 : s[2] > r[2] && (e = -1) : r.length >= 3 && (e = 1))), e;
}
function Wa(t) {
  const e = [
    {
      key: "Mac17,9",
      name: "MacBook Pro",
      size: "14-inch",
      processor: "M5 Pro",
      year: "2026",
      additional: ""
    },
    {
      key: "Mac17,8",
      name: "MacBook Pro",
      size: "16-inch",
      processor: "M5 Pro",
      year: "2026",
      additional: ""
    },
    {
      key: "Mac17,7",
      name: "MacBook Pro",
      size: "14-inch",
      processor: "M5 Max",
      year: "2026",
      additional: ""
    },
    {
      key: "Mac17,6",
      name: "MacBook Pro",
      size: "16-inch",
      processor: "M5 Max",
      year: "2026",
      additional: ""
    },
    {
      key: "Mac17,5",
      name: "MacBook Pro",
      size: "16-inch",
      processor: "M5 Pro",
      year: "2026",
      additional: ""
    },
    {
      key: "Mac17,4",
      name: "MacBook Pro",
      size: "14-inch",
      processor: "M5 Pro",
      year: "2026",
      additional: ""
    },
    {
      key: "Mac17,1",
      name: "MacBook Neo",
      size: "14-inch",
      processor: "A18 Pro",
      year: "2026",
      additional: ""
    },
    {
      key: "Mac17,3",
      name: "MacBook Pro",
      size: "16-inch",
      processor: "M5",
      year: "2025",
      additional: ""
    },
    {
      key: "Mac17,2",
      name: "MacBook Pro",
      size: "14-inch",
      processor: "M5",
      year: "2025",
      additional: ""
    },
    {
      key: "Mac16,13",
      name: "MacBook Air",
      size: "15-inch",
      processor: "M4",
      year: "2025",
      additional: ""
    },
    {
      key: "Mac16,12",
      name: "MacBook Air",
      size: "13-inch",
      processor: "M4",
      year: "2025",
      additional: ""
    },
    {
      key: "Mac15,13",
      name: "MacBook Air",
      size: "15-inch",
      processor: "M3",
      year: "2024",
      additional: ""
    },
    {
      key: "Mac15,12",
      name: "MacBook Air",
      size: "13-inch",
      processor: "M3",
      year: "2024",
      additional: ""
    },
    {
      key: "Mac14,15",
      name: "MacBook Air",
      size: "15-inch",
      processor: "M2",
      year: "2024",
      additional: ""
    },
    {
      key: "Mac14,2",
      name: "MacBook Air",
      size: "13-inch",
      processor: "M2",
      year: "2022",
      additional: ""
    },
    {
      key: "MacBookAir10,1",
      name: "MacBook Air",
      size: "13-inch",
      processor: "M1",
      year: "2020",
      additional: ""
    },
    {
      key: "MacBookAir9,1",
      name: "MacBook Air",
      size: "13-inch",
      processor: "",
      year: "2020",
      additional: ""
    },
    {
      key: "MacBookAir8,2",
      name: "MacBook Air",
      size: "13-inch",
      processor: "",
      year: "2019",
      additional: ""
    },
    {
      key: "MacBookAir8,1",
      name: "MacBook Air",
      size: "13-inch",
      processor: "",
      year: "2018",
      additional: ""
    },
    {
      key: "MacBookAir7,2",
      name: "MacBook Air",
      size: "13-inch",
      processor: "",
      year: "2017",
      additional: ""
    },
    {
      key: "MacBookAir7,2",
      name: "MacBook Air",
      size: "13-inch",
      processor: "",
      year: "Early 2015",
      additional: ""
    },
    {
      key: "MacBookAir7,1",
      name: "MacBook Air",
      size: "11-inch",
      processor: "",
      year: "Early 2015",
      additional: ""
    },
    {
      key: "MacBookAir6,2",
      name: "MacBook Air",
      size: "13-inch",
      processor: "",
      year: "Early 2014",
      additional: ""
    },
    {
      key: "MacBookAir6,1",
      name: "MacBook Air",
      size: "11-inch",
      processor: "",
      year: "Early 2014",
      additional: ""
    },
    {
      key: "MacBookAir6,2",
      name: "MacBook Air",
      size: "13-inch",
      processor: "",
      year: "Mid 2013",
      additional: ""
    },
    {
      key: "MacBookAir6,1",
      name: "MacBook Air",
      size: "11-inch",
      processor: "",
      year: "Mid 2013",
      additional: ""
    },
    {
      key: "MacBookAir5,2",
      name: "MacBook Air",
      size: "13-inch",
      processor: "",
      year: "Mid 2012",
      additional: ""
    },
    {
      key: "MacBookAir5,1",
      name: "MacBook Air",
      size: "11-inch",
      processor: "",
      year: "Mid 2012",
      additional: ""
    },
    {
      key: "MacBookAir4,2",
      name: "MacBook Air",
      size: "13-inch",
      processor: "",
      year: "Mid 2011",
      additional: ""
    },
    {
      key: "MacBookAir4,1",
      name: "MacBook Air",
      size: "11-inch",
      processor: "",
      year: "Mid 2011",
      additional: ""
    },
    {
      key: "MacBookAir3,2",
      name: "MacBook Air",
      size: "13-inch",
      processor: "",
      year: "Late 2010",
      additional: ""
    },
    {
      key: "MacBookAir3,1",
      name: "MacBook Air",
      size: "11-inch",
      processor: "",
      year: "Late 2010",
      additional: ""
    },
    {
      key: "MacBookAir2,1",
      name: "MacBook Air",
      size: "13-inch",
      processor: "",
      year: "Mid 2009",
      additional: ""
    },
    {
      key: "Mac16,1",
      name: "MacBook Pro",
      size: "14-inch",
      processor: "M4",
      year: "2024",
      additional: ""
    },
    {
      key: "Mac16,6",
      name: "MacBook Pro",
      size: "14-inch",
      processor: "M4 Pro",
      year: "2024",
      additional: ""
    },
    {
      key: "Mac16,8",
      name: "MacBook Pro",
      size: "14-inch",
      processor: "M4 Max",
      year: "2024",
      additional: ""
    },
    {
      key: "Mac16,5",
      name: "MacBook Pro",
      size: "16-inch",
      processor: "M4 Pro",
      year: "2024",
      additional: ""
    },
    {
      key: "Mac16,6",
      name: "MacBook Pro",
      size: "16-inch",
      processor: "M4 Max",
      year: "2024",
      additional: ""
    },
    {
      key: "Mac15,3",
      name: "MacBook Pro",
      size: "14-inch",
      processor: "M3",
      year: "Nov 2023",
      additional: ""
    },
    {
      key: "Mac15,6",
      name: "MacBook Pro",
      size: "14-inch",
      processor: "M3 Pro",
      year: "Nov 2023",
      additional: ""
    },
    {
      key: "Mac15,8",
      name: "MacBook Pro",
      size: "14-inch",
      processor: "M3 Pro",
      year: "Nov 2023",
      additional: ""
    },
    {
      key: "Mac15,10",
      name: "MacBook Pro",
      size: "14-inch",
      processor: "M3 Max",
      year: "Nov 2023",
      additional: ""
    },
    {
      key: "Mac15,7",
      name: "MacBook Pro",
      size: "16-inch",
      processor: "M3 Pro",
      year: "Nov 2023",
      additional: ""
    },
    {
      key: "Mac15,9",
      name: "MacBook Pro",
      size: "16-inch",
      processor: "M3 Pro",
      year: "Nov 2023",
      additional: ""
    },
    {
      key: "Mac15,11",
      name: "MacBook Pro",
      size: "16-inch",
      processor: "M3 Max",
      year: "Nov 2023",
      additional: ""
    },
    {
      key: "Mac14,5",
      name: "MacBook Pro",
      size: "14-inch",
      processor: "M2 Max",
      year: "2023",
      additional: ""
    },
    {
      key: "Mac14,9",
      name: "MacBook Pro",
      size: "14-inch",
      processor: "M2 Max",
      year: "2023",
      additional: ""
    },
    {
      key: "Mac14,6",
      name: "MacBook Pro",
      size: "16-inch",
      processor: "M2 Max",
      year: "2023",
      additional: ""
    },
    {
      key: "Mac14,10",
      name: "MacBook Pro",
      size: "16-inch",
      processor: "M2 Max",
      year: "2023",
      additional: ""
    },
    {
      key: "Mac14,7",
      name: "MacBook Pro",
      size: "13-inch",
      processor: "M2",
      year: "2022",
      additional: ""
    },
    {
      key: "MacBookPro18,3",
      name: "MacBook Pro",
      size: "14-inch",
      processor: "M1 Pro",
      year: "2021",
      additional: ""
    },
    {
      key: "MacBookPro18,4",
      name: "MacBook Pro",
      size: "14-inch",
      processor: "M1 Max",
      year: "2021",
      additional: ""
    },
    {
      key: "MacBookPro18,1",
      name: "MacBook Pro",
      size: "16-inch",
      processor: "M1 Pro",
      year: "2021",
      additional: ""
    },
    {
      key: "MacBookPro18,2",
      name: "MacBook Pro",
      size: "16-inch",
      processor: "M1 Max",
      year: "2021",
      additional: ""
    },
    {
      key: "MacBookPro17,1",
      name: "MacBook Pro",
      size: "13-inch",
      processor: "M1",
      year: "2020",
      additional: ""
    },
    {
      key: "MacBookPro16,3",
      name: "MacBook Pro",
      size: "13-inch",
      processor: "",
      year: "2020",
      additional: "Two Thunderbolt 3 ports"
    },
    {
      key: "MacBookPro16,2",
      name: "MacBook Pro",
      size: "13-inch",
      processor: "",
      year: "2020",
      additional: "Four Thunderbolt 3 ports"
    },
    {
      key: "MacBookPro16,1",
      name: "MacBook Pro",
      size: "16-inch",
      processor: "",
      year: "2019",
      additional: ""
    },
    {
      key: "MacBookPro16,4",
      name: "MacBook Pro",
      size: "16-inch",
      processor: "",
      year: "2019",
      additional: ""
    },
    {
      key: "MacBookPro15,3",
      name: "MacBook Pro",
      size: "15-inch",
      processor: "",
      year: "2019",
      additional: ""
    },
    {
      key: "MacBookPro15,2",
      name: "MacBook Pro",
      size: "13-inch",
      processor: "",
      year: "2019",
      additional: ""
    },
    {
      key: "MacBookPro15,1",
      name: "MacBook Pro",
      size: "15-inch",
      processor: "",
      year: "2019",
      additional: ""
    },
    {
      key: "MacBookPro15,4",
      name: "MacBook Pro",
      size: "13-inch",
      processor: "",
      year: "2019",
      additional: "Two Thunderbolt 3 ports"
    },
    {
      key: "MacBookPro15,1",
      name: "MacBook Pro",
      size: "15-inch",
      processor: "",
      year: "2018",
      additional: ""
    },
    {
      key: "MacBookPro15,2",
      name: "MacBook Pro",
      size: "13-inch",
      processor: "",
      year: "2018",
      additional: "Four Thunderbolt 3 ports"
    },
    {
      key: "MacBookPro14,1",
      name: "MacBook Pro",
      size: "13-inch",
      processor: "",
      year: "2017",
      additional: "Two Thunderbolt 3 ports"
    },
    {
      key: "MacBookPro14,2",
      name: "MacBook Pro",
      size: "13-inch",
      processor: "",
      year: "2017",
      additional: "Four Thunderbolt 3 ports"
    },
    {
      key: "MacBookPro14,3",
      name: "MacBook Pro",
      size: "15-inch",
      processor: "",
      year: "2017",
      additional: ""
    },
    {
      key: "MacBookPro13,1",
      name: "MacBook Pro",
      size: "13-inch",
      processor: "",
      year: "2016",
      additional: "Two Thunderbolt 3 ports"
    },
    {
      key: "MacBookPro13,2",
      name: "MacBook Pro",
      size: "13-inch",
      processor: "",
      year: "2016",
      additional: "Four Thunderbolt 3 ports"
    },
    {
      key: "MacBookPro13,3",
      name: "MacBook Pro",
      size: "15-inch",
      processor: "",
      year: "2016",
      additional: ""
    },
    {
      key: "MacBookPro11,4",
      name: "MacBook Pro",
      size: "15-inch",
      processor: "",
      year: "Mid 2015",
      additional: ""
    },
    {
      key: "MacBookPro11,5",
      name: "MacBook Pro",
      size: "15-inch",
      processor: "",
      year: "Mid 2015",
      additional: ""
    },
    {
      key: "MacBookPro12,1",
      name: "MacBook Pro",
      size: "13-inch",
      processor: "",
      year: "Early 2015",
      additional: ""
    },
    {
      key: "MacBookPro11,2",
      name: "MacBook Pro",
      size: "15-inch",
      processor: "",
      year: "Late 2013",
      additional: ""
    },
    {
      key: "MacBookPro11,3",
      name: "MacBook Pro",
      size: "15-inch",
      processor: "",
      year: "Late 2013",
      additional: ""
    },
    {
      key: "MacBookPro11,1",
      name: "MacBook Pro",
      size: "13-inch",
      processor: "",
      year: "Late 2013",
      additional: ""
    },
    {
      key: "MacBookPro10,1",
      name: "MacBook Pro",
      size: "15-inch",
      processor: "",
      year: "Mid 2012",
      additional: ""
    },
    {
      key: "MacBookPro10,2",
      name: "MacBook Pro",
      size: "13-inch",
      processor: "",
      year: "Late 2012",
      additional: ""
    },
    {
      key: "MacBookPro9,1",
      name: "MacBook Pro",
      size: "15-inch",
      processor: "",
      year: "Mid 2012",
      additional: ""
    },
    {
      key: "MacBookPro9,2",
      name: "MacBook Pro",
      size: "13-inch",
      processor: "",
      year: "Mid 2012",
      additional: ""
    },
    {
      key: "MacBookPro8,3",
      name: "MacBook Pro",
      size: "17-inch",
      processor: "",
      year: "Early 2011",
      additional: ""
    },
    {
      key: "MacBookPro8,2",
      name: "MacBook Pro",
      size: "15-inch",
      processor: "",
      year: "Early 2011",
      additional: ""
    },
    {
      key: "MacBookPro8,1",
      name: "MacBook Pro",
      size: "13-inch",
      processor: "",
      year: "Early 2011",
      additional: ""
    },
    {
      key: "MacBookPro6,1",
      name: "MacBook Pro",
      size: "17-inch",
      processor: "",
      year: "Mid 2010",
      additional: ""
    },
    {
      key: "MacBookPro6,2",
      name: "MacBook Pro",
      size: "15-inch",
      processor: "",
      year: "Mid 2010",
      additional: ""
    },
    {
      key: "MacBookPro7,1",
      name: "MacBook Pro",
      size: "13-inch",
      processor: "",
      year: "Mid 2010",
      additional: ""
    },
    {
      key: "MacBookPro5,2",
      name: "MacBook Pro",
      size: "17-inch",
      processor: "",
      year: "Early 2009",
      additional: ""
    },
    {
      key: "MacBookPro5,3",
      name: "MacBook Pro",
      size: "15-inch",
      processor: "",
      year: "Mid 2009",
      additional: ""
    },
    {
      key: "MacBookPro5,5",
      name: "MacBook Pro",
      size: "13-inch",
      processor: "",
      year: "Mid 2009",
      additional: ""
    },
    {
      key: "MacBookPro5,1",
      name: "MacBook Pro",
      size: "15-inch",
      processor: "",
      year: "Late 2008",
      additional: ""
    },
    {
      key: "MacBookPro4,1",
      name: "MacBook Pro",
      size: "15-inch",
      processor: "",
      year: "Early 2008",
      additional: ""
    },
    {
      key: "MacBook10,1",
      name: "MacBook",
      size: "12-inch",
      processor: "",
      year: "2017",
      additional: ""
    },
    {
      key: "MacBook9,1",
      name: "MacBook",
      size: "12-inch",
      processor: "",
      year: "Early 2016",
      additional: ""
    },
    {
      key: "MacBook8,1",
      name: "MacBook",
      size: "12-inch",
      processor: "",
      year: "Early 2015",
      additional: ""
    },
    {
      key: "MacBook7,1",
      name: "MacBook",
      size: "13-inch",
      processor: "",
      year: "Mid 2010",
      additional: ""
    },
    {
      key: "MacBook6,1",
      name: "MacBook",
      size: "13-inch",
      processor: "",
      year: "Late 2009",
      additional: ""
    },
    {
      key: "MacBook5,2",
      name: "MacBook",
      size: "13-inch",
      processor: "",
      year: "Early 2009",
      additional: ""
    },
    {
      key: "Mac14,13",
      name: "Mac Studio",
      size: "",
      processor: "M2 Max",
      year: "2023",
      additional: ""
    },
    {
      key: "Mac14,14",
      name: "Mac Studio",
      size: "",
      processor: "M2 Ultra",
      year: "2023",
      additional: ""
    },
    {
      key: "Mac15,14",
      name: "Mac Studio",
      size: "",
      processor: "M3 Ultra",
      year: "2025",
      additional: ""
    },
    {
      key: "Mac16,9",
      name: "Mac Studio",
      size: "",
      processor: "M4 Max",
      year: "2025",
      additional: ""
    },
    {
      key: "Mac13,1",
      name: "Mac Studio",
      size: "",
      processor: "M1 Max",
      year: "2022",
      additional: ""
    },
    {
      key: "Mac13,2",
      name: "Mac Studio",
      size: "",
      processor: "M1 Ultra",
      year: "2022",
      additional: ""
    },
    {
      key: "Mac16,11",
      name: "Mac mini",
      size: "",
      processor: "M4 Pro",
      year: "2024",
      additional: ""
    },
    {
      key: "Mac16,10",
      name: "Mac mini",
      size: "",
      processor: "M4",
      year: "2024",
      additional: ""
    },
    {
      key: "Mac14,3",
      name: "Mac mini",
      size: "",
      processor: "M2",
      year: "2023",
      additional: ""
    },
    {
      key: "Mac14,12",
      name: "Mac mini",
      size: "",
      processor: "M2 Pro",
      year: "2023",
      additional: ""
    },
    {
      key: "Macmini9,1",
      name: "Mac mini",
      size: "",
      processor: "M1",
      year: "2020",
      additional: ""
    },
    {
      key: "Macmini8,1",
      name: "Mac mini",
      size: "",
      processor: "",
      year: "Late 2018",
      additional: ""
    },
    {
      key: "Macmini7,1",
      name: "Mac mini",
      size: "",
      processor: "",
      year: "Late 2014",
      additional: ""
    },
    {
      key: "Macmini6,1",
      name: "Mac mini",
      size: "",
      processor: "",
      year: "Late 2012",
      additional: ""
    },
    {
      key: "Macmini6,2",
      name: "Mac mini",
      size: "",
      processor: "",
      year: "Late 2012",
      additional: ""
    },
    {
      key: "Macmini5,1",
      name: "Mac mini",
      size: "",
      processor: "",
      year: "Mid 2011",
      additional: ""
    },
    {
      key: "Macmini5,2",
      name: "Mac mini",
      size: "",
      processor: "",
      year: "Mid 2011",
      additional: ""
    },
    {
      key: "Macmini4,1",
      name: "Mac mini",
      size: "",
      processor: "",
      year: "Mid 2010",
      additional: ""
    },
    {
      key: "Macmini3,1",
      name: "Mac mini",
      size: "",
      processor: "",
      year: "Early 2009",
      additional: ""
    },
    {
      key: "Mac16,3",
      name: "iMac",
      size: "24-inch",
      processor: "M4",
      year: "2024",
      additional: "Four ports"
    },
    {
      key: "Mac16,2",
      name: "iMac",
      size: "24-inch",
      processor: "M4",
      year: "2024",
      additional: "Two ports"
    },
    {
      key: "Mac15,5",
      name: "iMac",
      size: "24-inch",
      processor: "M3",
      year: "2023",
      additional: "Four ports"
    },
    {
      key: "Mac15,4",
      name: "iMac",
      size: "24-inch",
      processor: "M3",
      year: "2023",
      additional: "Two ports"
    },
    {
      key: "iMac21,1",
      name: "iMac",
      size: "24-inch",
      processor: "M1",
      year: "2021",
      additional: ""
    },
    {
      key: "iMac21,2",
      name: "iMac",
      size: "24-inch",
      processor: "M1",
      year: "2021",
      additional: ""
    },
    {
      key: "iMac20,1",
      name: "iMac",
      size: "27-inch",
      processor: "",
      year: "2020",
      additional: "Retina 5K"
    },
    {
      key: "iMac20,2",
      name: "iMac",
      size: "27-inch",
      processor: "",
      year: "2020",
      additional: "Retina 5K"
    },
    {
      key: "iMac19,1",
      name: "iMac",
      size: "27-inch",
      processor: "",
      year: "2019",
      additional: "Retina 5K"
    },
    {
      key: "iMac19,2",
      name: "iMac",
      size: "21.5-inch",
      processor: "",
      year: "2019",
      additional: "Retina 4K"
    },
    {
      key: "iMacPro1,1",
      name: "iMac Pro",
      size: "",
      processor: "",
      year: "2017",
      additional: ""
    },
    {
      key: "iMac18,3",
      name: "iMac",
      size: "27-inch",
      processor: "",
      year: "2017",
      additional: "Retina 5K"
    },
    {
      key: "iMac18,2",
      name: "iMac",
      size: "21.5-inch",
      processor: "",
      year: "2017",
      additional: "Retina 4K"
    },
    {
      key: "iMac18,1",
      name: "iMac",
      size: "21.5-inch",
      processor: "",
      year: "2017",
      additional: ""
    },
    {
      key: "iMac17,1",
      name: "iMac",
      size: "27-inch",
      processor: "",
      year: "Late 2015",
      additional: "Retina 5K"
    },
    {
      key: "iMac16,2",
      name: "iMac",
      size: "21.5-inch",
      processor: "",
      year: "Late 2015",
      additional: "Retina 4K"
    },
    {
      key: "iMac16,1",
      name: "iMac",
      size: "21.5-inch",
      processor: "",
      year: "Late 2015",
      additional: ""
    },
    {
      key: "iMac15,1",
      name: "iMac",
      size: "27-inch",
      processor: "",
      year: "Late 2014",
      additional: "Retina 5K"
    },
    {
      key: "iMac14,4",
      name: "iMac",
      size: "21.5-inch",
      processor: "",
      year: "Mid 2014",
      additional: ""
    },
    {
      key: "iMac14,2",
      name: "iMac",
      size: "27-inch",
      processor: "",
      year: "Late 2013",
      additional: ""
    },
    {
      key: "iMac14,1",
      name: "iMac",
      size: "21.5-inch",
      processor: "",
      year: "Late 2013",
      additional: ""
    },
    {
      key: "iMac13,2",
      name: "iMac",
      size: "27-inch",
      processor: "",
      year: "Late 2012",
      additional: ""
    },
    {
      key: "iMac13,1",
      name: "iMac",
      size: "21.5-inch",
      processor: "",
      year: "Late 2012",
      additional: ""
    },
    {
      key: "iMac12,2",
      name: "iMac",
      size: "27-inch",
      processor: "",
      year: "Mid 2011",
      additional: ""
    },
    {
      key: "iMac12,1",
      name: "iMac",
      size: "21.5-inch",
      processor: "",
      year: "Mid 2011",
      additional: ""
    },
    {
      key: "iMac11,3",
      name: "iMac",
      size: "27-inch",
      processor: "",
      year: "Mid 2010",
      additional: ""
    },
    {
      key: "iMac11,2",
      name: "iMac",
      size: "21.5-inch",
      processor: "",
      year: "Mid 2010",
      additional: ""
    },
    {
      key: "iMac10,1",
      name: "iMac",
      size: "21.5-inch",
      processor: "",
      year: "Late 2009",
      additional: ""
    },
    {
      key: "iMac9,1",
      name: "iMac",
      size: "20-inch",
      processor: "",
      year: "Early 2009",
      additional: ""
    },
    {
      key: "Mac14,8",
      name: "Mac Pro",
      size: "",
      processor: "",
      year: "2023",
      additional: ""
    },
    {
      key: "Mac14,8",
      name: "Mac Pro",
      size: "",
      processor: "",
      year: "2023",
      additional: "Rack"
    },
    {
      key: "MacPro7,1",
      name: "Mac Pro",
      size: "",
      processor: "",
      year: "2019",
      additional: ""
    },
    {
      key: "MacPro7,1",
      name: "Mac Pro",
      size: "",
      processor: "",
      year: "2019",
      additional: "Rack"
    },
    {
      key: "MacPro6,1",
      name: "Mac Pro",
      size: "",
      processor: "",
      year: "Late 2013",
      additional: ""
    },
    {
      key: "MacPro5,1",
      name: "Mac Pro",
      size: "",
      processor: "",
      year: "Mid 2012",
      additional: ""
    },
    {
      key: "MacPro5,1",
      name: "Mac Pro Server",
      size: "",
      processor: "",
      year: "Mid 2012",
      additional: "Server"
    },
    {
      key: "MacPro5,1",
      name: "Mac Pro",
      size: "",
      processor: "",
      year: "Mid 2010",
      additional: ""
    },
    {
      key: "MacPro5,1",
      name: "Mac Pro Server",
      size: "",
      processor: "",
      year: "Mid 2010",
      additional: "Server"
    },
    {
      key: "MacPro4,1",
      name: "Mac Pro",
      size: "",
      processor: "",
      year: "Early 2009",
      additional: ""
    }
  ].filter((r) => r.key === t);
  if (e.length === 0)
    return {
      key: t,
      model: "Apple",
      version: "Unknown"
    };
  const s = [];
  return e[0].size && s.push(e[0].size), e[0].processor && s.push(e[0].processor), e[0].year && s.push(e[0].year), e[0].additional && s.push(e[0].additional), {
    key: t,
    model: e[0].name,
    version: e[0].name + " (" + s.join(", ") + ")"
  };
}
function za(t, n = 5e3) {
  const e = t.startsWith("https:") || t.indexOf(":443/") > 0 || t.indexOf(":8443/") > 0 ? Co : wo, s = Date.now();
  return new Promise((r) => {
    const i = e.get(t, (o) => {
      o.on("data", () => {
      }), o.on("end", () => {
        r({
          url: t,
          statusCode: o.statusCode,
          message: o.statusMessage,
          time: Date.now() - s
        });
      });
    }).on("error", (o) => {
      r({
        url: t,
        statusCode: 404,
        message: o.message,
        time: Date.now() - s
      });
    }).setTimeout(n, () => {
      i.destroy(), r({
        url: t,
        statusCode: 408,
        message: "Request Timeout",
        time: Date.now() - s
      });
    });
  });
}
function Ua(t) {
  return t.replace(/To Be Filled By O.E.M./g, "");
}
function $a(t, n) {
  return t.split(`
`).filter((s) => s.includes(n)).join(`
`);
}
function Ha() {
}
D.toInt = sa;
D.splitByNumber = ia;
D.execOptsWin = fs;
D.execOptsLinux = ms;
D.getCodepage = wa;
D.execWin = Oa;
D.isFunction = ra;
D.unique = oa;
D.sortByKey = aa;
D.cores = ca;
D.getValue = st;
D.decodeEscapeSequence = la;
D.parseDateTime = da;
D.parseHead = fa;
D.findObjectByKey = ma;
D.darwinXcodeExists = Pa;
D.getVboxmanage = ha;
D.powerShell = Sa;
D.powerShellStart = xa;
D.powerShellRelease = ya;
D.execSafe = Ca;
D.nanoSeconds = va;
D.countUniqueLines = Ma;
D.countLines = Aa;
D.noop = Ha;
D.isRaspberry = Ia;
D.isRaspbian = _a;
D.sanitizeShellString = Ar;
D.isPrototypePolluted = Er;
D.sanitizeString = Ea;
D.decodePiCpuinfo = Tr;
D.getRpiGpu = ba;
D.promiseAll = Va;
D.promisify = Na;
D.promisifySave = Ba;
D.smartMonToolsInstalled = La;
D.linuxVersion = ka;
D.plistParser = Fa;
D.plistReader = Ra;
D.stringObj = jn;
D.stringReplace = Js;
D.stringToLower = Qs;
D.stringToString = _r;
D.stringSubstr = Or;
D.stringSubstring = Pr;
D.stringTrim = vr;
D.stringStartWith = Mr;
D.mathMin = di;
D.WINDIR = Ir;
D.getFilesInPath = Da;
D.semverCompare = Ga;
D.getAppleModel = Wa;
D.checkWebsite = za;
D.cleanString = Ua;
D.grep = $a;
D.getPowershell = ga;
var bn = {}, Ft = {};
const Ve = je, Pe = Ne, N = D, B = ee.exec, hn = ee.execSync, Xa = ee.execFile, We = process.platform, nn = We === "linux" || We === "android", ve = We === "darwin", Me = We === "win32", fi = We === "freebsd", mi = We === "openbsd", gi = We === "netbsd", Ka = We === "sunos";
function ja() {
  const t = (/* @__PURE__ */ new Date()).toString().split(" ");
  let n = "";
  try {
    n = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    n = t.length >= 7 ? t.slice(6).join(" ").replace(/\(/g, "").replace(/\)/g, "") : "";
  }
  const e = {
    current: Date.now(),
    uptime: Ve.uptime(),
    timezone: t.length >= 7 ? t[5] : "",
    timezoneName: n
  };
  if (ve || nn)
    try {
      const r = hn("date +%Z && date +%z && ls -l /etc/localtime 2>/dev/null", N.execOptsLinux).toString().split(Ve.EOL);
      r.length > 3 && !r[0] && r.shift();
      let i = r[0] || "";
      return (i.startsWith("+") || i.startsWith("-")) && (i = "GMT"), {
        current: Date.now(),
        uptime: Ve.uptime(),
        timezone: r[1] ? i + r[1] : i,
        timezoneName: r[2] && r[2].indexOf("/zoneinfo/") > 0 && r[2].split("/zoneinfo/")[1] || ""
      };
    } catch {
      N.noop();
    }
  return e;
}
Ft.time = ja;
function ln(t) {
  t = t || "", t = t.toLowerCase();
  let n = We;
  return Me ? n = "windows" : t.indexOf("mac os") !== -1 || t.indexOf("macos") !== -1 ? n = "apple" : t.indexOf("arch") !== -1 ? n = "arch" : t.indexOf("cachy") !== -1 ? n = "cachy" : t.indexOf("centos") !== -1 ? n = "centos" : t.indexOf("coreos") !== -1 ? n = "coreos" : t.indexOf("debian") !== -1 ? n = "debian" : t.indexOf("deepin") !== -1 ? n = "deepin" : t.indexOf("elementary") !== -1 ? n = "elementary" : t.indexOf("endeavour") !== -1 ? n = "endeavour" : t.indexOf("fedora") !== -1 ? n = "fedora" : t.indexOf("gentoo") !== -1 ? n = "gentoo" : t.indexOf("mageia") !== -1 ? n = "mageia" : t.indexOf("mandriva") !== -1 ? n = "mandriva" : t.indexOf("manjaro") !== -1 ? n = "manjaro" : t.indexOf("mint") !== -1 ? n = "mint" : t.indexOf("mx") !== -1 ? n = "mx" : t.indexOf("openbsd") !== -1 ? n = "openbsd" : t.indexOf("freebsd") !== -1 ? n = "freebsd" : t.indexOf("opensuse") !== -1 ? n = "opensuse" : t.indexOf("pclinuxos") !== -1 ? n = "pclinuxos" : t.indexOf("puppy") !== -1 ? n = "puppy" : t.indexOf("popos") !== -1 ? n = "popos" : t.indexOf("raspbian") !== -1 ? n = "raspbian" : t.indexOf("reactos") !== -1 ? n = "reactos" : t.indexOf("redhat") !== -1 ? n = "redhat" : t.indexOf("slackware") !== -1 ? n = "slackware" : t.indexOf("sugar") !== -1 ? n = "sugar" : t.indexOf("steam") !== -1 ? n = "steam" : t.indexOf("suse") !== -1 ? n = "suse" : t.indexOf("mate") !== -1 ? n = "ubuntu-mate" : t.indexOf("lubuntu") !== -1 ? n = "lubuntu" : t.indexOf("xubuntu") !== -1 ? n = "xubuntu" : t.indexOf("ubuntu") !== -1 ? n = "ubuntu" : t.indexOf("solaris") !== -1 ? n = "solaris" : t.indexOf("tails") !== -1 ? n = "tails" : t.indexOf("feren") !== -1 ? n = "ferenos" : t.indexOf("robolinux") !== -1 ? n = "robolinux" : nn && t && (n = t.toLowerCase().trim().replace(/\s+/g, "-")), n;
}
const qa = [
  [26200, "25H2"],
  [26100, "24H2"],
  [22631, "23H2"],
  [22621, "22H2"],
  [19045, "22H2"],
  [22e3, "21H2"],
  [19044, "21H2"],
  [19043, "21H1"],
  [19042, "20H2"],
  [19041, "2004"],
  [18363, "1909"],
  [18362, "1903"],
  [17763, "1809"],
  [17134, "1803"]
];
function Ya(t) {
  for (const [n, e] of qa)
    if (t >= n) return e;
  return "";
}
function Ja() {
  let t = Ve.hostname;
  if (nn || ve)
    try {
      t = hn("hostname -f 2>/dev/null", N.execOptsLinux).toString().split(Ve.EOL)[0];
    } catch {
      N.noop();
    }
  if (fi || mi || gi)
    try {
      t = hn("hostname 2>/dev/null").toString().split(Ve.EOL)[0];
    } catch {
      N.noop();
    }
  if (Me)
    try {
      t = hn("echo %COMPUTERNAME%.%USERDNSDOMAIN%", N.execOptsWin).toString().replace(".%USERDNSDOMAIN%", "").split(Ve.EOL)[0];
    } catch {
      N.noop();
    }
  return t;
}
function Qa(t) {
  return new Promise((n) => {
    process.nextTick(() => {
      let e = {
        platform: We === "win32" ? "Windows" : We,
        distro: "unknown",
        release: "unknown",
        codename: "",
        kernel: Ve.release(),
        arch: Ve.arch(),
        hostname: Ve.hostname(),
        fqdn: Ja(),
        codepage: "",
        logofile: "",
        serial: "",
        build: "",
        servicepack: "",
        uefi: !1
      };
      if (nn && B("cat /etc/*-release; cat /usr/lib/os-release; cat /etc/openwrt_release", (s, r) => {
        let i = {};
        r.toString().split(`
`).forEach((u) => {
          u.indexOf("=") !== -1 && (i[u.split("=")[0].trim().toUpperCase()] = u.split("=")[1].trim());
        }), e.distro = (i.DISTRIB_ID || i.NAME || "unknown").replace(/"/g, ""), e.logofile = ln(e.distro);
        let a = (i.VERSION || "").replace(/"/g, ""), c = (i.DISTRIB_CODENAME || i.VERSION_CODENAME || "").replace(/"/g, "");
        const l = (i.PRETTY_NAME || "").replace(/"/g, "");
        l.indexOf(e.distro + " ") === 0 && (a = l.replace(e.distro + " ", "").trim()), a.indexOf("(") >= 0 && (c = a.split("(")[1].replace(/[()]/g, "").trim(), a = a.split("(")[0].trim()), e.release = (a || i.DISTRIB_RELEASE || i.VERSION_ID || "unknown").replace(/"/g, ""), e.codename = c, e.codepage = N.getCodepage(), e.build = (i.BUILD_ID || "").replace(/"/g, "").trim(), Za().then((u) => {
          e.uefi = u, Dr().then((d) => {
            e.serial = d.os, t && t(e), n(e);
          });
        });
      }), (fi || mi || gi) && B("sysctl kern.ostype kern.osrelease kern.osrevision kern.hostuuid machdep.bootmethod kern.geom.confxml", (s, r) => {
        let i = r.toString().split(`
`);
        const o = N.getValue(i, "kern.ostype"), a = ln(o), c = N.getValue(i, "kern.osrelease").split("-")[0], l = N.getValue(i, "kern.uuid"), u = N.getValue(i, "machdep.bootmethod"), d = r.toString().indexOf("<type>efi</type>") >= 0, p = u ? u.toLowerCase().indexOf("uefi") >= 0 : d || null;
        e.distro = o || e.distro, e.logofile = a || e.logofile, e.release = c || e.release, e.serial = l || e.serial, e.codename = "", e.codepage = N.getCodepage(), e.uefi = p || null, t && t(e), n(e);
      }), ve && B("sw_vers; sysctl kern.ostype kern.osrelease kern.osrevision kern.uuid", (s, r) => {
        let i = r.toString().split(`
`);
        e.serial = N.getValue(i, "kern.uuid"), e.distro = N.getValue(i, "ProductName"), e.release = (N.getValue(i, "ProductVersion", ":", !0, !0) + " " + N.getValue(i, "ProductVersionExtra", ":", !0, !0)).trim(), e.build = N.getValue(i, "BuildVersion"), e.logofile = ln(e.distro), e.codename = "macOS", e.codename = e.release.indexOf("10.4") > -1 ? "OS X Tiger" : e.codename, e.codename = e.release.indexOf("10.5") > -1 ? "OS X Leopard" : e.codename, e.codename = e.release.indexOf("10.6") > -1 ? "OS X Snow Leopard" : e.codename, e.codename = e.release.indexOf("10.7") > -1 ? "OS X Lion" : e.codename, e.codename = e.release.indexOf("10.8") > -1 ? "OS X Mountain Lion" : e.codename, e.codename = e.release.indexOf("10.9") > -1 ? "OS X Mavericks" : e.codename, e.codename = e.release.indexOf("10.10") > -1 ? "OS X Yosemite" : e.codename, e.codename = e.release.indexOf("10.11") > -1 ? "OS X El Capitan" : e.codename, e.codename = e.release.indexOf("10.12") > -1 ? "Sierra" : e.codename, e.codename = e.release.indexOf("10.13") > -1 ? "High Sierra" : e.codename, e.codename = e.release.indexOf("10.14") > -1 ? "Mojave" : e.codename, e.codename = e.release.indexOf("10.15") > -1 ? "Catalina" : e.codename, e.codename = e.release.startsWith("11.") ? "Big Sur" : e.codename, e.codename = e.release.startsWith("12.") ? "Monterey" : e.codename, e.codename = e.release.startsWith("13.") ? "Ventura" : e.codename, e.codename = e.release.startsWith("14.") ? "Sonoma" : e.codename, e.codename = e.release.startsWith("15.") ? "Sequoia" : e.codename, e.codename = e.release.startsWith("26.") ? "Tahoe" : e.codename, e.uefi = !0, e.codepage = N.getCodepage(), t && t(e), n(e);
      }), Ka && (e.release = e.kernel, B("uname -o", (s, r) => {
        const i = r.toString().split(`
`);
        e.distro = i[0], e.logofile = ln(e.distro), t && t(e), n(e);
      })), Me) {
        e.logofile = ln(), e.release = e.kernel;
        try {
          const s = [];
          s.push(N.powerShell("Get-CimInstance Win32_OperatingSystem | select Caption,SerialNumber,BuildNumber,ServicePackMajorVersion,ServicePackMinorVersion | fl")), s.push(N.powerShell("(Get-CimInstance Win32_ComputerSystem).HypervisorPresent")), s.push(N.powerShell("Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SystemInformation]::TerminalServerSession")), s.push(N.powerShell('reg query "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion" /v DisplayVersion')), N.promiseAll(s).then((r) => {
            const i = r.results[0] ? r.results[0].toString().split(`\r
`) : [""];
            e.distro = N.getValue(i, "Caption", ":").trim(), e.serial = N.getValue(i, "SerialNumber", ":").trim(), e.build = N.getValue(i, "BuildNumber", ":").trim(), e.servicepack = N.getValue(i, "ServicePackMajorVersion", ":").trim() + "." + N.getValue(i, "ServicePackMinorVersion", ":").trim(), e.codepage = N.getCodepage();
            const o = r.results[1] ? r.results[1].toString().toLowerCase() : "";
            e.hypervisor = o.indexOf("true") !== -1;
            const a = r.results[2] ? r.results[2].toString() : "";
            if (r.results[3]) {
              const c = r.results[3].split("REG_SZ");
              e.codename = c.length > 1 ? c[1].trim() : "";
            }
            if (!e.codename) {
              const c = parseInt(e.build, 10);
              e.codename = Ya(c);
            }
            e.remoteSession = a.toString().toLowerCase().indexOf("true") >= 0, ec().then((c) => {
              e.uefi = c, t && t(e), n(e);
            });
          });
        } catch {
          t && t(e), n(e);
        }
      }
    });
  });
}
Ft.osInfo = Qa;
function Za() {
  return new Promise((t) => {
    process.nextTick(() => {
      Pe.stat("/sys/firmware/efi", (n) => {
        if (n)
          B('dmesg | grep -E "EFI v"', (e, s) => {
            if (!e) {
              const r = s.toString().split(`
`);
              return t(r.length > 0);
            }
            return t(!1);
          });
        else
          return t(!0);
      });
    });
  });
}
function ec() {
  return new Promise((t) => {
    process.nextTick(() => {
      try {
        B('findstr /C:"Detected boot environment" "%windir%\\Panther\\setupact.log"', N.execOptsWin, (n, e) => {
          if (n)
            B("echo %firmware_type%", N.execOptsWin, (s, r) => {
              if (s)
                return t(!1);
              {
                const i = r.toString() || "";
                return t(i.toLowerCase().indexOf("efi") >= 0);
              }
            });
          else {
            const s = e.toString().split(`
\r`)[0];
            return t(s.toLowerCase().indexOf("efi") >= 0);
          }
        });
      } catch {
        return t(!1);
      }
    });
  });
}
function tc(t, n) {
  let e = {
    kernel: Ve.release(),
    apache: "",
    bash: "",
    bun: "",
    deno: "",
    docker: "",
    dotnet: "",
    fish: "",
    gcc: "",
    git: "",
    grunt: "",
    gulp: "",
    homebrew: "",
    java: "",
    mongodb: "",
    mysql: "",
    nginx: "",
    node: "",
    //process.versions.node,
    npm: "",
    openssl: "",
    perl: "",
    php: "",
    pip3: "",
    pip: "",
    pm2: "",
    postfix: "",
    postgresql: "",
    powershell: "",
    python3: "",
    python: "",
    redis: "",
    systemOpenssl: "",
    systemOpensslLib: "",
    tsc: "",
    v8: process.versions.v8,
    virtualbox: "",
    yarn: "",
    zsh: ""
  };
  function s(r) {
    if (r === "*")
      return {
        versions: e,
        counter: 34
      };
    if (!Array.isArray(r)) {
      r = r.trim().toLowerCase().replace(/,+/g, "|").replace(/ /g, "|"), r = r.split("|");
      const i = {
        versions: {},
        counter: 0
      };
      return r.forEach((o) => {
        if (o)
          for (let a in e)
            ({}).hasOwnProperty.call(e, a) && a.toLowerCase() === o.toLowerCase() && !{}.hasOwnProperty.call(i.versions, a) && (i.versions[a] = e[a], a === "openssl" && (i.versions.systemOpenssl = "", i.versions.systemOpensslLib = ""), i.versions[a] || i.counter++);
      }), i;
    }
  }
  return new Promise((r) => {
    process.nextTick(() => {
      if (N.isFunction(t) && !n)
        n = t, t = "*";
      else if (t = t || "*", typeof t != "string")
        return n && n({}), r({});
      const i = s(t);
      let o = i.counter, a = () => {
        --o === 0 && (n && n(i.versions), r(i.versions));
      }, c = "";
      try {
        if ({}.hasOwnProperty.call(i.versions, "openssl") && (i.versions.openssl = process.versions.openssl, B("openssl version", (l, u) => {
          if (!l) {
            let p = u.toString().split(`
`)[0].trim().split(" ");
            i.versions.systemOpenssl = p.length > 0 ? p[1] : p[0], i.versions.systemOpensslLib = p.length > 0 ? p[0] : "openssl";
          }
          a();
        })), {}.hasOwnProperty.call(i.versions, "npm") && B("npm -v", (l, u) => {
          l || (i.versions.npm = u.toString().split(`
`)[0]), a();
        }), {}.hasOwnProperty.call(i.versions, "pm2") && (c = "pm2", Me && (c += ".cmd"), B(`${c} -v`, (l, u) => {
          if (!l) {
            let d = u.toString().split(`
`)[0].trim();
            d.startsWith("[PM2]") || (i.versions.pm2 = d);
          }
          a();
        })), {}.hasOwnProperty.call(i.versions, "yarn") && B("yarn --version", (l, u) => {
          l || (i.versions.yarn = u.toString().split(`
`)[0]), a();
        }), {}.hasOwnProperty.call(i.versions, "gulp") && (c = "gulp", Me && (c += ".cmd"), B(`${c} --version`, (l, u) => {
          if (!l) {
            const d = u.toString().split(`
`)[0] || "";
            i.versions.gulp = (d.toLowerCase().split("version")[1] || "").trim();
          }
          a();
        })), {}.hasOwnProperty.call(i.versions, "homebrew") && (c = "brew", B(`${c} --version`, (l, u) => {
          if (!l) {
            const d = u.toString().split(`
`)[0] || "";
            i.versions.homebrew = (d.toLowerCase().split(" ")[1] || "").trim();
          }
          a();
        })), {}.hasOwnProperty.call(i.versions, "tsc") && (c = "tsc", Me && (c += ".cmd"), B(`${c} --version`, (l, u) => {
          if (!l) {
            const d = u.toString().split(`
`)[0] || "";
            i.versions.tsc = (d.toLowerCase().split("version")[1] || "").trim();
          }
          a();
        })), {}.hasOwnProperty.call(i.versions, "grunt") && (c = "grunt", Me && (c += ".cmd"), B(`${c} --version`, (l, u) => {
          if (!l) {
            const d = u.toString().split(`
`)[0] || "";
            i.versions.grunt = (d.toLowerCase().split("cli v")[1] || "").trim();
          }
          a();
        })), {}.hasOwnProperty.call(i.versions, "git"))
          if (ve) {
            const l = Pe.existsSync("/usr/local/Cellar/git") || Pe.existsSync("/opt/homebrew/bin/git");
            N.darwinXcodeExists() || l ? B("git --version", (u, d) => {
              if (!u) {
                let p = d.toString().split(`
`)[0] || "";
                p = (p.toLowerCase().split("version")[1] || "").trim(), i.versions.git = (p.split(" ")[0] || "").trim();
              }
              a();
            }) : a();
          } else
            B("git --version", (l, u) => {
              if (!l) {
                let d = u.toString().split(`
`)[0] || "";
                d = (d.toLowerCase().split("version")[1] || "").trim(), i.versions.git = (d.split(" ")[0] || "").trim();
              }
              a();
            });
        if ({}.hasOwnProperty.call(i.versions, "apache") && B("apachectl -v 2>&1", (l, u) => {
          if (!l) {
            const d = (u.toString().split(`
`)[0] || "").split(":");
            i.versions.apache = d.length > 1 ? d[1].replace("Apache", "").replace("/", "").split("(")[0].trim() : "";
          }
          a();
        }), {}.hasOwnProperty.call(i.versions, "nginx") && B("nginx -v 2>&1", (l, u) => {
          if (!l) {
            const d = u.toString().split(`
`)[0] || "";
            i.versions.nginx = (d.toLowerCase().split("/")[1] || "").trim();
          }
          a();
        }), {}.hasOwnProperty.call(i.versions, "mysql") && B("mysql -V", (l, u) => {
          if (!l) {
            let d = u.toString().split(`
`)[0] || "";
            if (d = d.toLowerCase(), d.indexOf(",") > -1) {
              d = (d.split(",")[0] || "").trim();
              const p = d.split(" ");
              i.versions.mysql = (p[p.length - 1] || "").trim();
            } else
              d.indexOf(" ver ") > -1 && (d = d.split(" ver ")[1], i.versions.mysql = d.split(" ")[0]);
          }
          a();
        }), {}.hasOwnProperty.call(i.versions, "php") && B("php -v", (l, u) => {
          if (!l) {
            let p = (u.toString().split(`
`)[0] || "").split("(");
            p[0].indexOf("-") && (p = p[0].split("-")), i.versions.php = p[0].replace(/[^0-9.]/g, "");
          }
          a();
        }), {}.hasOwnProperty.call(i.versions, "redis") && B("redis-server --version", (l, u) => {
          if (!l) {
            const p = (u.toString().split(`
`)[0] || "").split(" ");
            i.versions.redis = N.getValue(p, "v", "=", !0);
          }
          a();
        }), {}.hasOwnProperty.call(i.versions, "docker") && B("docker --version", (l, u) => {
          if (!l) {
            const p = (u.toString().split(`
`)[0] || "").split(" ");
            i.versions.docker = p.length > 2 && p[2].endsWith(",") ? p[2].slice(0, -1) : "";
          }
          a();
        }), {}.hasOwnProperty.call(i.versions, "postfix") && B("postconf -d | grep mail_version", (l, u) => {
          if (!l) {
            const d = u.toString().split(`
`) || [];
            i.versions.postfix = N.getValue(d, "mail_version", "=", !0);
          }
          a();
        }), {}.hasOwnProperty.call(i.versions, "mongodb") && B("mongod --version", (l, u) => {
          if (!l) {
            const d = u.toString().split(`
`)[0] || "";
            i.versions.mongodb = (d.toLowerCase().split(",")[0] || "").replace(/[^0-9.]/g, "");
          }
          a();
        }), {}.hasOwnProperty.call(i.versions, "postgresql") && (nn ? B("locate bin/postgres", (l, u) => {
          if (l)
            B("psql -V", (d, p) => {
              if (!d) {
                const f = p.toString().split(`
`)[0].split(" ") || [];
                i.versions.postgresql = f.length ? f[f.length - 1] : "", i.versions.postgresql = i.versions.postgresql.split("-")[0];
              }
              a();
            });
          else {
            const d = /^[a-zA-Z0-9/_.-]+$/, p = u.toString().split(`
`).filter((f) => d.test(f.trim())).sort();
            p.length ? Xa(p[p.length - 1], ["-V"], (f, m) => {
              if (!f) {
                const h = m.toString().split(`
`)[0].split(" ") || [];
                i.versions.postgresql = h.length ? h[h.length - 1] : "";
              }
              a();
            }) : a();
          }
        }) : Me ? N.powerShell("Get-CimInstance Win32_Service | select caption | fl").then((l) => {
          l.split(/\n\s*\n/).forEach((d) => {
            if (d.trim() !== "") {
              let p = d.trim().split(`\r
`), f = N.getValue(p, "caption", ":", !0).toLowerCase();
              if (f.indexOf("postgresql") > -1) {
                const m = f.split(" server ");
                m.length > 1 && (i.versions.postgresql = m[1]);
              }
            }
          }), a();
        }) : B("postgres -V", (l, u) => {
          if (l)
            B("pg_config --version", (d, p) => {
              if (!d) {
                const f = p.toString().split(`
`)[0].split(" ") || [];
                i.versions.postgresql = f.length ? f[f.length - 1] : "", i.versions.postgresql.includes("(") && f.length >= 2 && !f[f.length - 2].includes("(") && (i.versions.postgresql = f[f.length - 2]);
              }
            });
          else {
            const d = u.toString().split(`
`)[0].split(" ") || [];
            i.versions.postgresql = d.length ? d[d.length - 1] : "", i.versions.postgresql.includes("(") && d.length >= 2 && !d[d.length - 2].includes("(") && (i.versions.postgresql = d[d.length - 2]);
          }
          a();
        })), {}.hasOwnProperty.call(i.versions, "perl") && B("perl -v", (l, u) => {
          if (!l) {
            const d = u.toString().split(`
`) || "";
            for (; d.length > 0 && d[0].trim() === ""; )
              d.shift();
            d.length > 0 && (i.versions.perl = d[0].split("(").pop().split(")")[0].replace("v", ""));
          }
          a();
        }), {}.hasOwnProperty.call(i.versions, "python"))
          if (ve)
            try {
              const u = hn("sw_vers").toString().split(`
`), d = N.getValue(u, "ProductVersion", ":"), p = Pe.existsSync("/usr/local/Cellar/python"), f = Pe.existsSync("/opt/homebrew/bin/python");
              N.darwinXcodeExists() && N.semverCompare("12.0.1", d) < 0 || p || f ? B(p ? "/usr/local/Cellar/python -V 2>&1" : f ? "/opt/homebrew/bin/python -V 2>&1" : "python -V 2>&1", (h, y) => {
                if (!h) {
                  const g = y.toString().split(`
`)[0] || "";
                  i.versions.python = g.toLowerCase().replace("python", "").trim();
                }
                a();
              }) : a();
            } catch {
              a();
            }
          else
            B("python -V 2>&1", (l, u) => {
              if (!l) {
                const d = u.toString().split(`
`)[0] || "";
                i.versions.python = d.toLowerCase().replace("python", "").trim();
              }
              a();
            });
        if ({}.hasOwnProperty.call(i.versions, "python3"))
          if (ve) {
            const l = Pe.existsSync("/usr/local/Cellar/python3") || Pe.existsSync("/opt/homebrew/bin/python3");
            N.darwinXcodeExists() || l ? B("python3 -V 2>&1", (u, d) => {
              if (!u) {
                const p = d.toString().split(`
`)[0] || "";
                i.versions.python3 = p.toLowerCase().replace("python", "").trim();
              }
              a();
            }) : a();
          } else
            B("python3 -V 2>&1", (l, u) => {
              if (!l) {
                const d = u.toString().split(`
`)[0] || "";
                i.versions.python3 = d.toLowerCase().replace("python", "").trim();
              }
              a();
            });
        if ({}.hasOwnProperty.call(i.versions, "pip"))
          if (ve) {
            const l = Pe.existsSync("/usr/local/Cellar/pip") || Pe.existsSync("/opt/homebrew/bin/pip");
            N.darwinXcodeExists() || l ? B("pip -V 2>&1", (u, d) => {
              if (!u) {
                const f = (d.toString().split(`
`)[0] || "").split(" ");
                i.versions.pip = f.length >= 2 ? f[1] : "";
              }
              a();
            }) : a();
          } else
            B("pip -V 2>&1", (l, u) => {
              if (!l) {
                const p = (u.toString().split(`
`)[0] || "").split(" ");
                i.versions.pip = p.length >= 2 ? p[1] : "";
              }
              a();
            });
        if ({}.hasOwnProperty.call(i.versions, "pip3"))
          if (ve) {
            const l = Pe.existsSync("/usr/local/Cellar/pip3") || Pe.existsSync("/opt/homebrew/bin/pip3");
            N.darwinXcodeExists() || l ? B("pip3 -V 2>&1", (u, d) => {
              if (!u) {
                const f = (d.toString().split(`
`)[0] || "").split(" ");
                i.versions.pip3 = f.length >= 2 ? f[1] : "";
              }
              a();
            }) : a();
          } else
            B("pip3 -V 2>&1", (l, u) => {
              if (!l) {
                const p = (u.toString().split(`
`)[0] || "").split(" ");
                i.versions.pip3 = p.length >= 2 ? p[1] : "";
              }
              a();
            });
        ({}).hasOwnProperty.call(i.versions, "java") && (ve ? B("/usr/libexec/java_home -V 2>&1", (l, u) => {
          !l && u.toString().toLowerCase().indexOf("no java runtime") === -1 ? B("java -version 2>&1", (d, p) => {
            if (!d) {
              const m = (p.toString().split(`
`)[0] || "").split('"');
              i.versions.java = m.length === 3 ? m[1].trim() : "";
            }
            a();
          }) : a();
        }) : B("java -version 2>&1", (l, u) => {
          if (!l) {
            const p = (u.toString().split(`
`)[0] || "").split('"');
            i.versions.java = p.length === 3 ? p[1].trim() : "";
          }
          a();
        })), {}.hasOwnProperty.call(i.versions, "gcc") && (ve && N.darwinXcodeExists() || !ve ? B("gcc -dumpversion", (l, u) => {
          l || (i.versions.gcc = u.toString().split(`
`)[0].trim() || ""), i.versions.gcc.indexOf(".") > -1 ? a() : B("gcc --version", (d, p) => {
            if (!d) {
              const f = p.toString().split(`
`)[0].trim();
              if (f.indexOf("gcc") > -1 && f.indexOf(")") > -1) {
                const m = f.split(")");
                i.versions.gcc = m[1].trim() || i.versions.gcc;
              }
            }
            a();
          });
        }) : a()), {}.hasOwnProperty.call(i.versions, "virtualbox") && B(N.getVboxmanage() + " -v 2>&1", (l, u) => {
          if (!l) {
            const p = (u.toString().split(`
`)[0] || "").split("r");
            i.versions.virtualbox = p[0];
          }
          a();
        }), {}.hasOwnProperty.call(i.versions, "bash") && B("bash --version", (l, u) => {
          if (!l) {
            const p = u.toString().split(`
`)[0].split(" version ");
            p.length > 1 && (i.versions.bash = p[1].split(" ")[0].split("(")[0]);
          }
          a();
        }), {}.hasOwnProperty.call(i.versions, "zsh") && B("zsh --version", (l, u) => {
          if (!l) {
            const p = u.toString().split(`
`)[0].split("zsh ");
            p.length > 1 && (i.versions.zsh = p[1].split(" ")[0]);
          }
          a();
        }), {}.hasOwnProperty.call(i.versions, "fish") && B("fish --version", (l, u) => {
          if (!l) {
            const p = u.toString().split(`
`)[0].split(" version ");
            p.length > 1 && (i.versions.fish = p[1].split(" ")[0]);
          }
          a();
        }), {}.hasOwnProperty.call(i.versions, "bun") && B("bun -v", (l, u) => {
          if (!l) {
            const d = u.toString().split(`
`)[0].trim();
            i.versions.bun = d;
          }
          a();
        }), {}.hasOwnProperty.call(i.versions, "deno") && B("deno -v", (l, u) => {
          if (!l) {
            const p = u.toString().split(`
`)[0].trim().split(" ");
            p.length > 1 && (i.versions.deno = p[1]);
          }
          a();
        }), {}.hasOwnProperty.call(i.versions, "node") && B("node -v", (l, u) => {
          if (!l) {
            let d = u.toString().split(`
`)[0].trim();
            d.startsWith("v") && (d = d.slice(1)), i.versions.node = d;
          }
          a();
        }), {}.hasOwnProperty.call(i.versions, "powershell") && (Me ? N.powerShell("$PSVersionTable").then((l) => {
          const u = l.toString().toLowerCase().split(`
`).map((d) => d.replace(/ +/g, " ").replace(/ +/g, ":"));
          i.versions.powershell = N.getValue(u, "psversion"), a();
        }) : a()), {}.hasOwnProperty.call(i.versions, "dotnet") && (Me ? N.powerShell(
          'gci "HKLM:\\SOFTWARE\\Microsoft\\NET Framework Setup\\NDP" -recurse | gp -name Version,Release -EA 0 | where { $_.PSChildName -match "^(?!S)\\p{L}"} | select PSChildName, Version, Release'
        ).then((l) => {
          const u = l.toString().split(`\r
`);
          let d = "";
          u.forEach((p) => {
            p = p.replace(/ +/g, " ");
            const f = p.split(" ");
            d = d || (f[0].toLowerCase().startsWith("client") && f.length > 2 || f[0].toLowerCase().startsWith("full") && f.length > 2 ? f[1].trim() : "");
          }), i.versions.dotnet = d.trim(), a();
        }) : a());
      } catch {
        n && n(i.versions), r(i.versions);
      }
    });
  });
}
Ft.versions = tc;
function nc(t) {
  return new Promise((n) => {
    process.nextTick(() => {
      if (Me)
        try {
          const e = "CMD";
          N.powerShell(`Get-CimInstance -className win32_process | where-object {$_.ProcessId -eq ${process.ppid} } | select Name`).then((s) => {
            let r = "CMD";
            s && s.toString().toLowerCase().indexOf("powershell") >= 0 && (r = "PowerShell"), t && t(r), n(r);
          });
        } catch {
          t && t(result), n(result);
        }
      else {
        let e = "";
        B("echo $SHELL", (s, r) => {
          s || (e = r.toString().split(`
`)[0]), t && t(e), n(e);
        });
      }
    });
  });
}
Ft.shell = nc;
function sc() {
  let t = [];
  try {
    const n = Ve.networkInterfaces();
    for (let e in n)
      ({}).hasOwnProperty.call(n, e) && n[e].forEach((s) => {
        if (s && s.mac && s.mac !== "00:00:00:00:00:00") {
          const r = s.mac.toLowerCase();
          t.indexOf(r) === -1 && t.push(r);
        }
      });
    t = t.sort((e, s) => e < s ? -1 : e > s ? 1 : 0);
  } catch {
    t.push("00:00:00:00:00:00");
  }
  return t;
}
function Dr(t) {
  return new Promise((n) => {
    process.nextTick(() => {
      let e = {
        os: "",
        hardware: "",
        macs: sc()
      }, s;
      if (ve && B("system_profiler SPHardwareDataType -json", (r, i) => {
        if (!r)
          try {
            const o = JSON.parse(i.toString());
            if (o.SPHardwareDataType && o.SPHardwareDataType.length > 0) {
              const a = o.SPHardwareDataType[0];
              e.os = a.platform_UUID.toLowerCase(), e.hardware = a.serial_number;
            }
          } catch {
            N.noop();
          }
        t && t(e), n(e);
      }), nn && B(`echo -n "os: "; cat /var/lib/dbus/machine-id 2> /dev/null ||
cat /etc/machine-id 2> /dev/null; echo;
echo -n "hardware: "; cat /sys/class/dmi/id/product_uuid 2> /dev/null; echo;`, (i, o) => {
        const a = o.toString().split(`
`);
        if (e.os = N.getValue(a, "os").toLowerCase(), e.hardware = N.getValue(a, "hardware").toLowerCase(), !e.hardware) {
          const c = Pe.readFileSync("/proc/cpuinfo", { encoding: "utf8" }).toString().split(`
`), l = N.getValue(c, "serial");
          e.hardware = l || "";
        }
        t && t(e), n(e);
      }), (fi || mi || gi) && B("sysctl -i kern.hostid kern.hostuuid", (r, i) => {
        const o = i.toString().split(`
`);
        e.hardware = N.getValue(o, "kern.hostid", ":").toLowerCase(), e.os = N.getValue(o, "kern.hostuuid", ":").toLowerCase(), e.os.indexOf("unknown") >= 0 && (e.os = ""), e.hardware.indexOf("unknown") >= 0 && (e.hardware = ""), t && t(e), n(e);
      }), Me) {
        let r = "%windir%\\System32";
        process.arch === "ia32" && Object.prototype.hasOwnProperty.call(process.env, "PROCESSOR_ARCHITEW6432") && (r = "%windir%\\sysnative\\cmd.exe /c %windir%\\System32"), N.powerShell("Get-CimInstance Win32_ComputerSystemProduct | select UUID | fl").then((i) => {
          let o = i.split(`\r
`);
          e.hardware = N.getValue(o, "uuid", ":").toLowerCase(), B(`${r}\\reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid`, N.execOptsWin, (a, c) => {
            s = c.toString().split(`
\r`)[0].split("REG_SZ"), e.os = s.length > 1 ? s[1].replace(/\r+|\n+|\s+/gi, "").toLowerCase() : "", t && t(e), n(e);
          });
        });
      }
    });
  });
}
Ft.uuid = Dr;
const bs = Ne, Vt = je, L = D, { uuid: wp } = Ft, tn = ee.exec, bt = ee.execSync, Gn = L.promisify(ee.exec), ot = process.platform, gs = ot === "linux" || ot === "android", hs = ot === "darwin", xs = ot === "win32", Qt = ot === "freebsd", Zt = ot === "openbsd", en = ot === "netbsd", ys = ot === "sunos";
function ic(t) {
  return new Promise((n) => {
    process.nextTick(() => {
      let e = {
        manufacturer: "",
        model: "Computer",
        version: "",
        serial: "-",
        uuid: "-",
        sku: "-",
        virtual: !1
      };
      if ((gs || Qt || Zt || en) && tn("export LC_ALL=C; dmidecode -t system 2>/dev/null; unset LC_ALL", (s, r) => {
        let i = r.toString().split(`
`);
        e.manufacturer = K(L.getValue(i, "manufacturer")), e.model = K(L.getValue(i, "product name")), e.version = K(L.getValue(i, "version")), e.serial = K(L.getValue(i, "serial number")), e.uuid = K(L.getValue(i, "uuid")).toLowerCase(), e.sku = K(L.getValue(i, "sku number"));
        const o = `echo -n "product_name: "; cat /sys/devices/virtual/dmi/id/product_name 2>/dev/null; echo;
            echo -n "product_serial: "; cat /sys/devices/virtual/dmi/id/product_serial 2>/dev/null; echo;
            echo -n "product_uuid: "; cat /sys/devices/virtual/dmi/id/product_uuid 2>/dev/null; echo;
            echo -n "product_version: "; cat /sys/devices/virtual/dmi/id/product_version 2>/dev/null; echo;
            echo -n "sys_vendor: "; cat /sys/devices/virtual/dmi/id/sys_vendor 2>/dev/null; echo;`;
        try {
          i = bt(o, L.execOptsLinux).toString().split(`
`), e.manufacturer = K(e.manufacturer === "" ? L.getValue(i, "sys_vendor") : e.manufacturer), e.model = K(e.model === "" ? L.getValue(i, "product_name") : e.model), e.version = K(e.version === "" ? L.getValue(i, "product_version") : e.version), e.serial = K(e.serial === "" ? L.getValue(i, "product_serial") : e.serial), e.uuid = K(e.uuid === "" ? L.getValue(i, "product_uuid").toLowerCase() : e.uuid);
        } catch {
          L.noop();
        }
        if (e.serial || (e.serial = "-"), e.manufacturer || (e.manufacturer = ""), e.model || (e.model = "Computer"), e.version || (e.version = ""), e.sku || (e.sku = "-"), e.model.toLowerCase() === "virtualbox" || e.model.toLowerCase() === "kvm" || e.model.toLowerCase() === "virtual machine" || e.model.toLowerCase() === "bochs" || e.model.toLowerCase().startsWith("vmware") || e.model.toLowerCase().startsWith("droplet"))
          switch (e.virtual = !0, e.model.toLowerCase()) {
            case "virtualbox":
              e.virtualHost = "VirtualBox";
              break;
            case "vmware":
              e.virtualHost = "VMware";
              break;
            case "kvm":
              e.virtualHost = "KVM";
              break;
            case "bochs":
              e.virtualHost = "bochs";
              break;
          }
        if (e.manufacturer.toLowerCase().startsWith("vmware") || e.manufacturer.toLowerCase() === "xen")
          switch (e.virtual = !0, e.manufacturer.toLowerCase()) {
            case "vmware":
              e.virtualHost = "VMware";
              break;
            case "xen":
              e.virtualHost = "Xen";
              break;
          }
        if (!e.virtual)
          try {
            const a = bt("ls -1 /dev/disk/by-id/ 2>/dev/null; pciconf -lv  2>/dev/null", L.execOptsLinux).toString();
            (a.indexOf("_QEMU_") >= 0 || a.indexOf("QEMU ") >= 0) && (e.virtual = !0, e.virtualHost = "QEMU"), a.indexOf("_VBOX_") >= 0 && (e.virtual = !0, e.virtualHost = "VirtualBox");
          } catch {
            L.noop();
          }
        if (Qt || Zt || en)
          try {
            const a = bt("sysctl -i kern.hostuuid kern.hostid hw.model", L.execOptsLinux).toString().split(`
`);
            e.uuid || (e.uuid = L.getValue(a, "kern.hostuuid", ":").toLowerCase()), (!e.serial || e.serial === "-") && (e.serial = L.getValue(a, "kern.hostid", ":").toLowerCase()), (!e.model || e.model === "Computer") && (e.model = L.getValue(a, "hw.model", ":").trim());
          } catch {
            L.noop();
          }
        if (!e.virtual && (Vt.release().toLowerCase().indexOf("microsoft") >= 0 || Vt.release().toLowerCase().endsWith("wsl2"))) {
          const a = parseFloat(Vt.release().toLowerCase());
          e.virtual = !0, e.manufacturer = "Microsoft", e.model = "WSL", e.version = a < 4.19 ? "1" : "2";
        }
        if ((Qt || Zt || en) && !e.virtualHost)
          try {
            const c = bt("dmidecode -t 4", L.execOptsLinux).toString().split(`
`);
            switch (L.getValue(c, "manufacturer", ":", !0).toLowerCase()) {
              case "virtualbox":
                e.virtualHost = "VirtualBox";
                break;
              case "vmware":
                e.virtualHost = "VMware";
                break;
              case "kvm":
                e.virtualHost = "KVM";
                break;
              case "bochs":
                e.virtualHost = "bochs";
                break;
            }
          } catch {
            L.noop();
          }
        (bs.existsSync("/.dockerenv") || bs.existsSync("/.dockerinit")) && (e.model = "Docker Container");
        try {
          const a = bt('dmesg 2>/dev/null | grep -iE "virtual|hypervisor" | grep -iE "vmware|qemu|kvm|xen" | grep -viE "Nested Virtualization|/virtual/"');
          a.toString().split(`
`).length > 0 && (e.model === "Computer" && (e.model = "Virtual machine"), e.virtual = !0, a.toString().toLowerCase().indexOf("vmware") >= 0 && !e.virtualHost && (e.virtualHost = "VMware"), a.toString().toLowerCase().indexOf("qemu") >= 0 && !e.virtualHost && (e.virtualHost = "QEMU"), a.toString().toLowerCase().indexOf("xen") >= 0 && !e.virtualHost && (e.virtualHost = "Xen"), a.toString().toLowerCase().indexOf("kvm") >= 0 && !e.virtualHost && (e.virtualHost = "KVM"));
        } catch {
          L.noop();
        }
        e.manufacturer === "" && e.model === "Computer" && e.version === "" ? bs.readFile("/proc/cpuinfo", (a, c) => {
          if (!a) {
            let l = c.toString().split(`
`);
            if (e.model = L.getValue(l, "hardware", ":", !0).toUpperCase(), e.version = L.getValue(l, "revision", ":", !0).toLowerCase(), e.serial = L.getValue(l, "serial", ":", !0), L.getValue(l, "model:", ":", !0), L.isRaspberry(l)) {
              const u = L.decodePiCpuinfo(l);
              e.model = u.model, e.version = u.revisionCode, e.manufacturer = "Raspberry Pi Foundation", e.raspberry = {
                manufacturer: u.manufacturer,
                processor: u.processor,
                type: u.type,
                revision: u.revision
              };
            }
          }
          t && t(e), n(e);
        }) : (t && t(e), n(e));
      }), hs && tn("ioreg -c IOPlatformExpertDevice -d 2", (s, r) => {
        if (!s) {
          const i = r.toString().replace(/[<>"]/g, "").split(`
`), o = L.getAppleModel(L.getValue(i, "model", "=", !0));
          e.manufacturer = L.getValue(i, "manufacturer", "=", !0), e.model = o.key, e.type = br(o.version), e.version = o.version, e.serial = L.getValue(i, "ioplatformserialnumber", "=", !0), e.uuid = L.getValue(i, "ioplatformuuid", "=", !0).toLowerCase(), e.sku = L.getValue(i, "board-id", "=", !0) || L.getValue(i, "target-sub-type", "=", !0);
        }
        t && t(e), n(e);
      }), ys && (t && t(e), n(e)), xs)
        try {
          L.powerShell("Get-CimInstance Win32_ComputerSystemProduct | select Name,Vendor,Version,IdentifyingNumber,UUID | fl").then((s, r) => {
            if (r)
              t && t(e), n(e);
            else {
              const i = s.split(`\r
`);
              e.manufacturer = L.getValue(i, "vendor", ":"), e.model = L.getValue(i, "name", ":"), e.version = L.getValue(i, "version", ":"), e.serial = L.getValue(i, "identifyingnumber", ":"), e.uuid = L.getValue(i, "uuid", ":").toLowerCase();
              const o = e.model.toLowerCase();
              (o === "virtualbox" || o === "kvm" || o === "virtual machine" || o === "bochs" || o.startsWith("vmware") || o.startsWith("qemu") || o.startsWith("parallels")) && (e.virtual = !0, o.startsWith("virtualbox") && (e.virtualHost = "VirtualBox"), o.startsWith("vmware") && (e.virtualHost = "VMware"), o.startsWith("kvm") && (e.virtualHost = "KVM"), o.startsWith("bochs") && (e.virtualHost = "bochs"), o.startsWith("qemu") && (e.virtualHost = "KVM"), o.startsWith("parallels") && (e.virtualHost = "Parallels"));
              const a = e.manufacturer.toLowerCase();
              (a.startsWith("vmware") || a.startsWith("qemu") || a === "xen" || a.startsWith("parallels")) && (e.virtual = !0, a.startsWith("vmware") && (e.virtualHost = "VMware"), a.startsWith("xen") && (e.virtualHost = "Xen"), a.startsWith("qemu") && (e.virtualHost = "KVM"), a.startsWith("parallels") && (e.virtualHost = "Parallels")), L.powerShell('Get-CimInstance MS_Systeminformation -Namespace "root/wmi" | select systemsku | fl ').then((c, l) => {
                if (!l) {
                  const u = c.split(`\r
`);
                  e.sku = L.getValue(u, "systemsku", ":");
                }
                e.virtual ? (t && t(e), n(e)) : L.powerShell("Get-CimInstance Win32_bios | select Version, SerialNumber, SMBIOSBIOSVersion").then((u, d) => {
                  if (d)
                    t && t(e), n(e);
                  else {
                    let p = u.toString();
                    (p.indexOf("VRTUAL") >= 0 || p.indexOf("A M I ") >= 0 || p.indexOf("VirtualBox") >= 0 || p.indexOf("VMWare") >= 0 || p.indexOf("Xen") >= 0 || p.indexOf("Parallels") >= 0) && (e.virtual = !0, p.indexOf("VirtualBox") >= 0 && !e.virtualHost && (e.virtualHost = "VirtualBox"), p.indexOf("VMware") >= 0 && !e.virtualHost && (e.virtualHost = "VMware"), p.indexOf("Xen") >= 0 && !e.virtualHost && (e.virtualHost = "Xen"), p.indexOf("VRTUAL") >= 0 && !e.virtualHost && (e.virtualHost = "Hyper-V"), p.indexOf("A M I") >= 0 && !e.virtualHost && (e.virtualHost = "Virtual PC"), p.indexOf("Parallels") >= 0 && !e.virtualHost && (e.virtualHost = "Parallels")), t && t(e), n(e);
                  }
                });
              });
            }
          });
        } catch {
          t && t(e), n(e);
        }
    });
  });
}
bn.system = ic;
function K(t) {
  const n = t.toLowerCase();
  return n.indexOf("o.e.m.") === -1 && n.indexOf("default string") === -1 && n !== "default" && t || "";
}
function rc(t) {
  return new Promise((n) => {
    process.nextTick(() => {
      let e = {
        vendor: "",
        version: "",
        releaseDate: "",
        revision: ""
      }, s = "";
      if ((gs || Qt || Zt || en) && (process.arch === "arm" ? s = "cat /proc/cpuinfo | grep Serial" : s = "export LC_ALL=C; dmidecode -t bios 2>/dev/null; unset LC_ALL", tn(s, (r, i) => {
        let o = i.toString().split(`
`);
        e.vendor = L.getValue(o, "Vendor"), e.version = L.getValue(o, "Version");
        let a = L.getValue(o, "Release Date");
        e.releaseDate = L.parseDateTime(a).date, e.revision = L.getValue(o, "BIOS Revision"), e.serial = L.getValue(o, "SerialNumber");
        let c = L.getValue(o, "Currently Installed Language").split("|")[0];
        if (c && (e.language = c), o.length && i.toString().indexOf("Characteristics:") >= 0) {
          const u = [];
          o.forEach((d) => {
            if (d.indexOf(" is supported") >= 0) {
              const p = d.split(" is supported")[0].trim();
              u.push(p);
            }
          }), e.features = u;
        }
        const l = `echo -n "bios_date: "; cat /sys/devices/virtual/dmi/id/bios_date 2>/dev/null; echo;
            echo -n "bios_vendor: "; cat /sys/devices/virtual/dmi/id/bios_vendor 2>/dev/null; echo;
            echo -n "bios_version: "; cat /sys/devices/virtual/dmi/id/bios_version 2>/dev/null; echo;`;
        try {
          o = bt(l, L.execOptsLinux).toString().split(`
`), e.vendor = e.vendor ? e.vendor : L.getValue(o, "bios_vendor"), e.version = e.version ? e.version : L.getValue(o, "bios_version"), a = L.getValue(o, "bios_date"), e.releaseDate = e.releaseDate ? e.releaseDate : L.parseDateTime(a).date;
        } catch {
          L.noop();
        }
        t && t(e), n(e);
      })), hs && (e.vendor = "Apple Inc.", tn("system_profiler SPHardwareDataType -json", (r, i) => {
        try {
          const o = JSON.parse(i.toString());
          if (o && o.SPHardwareDataType && o.SPHardwareDataType.length) {
            let a = o.SPHardwareDataType[0].boot_rom_version;
            a = a ? a.split("(")[0].trim() : null, e.version = a;
          }
        } catch {
          L.noop();
        }
        t && t(e), n(e);
      })), ys && (e.vendor = "Sun Microsystems", t && t(e), n(e)), xs)
        try {
          L.powerShell(
            'Get-CimInstance Win32_bios | select Description,Version,Manufacturer,@{n="ReleaseDate";e={$_.ReleaseDate.ToString("yyyy-MM-dd")}},BuildNumber,SerialNumber,SMBIOSBIOSVersion | fl'
          ).then((r, i) => {
            if (!i) {
              let o = r.toString().split(`\r
`);
              const a = L.getValue(o, "description", ":"), c = L.getValue(o, "SMBIOSBIOSVersion", ":");
              a.indexOf(" Version ") !== -1 ? (e.vendor = a.split(" Version ")[0].trim(), e.version = a.split(" Version ")[1].trim()) : a.indexOf(" Ver: ") !== -1 ? (e.vendor = L.getValue(o, "manufacturer", ":"), e.version = a.split(" Ver: ")[1].trim()) : (e.vendor = L.getValue(o, "manufacturer", ":"), e.version = c || L.getValue(o, "version", ":")), e.releaseDate = L.getValue(o, "releasedate", ":"), e.revision = L.getValue(o, "buildnumber", ":"), e.serial = K(L.getValue(o, "serialnumber", ":"));
            }
            t && t(e), n(e);
          });
        } catch {
          t && t(e), n(e);
        }
    });
  });
}
bn.bios = rc;
function oc(t) {
  return new Promise((n) => {
    process.nextTick(() => {
      const e = {
        manufacturer: "",
        model: "",
        version: "",
        serial: "-",
        assetTag: "-",
        memMax: null,
        memSlots: null
      };
      let s = "";
      if (gs || Qt || Zt || en) {
        process.arch === "arm" ? s = "cat /proc/cpuinfo | grep Serial" : s = "export LC_ALL=C; dmidecode -t 2 2>/dev/null; unset LC_ALL";
        const r = [];
        r.push(Gn(s)), r.push(Gn("export LC_ALL=C; dmidecode -t memory 2>/dev/null")), L.promiseAll(r).then((i) => {
          let o = i.results[0] ? i.results[0].toString().split(`
`) : [""];
          e.manufacturer = K(L.getValue(o, "Manufacturer")), e.model = K(L.getValue(o, "Product Name")), e.version = K(L.getValue(o, "Version")), e.serial = K(L.getValue(o, "Serial Number")), e.assetTag = K(L.getValue(o, "Asset Tag"));
          const a = `echo -n "board_asset_tag: "; cat /sys/devices/virtual/dmi/id/board_asset_tag 2>/dev/null; echo;
            echo -n "board_name: "; cat /sys/devices/virtual/dmi/id/board_name 2>/dev/null; echo;
            echo -n "board_serial: "; cat /sys/devices/virtual/dmi/id/board_serial 2>/dev/null; echo;
            echo -n "board_vendor: "; cat /sys/devices/virtual/dmi/id/board_vendor 2>/dev/null; echo;
            echo -n "board_version: "; cat /sys/devices/virtual/dmi/id/board_version 2>/dev/null; echo;`;
          try {
            o = bt(a, L.execOptsLinux).toString().split(`
`), e.manufacturer = K(e.manufacturer ? e.manufacturer : L.getValue(o, "board_vendor")), e.model = K(e.model ? e.model : L.getValue(o, "board_name")), e.version = K(e.version ? e.version : L.getValue(o, "board_version")), e.serial = K(e.serial ? e.serial : L.getValue(o, "board_serial")), e.assetTag = K(e.assetTag ? e.assetTag : L.getValue(o, "board_asset_tag"));
          } catch {
            L.noop();
          }
          if (o = i.results[1] ? i.results[1].toString().split(`
`) : [""], e.memMax = L.toInt(L.getValue(o, "Maximum Capacity")) * 1024 * 1024 * 1024 || null, e.memSlots = L.toInt(L.getValue(o, "Number Of Devices")) || null, L.isRaspberry()) {
            const c = L.decodePiCpuinfo();
            e.manufacturer = c.manufacturer, e.model = "Raspberry Pi", e.serial = c.serial, e.version = c.type + " - " + c.revision, e.memMax = Vt.totalmem(), e.memSlots = 0;
          }
          t && t(e), n(e);
        });
      }
      if (hs) {
        const r = [];
        r.push(Gn("ioreg -c IOPlatformExpertDevice -d 2")), r.push(Gn("system_profiler SPMemoryDataType")), L.promiseAll(r).then((i) => {
          const o = i.results[0] ? i.results[0].toString().replace(/[<>"]/g, "").split(`
`) : [""];
          e.manufacturer = L.getValue(o, "manufacturer", "=", !0), e.model = L.getValue(o, "model", "=", !0), e.version = L.getValue(o, "version", "=", !0), e.serial = L.getValue(o, "ioplatformserialnumber", "=", !0), e.assetTag = L.getValue(o, "board-id", "=", !0);
          let a = i.results[1] ? i.results[1].toString().split("        BANK ") : [""];
          a.length === 1 && (a = i.results[1] ? i.results[1].toString().split("        DIMM") : [""]), a.shift(), e.memSlots = a.length, Vt.arch() === "arm64" && (e.memSlots = 0, e.memMax = Vt.totalmem()), t && t(e), n(e);
        });
      }
      if (ys && (t && t(e), n(e)), xs)
        try {
          const r = [], i = parseInt(Vt.release()) >= 10, o = i ? "MaxCapacityEx" : "MaxCapacity";
          r.push(L.powerShell("Get-CimInstance Win32_baseboard | select Model,Manufacturer,Product,Version,SerialNumber,PartNumber,SKU | fl")), r.push(L.powerShell(`Get-CimInstance Win32_physicalmemoryarray | select ${o}, MemoryDevices | fl`)), L.promiseAll(r).then((a) => {
            let c = a.results[0] ? a.results[0].toString().split(`\r
`) : [""];
            e.manufacturer = K(L.getValue(c, "manufacturer", ":")), e.model = K(L.getValue(c, "model", ":")), e.model || (e.model = K(L.getValue(c, "product", ":"))), e.version = K(L.getValue(c, "version", ":")), e.serial = K(L.getValue(c, "serialnumber", ":")), e.assetTag = K(L.getValue(c, "partnumber", ":")), e.assetTag || (e.assetTag = K(L.getValue(c, "sku", ":"))), c = a.results[1] ? a.results[1].toString().split(`\r
`) : [""], e.memMax = L.toInt(L.getValue(c, o, ":")) * (i ? 1024 : 1) || null, e.memSlots = L.toInt(L.getValue(c, "MemoryDevices", ":")) || null, t && t(e), n(e);
          });
        } catch {
          t && t(e), n(e);
        }
    });
  });
}
bn.baseboard = oc;
function br(t) {
  return t = t.toLowerCase(), t.indexOf("macbookair") >= 0 || t.indexOf("macbook air") >= 0 || t.indexOf("macbookpro") >= 0 || t.indexOf("macbook pro") >= 0 || t.indexOf("macbook") >= 0 ? "Notebook" : t.indexOf("macmini") >= 0 || t.indexOf("mac mini") >= 0 || t.indexOf("imac") >= 0 || t.indexOf("macstudio") >= 0 || t.indexOf("mac studio") >= 0 ? "Desktop" : t.indexOf("macpro") >= 0 || t.indexOf("mac pro") >= 0 ? "Tower" : "Other";
}
function ac(t) {
  const n = [
    "Other",
    "Unknown",
    "Desktop",
    "Low Profile Desktop",
    "Pizza Box",
    "Mini Tower",
    "Tower",
    "Portable",
    "Laptop",
    "Notebook",
    "Hand Held",
    "Docking Station",
    "All in One",
    "Sub Notebook",
    "Space-Saving",
    "Lunch Box",
    "Main System Chassis",
    "Expansion Chassis",
    "SubChassis",
    "Bus Expansion Chassis",
    "Peripheral Chassis",
    "Storage Chassis",
    "Rack Mount Chassis",
    "Sealed-Case PC",
    "Multi-System Chassis",
    "Compact PCI",
    "Advanced TCA",
    "Blade",
    "Blade Enclosure",
    "Tablet",
    "Convertible",
    "Detachable",
    "IoT Gateway ",
    "Embedded PC",
    "Mini PC",
    "Stick PC"
  ];
  return new Promise((e) => {
    process.nextTick(() => {
      let s = {
        manufacturer: "",
        model: "",
        type: "",
        version: "",
        serial: "-",
        assetTag: "-",
        sku: ""
      };
      if ((gs || Qt || Zt || en) && tn(`echo -n "chassis_asset_tag: "; cat /sys/devices/virtual/dmi/id/chassis_asset_tag 2>/dev/null; echo;
            echo -n "chassis_serial: "; cat /sys/devices/virtual/dmi/id/chassis_serial 2>/dev/null; echo;
            echo -n "chassis_type: "; cat /sys/devices/virtual/dmi/id/chassis_type 2>/dev/null; echo;
            echo -n "chassis_vendor: "; cat /sys/devices/virtual/dmi/id/chassis_vendor 2>/dev/null; echo;
            echo -n "chassis_version: "; cat /sys/devices/virtual/dmi/id/chassis_version 2>/dev/null; echo;`, (i, o) => {
        let a = o.toString().split(`
`);
        s.manufacturer = K(L.getValue(a, "chassis_vendor"));
        const c = parseInt(L.getValue(a, "chassis_type").replace(/\D/g, ""));
        s.type = K(c && !isNaN(c) && c < n.length ? n[c - 1] : ""), s.version = K(L.getValue(a, "chassis_version")), s.serial = K(L.getValue(a, "chassis_serial")), s.assetTag = K(L.getValue(a, "chassis_asset_tag")), t && t(s), e(s);
      }), hs && tn("ioreg -c IOPlatformExpertDevice -d 2", (r, i) => {
        if (!r) {
          const o = i.toString().replace(/[<>"]/g, "").split(`
`), a = L.getAppleModel(L.getValue(o, "model", "=", !0));
          s.manufacturer = L.getValue(o, "manufacturer", "=", !0), s.model = a.key, s.type = br(a.model), s.version = a.version, s.serial = L.getValue(o, "ioplatformserialnumber", "=", !0), s.assetTag = L.getValue(o, "board-id", "=", !0) || L.getValue(o, "target-type", "=", !0), s.sku = L.getValue(o, "target-sub-type", "=", !0);
        }
        t && t(s), e(s);
      }), ys && (t && t(s), e(s)), xs)
        try {
          L.powerShell("Get-CimInstance Win32_SystemEnclosure | select Model,Manufacturer,ChassisTypes,Version,SerialNumber,PartNumber,SKU,SMBIOSAssetTag | fl").then((r, i) => {
            if (!i) {
              let o = r.toString().split(`\r
`);
              s.manufacturer = K(L.getValue(o, "manufacturer", ":")), s.model = K(L.getValue(o, "model", ":"));
              const a = parseInt(L.getValue(o, "ChassisTypes", ":").replace(/\D/g, ""));
              s.type = a && !isNaN(a) && a < n.length ? n[a - 1] : "", s.version = K(L.getValue(o, "version", ":")), s.serial = K(L.getValue(o, "serialnumber", ":")), s.assetTag = K(L.getValue(o, "partnumber", ":")), s.assetTag || (s.assetTag = K(L.getValue(o, "SMBIOSAssetTag", ":"))), s.sku = K(L.getValue(o, "sku", ":"));
            }
            t && t(s), e(s);
          });
        } catch {
          t && t(s), e(s);
        }
    });
  });
}
bn.chassis = ac;
var _t = {};
const Re = je, Se = ee.exec, Ss = ee.execSync, ns = Ne, P = D, at = process.platform, sn = at === "linux" || at === "android", Cs = at === "darwin", ws = at === "win32", Ls = at === "freebsd", Is = at === "openbsd", _s = at === "netbsd", Os = at === "sunos";
let Jt = 0, Y = {
  user: 0,
  nice: 0,
  system: 0,
  idle: 0,
  irq: 0,
  steal: 0,
  guest: 0,
  load: 0,
  tick: 0,
  ms: 0,
  currentLoad: 0,
  currentLoadUser: 0,
  currentLoadSystem: 0,
  currentLoadNice: 0,
  currentLoadIdle: 0,
  currentLoadIrq: 0,
  currentLoadSteal: 0,
  currentLoadGuest: 0,
  rawCurrentLoad: 0,
  rawCurrentLoadUser: 0,
  rawCurrentLoadSystem: 0,
  rawCurrentLoadNice: 0,
  rawCurrentLoadIdle: 0,
  rawCurrentLoadIrq: 0,
  rawCurrentLoadSteal: 0,
  rawCurrentLoadGuest: 0
}, I = [], Vs = 0;
const Ns = {
  8346: "1.8",
  8347: "1.9",
  8350: "2.0",
  8354: "2.2",
  "8356|SE": "2.4",
  8356: "2.3",
  8360: "2.5",
  2372: "2.1",
  2373: "2.1",
  2374: "2.2",
  2376: "2.3",
  2377: "2.3",
  2378: "2.4",
  2379: "2.4",
  2380: "2.5",
  2381: "2.5",
  2382: "2.6",
  2384: "2.7",
  2386: "2.8",
  2387: "2.8",
  2389: "2.9",
  2393: "3.1",
  8374: "2.2",
  8376: "2.3",
  8378: "2.4",
  8379: "2.4",
  8380: "2.5",
  8381: "2.5",
  8382: "2.6",
  8384: "2.7",
  8386: "2.8",
  8387: "2.8",
  8389: "2.9",
  8393: "3.1",
  "2419EE": "1.8",
  "2423HE": "2.0",
  "2425HE": "2.1",
  2427: "2.2",
  2431: "2.4",
  2435: "2.6",
  "2439SE": "2.8",
  "8425HE": "2.1",
  8431: "2.4",
  8435: "2.6",
  "8439SE": "2.8",
  4122: "2.2",
  4130: "2.6",
  "4162EE": "1.7",
  "4164EE": "1.8",
  "4170HE": "2.1",
  "4174HE": "2.3",
  "4176HE": "2.4",
  4180: "2.6",
  4184: "2.8",
  "6124HE": "1.8",
  "6128HE": "2.0",
  "6132HE": "2.2",
  6128: "2.0",
  6134: "2.3",
  6136: "2.4",
  6140: "2.6",
  "6164HE": "1.7",
  "6166HE": "1.8",
  6168: "1.9",
  6172: "2.1",
  6174: "2.2",
  6176: "2.3",
  "6176SE": "2.3",
  "6180SE": "2.5",
  3250: "2.5",
  3260: "2.7",
  3280: "2.4",
  4226: "2.7",
  4228: "2.8",
  4230: "2.9",
  4234: "3.1",
  4238: "3.3",
  4240: "3.4",
  4256: "1.6",
  4274: "2.5",
  4276: "2.6",
  4280: "2.8",
  4284: "3.0",
  6204: "3.3",
  6212: "2.6",
  6220: "3.0",
  6234: "2.4",
  6238: "2.6",
  "6262HE": "1.6",
  6272: "2.1",
  6274: "2.2",
  6276: "2.3",
  6278: "2.4",
  "6282SE": "2.6",
  "6284SE": "2.7",
  6308: "3.5",
  6320: "2.8",
  6328: "3.2",
  "6338P": "2.3",
  6344: "2.6",
  6348: "2.8",
  6366: "1.8",
  "6370P": "2.0",
  6376: "2.3",
  6378: "2.4",
  6380: "2.5",
  6386: "2.8",
  "FX|4100": "3.6",
  "FX|4120": "3.9",
  "FX|4130": "3.8",
  "FX|4150": "3.8",
  "FX|4170": "4.2",
  "FX|6100": "3.3",
  "FX|6120": "3.6",
  "FX|6130": "3.6",
  "FX|6200": "3.8",
  "FX|8100": "2.8",
  "FX|8120": "3.1",
  "FX|8140": "3.2",
  "FX|8150": "3.6",
  "FX|8170": "3.9",
  "FX|4300": "3.8",
  "FX|4320": "4.0",
  "FX|4350": "4.2",
  "FX|6300": "3.5",
  "FX|6350": "3.9",
  "FX|8300": "3.3",
  "FX|8310": "3.4",
  "FX|8320": "3.5",
  "FX|8350": "4.0",
  "FX|8370": "4.0",
  "FX|9370": "4.4",
  "FX|9590": "4.7",
  "FX|8320E": "3.2",
  "FX|8370E": "3.3",
  // ZEN Desktop CPUs
  1200: "3.1",
  "Pro 1200": "3.1",
  "1300X": "3.5",
  "Pro 1300": "3.5",
  1400: "3.2",
  "1500X": "3.5",
  "Pro 1500": "3.5",
  1600: "3.2",
  "1600X": "3.6",
  "Pro 1600": "3.2",
  1700: "3.0",
  "Pro 1700": "3.0",
  "1700X": "3.4",
  "Pro 1700X": "3.4",
  "1800X": "3.6",
  "1900X": "3.8",
  1920: "3.2",
  "1920X": "3.5",
  "1950X": "3.4",
  // ZEN Desktop APUs
  "200GE": "3.2",
  "Pro 200GE": "3.2",
  "220GE": "3.4",
  "240GE": "3.5",
  "3000G": "3.5",
  "300GE": "3.4",
  "3050GE": "3.4",
  "2200G": "3.5",
  "Pro 2200G": "3.5",
  "2200GE": "3.2",
  "Pro 2200GE": "3.2",
  "2400G": "3.6",
  "Pro 2400G": "3.6",
  "2400GE": "3.2",
  "Pro 2400GE": "3.2",
  // ZEN Mobile APUs
  "Pro 200U": "2.3",
  "300U": "2.4",
  "2200U": "2.5",
  "3200U": "2.6",
  "2300U": "2.0",
  "Pro 2300U": "2.0",
  "2500U": "2.0",
  "Pro 2500U": "2.2",
  "2600H": "3.2",
  "2700U": "2.0",
  "Pro 2700U": "2.2",
  "2800H": "3.3",
  // ZEN Server Processors
  7351: "2.4",
  "7351P": "2.4",
  7401: "2.0",
  "7401P": "2.0",
  "7551P": "2.0",
  7551: "2.0",
  7251: "2.1",
  7261: "2.5",
  7281: "2.1",
  7301: "2.2",
  7371: "3.1",
  7451: "2.3",
  7501: "2.0",
  7571: "2.2",
  7601: "2.2",
  // ZEN Embedded Processors
  V1500B: "2.2",
  V1780B: "3.35",
  V1202B: "2.3",
  V1404I: "2.0",
  V1605B: "2.0",
  V1756B: "3.25",
  V1807B: "3.35",
  3101: "2.1",
  3151: "2.7",
  3201: "1.5",
  3251: "2.5",
  3255: "2.5",
  3301: "2.0",
  3351: "1.9",
  3401: "1.85",
  3451: "2.15",
  // ZEN+ Desktop
  "1200|AF": "3.1",
  "2300X": "3.5",
  "2500X": "3.6",
  2600: "3.4",
  "2600E": "3.1",
  "1600|AF": "3.2",
  "2600X": "3.6",
  2700: "3.2",
  "2700E": "2.8",
  "Pro 2700": "3.2",
  "2700X": "3.7",
  "Pro 2700X": "3.6",
  "2920X": "3.5",
  "2950X": "3.5",
  "2970WX": "3.0",
  "2990WX": "3.0",
  // ZEN+ Desktop APU
  "Pro 300GE": "3.4",
  "Pro 3125GE": "3.4",
  "3150G": "3.5",
  "Pro 3150G": "3.5",
  "3150GE": "3.3",
  "Pro 3150GE": "3.3",
  "3200G": "3.6",
  "Pro 3200G": "3.6",
  "3200GE": "3.3",
  "Pro 3200GE": "3.3",
  "3350G": "3.6",
  "Pro 3350G": "3.6",
  "3350GE": "3.3",
  "Pro 3350GE": "3.3",
  "3400G": "3.7",
  "Pro 3400G": "3.7",
  "3400GE": "3.3",
  "Pro 3400GE": "3.3",
  // ZEN+ Mobile
  "3300U": "2.1",
  "PRO 3300U": "2.1",
  "3450U": "2.1",
  "3500U": "2.1",
  "PRO 3500U": "2.1",
  "3500C": "2.1",
  "3550H": "2.1",
  "3580U": "2.1",
  "3700U": "2.3",
  "PRO 3700U": "2.3",
  "3700C": "2.3",
  "3750H": "2.3",
  "3780U": "2.3",
  // ZEN2 Desktop CPUS
  3100: "3.6",
  "3300X": "3.8",
  3500: "3.6",
  "3500X": "3.6",
  3600: "3.6",
  "Pro 3600": "3.6",
  "3600X": "3.8",
  "3600XT": "3.8",
  "Pro 3700": "3.6",
  "3700X": "3.6",
  "3800X": "3.9",
  "3800XT": "3.9",
  3900: "3.1",
  "Pro 3900": "3.1",
  "3900X": "3.8",
  "3900XT": "3.8",
  "3950X": "3.5",
  "3960X": "3.8",
  "3970X": "3.7",
  "3990X": "2.9",
  "3945WX": "4.0",
  "3955WX": "3.9",
  "3975WX": "3.5",
  "3995WX": "2.7",
  // ZEN2 Desktop APUs
  "4300GE": "3.5",
  "Pro 4300GE": "3.5",
  "4300G": "3.8",
  "Pro 4300G": "3.8",
  "4600GE": "3.3",
  "Pro 4650GE": "3.3",
  "4600G": "3.7",
  "Pro 4650G": "3.7",
  "4700GE": "3.1",
  "Pro 4750GE": "3.1",
  "4700G": "3.6",
  "Pro 4750G": "3.6",
  "4300U": "2.7",
  "4450U": "2.5",
  "Pro 4450U": "2.5",
  "4500U": "2.3",
  "4600U": "2.1",
  "PRO 4650U": "2.1",
  "4680U": "2.1",
  "4600HS": "3.0",
  "4600H": "3.0",
  "4700U": "2.0",
  "PRO 4750U": "1.7",
  "4800U": "1.8",
  "4800HS": "2.9",
  "4800H": "2.9",
  "4900HS": "3.0",
  "4900H": "3.3",
  "5300U": "2.6",
  "5500U": "2.1",
  "5700U": "1.8",
  // ZEN2 - EPYC
  "7232P": "3.1",
  "7302P": "3.0",
  "7402P": "2.8",
  "7502P": "2.5",
  "7702P": "2.0",
  7252: "3.1",
  7262: "3.2",
  7272: "2.9",
  7282: "2.8",
  7302: "3.0",
  7352: "2.3",
  7402: "2.8",
  7452: "2.35",
  7502: "2.5",
  7532: "2.4",
  7542: "2.9",
  7552: "2.2",
  7642: "2.3",
  7662: "2.0",
  7702: "2.0",
  7742: "2.25",
  "7H12": "2.6",
  "7F32": "3.7",
  "7F52": "3.5",
  "7F72": "3.2",
  // Epyc (Milan)
  "7773X": "2.2",
  7763: "2.45",
  7713: "2.0",
  "7713P": "2.0",
  7663: "2.0",
  7643: "2.3",
  "7573X": "2.8",
  "75F3": "2.95",
  7543: "2.8",
  "7543P": "2.8",
  7513: "2.6",
  "7473X": "2.8",
  7453: "2.75",
  "74F3": "3.2",
  7443: "2.85",
  "7443P": "2.85",
  7413: "2.65",
  "7373X": "3.05",
  "73F3": "3.5",
  7343: "3.2",
  7313: "3.0",
  "7313P": "3.0",
  "72F3": "3.7",
  // ZEN3
  "5600X": "3.7",
  "5800X": "3.8",
  "5900X": "3.7",
  "5950X": "3.4",
  "5945WX": "4.1",
  "5955WX": "4.0",
  "5965WX": "3.8",
  "5975WX": "3.6",
  "5995WX": "2.7",
  "7960X": "4.2",
  "7970X": "4.0",
  "7980X": "3.2",
  "7965WX": "4.2",
  "7975WX": "4.0",
  "7985WX": "3.2",
  "7995WX": "2.5",
  // ZEN4
  9754: "2.25",
  "9754S": "2.25",
  9734: "2.2",
  "9684X": "2.55",
  "9384X": "3.1",
  "9184X": "3.55",
  "9654P": "2.4",
  9654: "2.4",
  9634: "2.25",
  "9554P": "3.1",
  9554: "3.1",
  9534: "2.45",
  "9474F": "3.6",
  "9454P": "2.75",
  9454: "2.75",
  "9374F": "3.85",
  "9354P": "3.25",
  9354: "3.25",
  9334: "2.7",
  "9274F": "4.05",
  9254: "2.9",
  9224: "2.5",
  "9174F": "4.1",
  9124: "3.0",
  // Epyc 4th gen
  "4124P": "3.8",
  "4244P": "3.8",
  "4344P": "3.8",
  "4364P": "4.5",
  "4464P": "3.7",
  "4484PX": "4.4",
  "4564P": "4.5",
  "4584PX": "4.2",
  "8024P": "2.4",
  "8024PN": "2.05",
  "8124P": "2.45",
  "8124PN": "2.0",
  "8224P": "2.55",
  "8224PN": "2.0",
  "8324P": "2.65",
  "8324PN": "2.05",
  "8434P": "2.5",
  "8434PN": "2.0",
  "8534P": "2.3",
  "8534PN": "2.0",
  // Epyc 5th gen
  9115: "2.6",
  9135: "3.65",
  "9175F": "4.2",
  9255: "3.25",
  "9275F": "4.1",
  9335: "3.0",
  "9355P": "3.55",
  9355: "3.55",
  "9375F": "3.8",
  9365: "3.4",
  "9455P": "3.15",
  9455: "3.15",
  "9475F": "3.65",
  9535: "2.4",
  "9555P": "3.2",
  9555: "3.2",
  "9575F": "3.3",
  9565: "3.15",
  "9655P": "2.5",
  9655: "2.5",
  9755: "2.7",
  "4245P": "3.9",
  "4345P": "3.8",
  "4465P": "3.4",
  "4545P": "3.0",
  "4565P": "4.3",
  "4585PX": "4.3",
  "5900XT": "3.3",
  5900: "3.0",
  5945: "3.0",
  "5800X3D": "3.4",
  "5800XT": "3.8",
  5800: "3.4",
  "5700X3D": "3.0",
  "5700X": "3.4",
  5845: "3.4",
  "5600X3D": "3.3",
  "5600XT": "3.7",
  "5600T": "3.5",
  5600: "3.5",
  "5600F": "3.0",
  5645: "3.7",
  "5500X3D": "3.0",
  "5980HX": "3.3",
  "5980HS": "3.0",
  "5900HX": "3.3",
  "5900HS": "3.0",
  "5800H": "3.2",
  "5800HS": "2.8",
  "5800U": "1.9",
  "5600H": "3.3",
  "5600HS": "3.0",
  "5600U": "2.3",
  "5560U": "2.3",
  "5400U": "2.7",
  "5825U": "2.0",
  "5625U": "2.3",
  "5425U": "2.7",
  "5125C": "3.0",
  "7730U": "2.0",
  "7530U": "2.0",
  "7430U": "2.3",
  "7330U": "2.3",
  7203: "2.8",
  7303: "2.4",
  "7663P": "2.0",
  "6980HX": "3.3",
  "6980HS": "3.3",
  "6900HX": "3.3",
  "6900HS": "3.3",
  "6800H": "3.2",
  "6800HS": "3.2",
  "6800U": "2.7",
  "6600H": "3.3",
  "6600HS": "3.3",
  "6600U": "2.9",
  "7735HS": "3.2",
  "7735H": "3.2",
  "7736U": "2.7",
  "7735U": "2.7",
  "7435HS": "3.1",
  "7435H": "3.1",
  "7535HS": "3.3",
  "7535H": "3.3",
  "7535U": "2.9",
  "7235HS": "3.2",
  "7235H": "3.2",
  "7335U": "3.0",
  270: "4.0",
  260: "3.8",
  250: "3.3",
  240: "4.3",
  230: "3.5",
  220: "3.0",
  210: "2.8",
  "8945HS": "4.0",
  "8845HS": "3.8",
  "8840HS": "3.3",
  "8840U": "3.3",
  "8645HS": "4.3",
  "8640HS": "3.5",
  "8640U": "3.5",
  "8540U": "3.0",
  "8440U": "2.8",
  "9950X3D": "4.3",
  "9950X": "4.3",
  "9900X3D": "4.4",
  "9900X": "4.4",
  "9800X3D": "4.7",
  "9700X": "3.8",
  "9700F": "3.8",
  "9600X": "3.9",
  9600: "3.8",
  "9500F": "3.8",
  "9995WX": "2.5",
  "9985WX": "3.2",
  "9975WX": "4.0",
  "9965WX": "4.2",
  "9955WX": "4.5",
  "9945WX": "4.7",
  "9980X": "3.2",
  "9970X": "4.0",
  "9960X": "4.2",
  "PRO HX375": "2.0",
  HX375: "2.0",
  "PRO HX370": "2.0",
  HX370: "2.0",
  365: "2.0",
  "PRO 360": "2.0",
  350: "2.0",
  "PRO 350": "2.0",
  340: "2.0",
  "PRO 340": "2.0",
  330: "2.0",
  395: "3.0",
  "PRO 395": "3.0",
  390: "3.2",
  "PRO 390": "3.2",
  385: "3.6",
  "PRO 385": "3.6",
  "PRO 380": "3.6",
  "9955HX3D": "2.3",
  "9955HX": "2.5",
  "9850HX": "3.0",
  9015: "3.6",
  9965: "2.25",
  9845: "2.1",
  9825: "2.2",
  9745: "2.4",
  9645: "2.3"
}, Ni = {
  1: "Other",
  2: "Unknown",
  3: "Daughter Board",
  4: "ZIF Socket",
  5: "Replacement/Piggy Back",
  6: "None",
  7: "LIF Socket",
  8: "Slot 1",
  9: "Slot 2",
  10: "370 Pin Socket",
  11: "Slot A",
  12: "Slot M",
  13: "423",
  14: "A (Socket 462)",
  15: "478",
  16: "754",
  17: "940",
  18: "939",
  19: "mPGA604",
  20: "LGA771",
  21: "LGA775",
  22: "S1",
  23: "AM2",
  24: "F (1207)",
  25: "LGA1366",
  26: "G34",
  27: "AM3",
  28: "C32",
  29: "LGA1156",
  30: "LGA1567",
  31: "PGA988A",
  32: "BGA1288",
  33: "rPGA988B",
  34: "BGA1023",
  35: "BGA1224",
  36: "LGA1155",
  37: "LGA1356",
  38: "LGA2011",
  39: "FS1",
  40: "FS2",
  41: "FM1",
  42: "FM2",
  43: "LGA2011-3",
  44: "LGA1356-3",
  45: "LGA1150",
  46: "BGA1168",
  47: "BGA1234",
  48: "BGA1364",
  49: "AM4",
  50: "LGA1151",
  51: "BGA1356",
  52: "BGA1440",
  53: "BGA1515",
  54: "LGA3647-1",
  55: "SP3",
  56: "SP3r2",
  57: "LGA2066",
  58: "BGA1392",
  59: "BGA1510",
  60: "BGA1528",
  61: "LGA4189",
  62: "LGA1200",
  63: "LGA4677",
  64: "LGA1700",
  65: "BGA1744",
  66: "BGA1781",
  67: "BGA1211",
  68: "BGA2422",
  69: "LGA1211",
  70: "LGA2422",
  71: "LGA5773",
  72: "BGA5773",
  73: "AM5",
  74: "SP5",
  75: "SP6",
  76: "BGA883",
  77: "BGA1190",
  78: "BGA4129",
  79: "LGA4710",
  80: "LGA7529",
  81: "BGA1964",
  82: "BGA1792",
  83: "BGA2049",
  84: "BGA2551",
  85: "LGA1851",
  86: "BGA2114",
  87: "BGA2833"
}, Bi = {
  LGA1150: "i7-5775C i3-4340 i3-4170 G3250 i3-4160T i3-4160 E3-1231 G3258 G3240 i7-4790S i7-4790K i7-4790 i5-4690K i5-4690 i5-4590T i5-4590S i5-4590 i5-4460 i3-4360 i3-4150 G1820 G3420 G3220 i7-4771 i5-4440 i3-4330 i3-4130T i3-4130 E3-1230 i7-4770S i7-4770K i7-4770 i5-4670K i5-4670 i5-4570T i5-4570S i5-4570 i5-4430",
  LGA1151: "i9-9900KS E-2288G E-2224 G5420 i9-9900T i9-9900 i7-9700T i7-9700F i7-9700E i7-9700 i5-9600 i5-9500T i5-9500F i5-9500 i5-9400T i3-9350K i3-9300 i3-9100T i3-9100F i3-9100 G4930 i9-9900KF i7-9700KF i5-9600KF i5-9400F i5-9400 i3-9350KF i9-9900K i7-9700K i5-9600K G5500 G5400 i7-8700T i7-8086K i5-8600 i5-8500T i5-8500 i5-8400T i3-8300 i3-8100T G4900 i7-8700K i7-8700 i5-8600K i5-8400 i3-8350K i3-8100 E3-1270 G4600 G4560 i7-7700T i7-7700K i7-7700 i5-7600K i5-7600 i5-7500T i5-7500 i5-7400 i3-7350K i3-7300 i3-7100T i3-7100 G3930 G3900 G4400 i7-6700T i7-6700K i7-6700 i5-6600K i5-6600 i5-6500T i5-6500 i5-6400T i5-6400 i3-6300 i3-6100T i3-6100 E3-1270 E3-1270 T4500 T4400",
  1155: "G440 G460 G465 G470 G530T G540T G550T G1610T G1620T G530 G540 G1610 G550 G1620 G555 G1630 i3-2100T i3-2120T i3-3220T i3-3240T i3-3250T i3-2100 i3-2105 i3-2102 i3-3210 i3-3220 i3-2125 i3-2120 i3-3225 i3-2130 i3-3245 i3-3240 i3-3250 i5-3570T i5-2500T i5-2400S i5-2405S i5-2390T i5-3330S i5-2500S i5-3335S i5-2300 i5-3450S i5-3340S i5-3470S i5-3475S i5-3470T i5-2310 i5-3550S i5-2320 i5-3330 i5-3350P i5-3450 i5-2400 i5-3340 i5-3570S i5-2380P i5-2450P i5-3470 i5-2500K i5-3550 i5-2500 i5-3570 i5-3570K i5-2550K i7-3770T i7-2600S i7-3770S i7-2600K i7-2600 i7-3770 i7-3770K i7-2700K G620T G630T G640T G2020T G645T G2100T G2030T G622 G860T G620 G632 G2120T G630 G640 G2010 G840 G2020 G850 G645 G2030 G860 G2120 G870 G2130 G2140 E3-1220L E3-1220L E3-1260L E3-1265L E3-1220 E3-1225 E3-1220 E3-1235 E3-1225 E3-1230 E3-1230 E3-1240 E3-1245 E3-1270 E3-1275 E3-1240 E3-1245 E3-1270 E3-1280 E3-1275 E3-1290 E3-1280 E3-1290"
};
function cc(t) {
  let n = "";
  for (const e in Bi)
    Bi[e].split(" ").forEach((r) => {
      t.indexOf(r) >= 0 && (n = e);
    });
  return n;
}
function qn(t) {
  let n = t;
  return t = t.toLowerCase(), t.indexOf("intel") >= 0 && (n = "Intel"), t.indexOf("amd") >= 0 && (n = "AMD"), t.indexOf("qemu") >= 0 && (n = "QEMU"), t.indexOf("hygon") >= 0 && (n = "Hygon"), t.indexOf("centaur") >= 0 && (n = "WinChip/Via"), t.indexOf("vmware") >= 0 && (n = "VMware"), t.indexOf("Xen") >= 0 && (n = "Xen Hypervisor"), t.indexOf("tcg") >= 0 && (n = "QEMU"), t.indexOf("apple") >= 0 && (n = "Apple"), t.indexOf("sifive") >= 0 && (n = "SiFive"), t.indexOf("thead") >= 0 && (n = "T-Head"), t.indexOf("andestech") >= 0 && (n = "Andes Technology"), n;
}
function Wn(t) {
  t.brand = t.brand.replace(/\(R\)+/g, "®").replace(/\s+/g, " ").trim(), t.brand = t.brand.replace(/\(TM\)+/g, "™").replace(/\s+/g, " ").trim(), t.brand = t.brand.replace(/\(C\)+/g, "©").replace(/\s+/g, " ").trim(), t.brand = t.brand.replace(/CPU+/g, "").replace(/\s+/g, " ").trim(), t.manufacturer = qn(t.brand);
  let n = t.brand.split(" ");
  return n.shift(), t.brand = n.join(" "), t;
}
function Bs(t) {
  let n = "0";
  for (let e in Ns)
    if ({}.hasOwnProperty.call(Ns, e)) {
      let s = e.split("|"), r = 0;
      s.forEach((i) => {
        t.indexOf(i) > -1 && r++;
      }), r === s.length && (n = Ns[e]);
    }
  return parseFloat(n);
}
function lc() {
  return new Promise((t) => {
    process.nextTick(() => {
      const n = "unknown";
      let e = {
        manufacturer: n,
        brand: n,
        vendor: "",
        family: "",
        model: "",
        stepping: "",
        revision: "",
        voltage: "",
        speed: 0,
        speedMin: 0,
        speedMax: 0,
        governor: "",
        cores: P.cores(),
        physicalCores: P.cores(),
        performanceCores: P.cores(),
        efficiencyCores: 0,
        processors: 1,
        socket: "",
        flags: "",
        virtualization: !1,
        cache: {}
      };
      Vr().then((s) => {
        if (e.flags = s, e.virtualization = s.indexOf("vmx") > -1 || s.indexOf("svm") > -1, Cs && Se("sysctl machdep.cpu hw.cpufrequency_max hw.cpufrequency_min hw.packages hw.physicalcpu_max hw.ncpu hw.tbfrequency hw.cpufamily hw.cpusubfamily", (r, i) => {
          const o = i.toString().split(`
`), c = P.getValue(o, "machdep.cpu.brand_string").split("@");
          e.brand = c[0].trim();
          const l = c[1] ? c[1].trim() : "0";
          e.speed = parseFloat(l.replace(/GHz+/g, ""));
          let u = P.getValue(o, "hw.tbfrequency") / 1e9;
          u = u < 0.1 ? u * 100 : u, e.speed = e.speed === 0 ? u : e.speed, Jt = e.speed, e = Wn(e), e.speedMin = P.getValue(o, "hw.cpufrequency_min") ? P.getValue(o, "hw.cpufrequency_min") / 1e9 : e.speed, e.speedMax = P.getValue(o, "hw.cpufrequency_max") ? P.getValue(o, "hw.cpufrequency_max") / 1e9 : e.speed, e.vendor = P.getValue(o, "machdep.cpu.vendor") || "Apple", e.family = P.getValue(o, "machdep.cpu.family") || P.getValue(o, "hw.cpufamily"), e.model = P.getValue(o, "machdep.cpu.model"), e.stepping = P.getValue(o, "machdep.cpu.stepping") || P.getValue(o, "hw.cpusubfamily"), e.virtualization = !0;
          const d = P.getValue(o, "hw.packages"), p = P.getValue(o, "hw.physicalcpu_max"), f = P.getValue(o, "hw.ncpu");
          if (Re.arch() === "arm64") {
            e.socket = "SOC";
            try {
              const m = Ss("ioreg -c IOPlatformDevice -d 3 -r | grep cluster-type").toString().split(`
`), h = m.filter((g) => g.indexOf('"E"') >= 0).length + m.filter((g) => g.indexOf('"M"') >= 0).length, y = m.filter((g) => g.indexOf('"P"') >= 0).length;
              e.efficiencyCores = h, e.performanceCores = y;
            } catch {
              P.noop();
            }
          }
          d && (e.processors = parseInt(d, 10) || 1), p && f && (e.cores = parseInt(f) || P.cores(), e.physicalCores = parseInt(p) || P.cores()), Nr().then((m) => {
            e.cache = m, t(e);
          });
        }), sn) {
          let r = "", i = [];
          Re.cpus()[0] && Re.cpus()[0].model && (r = Re.cpus()[0].model), Se('export LC_ALL=C; lscpu; echo -n "Governor: "; cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor 2>/dev/null; echo; unset LC_ALL', (o, a) => {
            o || (i = a.toString().split(`
`)), r = P.getValue(i, "model name") || r, r = P.getValue(i, "bios model name") || r, r = P.cleanString(r);
            const c = r.split("@");
            if (e.brand = c[0].trim(), e.brand.indexOf("Unknown") >= 0 && (e.brand = e.brand.split("Unknown")[0].trim()), e.speed = c[1] ? parseFloat(c[1].trim()) : 0, e.speed === 0 && (e.brand.indexOf("AMD") > -1 || e.brand.toLowerCase().indexOf("ryzen") > -1) && (e.speed = Bs(e.brand)), e.speed === 0) {
              const h = Zs();
              h.avg !== 0 && (e.speed = h.avg);
            }
            Jt = e.speed, e.speedMin = Math.round(parseFloat(P.getValue(i, "cpu min mhz").replace(/,/g, ".")) / 10) / 100, e.speedMax = Math.round(parseFloat(P.getValue(i, "cpu max mhz").replace(/,/g, ".")) / 10) / 100, e = Wn(e), e.vendor = qn(P.getValue(i, "vendor id")), e.family = P.getValue(i, "cpu family"), e.model = P.getValue(i, "model:"), e.stepping = P.getValue(i, "stepping"), e.revision = P.getValue(i, "cpu revision"), e.cache.l1d = P.getValue(i, "l1d cache"), e.cache.l1d && (e.cache.l1d = parseInt(e.cache.l1d) * (e.cache.l1d.indexOf("M") !== -1 ? 1024 * 1024 : e.cache.l1d.indexOf("K") !== -1 ? 1024 : 1)), e.cache.l1i = P.getValue(i, "l1i cache"), e.cache.l1i && (e.cache.l1i = parseInt(e.cache.l1i) * (e.cache.l1i.indexOf("M") !== -1 ? 1024 * 1024 : e.cache.l1i.indexOf("K") !== -1 ? 1024 : 1)), e.cache.l2 = P.getValue(i, "l2 cache"), e.cache.l2 && (e.cache.l2 = parseInt(e.cache.l2) * (e.cache.l2.indexOf("M") !== -1 ? 1024 * 1024 : e.cache.l2.indexOf("K") !== -1 ? 1024 : 1)), e.cache.l3 = P.getValue(i, "l3 cache"), e.cache.l3 && (e.cache.l3 = parseInt(e.cache.l3) * (e.cache.l3.indexOf("M") !== -1 ? 1024 * 1024 : e.cache.l3.indexOf("K") !== -1 ? 1024 : 1));
            const l = P.getValue(i, "thread(s) per core") || "1", u = P.getValue(i, "socket(s)") || "1", d = parseInt(l, 10), p = parseInt(u, 10) || 1, f = parseInt(P.getValue(i, "core(s) per socket"), 10);
            if (e.physicalCores = f ? f * p : e.cores / d, e.performanceCores = d > 1 ? e.cores - e.physicalCores : e.cores, e.efficiencyCores = d > 1 ? e.cores - d * e.performanceCores : 0, e.processors = p, e.governor = P.getValue(i, "governor") || "", e.vendor === "ARM" && P.isRaspberry()) {
              const h = P.decodePiCpuinfo();
              e.family = e.manufacturer, e.manufacturer = h.manufacturer, e.brand = h.processor, e.revision = h.revisionCode, e.socket = "SOC";
            }
            if (P.getValue(i, "architecture") === "riscv64") {
              const h = ns.readFileSync("/proc/cpuinfo").toString().split(`
`), y = P.getValue(h, "uarch") || "";
              if (y.indexOf(",") > -1) {
                const g = y.split(",");
                e.manufacturer = qn(g[0]), e.brand = g[1];
              }
            }
            let m = [];
            Se('export LC_ALL=C; dmidecode –t 4 2>/dev/null | grep "Upgrade: Socket"; unset LC_ALL', (h, y) => {
              m = y.toString().split(`
`), m && m.length && (e.socket = P.getValue(m, "Upgrade").replace("Socket", "").trim() || e.socket), t(e);
            });
          });
        }
        if (Ls || Is || _s) {
          let r = "", i = [];
          Re.cpus()[0] && Re.cpus()[0].model && (r = Re.cpus()[0].model), Se("export LC_ALL=C; dmidecode -t 4; dmidecode -t 7 unset LC_ALL", (o, a) => {
            let c = [];
            if (!o) {
              const f = a.toString().split("# dmidecode"), m = f.length > 1 ? f[1] : "";
              c = f.length > 2 ? f[2].split("Cache Information") : [], i = m.split(`
`);
            }
            if (e.brand = r.split("@")[0].trim(), e.speed = r.split("@")[1] ? parseFloat(r.split("@")[1].trim()) : 0, e.speed === 0 && (e.brand.indexOf("AMD") > -1 || e.brand.toLowerCase().indexOf("ryzen") > -1) && (e.speed = Bs(e.brand)), e.speed === 0) {
              const f = Zs();
              f.avg !== 0 && (e.speed = f.avg);
            }
            Jt = e.speed, e.speedMin = e.speed, e.speedMax = Math.round(parseFloat(P.getValue(i, "max speed").replace(/Mhz/g, "")) / 10) / 100, e = Wn(e), e.vendor = qn(P.getValue(i, "manufacturer"));
            let l = P.getValue(i, "signature");
            l = l.split(",");
            for (let f = 0; f < l.length; f++)
              l[f] = l[f].trim();
            e.family = P.getValue(l, "Family", " ", !0), e.model = P.getValue(l, "Model", " ", !0), e.stepping = P.getValue(l, "Stepping", " ", !0), e.revision = "";
            const u = parseFloat(P.getValue(i, "voltage"));
            e.voltage = isNaN(u) ? "" : u.toFixed(2);
            for (let f = 0; f < c.length; f++) {
              i = c[f].split(`
`);
              let m = P.getValue(i, "Socket Designation").toLowerCase().replace(" ", "-").split("-");
              m = m.length ? m[0] : "";
              const h = P.getValue(i, "Installed Size").split(" ");
              let y = parseInt(h[0], 10);
              const g = h.length > 1 ? h[1] : "kb";
              y = y * (g === "kb" ? 1024 : g === "mb" ? 1024 * 1024 : g === "gb" ? 1024 * 1024 * 1024 : 1), m && (m === "l1" ? (e.cache[m + "d"] = y / 2, e.cache[m + "i"] = y / 2) : e.cache[m] = y);
            }
            e.socket = P.getValue(i, "Upgrade").replace("Socket", "").trim();
            const d = P.getValue(i, "thread count").trim(), p = P.getValue(i, "core count").trim();
            p && d && (e.cores = parseInt(d, 10), e.physicalCores = parseInt(p, 10)), t(e);
          });
        }
        if (Os && t(e), ws)
          try {
            const r = [];
            r.push(
              P.powerShell(
                "Get-CimInstance Win32_processor | select Name, Revision, L2CacheSize, L3CacheSize, Manufacturer, MaxClockSpeed, Description, UpgradeMethod, Caption, NumberOfLogicalProcessors, NumberOfCores | fl"
              )
            ), r.push(P.powerShell("Get-CimInstance Win32_CacheMemory | select CacheType,InstalledSize,Level | fl")), r.push(P.powerShell("(Get-CimInstance Win32_ComputerSystem).HypervisorPresent")), Promise.all(r).then((i) => {
              let o = i[0].split(`\r
`), a = P.getValue(o, "name", ":") || "";
              a.indexOf("@") >= 0 ? (e.brand = a.split("@")[0].trim(), e.speed = a.split("@")[1] ? parseFloat(a.split("@")[1].trim()) : 0, Jt = e.speed) : (e.brand = a.trim(), e.speed = 0), e = Wn(e), e.revision = P.getValue(o, "revision", ":"), e.vendor = P.getValue(o, "manufacturer", ":"), e.speedMax = Math.round(parseFloat(P.getValue(o, "maxclockspeed", ":").replace(/,/g, ".")) / 10) / 100, e.speed === 0 && (e.brand.indexOf("AMD") > -1 || e.brand.toLowerCase().indexOf("ryzen") > -1) && (e.speed = Bs(e.brand)), e.speed === 0 && (e.speed = e.speedMax), e.speedMin = e.speed;
              let c = P.getValue(o, "description", ":").split(" ");
              for (let h = 0; h < c.length; h++)
                c[h].toLowerCase().startsWith("family") && h + 1 < c.length && c[h + 1] && (e.family = c[h + 1]), c[h].toLowerCase().startsWith("model") && h + 1 < c.length && c[h + 1] && (e.model = c[h + 1]), c[h].toLowerCase().startsWith("stepping") && h + 1 < c.length && c[h + 1] && (e.stepping = c[h + 1]);
              const l = P.getValue(o, "UpgradeMethod", ":");
              Ni[l] && (e.socket = Ni[l]);
              const u = cc(a);
              u && (e.socket = u);
              const d = P.countLines(o, "Caption"), p = P.getValue(o, "NumberOfLogicalProcessors", ":"), f = P.getValue(o, "NumberOfCores", ":");
              d && (e.processors = parseInt(d) || 1), f && p && (e.cores = parseInt(p) || P.cores(), e.physicalCores = parseInt(f) || P.cores()), d > 1 && (e.cores = e.cores * d, e.physicalCores = e.physicalCores * d), e.cache = Br(i[0], i[1]);
              const m = i[2] ? i[2].toString().toLowerCase() : "";
              e.virtualization = m.indexOf("true") !== -1, t(e);
            });
          } catch {
            t(e);
          }
      });
    });
  });
}
function uc(t) {
  return new Promise((n) => {
    process.nextTick(() => {
      lc().then((e) => {
        t && t(e), n(e);
      });
    });
  });
}
_t.cpu = uc;
function Zs() {
  const t = Re.cpus();
  let n = 999999999, e = 0, s = 0;
  const r = [], i = [];
  if (t && t.length && Object.prototype.hasOwnProperty.call(t[0], "speed"))
    for (let o in t)
      i.push(t[o].speed > 100 ? (t[o].speed + 1) / 1e3 : t[o].speed / 10);
  else if (sn)
    try {
      const o = Ss('cat /proc/cpuinfo | grep "cpu MHz" | cut -d " " -f 3', P.execOptsLinux).toString().split(`
`).filter((a) => a.length > 0);
      for (let a in o)
        i.push(Math.floor(parseInt(o[a], 10) / 10) / 100);
    } catch {
      P.noop();
    }
  if (i && i.length)
    try {
      for (const o in i)
        s = s + i[o], i[o] > e && (e = i[o]), i[o] < n && (n = i[o]), r.push(parseFloat(i[o].toFixed(2)));
      return s = s / i.length, {
        min: parseFloat(n.toFixed(2)),
        max: parseFloat(e.toFixed(2)),
        avg: parseFloat(s.toFixed(2)),
        cores: r
      };
    } catch {
      return {
        min: 0,
        max: 0,
        avg: 0,
        cores: r
      };
    }
  else
    return {
      min: 0,
      max: 0,
      avg: 0,
      cores: r
    };
}
function pc(t) {
  return new Promise((n) => {
    process.nextTick(() => {
      let e = Zs();
      if (e.avg === 0 && Jt !== 0) {
        const s = parseFloat(Jt);
        e = {
          min: s,
          max: s,
          avg: s,
          cores: []
        };
      }
      t && t(e), n(e);
    });
  });
}
_t.cpuCurrentSpeed = pc;
function dc(t) {
  return new Promise((n) => {
    process.nextTick(() => {
      let e = {
        main: null,
        cores: [],
        max: null,
        socket: [],
        chipset: null
      };
      if (sn) {
        let s = null;
        try {
          const o = Ss('cat /sys/class/thermal/thermal_zone*/type  2>/dev/null; echo "-----"; cat /sys/class/thermal/thermal_zone*/temp 2>/dev/null;', P.execOptsLinux).toString().split(`-----
`);
          if (o.length === 2) {
            const a = o[0].split(`
`), c = o[1].split(`
`);
            for (let l = 0; l < a.length; l++) {
              const u = a[l].trim();
              u.startsWith("acpi") && c[l] && e.socket.push(Math.round(parseInt(c[l], 10) / 100) / 10), u.startsWith("pch") && c[l] && (e.chipset = Math.round(parseInt(c[l], 10) / 100) / 10), s === null && u.indexOf("cpu") !== -1 && c[l] && (s = Math.round(parseInt(c[l], 10) / 100) / 10);
            }
          }
        } catch {
          P.noop();
        }
        const r = 'for mon in /sys/class/hwmon/hwmon*; do for label in "$mon"/temp*_label; do if [ -f $label ]; then value=${label%_*}_input; echo $(cat "$label")___$(cat "$value"); fi; done; done;';
        try {
          Se(r, (i, o) => {
            o = o.toString();
            const a = o.toLowerCase().indexOf("tdie");
            a !== -1 && (o = o.substring(a));
            const c = o.split(`
`);
            let l = 0;
            if (c.forEach((u) => {
              const d = u.split("___"), p = d[0], f = d.length > 1 && d[1] ? d[1] : "0";
              f && p && p.toLowerCase() === "tctl" && (l = e.main = Math.round(parseInt(f, 10) / 100) / 10), f && (p === void 0 || p && p.toLowerCase().startsWith("core")) ? e.cores.push(Math.round(parseInt(f, 10) / 100) / 10) : f && p && e.main === null && (p.toLowerCase().indexOf("package") >= 0 || p.toLowerCase().indexOf("physical") >= 0 || p.toLowerCase() === "tccd1") && (e.main = Math.round(parseInt(f, 10) / 100) / 10);
            }), l && e.main === null && (e.main = l), e.cores.length > 0) {
              e.main === null && (e.main = Math.round(e.cores.reduce((d, p) => d + p, 0) / e.cores.length));
              let u = Math.max.apply(Math, e.cores);
              e.max = u > e.main ? u : e.main;
            }
            if (e.main !== null) {
              e.max === null && (e.max = e.main), t && t(e), n(e);
              return;
            }
            if (s !== null) {
              e.main = s, e.max = s, t && t(e), n(e);
              return;
            }
            Se("sensors", (u, d) => {
              if (!u) {
                const p = d.toString().split(`
`);
                let f = null, m = null, h = !0, y = "";
                if (p.forEach((g) => {
                  if (g.trim() === "")
                    h = !0;
                  else if (h) {
                    const C = g.trim().toLowerCase();
                    C.startsWith("acpi") ? y = "acpi" : C.startsWith("pch") ? y = "pch" : C.startsWith("coretemp") || C.startsWith("core") ? y = "core" : C.startsWith("k10temp") ? y = "coreAMD" : C.startsWith("cpu_thermal") || C.startsWith("cpu-thermal") || C.startsWith("soc_thermal") || C.startsWith("cpu") ? y = "cpuThermal" : y = "other", h = !1;
                  }
                  const x = /[+-]([^°]*)/g, S = g.match(x), w = g.split(":")[0].toUpperCase();
                  y === "acpi" ? w.indexOf("TEMP") !== -1 && e.socket.push(parseFloat(S)) : y === "pch" && w.indexOf("TEMP") !== -1 && !e.chipset && (e.chipset = parseFloat(S)), (w.indexOf("PHYSICAL") !== -1 || w.indexOf("PACKAGE") !== -1 || y === "coreAMD" && w.indexOf("TDIE") !== -1) && (e.main = parseFloat(S)), w.indexOf("CORE ") !== -1 && e.cores.push(parseFloat(S)), w.indexOf("TDIE") !== -1 && f === null && (f = parseFloat(S)), y === "cpuThermal" && w.indexOf("TEMP") !== -1 && m === null && (m = parseFloat(S));
                }), e.cores.length > 0) {
                  e.main = Math.round(e.cores.reduce((x, S) => x + S, 0) / e.cores.length);
                  const g = Math.max.apply(Math, e.cores);
                  e.max = g > e.main ? g : e.main;
                } else
                  e.main === null && m !== null ? (e.main = m, e.max = m) : e.main === null && f !== null && (e.main = f, e.max = f);
                if (e.main !== null && e.max === null && (e.max = e.main), e.main !== null || e.max !== null) {
                  t && t(e), n(e);
                  return;
                }
              }
              ns.stat("/sys/class/thermal/thermal_zone0/temp", (p) => {
                p === null ? ns.readFile("/sys/class/thermal/thermal_zone0/temp", (f, m) => {
                  if (!f) {
                    const h = m.toString().split(`
`);
                    h.length > 0 && (e.main = parseFloat(h[0]) / 1e3, e.max = e.main);
                  }
                  t && t(e), n(e);
                }) : Se("/opt/vc/bin/vcgencmd measure_temp", (f, m) => {
                  if (!f) {
                    const h = m.toString().split(`
`);
                    h.length > 0 && h[0].indexOf("=") && (e.main = parseFloat(h[0].split("=")[1]), e.max = e.main);
                  }
                  t && t(e), n(e);
                });
              });
            });
          });
        } catch {
          t && t(e), n(e);
        }
      }
      if ((Ls || Is || _s) && Se("sysctl dev.cpu | grep temp", (s, r) => {
        if (!s) {
          const i = r.toString().split(`
`);
          let o = 0;
          i.forEach((a) => {
            const c = a.split(":");
            if (c.length > 1) {
              const l = parseFloat(c[1].replace(",", "."));
              l > e.max && (e.max = l), o = o + l, e.cores.push(l);
            }
          }), e.cores.length && (e.main = Math.round(o / e.cores.length * 100) / 100);
        }
        t && t(e), n(e);
      }), Cs) {
        try {
          if (e = require("osx-temperature-sensor").cpuTemperature(), e.main && (e.main = Math.round(e.main * 100) / 100), e.max && (e.max = Math.round(e.max * 100) / 100), e && e.cores && e.cores.length)
            for (let r = 0; r < e.cores.length; r++)
              e.cores[r] = Math.round(e.cores[r] * 100) / 100;
        } catch {
          P.noop();
        }
        try {
          const r = require("macos-temperature-sensor").temperature();
          if (r.cpu && (e.main = Math.round(r.cpu * 100) / 100, e.max = e.main), r.soc && (e.chipset = Math.round(r.soc * 100) / 100), r && r.cpuDieTemps.length)
            for (const i of r.cpuDieTemps)
              e.cores.push(Math.round(i * 100) / 100);
        } catch {
          P.noop();
        }
        t && t(e), n(e);
      }
      if (Os && (t && t(e), n(e)), ws)
        try {
          P.powerShell('Get-CimInstance MSAcpi_ThermalZoneTemperature -Namespace "root/wmi" | Select CurrentTemperature').then((s, r) => {
            if (!r) {
              let i = 0;
              s.split(`\r
`).filter((a) => a.trim() !== "").filter((a, c) => c > 0).forEach((a) => {
                const c = (parseInt(a, 10) - 2732) / 10;
                isNaN(c) || (i = i + c, c > e.max && (e.max = c), e.cores.push(c));
              }), e.cores.length && (e.main = i / e.cores.length);
            }
            t && t(e), n(e);
          });
        } catch {
          t && t(e), n(e);
        }
    });
  });
}
_t.cpuTemperature = dc;
function Vr(t) {
  return new Promise((n) => {
    process.nextTick(() => {
      let e = "";
      if (ws)
        try {
          Se('reg query "HKEY_LOCAL_MACHINE\\HARDWARE\\DESCRIPTION\\System\\CentralProcessor\\0" /v FeatureSet', P.execOptsWin, (s, r) => {
            if (!s) {
              let i = r.split("0x").pop().trim(), o = parseInt(i, 16).toString(2), a = "0".repeat(32 - o.length) + o, c = [
                "fpu",
                "vme",
                "de",
                "pse",
                "tsc",
                "msr",
                "pae",
                "mce",
                "cx8",
                "apic",
                "",
                "sep",
                "mtrr",
                "pge",
                "mca",
                "cmov",
                "pat",
                "pse-36",
                "psn",
                "clfsh",
                "",
                "ds",
                "acpi",
                "mmx",
                "fxsr",
                "sse",
                "sse2",
                "ss",
                "htt",
                "tm",
                "ia64",
                "pbe"
              ];
              for (let l = 0; l < c.length; l++)
                a[l] === "1" && c[l] !== "" && (e += " " + c[l]);
              e = e.trim().toLowerCase();
            }
            t && t(e), n(e);
          });
        } catch {
          t && t(e), n(e);
        }
      if (sn)
        try {
          Se("export LC_ALL=C; lscpu; unset LC_ALL", (s, r) => {
            s || r.toString().split(`
`).forEach((o) => {
              o.split(":")[0].toUpperCase().indexOf("FLAGS") !== -1 && (e = o.split(":")[1].trim().toLowerCase());
            }), e ? (t && t(e), n(e)) : ns.readFile("/proc/cpuinfo", (i, o) => {
              if (!i) {
                let a = o.toString().split(`
`);
                e = P.getValue(a, "features", ":", !0).toLowerCase();
              }
              t && t(e), n(e);
            });
          });
        } catch {
          t && t(e), n(e);
        }
      (Ls || Is || _s) && Se("export LC_ALL=C; dmidecode -t 4 2>/dev/null; unset LC_ALL", (s, r) => {
        const i = [];
        if (!s) {
          const o = r.toString().split("	Flags:");
          (o.length > 1 ? o[1].split("	Version:")[0].split(`
`) : []).forEach((c) => {
            const l = (c.indexOf("(") ? c.split("(")[0].toLowerCase() : "").trim().replace(/\t/g, "");
            l && i.push(l);
          });
        }
        e = i.join(" ").trim().toLowerCase(), t && t(e), n(e);
      }), Cs && Se("sysctl machdep.cpu.features", (s, r) => {
        if (!s) {
          let i = r.toString().split(`
`);
          i.length > 0 && i[0].indexOf("machdep.cpu.features:") !== -1 && (e = i[0].split(":")[1].trim().toLowerCase());
        }
        t && t(e), n(e);
      }), Os && (t && t(e), n(e));
    });
  });
}
_t.cpuFlags = Vr;
function Nr(t) {
  return new Promise((n) => {
    process.nextTick(() => {
      let e = {
        l1d: null,
        l1i: null,
        l2: null,
        l3: null
      };
      if (sn)
        try {
          Se("export LC_ALL=C; lscpu; unset LC_ALL", (s, r) => {
            s || r.toString().split(`
`).forEach((o) => {
              const a = o.split(":");
              a[0].toUpperCase().indexOf("L1D CACHE") !== -1 && (e.l1d = parseInt(a[1].trim()) * (a[1].indexOf("M") !== -1 ? 1024 * 1024 : a[1].indexOf("K") !== -1 ? 1024 : 1)), a[0].toUpperCase().indexOf("L1I CACHE") !== -1 && (e.l1i = parseInt(a[1].trim()) * (a[1].indexOf("M") !== -1 ? 1024 * 1024 : a[1].indexOf("K") !== -1 ? 1024 : 1)), a[0].toUpperCase().indexOf("L2 CACHE") !== -1 && (e.l2 = parseInt(a[1].trim()) * (a[1].indexOf("M") !== -1 ? 1024 * 1024 : a[1].indexOf("K") !== -1 ? 1024 : 1)), a[0].toUpperCase().indexOf("L3 CACHE") !== -1 && (e.l3 = parseInt(a[1].trim()) * (a[1].indexOf("M") !== -1 ? 1024 * 1024 : a[1].indexOf("K") !== -1 ? 1024 : 1));
            }), t && t(e), n(e);
          });
        } catch {
          t && t(e), n(e);
        }
      if ((Ls || Is || _s) && Se("export LC_ALL=C; dmidecode -t 7 2>/dev/null; unset LC_ALL", (s, r) => {
        let i = [];
        s || (i = r.toString().split("Cache Information"), i.shift());
        for (let o = 0; o < i.length; o++) {
          const a = i[o].split(`
`);
          let c = P.getValue(a, "Socket Designation").toLowerCase().replace(" ", "-").split("-");
          c = c.length ? c[0] : "";
          const l = P.getValue(a, "Installed Size").split(" ");
          let u = parseInt(l[0], 10);
          const d = l.length > 1 ? l[1] : "kb";
          u = u * (d === "kb" ? 1024 : d === "mb" ? 1024 * 1024 : d === "gb" ? 1024 * 1024 * 1024 : 1), c && (c === "l1" ? (e.cache[c + "d"] = u / 2, e.cache[c + "i"] = u / 2) : e.cache[c] = u);
        }
        t && t(e), n(e);
      }), Cs && Se("sysctl hw.l1icachesize hw.l1dcachesize hw.l2cachesize hw.l3cachesize", (s, r) => {
        s || r.toString().split(`
`).forEach((o) => {
          let a = o.split(":");
          a[0].toLowerCase().indexOf("hw.l1icachesize") !== -1 && (e.l1d = parseInt(a[1].trim()) * (a[1].indexOf("K") !== -1 ? 1024 : 1)), a[0].toLowerCase().indexOf("hw.l1dcachesize") !== -1 && (e.l1i = parseInt(a[1].trim()) * (a[1].indexOf("K") !== -1 ? 1024 : 1)), a[0].toLowerCase().indexOf("hw.l2cachesize") !== -1 && (e.l2 = parseInt(a[1].trim()) * (a[1].indexOf("K") !== -1 ? 1024 : 1)), a[0].toLowerCase().indexOf("hw.l3cachesize") !== -1 && (e.l3 = parseInt(a[1].trim()) * (a[1].indexOf("K") !== -1 ? 1024 : 1));
        }), t && t(e), n(e);
      }), Os && (t && t(e), n(e)), ws)
        try {
          const s = [];
          s.push(P.powerShell("Get-CimInstance Win32_processor | select L2CacheSize, L3CacheSize | fl")), s.push(P.powerShell("Get-CimInstance Win32_CacheMemory | select CacheType,InstalledSize,Level | fl")), Promise.all(s).then((r) => {
            e = Br(r[0], r[1]), t && t(e), n(e);
          });
        } catch {
          t && t(e), n(e);
        }
    });
  });
}
function Br(t, n) {
  const e = {
    l1d: null,
    l1i: null,
    l2: null,
    l3: null
  };
  let s = t.split(`\r
`);
  e.l1d = 0, e.l1i = 0, e.l2 = P.getValue(s, "l2cachesize", ":"), e.l3 = P.getValue(s, "l3cachesize", ":"), e.l2 ? e.l2 = parseInt(e.l2, 10) * 1024 : e.l2 = 0, e.l3 ? e.l3 = parseInt(e.l3, 10) * 1024 : e.l3 = 0;
  const r = n.split(/\n\s*\n/);
  let i = 0, o = 0, a = 0;
  return r.forEach((c) => {
    const l = c.split(`\r
`), u = P.getValue(l, "CacheType"), d = P.getValue(l, "Level"), p = P.getValue(l, "InstalledSize");
    d === "3" && u === "3" && (e.l1i = e.l1i + parseInt(p, 10) * 1024), d === "3" && u === "4" && (e.l1d = e.l1d + parseInt(p, 10) * 1024), d === "3" && u === "5" && (i = parseInt(p, 10) / 2, o = parseInt(p, 10) / 2), d === "4" && u === "5" && (a = a + parseInt(p, 10) * 1024);
  }), !e.l1i && !e.l1d && (e.l1i = i, e.l1d = o), a && (e.l2 = a), e;
}
_t.cpuCache = Nr;
function fc() {
  return new Promise((t) => {
    process.nextTick(() => {
      const n = Re.loadavg().map((i) => i / P.cores()), e = parseFloat(Math.max.apply(Math, n).toFixed(2));
      let s = {};
      if (Date.now() - Y.ms >= 200) {
        Y.ms = Date.now();
        const i = Re.cpus().map((g) => (g.times.steal = 0, g.times.guest = 0, g));
        let o = 0, a = 0, c = 0, l = 0, u = 0, d = 0, p = 0;
        const f = [];
        if (Vs = i && i.length ? i.length : 0, sn)
          try {
            const g = Ss("cat /proc/stat 2>/dev/null | grep cpu", P.execOptsLinux).toString().split(`
`);
            if (g.length > 1 && (g.shift(), g.length === i.length))
              for (let x = 0; x < g.length; x++) {
                let S = g[x].split(" ");
                if (S.length >= 10) {
                  const w = parseFloat(S[8]) || 0, C = parseFloat(S[9]) || 0;
                  i[x].times.steal = w, i[x].times.guest = C;
                }
              }
          } catch {
            P.noop();
          }
        for (let g = 0; g < Vs; g++) {
          const x = i[g].times;
          o += x.user, a += x.sys, c += x.nice, u += x.idle, l += x.irq, d += x.steal || 0, p += x.guest || 0;
          const S = I && I[g] && I[g].totalTick ? I[g].totalTick : 0, w = I && I[g] && I[g].totalLoad ? I[g].totalLoad : 0, C = I && I[g] && I[g].user ? I[g].user : 0, A = I && I[g] && I[g].sys ? I[g].sys : 0, v = I && I[g] && I[g].nice ? I[g].nice : 0, k = I && I[g] && I[g].idle ? I[g].idle : 0, O = I && I[g] && I[g].irq ? I[g].irq : 0, $ = I && I[g] && I[g].steal ? I[g].steal : 0, ie = I && I[g] && I[g].guest ? I[g].guest : 0;
          I[g] = x, I[g].totalTick = I[g].user + I[g].sys + I[g].nice + I[g].irq + I[g].steal + I[g].guest + I[g].idle, I[g].totalLoad = I[g].user + I[g].sys + I[g].nice + I[g].irq + I[g].steal + I[g].guest, I[g].currentTick = I[g].totalTick - S, I[g].load = I[g].totalLoad - w, I[g].loadUser = I[g].user - C, I[g].loadSystem = I[g].sys - A, I[g].loadNice = I[g].nice - v, I[g].loadIdle = I[g].idle - k, I[g].loadIrq = I[g].irq - O, I[g].loadSteal = I[g].steal - $, I[g].loadGuest = I[g].guest - ie, f[g] = {}, f[g].load = I[g].load / I[g].currentTick * 100, f[g].loadUser = I[g].loadUser / I[g].currentTick * 100, f[g].loadSystem = I[g].loadSystem / I[g].currentTick * 100, f[g].loadNice = I[g].loadNice / I[g].currentTick * 100, f[g].loadIdle = I[g].loadIdle / I[g].currentTick * 100, f[g].loadIrq = I[g].loadIrq / I[g].currentTick * 100, f[g].loadSteal = I[g].loadSteal / I[g].currentTick * 100, f[g].loadGuest = I[g].loadGuest / I[g].currentTick * 100, f[g].rawLoad = I[g].load, f[g].rawLoadUser = I[g].loadUser, f[g].rawLoadSystem = I[g].loadSystem, f[g].rawLoadNice = I[g].loadNice, f[g].rawLoadIdle = I[g].loadIdle, f[g].rawLoadIrq = I[g].loadIrq, f[g].rawLoadSteal = I[g].loadSteal, f[g].rawLoadGuest = I[g].loadGuest;
        }
        const m = o + a + c + l + d + p + u, h = o + a + c + l + d + p, y = m - Y.tick;
        s = {
          avgLoad: e,
          currentLoad: (h - Y.load) / y * 100,
          currentLoadUser: (o - Y.user) / y * 100,
          currentLoadSystem: (a - Y.system) / y * 100,
          currentLoadNice: (c - Y.nice) / y * 100,
          currentLoadIdle: (u - Y.idle) / y * 100,
          currentLoadIrq: (l - Y.irq) / y * 100,
          currentLoadSteal: (d - Y.steal) / y * 100,
          currentLoadGuest: (p - Y.guest) / y * 100,
          rawCurrentLoad: h - Y.load,
          rawCurrentLoadUser: o - Y.user,
          rawCurrentLoadSystem: a - Y.system,
          rawCurrentLoadNice: c - Y.nice,
          rawCurrentLoadIdle: u - Y.idle,
          rawCurrentLoadIrq: l - Y.irq,
          rawCurrentLoadSteal: d - Y.steal,
          rawCurrentLoadGuest: p - Y.guest,
          cpus: f
        }, Y = {
          user: o,
          nice: c,
          system: a,
          idle: u,
          irq: l,
          steal: d,
          guest: p,
          tick: m,
          load: h,
          ms: Y.ms,
          currentLoad: s.currentLoad,
          currentLoadUser: s.currentLoadUser,
          currentLoadSystem: s.currentLoadSystem,
          currentLoadNice: s.currentLoadNice,
          currentLoadIdle: s.currentLoadIdle,
          currentLoadIrq: s.currentLoadIrq,
          currentLoadSteal: s.currentLoadSteal,
          currentLoadGuest: s.currentLoadGuest,
          rawCurrentLoad: s.rawCurrentLoad,
          rawCurrentLoadUser: s.rawCurrentLoadUser,
          rawCurrentLoadSystem: s.rawCurrentLoadSystem,
          rawCurrentLoadNice: s.rawCurrentLoadNice,
          rawCurrentLoadIdle: s.rawCurrentLoadIdle,
          rawCurrentLoadIrq: s.rawCurrentLoadIrq,
          rawCurrentLoadSteal: s.rawCurrentLoadSteal,
          rawCurrentLoadGuest: s.rawCurrentLoadGuest
        };
      } else {
        const i = [];
        for (let o = 0; o < Vs; o++)
          i[o] = {}, i[o].load = I[o].load / I[o].currentTick * 100, i[o].loadUser = I[o].loadUser / I[o].currentTick * 100, i[o].loadSystem = I[o].loadSystem / I[o].currentTick * 100, i[o].loadNice = I[o].loadNice / I[o].currentTick * 100, i[o].loadIdle = I[o].loadIdle / I[o].currentTick * 100, i[o].loadIrq = I[o].loadIrq / I[o].currentTick * 100, i[o].rawLoad = I[o].load, i[o].rawLoadUser = I[o].loadUser, i[o].rawLoadSystem = I[o].loadSystem, i[o].rawLoadNice = I[o].loadNice, i[o].rawLoadIdle = I[o].loadIdle, i[o].rawLoadIrq = I[o].loadIrq, i[o].rawLoadSteal = I[o].loadSteal, i[o].rawLoadGuest = I[o].loadGuest;
        s = {
          avgLoad: e,
          currentLoad: Y.currentLoad,
          currentLoadUser: Y.currentLoadUser,
          currentLoadSystem: Y.currentLoadSystem,
          currentLoadNice: Y.currentLoadNice,
          currentLoadIdle: Y.currentLoadIdle,
          currentLoadIrq: Y.currentLoadIrq,
          currentLoadSteal: Y.currentLoadSteal,
          currentLoadGuest: Y.currentLoadGuest,
          rawCurrentLoad: Y.rawCurrentLoad,
          rawCurrentLoadUser: Y.rawCurrentLoadUser,
          rawCurrentLoadSystem: Y.rawCurrentLoadSystem,
          rawCurrentLoadNice: Y.rawCurrentLoadNice,
          rawCurrentLoadIdle: Y.rawCurrentLoadIdle,
          rawCurrentLoadIrq: Y.rawCurrentLoadIrq,
          rawCurrentLoadSteal: Y.rawCurrentLoadSteal,
          rawCurrentLoadGuest: Y.rawCurrentLoadGuest,
          cpus: i
        };
      }
      t(s);
    });
  });
}
function mc(t) {
  return new Promise((n) => {
    process.nextTick(() => {
      fc().then((e) => {
        t && t(e), n(e);
      });
    });
  });
}
_t.currentLoad = mc;
function gc() {
  return new Promise((t) => {
    process.nextTick(() => {
      const n = Re.cpus();
      let e = 0, s = 0, r = 0, i = 0, o = 0, a = 0;
      if (n && n.length) {
        for (let l = 0, u = n.length; l < u; l++) {
          const d = n[l].times;
          e += d.user, s += d.sys, r += d.nice, i += d.irq, o += d.idle;
        }
        const c = o + i + r + s + e;
        a = (c - o) / c * 100;
      }
      t(a);
    });
  });
}
function hc(t) {
  return new Promise((n) => {
    process.nextTick(() => {
      gc().then((e) => {
        t && t(e), n(e);
      });
    });
  });
}
_t.fullLoad = hc;
var hi = {};
const ze = je, xn = ee.exec, Yn = ee.execSync, M = D, xc = Ne;
let ct = process.platform;
const kr = ct === "linux" || ct === "android", Fr = ct === "darwin", Rr = ct === "win32", Gr = ct === "freebsd", Wr = ct === "openbsd", zr = ct === "netbsd", Ur = ct === "sunos", ki = {
  "00CE": "Samsung Electronics Inc",
  "014F": "Transcend Information Inc.",
  "017A": "Apacer Technology Inc.",
  "0198": "HyperX",
  "029E": "Corsair",
  "02FE": "Elpida",
  "04CB": "A-DATA",
  "04CD": "G.Skill International Enterprise",
  "059B": "Crucial",
  1315: "Crucial",
  "2C00": "Micron Technology Inc.",
  5105: "Qimonda AG i. In.",
  "802C": "Micron Technology Inc.",
  "80AD": "Hynix Semiconductor Inc.",
  "80CE": "Samsung Electronics Inc.",
  8551: "Qimonda AG i. In.",
  "859B": "Crucial",
  AD00: "Hynix Semiconductor Inc.",
  CE00: "Samsung Electronics Inc.",
  SAMSUNG: "Samsung Electronics Inc.",
  HYNIX: "Hynix Semiconductor Inc.",
  "G-SKILL": "G-Skill International Enterprise",
  "G.SKILL": "G-Skill International Enterprise",
  TRANSCEND: "Transcend Information",
  APACER: "Apacer Technology Inc",
  MICRON: "Micron Technology Inc.",
  QIMONDA: "Qimonda AG i. In."
};
function yc(t) {
  return new Promise((n) => {
    process.nextTick(() => {
      let e = {
        total: ze.totalmem(),
        free: ze.freemem(),
        used: ze.totalmem() - ze.freemem(),
        active: ze.totalmem() - ze.freemem(),
        // temporarily (fallback)
        available: ze.freemem(),
        // temporarily (fallback)
        buffers: 0,
        cached: 0,
        slab: 0,
        buffcache: 0,
        reclaimable: 0,
        swaptotal: 0,
        swapused: 0,
        swapfree: 0,
        writeback: null,
        dirty: null
      };
      if (kr)
        try {
          xc.readFile("/proc/meminfo", (s, r) => {
            if (!s) {
              const i = r.toString().split(`
`);
              e.total = parseInt(M.getValue(i, "memtotal"), 10), e.total = e.total ? e.total * 1024 : ze.totalmem(), e.free = parseInt(M.getValue(i, "memfree"), 10), e.free = e.free ? e.free * 1024 : ze.freemem(), e.used = e.total - e.free, e.buffers = parseInt(M.getValue(i, "buffers"), 10), e.buffers = e.buffers ? e.buffers * 1024 : 0, e.cached = parseInt(M.getValue(i, "cached"), 10), e.cached = e.cached ? e.cached * 1024 : 0, e.slab = parseInt(M.getValue(i, "slab"), 10), e.slab = e.slab ? e.slab * 1024 : 0, e.buffcache = e.buffers + e.cached + e.slab;
              let o = parseInt(M.getValue(i, "memavailable"), 10);
              e.available = o ? o * 1024 : e.free + e.buffcache, e.active = e.total - e.available, e.swaptotal = parseInt(M.getValue(i, "swaptotal"), 10), e.swaptotal = e.swaptotal ? e.swaptotal * 1024 : 0, e.swapfree = parseInt(M.getValue(i, "swapfree"), 10), e.swapfree = e.swapfree ? e.swapfree * 1024 : 0, e.swapused = e.swaptotal - e.swapfree, e.writeback = parseInt(M.getValue(i, "writeback"), 10), e.writeback = e.writeback ? e.writeback * 1024 : 0, e.dirty = parseInt(M.getValue(i, "dirty"), 10), e.dirty = e.dirty ? e.dirty * 1024 : 0, e.reclaimable = parseInt(M.getValue(i, "sreclaimable"), 10), e.reclaimable = e.reclaimable ? e.reclaimable * 1024 : 0;
            }
            t && t(e), n(e);
          });
        } catch {
          t && t(e), n(e);
        }
      if (Gr || Wr || zr)
        try {
          xn(
            "/sbin/sysctl hw.realmem hw.physmem vm.stats.vm.v_page_count vm.stats.vm.v_wire_count vm.stats.vm.v_active_count vm.stats.vm.v_inactive_count vm.stats.vm.v_cache_count vm.stats.vm.v_free_count vm.stats.vm.v_page_size",
            (s, r) => {
              if (!s) {
                const i = r.toString().split(`
`), o = parseInt(M.getValue(i, "vm.stats.vm.v_page_size"), 10), a = parseInt(M.getValue(i, "vm.stats.vm.v_inactive_count"), 10) * o, c = parseInt(M.getValue(i, "vm.stats.vm.v_cache_count"), 10) * o;
                e.total = parseInt(M.getValue(i, "hw.realmem"), 10), isNaN(e.total) && (e.total = parseInt(M.getValue(i, "hw.physmem"), 10)), e.free = parseInt(M.getValue(i, "vm.stats.vm.v_free_count"), 10) * o, e.buffcache = a + c, e.available = e.buffcache + e.free, e.active = e.total - e.free - e.buffcache, e.swaptotal = 0, e.swapfree = 0, e.swapused = 0;
              }
              t && t(e), n(e);
            }
          );
        } catch {
          t && t(e), n(e);
        }
      if (Ur && (t && t(e), n(e)), Fr) {
        let s = 4096;
        try {
          s = M.toInt(Yn("sysctl -n vm.pagesize").toString()) || s;
        } catch {
          M.noop();
        }
        try {
          xn('vm_stat 2>/dev/null | egrep "Pages active|Pages inactive|Pages speculative|Pages wired down|Pages occupied by compressor|Pages purgeable|File-backed pages|Anonymous pages"', (r, i) => {
            if (!r) {
              let o = i.toString().split(`
`);
              const a = (parseInt(M.getValue(o, "Pages wired down"), 10) || 0) * s, c = (parseInt(M.getValue(o, "Pages occupied by compressor"), 10) || 0) * s, l = (parseInt(M.getValue(o, "Pages purgeable"), 10) || 0) * s, u = (parseInt(M.getValue(o, "Anonymous pages"), 10) || 0) * s;
              e.active = u - l + a + c, e.reclaimable = (parseInt(M.getValue(o, "Pages inactive"), 10) || 0) * s, e.buffcache = e.used - e.active, e.available = e.free + e.buffcache;
            }
            xn("sysctl -n vm.swapusage 2>/dev/null", (o, a) => {
              if (!o) {
                let c = a.toString().split(`
`);
                c.length > 0 && c[0].replace(/,/g, ".").replace(/M/g, "").trim().split("  ").forEach((d) => {
                  d.toLowerCase().indexOf("total") !== -1 && (e.swaptotal = parseFloat(d.split("=")[1].trim()) * 1024 * 1024), d.toLowerCase().indexOf("used") !== -1 && (e.swapused = parseFloat(d.split("=")[1].trim()) * 1024 * 1024), d.toLowerCase().indexOf("free") !== -1 && (e.swapfree = parseFloat(d.split("=")[1].trim()) * 1024 * 1024);
                });
              }
              t && t(e), n(e);
            });
          });
        } catch {
          t && t(e), n(e);
        }
      }
      if (Rr) {
        let s = 0, r = 0;
        try {
          M.powerShell("Get-CimInstance Win32_PageFileUsage | Select AllocatedBaseSize, CurrentUsage").then((i, o) => {
            o || i.split(`\r
`).filter((c) => c.trim() !== "").filter((c, l) => l > 0).forEach((c) => {
              c !== "" && (c = c.trim().split(/\s\s+/), s = s + (parseInt(c[0], 10) || 0), r = r + (parseInt(c[1], 10) || 0));
            }), e.swaptotal = s * 1024 * 1024, e.swapused = r * 1024 * 1024, e.swapfree = e.swaptotal - e.swapused, t && t(e), n(e);
          });
        } catch {
          t && t(e), n(e);
        }
      }
    });
  });
}
hi.mem = yc;
function Sc(t) {
  function n(e) {
    const s = e.replace("0x", "").toUpperCase();
    return s.length >= 4 && {}.hasOwnProperty.call(ki, s) ? ki[s] : e;
  }
  return new Promise((e) => {
    process.nextTick(() => {
      let s = [];
      if ((kr || Gr || Wr || zr) && xn(
        'export LC_ALL=C; dmidecode -t memory 2>/dev/null | grep -iE "Size:|Type|Speed|Manufacturer|Form Factor|Locator|Memory Device|Serial Number|Voltage|Part Number"; unset LC_ALL',
        (r, i) => {
          if (!r) {
            const o = i.toString().split("Memory Device");
            o.shift(), o.forEach((a) => {
              const c = a.split(`
`), l = M.getValue(c, "Size"), u = l.indexOf("GB") >= 0 ? parseInt(l, 10) * 1024 * 1024 * 1024 : parseInt(l, 10) * 1024 * 1024;
              let d = M.getValue(c, "Bank Locator");
              if (d.toLowerCase().indexOf("bad") >= 0 && (d = ""), parseInt(M.getValue(c, "Size"), 10) > 0) {
                const p = M.toInt(M.getValue(c, "Total Width")), f = M.toInt(M.getValue(c, "Data Width"));
                s.push({
                  size: u,
                  bank: d,
                  type: M.getValue(c, "Type:"),
                  ecc: f && p ? p > f : !1,
                  clockSpeed: M.getValue(c, "Configured Clock Speed:") ? parseInt(M.getValue(c, "Configured Clock Speed:"), 10) : M.getValue(c, "Speed:") ? parseInt(M.getValue(c, "Speed:"), 10) : null,
                  formFactor: M.getValue(c, "Form Factor:"),
                  manufacturer: n(M.getValue(c, "Manufacturer:")),
                  partNum: M.getValue(c, "Part Number:"),
                  serialNum: M.getValue(c, "Serial Number:"),
                  voltageConfigured: parseFloat(M.getValue(c, "Configured Voltage:")) || null,
                  voltageMin: parseFloat(M.getValue(c, "Minimum Voltage:")) || null,
                  voltageMax: parseFloat(M.getValue(c, "Maximum Voltage:")) || null
                });
              } else
                s.push({
                  size: 0,
                  bank: d,
                  type: "Empty",
                  ecc: null,
                  clockSpeed: 0,
                  formFactor: M.getValue(c, "Form Factor:"),
                  partNum: "",
                  serialNum: "",
                  voltageConfigured: null,
                  voltageMin: null,
                  voltageMax: null
                });
            });
          }
          if (!s.length) {
            s.push({
              size: ze.totalmem(),
              bank: "",
              type: "",
              ecc: null,
              clockSpeed: 0,
              formFactor: "",
              partNum: "",
              serialNum: "",
              voltageConfigured: null,
              voltageMin: null,
              voltageMax: null
            });
            try {
              let o = Yn("cat /proc/cpuinfo 2>/dev/null", M.execOptsLinux), a = o.toString().split(`
`), c = M.getValue(a, "revision", ":", !0).toLowerCase();
              if (M.isRaspberry(a)) {
                const l = {
                  0: 400,
                  1: 450,
                  2: 450,
                  3: 3200,
                  4: 4267
                };
                s[0].type = "LPDDR2", s[0].type = c && c[2] && c[2] === "3" ? "LPDDR4" : s[0].type, s[0].type = c && c[2] && c[2] === "4" ? "LPDDR4X" : s[0].type, s[0].ecc = !1, s[0].clockSpeed = c && c[2] && l[c[2]] || 400, s[0].clockSpeed = c && c[4] && c[4] === "d" ? 500 : s[0].clockSpeed, s[0].formFactor = "SoC", o = Yn("vcgencmd get_config sdram_freq 2>/dev/null", M.execOptsLinux), a = o.toString().split(`
`);
                let u = parseInt(M.getValue(a, "sdram_freq", "=", !0), 10) || 0;
                u && (s[0].clockSpeed = u), o = Yn("vcgencmd measure_volts sdram_p 2>/dev/null", M.execOptsLinux), a = o.toString().split(`
`);
                let d = parseFloat(M.getValue(a, "volt", "=", !0)) || 0;
                d && (s[0].voltageConfigured = d, s[0].voltageMin = d, s[0].voltageMax = d);
              }
            } catch {
              M.noop();
            }
          }
          t && t(s), e(s);
        }
      ), Fr && xn("system_profiler SPMemoryDataType", (r, i) => {
        if (!r) {
          const o = i.toString().split(`
`), a = M.getValue(o, "ecc", ":", !0).toLowerCase();
          let c = i.toString().split("        BANK "), l = !0;
          c.length === 1 && (c = i.toString().split("        DIMM"), l = !1), c.shift(), c.forEach((u) => {
            const d = u.split(`
`), p = (l ? "BANK " : "DIMM") + d[0].trim().split("/")[0], f = parseInt(M.getValue(d, "          Size"));
            f ? s.push({
              size: f * 1024 * 1024 * 1024,
              bank: p,
              type: M.getValue(d, "          Type:"),
              ecc: a ? a === "enabled" : null,
              clockSpeed: parseInt(M.getValue(d, "          Speed:"), 10),
              formFactor: "",
              manufacturer: n(M.getValue(d, "          Manufacturer:")),
              partNum: M.getValue(d, "          Part Number:"),
              serialNum: M.getValue(d, "          Serial Number:"),
              voltageConfigured: null,
              voltageMin: null,
              voltageMax: null
            }) : s.push({
              size: 0,
              bank: p,
              type: "Empty",
              ecc: null,
              clockSpeed: 0,
              formFactor: "",
              manufacturer: "",
              partNum: "",
              serialNum: "",
              voltageConfigured: null,
              voltageMin: null,
              voltageMax: null
            });
          });
        }
        if (!s.length) {
          const o = i.toString().split(`
`), a = parseInt(M.getValue(o, "      Memory:")), c = M.getValue(o, "      Type:"), l = M.getValue(o, "      Manufacturer:");
          a && c && s.push({
            size: a * 1024 * 1024 * 1024,
            bank: "0",
            type: c,
            ecc: !1,
            clockSpeed: null,
            formFactor: "SOC",
            manufacturer: n(l),
            partNum: "",
            serialNum: "",
            voltageConfigured: null,
            voltageMin: null,
            voltageMax: null
          });
        }
        t && t(s), e(s);
      }), Ur && (t && t(s), e(s)), Rr) {
        const r = "Unknown|Other|DRAM|Synchronous DRAM|Cache DRAM|EDO|EDRAM|VRAM|SRAM|RAM|ROM|FLASH|EEPROM|FEPROM|EPROM|CDRAM|3DRAM|SDRAM|SGRAM|RDRAM|DDR|DDR2|DDR2 FB-DIMM|Reserved|DDR3|FBD2|DDR4|LPDDR|LPDDR2|LPDDR3|LPDDR4|Logical non-volatile device|HBM|HBM2|DDR5|LPDDR5".split(
          "|"
        ), i = "Unknown|Other|SIP|DIP|ZIP|SOJ|Proprietary|SIMM|DIMM|TSOP|PGA|RIMM|SODIMM|SRIMM|SMD|SSMP|QFP|TQFP|SOIC|LCC|PLCC|BGA|FPBGA|LGA".split("|");
        try {
          M.powerShell(
            "Get-CimInstance Win32_PhysicalMemory | select DataWidth,TotalWidth,Capacity,BankLabel,MemoryType,SMBIOSMemoryType,ConfiguredClockSpeed,Speed,FormFactor,Manufacturer,PartNumber,SerialNumber,ConfiguredVoltage,MinVoltage,MaxVoltage,Tag | fl"
          ).then((o, a) => {
            if (!a) {
              const c = o.toString().split(/\n\s*\n/);
              c.shift(), c.forEach((l) => {
                const u = l.split(`\r
`), d = M.toInt(M.getValue(u, "DataWidth", ":")), p = M.toInt(M.getValue(u, "TotalWidth", ":")), f = parseInt(M.getValue(u, "Capacity", ":"), 10) || 0, m = M.getValue(u, "Tag", ":"), h = M.splitByNumber(m);
                f && s.push({
                  size: f,
                  bank: M.getValue(u, "BankLabel", ":") + (h[1] ? "/" + h[1] : ""),
                  // BankLabel
                  type: r[parseInt(M.getValue(u, "MemoryType", ":"), 10) || parseInt(M.getValue(u, "SMBIOSMemoryType", ":"), 10)],
                  ecc: d && p ? p > d : !1,
                  clockSpeed: parseInt(M.getValue(u, "ConfiguredClockSpeed", ":"), 10) || parseInt(M.getValue(u, "Speed", ":"), 10) || 0,
                  formFactor: i[parseInt(M.getValue(u, "FormFactor", ":"), 10) || 0],
                  manufacturer: n(M.getValue(u, "Manufacturer", ":")),
                  partNum: M.getValue(u, "PartNumber", ":"),
                  serialNum: M.getValue(u, "SerialNumber", ":"),
                  voltageConfigured: (parseInt(M.getValue(u, "ConfiguredVoltage", ":"), 10) || 0) / 1e3,
                  voltageMin: (parseInt(M.getValue(u, "MinVoltage", ":"), 10) || 0) / 1e3,
                  voltageMax: (parseInt(M.getValue(u, "MaxVoltage", ":"), 10) || 0) / 1e3
                });
              });
            }
            t && t(s), e(s);
          });
        } catch {
          t && t(s), e(s);
        }
      }
    });
  });
}
hi.memLayout = Sc;
const Fi = ee.exec, Ut = Ne, H = D, lt = process.platform, Cc = lt === "linux" || lt === "android", wc = lt === "darwin", Lc = lt === "win32", Ic = lt === "freebsd", _c = lt === "openbsd", Oc = lt === "netbsd", Pc = lt === "sunos";
function vc(t, n, e) {
  const s = {};
  let r = parseInt(H.getValue(t, "BatteryStatus", ":").trim(), 10) || 0;
  if (r >= 0) {
    const i = r;
    s.status = i, s.hasBattery = !0, s.maxCapacity = e || parseInt(H.getValue(t, "DesignCapacity", ":") || 0), s.designedCapacity = parseInt(H.getValue(t, "DesignCapacity", ":") || n), s.voltage = (parseInt(H.getValue(t, "DesignVoltage", ":"), 10) || 0) / 1e3, s.capacityUnit = "mWh", s.percent = parseInt(H.getValue(t, "EstimatedChargeRemaining", ":"), 10) || 0, s.currentCapacity = parseInt(s.maxCapacity * s.percent / 100), s.isCharging = i >= 6 && i <= 9 || i === 11 || i !== 3 && i !== 1 && s.percent < 100, s.acConnected = s.isCharging || i === 2, s.model = H.getValue(t, "DeviceID", ":");
  } else
    s.status = -1;
  return s;
}
var Mc = (t) => new Promise((n) => {
  process.nextTick(() => {
    let e = {
      hasBattery: !1,
      cycleCount: 0,
      isCharging: !1,
      designedCapacity: 0,
      maxCapacity: 0,
      currentCapacity: 0,
      voltage: 0,
      capacityUnit: "",
      percent: 0,
      timeRemaining: null,
      acConnected: !0,
      type: "",
      model: "",
      manufacturer: "",
      serial: ""
    };
    if (Cc) {
      let s = "";
      Ut.existsSync("/sys/class/power_supply/BAT1/uevent") ? s = "/sys/class/power_supply/BAT1/" : Ut.existsSync("/sys/class/power_supply/BAT0/uevent") && (s = "/sys/class/power_supply/BAT0/");
      let r = !1, i = "";
      Ut.existsSync("/sys/class/power_supply/AC/online") ? i = "/sys/class/power_supply/AC/online" : Ut.existsSync("/sys/class/power_supply/AC0/online") && (i = "/sys/class/power_supply/AC0/online"), i && (r = Ut.readFileSync(i).toString().trim() === "1"), s ? Ut.readFile(s + "uevent", (o, a) => {
        if (o)
          t && t(e), n(e);
        else {
          let c = a.toString().split(`
`);
          e.isCharging = H.getValue(c, "POWER_SUPPLY_STATUS", "=").toLowerCase() === "charging", e.acConnected = r || e.isCharging, e.voltage = parseInt("0" + H.getValue(c, "POWER_SUPPLY_VOLTAGE_NOW", "="), 10) / 1e6, e.capacityUnit = e.voltage ? "mWh" : "mAh", e.cycleCount = parseInt("0" + H.getValue(c, "POWER_SUPPLY_CYCLE_COUNT", "="), 10), e.maxCapacity = Math.round(parseInt("0" + H.getValue(c, "POWER_SUPPLY_CHARGE_FULL", "=", !0, !0), 10) / 1e3 * (e.voltage || 1));
          const l = parseInt("0" + H.getValue(c, "POWER_SUPPLY_VOLTAGE_MIN_DESIGN", "="), 10) / 1e6;
          e.designedCapacity = Math.round(
            parseInt("0" + H.getValue(c, "POWER_SUPPLY_CHARGE_FULL_DESIGN", "=", !0, !0), 10) / 1e3 * (l || e.voltage || 1)
          ), e.currentCapacity = Math.round(parseInt("0" + H.getValue(c, "POWER_SUPPLY_CHARGE_NOW", "="), 10) / 1e3 * (e.voltage || 1)), e.maxCapacity || (e.maxCapacity = parseInt("0" + H.getValue(c, "POWER_SUPPLY_ENERGY_FULL", "=", !0, !0), 10) / 1e3, e.designedCapacity = parseInt("0" + H.getValue(c, "POWER_SUPPLY_ENERGY_FULL_DESIGN", "=", !0, !0), 10) / 1e3 | e.maxCapacity, e.currentCapacity = parseInt("0" + H.getValue(c, "POWER_SUPPLY_ENERGY_NOW", "="), 10) / 1e3);
          const u = H.getValue(c, "POWER_SUPPLY_CAPACITY", "="), d = parseInt("0" + H.getValue(c, "POWER_SUPPLY_ENERGY_NOW", "="), 10), p = parseInt("0" + H.getValue(c, "POWER_SUPPLY_POWER_NOW", "="), 10), f = parseInt("0" + H.getValue(c, "POWER_SUPPLY_CURRENT_NOW", "="), 10), m = parseInt("0" + H.getValue(c, "POWER_SUPPLY_CHARGE_NOW", "="), 10);
          e.percent = parseInt("0" + u, 10), e.maxCapacity && e.currentCapacity && (e.hasBattery = !0, u || (e.percent = 100 * e.currentCapacity / e.maxCapacity)), e.isCharging && (e.hasBattery = !0), d && p ? e.timeRemaining = Math.floor(d / p * 60) : f && m ? e.timeRemaining = Math.floor(m / f * 60) : f && e.currentCapacity && (e.timeRemaining = Math.floor(e.currentCapacity / f * 60)), e.type = H.getValue(c, "POWER_SUPPLY_TECHNOLOGY", "="), e.model = H.getValue(c, "POWER_SUPPLY_MODEL_NAME", "="), e.manufacturer = H.getValue(c, "POWER_SUPPLY_MANUFACTURER", "="), e.serial = H.getValue(c, "POWER_SUPPLY_SERIAL_NUMBER", "="), t && t(e), n(e);
        }
      }) : (t && t(e), n(e));
    }
    if ((Ic || _c || Oc) && Fi("sysctl -i hw.acpi.battery hw.acpi.acline", (s, r) => {
      let i = r.toString().split(`
`);
      const o = parseInt("0" + H.getValue(i, "hw.acpi.battery.units"), 10), a = parseInt("0" + H.getValue(i, "hw.acpi.battery.life"), 10);
      e.hasBattery = o > 0, e.cycleCount = null, e.isCharging = H.getValue(i, "hw.acpi.acline") !== "1", e.acConnected = e.isCharging, e.maxCapacity = null, e.currentCapacity = null, e.capacityUnit = "unknown", e.percent = o ? a : null, t && t(e), n(e);
    }), wc && Fi(
      'ioreg -n AppleSmartBattery -r | egrep "CycleCount|IsCharging|DesignCapacity|MaxCapacity|CurrentCapacity|DeviceName|BatterySerialNumber|Serial|TimeRemaining|Voltage"; pmset -g batt | grep %',
      (s, r) => {
        if (r) {
          let i = r.toString().replace(/ +/g, "").replace(/"+/g, "").replace(/-/g, "").split(`
`);
          e.cycleCount = parseInt("0" + H.getValue(i, "cyclecount", "="), 10), e.voltage = parseInt("0" + H.getValue(i, "voltage", "="), 10) / 1e3, e.capacityUnit = e.voltage ? "mWh" : "mAh", e.maxCapacity = Math.round(parseInt("0" + H.getValue(i, "applerawmaxcapacity", "="), 10) * (e.voltage || 1)), e.currentCapacity = Math.round(parseInt("0" + H.getValue(i, "applerawcurrentcapacity", "="), 10) * (e.voltage || 1)), e.designedCapacity = Math.round(parseInt("0" + H.getValue(i, "DesignCapacity", "="), 10) * (e.voltage || 1)), e.manufacturer = "Apple", e.serial = H.getValue(i, "BatterySerialNumber", "=") || H.getValue(i, "Serial", "="), e.model = H.getValue(i, "DeviceName", "=");
          let o = null, c = H.getValue(i, "internal", "Battery").split(";");
          if (c && c[0]) {
            let l = c[0].split("	");
            l && l[1] && (o = parseFloat(l[1].trim().replace(/%/g, "")));
          }
          c && c[1] ? (e.isCharging = c[1].trim() === "charging", e.acConnected = c[1].trim() !== "discharging") : (e.isCharging = H.getValue(i, "ischarging", "=").toLowerCase() === "yes", e.acConnected = e.isCharging), e.maxCapacity && e.currentCapacity && (e.hasBattery = !0, e.type = "Li-ion", e.percent = o !== null ? o : Math.round(100 * e.currentCapacity / e.maxCapacity), e.isCharging || (e.timeRemaining = parseInt("0" + H.getValue(i, "TimeRemaining", "="), 10)));
        }
        t && t(e), n(e);
      }
    ), Pc && (t && t(e), n(e)), Lc)
      try {
        const s = [];
        s.push(H.powerShell("Get-CimInstance Win32_Battery | select BatteryStatus, DesignCapacity, DesignVoltage, EstimatedChargeRemaining, DeviceID | fl")), s.push(H.powerShell("(Get-WmiObject -Class BatteryStaticData -Namespace ROOT/WMI).DesignedCapacity")), s.push(H.powerShell("(Get-CimInstance -Class BatteryFullChargedCapacity -Namespace ROOT/WMI).FullChargedCapacity")), H.promiseAll(s).then((r) => {
          if (r) {
            const i = r.results[0].split(/\n\s*\n/), o = [], a = (u) => /\S/.test(u);
            for (let u = 0; u < i.length; u++)
              a(i[u]) && o.push(i[u]);
            const c = r.results[1].split(`\r
`).filter((u) => u), l = r.results[2].split(`\r
`).filter((u) => u);
            if (o.length) {
              let u = !1;
              const d = [];
              for (let p = 0; p < o.length; p++) {
                const f = o[p].split(`\r
`), m = c && c.length >= p + 1 && c[p] ? H.toInt(c[p]) : 0, h = l && l.length >= p + 1 && l[p] ? H.toInt(l[p]) : 0, y = vc(f, m, h);
                !u && y.status > 0 && y.status !== 10 ? (e.hasBattery = y.hasBattery, e.maxCapacity = y.maxCapacity, e.designedCapacity = y.designedCapacity, e.voltage = y.voltage, e.capacityUnit = y.capacityUnit, e.percent = y.percent, e.currentCapacity = y.currentCapacity, e.isCharging = y.isCharging, e.acConnected = y.acConnected, e.model = y.model, u = !0) : y.status !== -1 && d.push({
                  hasBattery: y.hasBattery,
                  maxCapacity: y.maxCapacity,
                  designedCapacity: y.designedCapacity,
                  voltage: y.voltage,
                  capacityUnit: y.capacityUnit,
                  percent: y.percent,
                  currentCapacity: y.currentCapacity,
                  isCharging: y.isCharging,
                  timeRemaining: null,
                  acConnected: y.acConnected,
                  model: y.model,
                  type: "",
                  manufacturer: "",
                  serial: ""
                });
              }
              !u && d.length && (e = d[0], d.shift()), d.length && (e.additionalBatteries = d);
            }
          }
          t && t(e), n(e);
        });
      } catch {
        t && t(e), n(e);
      }
  });
}), $r = {};
const Ri = Ne, Gi = ps, $t = ee.exec, ks = ee.execSync, V = D, ut = process.platform;
let un = "";
const zn = ut === "linux" || ut === "android", Ac = ut === "darwin", Fs = ut === "win32", Ec = ut === "freebsd", Tc = ut === "openbsd", Dc = ut === "netbsd", bc = ut === "sunos";
let pn = 0, dn = 0, Un = 0, $n = 0;
const Wi = {
  "-2": "UNINITIALIZED",
  "-1": "OTHER",
  0: "HD15",
  1: "SVIDEO",
  2: "Composite video",
  3: "Component video",
  4: "DVI",
  5: "HDMI",
  6: "LVDS",
  8: "D_JPN",
  9: "SDI",
  10: "DP",
  11: "DP embedded",
  12: "UDI",
  13: "UDI embedded",
  14: "SDTVDONGLE",
  15: "MIRACAST",
  2147483648: "INTERNAL"
};
function zi(t) {
  const n = [
    { pattern: "^LG.+", manufacturer: "LG" },
    { pattern: "^BENQ.+", manufacturer: "BenQ" },
    { pattern: "^ASUS.+", manufacturer: "Asus" },
    { pattern: "^DELL.+", manufacturer: "Dell" },
    { pattern: "^SAMSUNG.+", manufacturer: "Samsung" },
    { pattern: "^VIEWSON.+", manufacturer: "ViewSonic" },
    { pattern: "^SONY.+", manufacturer: "Sony" },
    { pattern: "^ACER.+", manufacturer: "Acer" },
    { pattern: "^AOC.+", manufacturer: "AOC Monitors" },
    { pattern: "^HP.+", manufacturer: "HP" },
    { pattern: "^EIZO.?", manufacturer: "Eizo" },
    { pattern: "^PHILIPS.?", manufacturer: "Philips" },
    { pattern: "^IIYAMA.?", manufacturer: "Iiyama" },
    { pattern: "^SHARP.?", manufacturer: "Sharp" },
    { pattern: "^NEC.?", manufacturer: "NEC" },
    { pattern: "^LENOVO.?", manufacturer: "Lenovo" },
    { pattern: "COMPAQ.?", manufacturer: "Compaq" },
    { pattern: "APPLE.?", manufacturer: "Apple" },
    { pattern: "INTEL.?", manufacturer: "Intel" },
    { pattern: "AMD.?", manufacturer: "AMD" },
    { pattern: "NVIDIA.?", manufacturer: "NVDIA" }
  ];
  let e = "";
  return t && (t = t.toUpperCase(), n.forEach((s) => {
    RegExp(s.pattern).test(t) && (e = s.manufacturer);
  })), e;
}
function Vc(t) {
  return {
    610: "Apple",
    "1e6d": "LG",
    "10ac": "DELL",
    "4dd9": "Sony",
    "38a3": "NEC"
  }[t] || "";
}
function Nc(t) {
  let n = "";
  return t = (t || "").toLowerCase(), t.indexOf("apple") >= 0 ? n = "0x05ac" : t.indexOf("nvidia") >= 0 ? n = "0x10de" : t.indexOf("intel") >= 0 ? n = "0x8086" : (t.indexOf("ati") >= 0 || t.indexOf("amd") >= 0) && (n = "0x1002"), n;
}
function Bc(t) {
  return {
    spdisplays_mtlgpufamilymac1: "mac1",
    spdisplays_mtlgpufamilymac2: "mac2",
    spdisplays_mtlgpufamilyapple1: "apple1",
    spdisplays_mtlgpufamilyapple2: "apple2",
    spdisplays_mtlgpufamilyapple3: "apple3",
    spdisplays_mtlgpufamilyapple4: "apple4",
    spdisplays_mtlgpufamilyapple5: "apple5",
    spdisplays_mtlgpufamilyapple6: "apple6",
    spdisplays_mtlgpufamilyapple7: "apple7",
    spdisplays_metalfeaturesetfamily11: "family1_v1",
    spdisplays_metalfeaturesetfamily12: "family1_v2",
    spdisplays_metalfeaturesetfamily13: "family1_v3",
    spdisplays_metalfeaturesetfamily14: "family1_v4",
    spdisplays_metalfeaturesetfamily21: "family2_v1"
  }[t] || "";
}
function kc(t) {
  function n(p) {
    const f = {
      controllers: [],
      displays: []
    };
    try {
      return p.forEach((m) => {
        const h = (m.sppci_bus || "").indexOf("builtin") > -1 ? "Built-In" : (m.sppci_bus || "").indexOf("pcie") > -1 ? "PCIe" : "", y = (parseInt(m.spdisplays_vram || "", 10) || 0) * ((m.spdisplays_vram || "").indexOf("GB") > -1 ? 1024 : 1), g = (parseInt(m.spdisplays_vram_shared || "", 10) || 0) * ((m.spdisplays_vram_shared || "").indexOf("GB") > -1 ? 1024 : 1);
        let x = Bc(m.spdisplays_metal || m.spdisplays_metalfamily || "");
        f.controllers.push({
          vendor: zi(m.spdisplays_vendor || "") || m.spdisplays_vendor || "",
          model: m.sppci_model || "",
          bus: h,
          vramDynamic: h === "Built-In",
          vram: y || g || null,
          deviceId: m["spdisplays_device-id"] || "",
          vendorId: m["spdisplays_vendor-id"] || Nc((m.spdisplays_vendor || "") + (m.sppci_model || "")),
          external: m.sppci_device_type === "spdisplays_egpu",
          cores: m.sppci_cores || null,
          metalVersion: x
        }), m.spdisplays_ndrvs && m.spdisplays_ndrvs.length && m.spdisplays_ndrvs.forEach((S) => {
          const w = S.spdisplays_connection_type || "", C = (S._spdisplays_resolution || "").split("@"), A = C[0].split("x"), v = (S._spdisplays_pixels || "").split("x"), k = S.spdisplays_depth || "", O = S["_spdisplays_display-serial-number"] || S["_spdisplays_display-serial-number2"] || null;
          f.displays.push({
            vendor: Vc(S["_spdisplays_display-vendor-id"] || "") || zi(S._name || ""),
            vendorId: S["_spdisplays_display-vendor-id"] || "",
            model: S._name || "",
            productionYear: S["_spdisplays_display-year"] || null,
            serial: O !== "0" ? O : null,
            displayId: S._spdisplays_displayID || null,
            main: S.spdisplays_main ? S.spdisplays_main === "spdisplays_yes" : !1,
            builtin: (S.spdisplays_display_type || "").indexOf("built-in") > -1,
            connection: w.indexOf("_internal") > -1 ? "Internal" : w.indexOf("_displayport") > -1 ? "Display Port" : w.indexOf("_hdmi") > -1 ? "HDMI" : null,
            sizeX: null,
            sizeY: null,
            pixelDepth: k === "CGSThirtyBitColor" ? 30 : k === "CGSThirtytwoBitColor" ? 32 : k === "CGSTwentyfourBitColor" ? 24 : null,
            resolutionX: v.length > 1 ? parseInt(v[0], 10) : null,
            resolutionY: v.length > 1 ? parseInt(v[1], 10) : null,
            currentResX: A.length > 1 ? parseInt(A[0], 10) : null,
            currentResY: A.length > 1 ? parseInt(A[1], 10) : null,
            positionX: 0,
            positionY: 0,
            currentRefreshRate: C.length > 1 ? parseInt(C[1], 10) : null
          });
        });
      }), f;
    } catch {
      return f;
    }
  }
  function e(p) {
    let f = [], m = {
      vendor: "",
      subVendor: "",
      model: "",
      bus: "",
      busAddress: "",
      vram: null,
      vramDynamic: !1,
      pciID: ""
    }, h = !1, y = [];
    try {
      y = ks('export LC_ALL=C; dmidecode -t 9 2>/dev/null; unset LC_ALL | grep "Bus Address: "', V.execOptsLinux).toString().split(`
`);
      for (let x = 0; x < y.length; x++)
        y[x] = y[x].replace("Bus Address:", "").replace("0000:", "").trim();
      y = y.filter((x) => x != null && x);
    } catch {
      V.noop();
    }
    let g = 1;
    return p.forEach((x) => {
      let S = "";
      if (g < p.length && p[g] && (S = p[g], S.indexOf(":") > 0 && (S = S.split(":")[1])), x.trim() !== "") {
        if (x[0] !== " " && x[0] !== "	") {
          let w = y.indexOf(x.split(" ")[0]) >= 0, C = x.toLowerCase().indexOf(" vga "), A = x.toLowerCase().indexOf("3d controller");
          if (C !== -1 || A !== -1) {
            A !== -1 && C === -1 && (C = A), (m.vendor || m.model || m.bus || m.vram !== null || m.vramDynamic) && (f.push(m), m = {
              vendor: "",
              model: "",
              bus: "",
              busAddress: "",
              vram: null,
              vramDynamic: !1
            });
            const v = x.split(" ")[0];
            /[\da-fA-F]{2}:[\da-fA-F]{2}\.[\da-fA-F]/.test(v) && (m.busAddress = v), h = !0;
            let k = x.search(/\[[0-9a-f]{4}:[0-9a-f]{4}]|$/), O = x.substr(C, k - C).split(":");
            if (m.busAddress = x.substr(0, C).trim(), O.length > 1 && (O[1] = O[1].trim(), O[1].toLowerCase().indexOf("corporation") >= 0 ? (m.vendor = O[1].substr(0, O[1].toLowerCase().indexOf("corporation") + 11).trim(), m.model = O[1].substr(O[1].toLowerCase().indexOf("corporation") + 11, 200).split("(")[0].trim(), m.bus = y.length > 0 && w ? "PCIe" : "Onboard", m.vram = null, m.vramDynamic = !1) : O[1].toLowerCase().indexOf(" inc.") >= 0 ? ((O[1].match(/]/g) || []).length > 1 ? (m.vendor = O[1].substr(0, O[1].toLowerCase().indexOf("]") + 1).trim(), m.model = O[1].substr(O[1].toLowerCase().indexOf("]") + 1, 200).trim().split("(")[0].trim()) : (m.vendor = O[1].substr(0, O[1].toLowerCase().indexOf(" inc.") + 5).trim(), m.model = O[1].substr(O[1].toLowerCase().indexOf(" inc.") + 5, 200).trim().split("(")[0].trim()), m.bus = y.length > 0 && w ? "PCIe" : "Onboard", m.vram = null, m.vramDynamic = !1) : O[1].toLowerCase().indexOf(" ltd.") >= 0 && ((O[1].match(/]/g) || []).length > 1 ? (m.vendor = O[1].substr(0, O[1].toLowerCase().indexOf("]") + 1).trim(), m.model = O[1].substr(O[1].toLowerCase().indexOf("]") + 1, 200).trim().split("(")[0].trim()) : (m.vendor = O[1].substr(0, O[1].toLowerCase().indexOf(" ltd.") + 5).trim(), m.model = O[1].substr(O[1].toLowerCase().indexOf(" ltd.") + 5, 200).trim().split("(")[0].trim())), m.model && S.indexOf(m.model) !== -1)) {
              const $ = S.split(m.model)[0].trim();
              $ && (m.subVendor = $);
            }
          } else
            h = !1;
        }
        if (h) {
          let w = x.split(":");
          if (w.length > 1 && w[0].replace(/ +/g, "").toLowerCase().indexOf("devicename") !== -1 && w[1].toLowerCase().indexOf("onboard") !== -1 && (m.bus = "Onboard"), w.length > 1 && w[0].replace(/ +/g, "").toLowerCase().indexOf("region") !== -1 && w[1].toLowerCase().indexOf("memory") !== -1) {
            const C = w[1].match(/size=(\d+)([KMG])?/i);
            if (C) {
              let A = parseInt(C[1], 10);
              const v = (C[2] || "").toUpperCase();
              v === "G" ? A *= 1024 : v === "K" ? A = Math.round(A / 1024) : v === "" && (A = Math.round(A / 1024 / 1024)), (m.vram === null || A > m.vram) && (m.vram = A);
            }
          }
        }
      }
      g++;
    }), (m.vendor || m.model || m.bus || m.busAddress || m.vram !== null || m.vramDynamic) && f.push(m), f;
  }
  function s(p, f) {
    const m = /\[([^\]]+)\]\s+(\w+)\s+(.*)/, h = f.reduce((y, g) => {
      const x = m.exec(g.trim());
      return x && (y[x[1]] || (y[x[1]] = {}), y[x[1]][x[2]] = x[3]), y;
    }, {});
    for (let y in h) {
      const g = h[y];
      if (g.CL_DEVICE_TYPE === "CL_DEVICE_TYPE_GPU") {
        let x;
        if (g.CL_DEVICE_TOPOLOGY_AMD) {
          const S = g.CL_DEVICE_TOPOLOGY_AMD.match(/[a-zA-Z0-9]+:\d+\.\d+/);
          S && (x = S[0]);
        } else if (g.CL_DEVICE_PCI_BUS_ID_NV && g.CL_DEVICE_PCI_SLOT_ID_NV) {
          const S = parseInt(g.CL_DEVICE_PCI_BUS_ID_NV), w = parseInt(g.CL_DEVICE_PCI_SLOT_ID_NV);
          if (!isNaN(S) && !isNaN(w)) {
            const C = S & 255, A = w >> 3 & 255, v = w & 7;
            x = `${C.toString().padStart(2, "0")}:${A.toString().padStart(2, "0")}.${v}`;
          }
        }
        if (x) {
          let S = p.find((C) => C.busAddress === x);
          S || (S = {
            vendor: "",
            model: "",
            bus: "",
            busAddress: x,
            vram: null,
            vramDynamic: !1
          }, p.push(S)), S.vendor = g.CL_DEVICE_VENDOR, g.CL_DEVICE_BOARD_NAME_AMD ? S.model = g.CL_DEVICE_BOARD_NAME_AMD : S.model = g.CL_DEVICE_NAME;
          const w = parseInt(g.CL_DEVICE_GLOBAL_MEM_SIZE);
          isNaN(w) || (S.vram = Math.round(w / 1024 / 1024));
        }
      }
    }
    return p;
  }
  function r() {
    if (un)
      return un;
    if (Fs)
      try {
        const p = Gi.join(V.WINDIR, "System32", "DriverStore", "FileRepository"), f = Ri.readdirSync(p, { withFileTypes: !0 }).filter((m) => m.isDirectory()).map((m) => {
          const h = Gi.join(p, m.name, "nvidia-smi.exe");
          try {
            const y = Ri.statSync(h);
            return { path: h, ctime: y.ctimeMs };
          } catch {
            return null;
          }
        }).filter(Boolean);
        f.length > 0 && (un = f.reduce((m, h) => h.ctime > m.ctime ? h : m).path);
      } catch {
        V.noop();
      }
    else zn && (un = "nvidia-smi");
    return un;
  }
  function i(p) {
    const f = r();
    if (p = p || V.execOptsWin, f) {
      const h = `"${f}" --query-gpu=driver_version,pci.sub_device_id,name,pci.bus_id,fan.speed,memory.total,memory.used,memory.free,utilization.gpu,utilization.memory,temperature.gpu,temperature.memory,power.draw,power.limit,clocks.gr,clocks.mem --format=csv,noheader,nounits`;
      zn && (p.stdio = ["pipe", "pipe", "ignore"]);
      try {
        const y = h + (zn ? "  2>/dev/null" : "") + (Fs ? "  2> nul" : "");
        return ks(y, p).toString();
      } catch {
        V.noop();
      }
    }
    return "";
  }
  function o() {
    function p(y) {
      return [null, void 0].includes(y) ? y : parseFloat(y);
    }
    const f = i();
    if (!f)
      return [];
    let h = f.split(`
`).filter(Boolean).map((y) => {
      const g = y.split(", ").map((x) => x.includes("N/A") ? void 0 : x);
      return g.length === 16 ? {
        driverVersion: g[0],
        subDeviceId: g[1],
        name: g[2],
        pciBus: g[3],
        fanSpeed: p(g[4]),
        memoryTotal: p(g[5]),
        memoryUsed: p(g[6]),
        memoryFree: p(g[7]),
        utilizationGpu: p(g[8]),
        utilizationMemory: p(g[9]),
        temperatureGpu: p(g[10]),
        temperatureMemory: p(g[11]),
        powerDraw: p(g[12]),
        powerLimit: p(g[13]),
        clockCore: p(g[14]),
        clockMemory: p(g[15])
      } : {};
    });
    return h = h.filter((y) => "pciBus" in y), h;
  }
  function a(p, f) {
    return f.driverVersion && (p.driverVersion = f.driverVersion), f.subDeviceId && (p.subDeviceId = f.subDeviceId), f.name && (p.name = f.name), f.pciBus && (p.pciBus = f.pciBus), f.fanSpeed && (p.fanSpeed = f.fanSpeed), f.memoryTotal && (p.memoryTotal = f.memoryTotal, p.vram = f.memoryTotal, p.vramDynamic = !1), f.memoryUsed && (p.memoryUsed = f.memoryUsed), f.memoryFree && (p.memoryFree = f.memoryFree), f.utilizationGpu && (p.utilizationGpu = f.utilizationGpu), f.utilizationMemory && (p.utilizationMemory = f.utilizationMemory), f.temperatureGpu && (p.temperatureGpu = f.temperatureGpu), f.temperatureMemory && (p.temperatureMemory = f.temperatureMemory), f.powerDraw && (p.powerDraw = f.powerDraw), f.powerLimit && (p.powerLimit = f.powerLimit), f.clockCore && (p.clockCore = f.clockCore), f.clockMemory && (p.clockMemory = f.clockMemory), p;
  }
  function c(p) {
    const f = {
      vendor: "",
      model: "",
      deviceName: "",
      main: !1,
      builtin: !1,
      connection: "",
      sizeX: null,
      sizeY: null,
      pixelDepth: null,
      resolutionX: null,
      resolutionY: null,
      currentResX: null,
      currentResY: null,
      positionX: 0,
      positionY: 0,
      currentRefreshRate: null
    };
    let m = 108;
    if (p.substr(m, 6) === "000000" && (m += 36), p.substr(m, 6) === "000000" && (m += 36), p.substr(m, 6) === "000000" && (m += 36), p.substr(m, 6) === "000000" && (m += 36), f.resolutionX = parseInt("0x0" + p.substr(m + 8, 1) + p.substr(m + 4, 2)), f.resolutionY = parseInt("0x0" + p.substr(m + 14, 1) + p.substr(m + 10, 2)), f.sizeX = parseInt("0x0" + p.substr(m + 28, 1) + p.substr(m + 24, 2)), f.sizeY = parseInt("0x0" + p.substr(m + 29, 1) + p.substr(m + 26, 2)), m = p.indexOf("000000fc00"), m >= 0) {
      let h = p.substr(m + 10, 26);
      h.indexOf("0a") !== -1 && (h = h.substr(0, h.indexOf("0a")));
      try {
        h.length > 2 && (f.model = h.match(/.{1,2}/g).map((y) => String.fromCharCode(parseInt(y, 16))).join(""));
      } catch {
        V.noop();
      }
    } else
      f.model = "";
    return f;
  }
  function l(p, f) {
    const m = [];
    let h = {
      vendor: "",
      model: "",
      deviceName: "",
      main: !1,
      builtin: !1,
      connection: "",
      sizeX: null,
      sizeY: null,
      pixelDepth: null,
      resolutionX: null,
      resolutionY: null,
      currentResX: null,
      currentResY: null,
      positionX: 0,
      positionY: 0,
      currentRefreshRate: null
    }, y = !1, g = !1, x = "", S = 0;
    for (let w = 1; w < p.length; w++)
      if (p[w].trim() !== "") {
        if (p[w][0] !== " " && p[w][0] !== "	" && p[w].toLowerCase().indexOf(" connected ") !== -1) {
          (h.model || h.main || h.builtin || h.connection || h.sizeX !== null || h.pixelDepth !== null || h.resolutionX !== null) && (m.push(h), h = {
            vendor: "",
            model: "",
            main: !1,
            builtin: !1,
            connection: "",
            sizeX: null,
            sizeY: null,
            pixelDepth: null,
            resolutionX: null,
            resolutionY: null,
            currentResX: null,
            currentResY: null,
            positionX: 0,
            positionY: 0,
            currentRefreshRate: null
          });
          let C = p[w].split(" ");
          h.connection = C[0], h.main = p[w].toLowerCase().indexOf(" primary ") >= 0, h.builtin = C[0].toLowerCase().indexOf("edp") >= 0;
        }
        if (y)
          if (p[w].search(/\S|$/) > S)
            x += p[w].toLowerCase().trim();
          else {
            let C = c(x);
            h.vendor = C.vendor, h.model = C.model, h.resolutionX = C.resolutionX, h.resolutionY = C.resolutionY, h.sizeX = C.sizeX, h.sizeY = C.sizeY, h.pixelDepth = f, y = !1;
          }
        if (p[w].toLowerCase().indexOf("edid:") >= 0 && (y = !0, S = p[w].search(/\S|$/)), p[w].toLowerCase().indexOf("*current") >= 0) {
          const C = p[w].split("(");
          if (C && C.length > 1 && C[0].indexOf("x") >= 0) {
            const A = C[0].trim().split("x");
            h.currentResX = V.toInt(A[0]), h.currentResY = V.toInt(A[1]);
          }
          g = !0;
        }
        if (g && p[w].toLowerCase().indexOf("clock") >= 0 && p[w].toLowerCase().indexOf("hz") >= 0 && p[w].toLowerCase().indexOf("v: height") >= 0) {
          const C = p[w].split("clock");
          C && C.length > 1 && C[1].toLowerCase().indexOf("hz") >= 0 && (h.currentRefreshRate = V.toInt(C[1])), g = !1;
        }
      }
    return (h.model || h.main || h.builtin || h.connection || h.sizeX !== null || h.pixelDepth !== null || h.resolutionX !== null) && m.push(h), m;
  }
  return new Promise((p) => {
    process.nextTick(() => {
      let f = {
        controllers: [],
        displays: []
      };
      if (Ac && $t("system_profiler -xml -detailLevel full SPDisplaysDataType", (h, y) => {
        if (!h) {
          try {
            const g = y.toString();
            f = n(V.plistParser(g)[0]._items);
          } catch {
            V.noop();
          }
          try {
            y = ks(
              'defaults read /Library/Preferences/com.apple.windowserver.plist 2>/dev/null;defaults read /Library/Preferences/com.apple.windowserver.displays.plist 2>/dev/null; echo ""',
              { maxBuffer: 1024 * 102400 }
            );
            const g = (y || "").toString(), x = V.plistReader(g);
            if (x.DisplayAnyUserSets && x.DisplayAnyUserSets.Configs && x.DisplayAnyUserSets.Configs[0] && x.DisplayAnyUserSets.Configs[0].DisplayConfig) {
              const S = x.DisplayAnyUserSets.Configs[0].DisplayConfig;
              let w = 0;
              S.forEach((C) => {
                C.CurrentInfo && C.CurrentInfo.OriginX !== void 0 && f.displays && f.displays[w] && (f.displays[w].positionX = C.CurrentInfo.OriginX), C.CurrentInfo && C.CurrentInfo.OriginY !== void 0 && f.displays && f.displays[w] && (f.displays[w].positionY = C.CurrentInfo.OriginY), w++;
              });
            }
            if (x.DisplayAnyUserSets && x.DisplayAnyUserSets.length > 0 && x.DisplayAnyUserSets[0].length > 0 && x.DisplayAnyUserSets[0][0].DisplayID) {
              const S = x.DisplayAnyUserSets[0];
              let w = 0;
              S.forEach((C) => {
                "OriginX" in C && f.displays && f.displays[w] && (f.displays[w].positionX = C.OriginX), "OriginY" in C && f.displays && f.displays[w] && (f.displays[w].positionY = C.OriginY), C.Mode && C.Mode.BitsPerPixel !== void 0 && f.displays && f.displays[w] && (f.displays[w].pixelDepth = C.Mode.BitsPerPixel), w++;
              });
            }
          } catch {
            V.noop();
          }
        }
        t && t(f), p(f);
      }), zn && (V.isRaspberry() && $t(`fbset -s 2> /dev/null | grep 'mode "' ; vcgencmd get_mem gpu 2> /dev/null; tvservice -s 2> /dev/null; tvservice -n 2> /dev/null;`, (y, g) => {
        const x = g.toString().split(`
`);
        if (x.length > 3 && x[0].indexOf('mode "') >= -1 && x[2].indexOf("0x12000a") > -1) {
          const S = x[0].replace("mode", "").replace(/"/g, "").trim().split("x");
          S.length === 2 && f.displays.push({
            vendor: "",
            model: V.getValue(x, "device_name", "="),
            main: !0,
            builtin: !1,
            connection: "HDMI",
            sizeX: null,
            sizeY: null,
            pixelDepth: null,
            resolutionX: parseInt(S[0], 10),
            resolutionY: parseInt(S[1], 10),
            currentResX: null,
            currentResY: null,
            positionX: 0,
            positionY: 0,
            currentRefreshRate: null
          });
        }
        x.length >= 1 && g.toString().indexOf("gpu=") >= -1 && f.controllers.push({
          vendor: "Broadcom",
          model: V.getRpiGpu(),
          bus: "",
          vram: V.getValue(x, "gpu", "=").replace("M", ""),
          vramDynamic: !0
        });
      }), $t("lspci -vvv  2>/dev/null", (h, y) => {
        if (!h) {
          const x = y.toString().split(`
`);
          if (f.controllers.length === 0) {
            f.controllers = e(x);
            const S = o();
            f.controllers = f.controllers.map((w) => a(w, S.find((C) => C.pciBus.toLowerCase().endsWith(w.busAddress.toLowerCase())) || {}));
          }
        }
        $t("clinfo --raw", (x, S) => {
          if (!x) {
            const C = S.toString().split(`
`);
            f.controllers = s(f.controllers, C);
          }
          $t("xdpyinfo 2>/dev/null | grep 'depth of root window' | awk '{ print $5 }'", (C, A) => {
            let v = 0;
            if (!C) {
              const O = A.toString().split(`
`);
              v = parseInt(O[0]) || 0;
            }
            $t("xrandr --verbose 2>/dev/null", (O, $) => {
              if (!O) {
                const ie = $.toString().split(`
`);
                f.displays = l(ie, v);
              }
              t && t(f), p(f);
            });
          });
        });
      })), (Ec || Tc || Dc) && (t && t(null), p(null)), bc && (t && t(null), p(null)), Fs)
        try {
          const m = [];
          m.push(V.powerShell("Get-CimInstance win32_VideoController | fl *")), m.push(
            V.powerShell(
              'gp "HKLM:\\SYSTEM\\ControlSet001\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\*" -ErrorAction SilentlyContinue | where MatchingDeviceId $null -NE | select MatchingDeviceId,HardwareInformation.qwMemorySize | fl'
            )
          ), m.push(V.powerShell("Get-CimInstance win32_desktopmonitor | fl *")), m.push(V.powerShell("Get-CimInstance -Namespace root\\wmi -ClassName WmiMonitorBasicDisplayParams | fl")), m.push(V.powerShell("Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::AllScreens")), m.push(V.powerShell("Get-CimInstance -Namespace root\\wmi -ClassName WmiMonitorConnectionParams | fl")), m.push(
            V.powerShell(
              'gwmi WmiMonitorID -Namespace root\\wmi | ForEach-Object {(($_.ManufacturerName -notmatch 0 | foreach {[char]$_}) -join "") + "|" + (($_.ProductCodeID -notmatch 0 | foreach {[char]$_}) -join "") + "|" + (($_.UserFriendlyName -notmatch 0 | foreach {[char]$_}) -join "") + "|" + (($_.SerialNumberID -notmatch 0 | foreach {[char]$_}) -join "") + "|" + $_.InstanceName}'
            )
          );
          const h = o();
          Promise.all(m).then((y) => {
            const g = y[0].replace(/\r/g, "").split(/\n\s*\n/), x = y[1].replace(/\r/g, "").split(/\n\s*\n/);
            f.controllers = u(g, x), f.controllers = f.controllers.map((O) => O.vendor.toLowerCase() === "nvidia" ? a(
              O,
              h.find(($) => {
                let ie = (O.subDeviceId || "").toLowerCase();
                const se = $.subDeviceId.split("x");
                let ne = se.length > 1 ? se[1].toLowerCase() : se[0].toLowerCase();
                const fe = Math.abs(ie.length - ne.length);
                if (ie.length > ne.length)
                  for (let W = 0; W < fe; W++)
                    ne = "0" + ne;
                else if (ie.length < ne.length)
                  for (let W = 0; W < fe; W++)
                    ie = "0" + ie;
                return ie === ne;
              }) || {}
            ) : O);
            const S = y[2].replace(/\r/g, "").split(/\n\s*\n/);
            S[0].trim() === "" && S.shift(), S.length && S[S.length - 1].trim() === "" && S.pop();
            const w = y[3].replace(/\r/g, "").split("Active ");
            w.shift();
            const C = y[4].replace(/\r/g, "").split("BitsPerPixel ");
            C.shift();
            const A = y[5].replace(/\r/g, "").split(/\n\s*\n/);
            A.shift();
            const v = y[6].replace(/\r/g, "").split(/\n/), k = [];
            v.forEach((O) => {
              const $ = O.split("|");
              $.length === 5 && k.push({
                vendor: $[0],
                code: $[1],
                model: $[2],
                serial: $[3],
                instanceId: $[4]
              });
            }), f.displays = d(C, w, S, A, k), f.displays.length === 1 && (pn && (f.displays[0].resolutionX = pn, f.displays[0].currentResX || (f.displays[0].currentResX = pn)), dn && (f.displays[0].resolutionY = dn, f.displays[0].currentResY === 0 && (f.displays[0].currentResY = dn)), Un && (f.displays[0].pixelDepth = Un)), f.displays = f.displays.map((O) => ($n && !O.currentRefreshRate && (O.currentRefreshRate = $n), O)), t && t(f), p(f);
          }).catch(() => {
            t && t(f), p(f);
          });
        } catch {
          t && t(f), p(f);
        }
    });
  });
  function u(p, f) {
    const m = {};
    for (const y in f)
      if ({}.hasOwnProperty.call(f, y) && f[y].trim() !== "") {
        const g = f[y].trim().split(`
`), x = V.getValue(g, "MatchingDeviceId").match(/PCI\\(VEN_[0-9A-F]{4})&(DEV_[0-9A-F]{4})(?:&(SUBSYS_[0-9A-F]{8}))?(?:&(REV_[0-9A-F]{2}))?/i);
        if (x) {
          const S = parseInt(V.getValue(g, "HardwareInformation.qwMemorySize"));
          if (!isNaN(S)) {
            let w = x[1].toUpperCase() + "&" + x[2].toUpperCase();
            x[3] && (w += "&" + x[3].toUpperCase()), x[4] && (w += "&" + x[4].toUpperCase()), m[w] = S;
          }
        }
      }
    const h = [];
    for (const y in p)
      if ({}.hasOwnProperty.call(p, y) && p[y].trim() !== "") {
        const g = p[y].trim().split(`
`), x = V.getValue(g, "PNPDeviceID", ":").match(/PCI\\(VEN_[0-9A-F]{4})&(DEV_[0-9A-F]{4})(?:&(SUBSYS_[0-9A-F]{8}))?(?:&(REV_[0-9A-F]{2}))?/i);
        let S = null, w = null;
        if (x) {
          if (S = x[3] || "", S && (S = S.split("_")[1]), w == null && x[3] && x[4]) {
            const C = x[1].toUpperCase() + "&" + x[2].toUpperCase() + "&" + x[3].toUpperCase() + "&" + x[4].toUpperCase();
            ({}).hasOwnProperty.call(m, C) && (w = m[C]);
          }
          if (w == null && x[3]) {
            const C = x[1].toUpperCase() + "&" + x[2].toUpperCase() + "&" + x[3].toUpperCase();
            ({}).hasOwnProperty.call(m, C) && (w = m[C]);
          }
          if (w == null && x[4]) {
            const C = x[1].toUpperCase() + "&" + x[2].toUpperCase() + "&" + x[4].toUpperCase();
            ({}).hasOwnProperty.call(m, C) && (w = m[C]);
          }
          if (w == null) {
            const C = x[1].toUpperCase() + "&" + x[2].toUpperCase();
            ({}).hasOwnProperty.call(m, C) && (w = m[C]);
          }
        }
        h.push({
          vendor: V.getValue(g, "AdapterCompatibility", ":"),
          model: V.getValue(g, "name", ":"),
          bus: V.getValue(g, "PNPDeviceID", ":").startsWith("PCI") ? "PCI" : "",
          vram: (w ?? V.toInt(V.getValue(g, "AdapterRAM", ":"))) / 1024 / 1024,
          vramDynamic: V.getValue(g, "VideoMemoryType", ":") === "2",
          subDeviceId: S
        }), pn = V.toInt(V.getValue(g, "CurrentHorizontalResolution", ":")) || pn, dn = V.toInt(V.getValue(g, "CurrentVerticalResolution", ":")) || dn, $n = V.toInt(V.getValue(g, "CurrentRefreshRate", ":")) || $n, Un = V.toInt(V.getValue(g, "CurrentBitsPerPixel", ":")) || Un;
      }
    return h;
  }
  function d(p, f, m, h, y) {
    const g = [];
    let x = "", S = "", w = "", C = 0, A = 0;
    if (m && m.length) {
      const v = m[0].split(`
`);
      x = V.getValue(v, "MonitorManufacturer", ":"), S = V.getValue(v, "Name", ":"), w = V.getValue(v, "PNPDeviceID", ":").replace(/&amp;/g, "&").toLowerCase(), C = V.toInt(V.getValue(v, "ScreenWidth", ":")), A = V.toInt(V.getValue(v, "ScreenHeight", ":"));
    }
    for (let v = 0; v < p.length; v++)
      if (p[v].trim() !== "") {
        p[v] = "BitsPerPixel " + p[v], f[v] = "Active " + f[v], (h.length === 0 || h[v] === void 0) && (h[v] = "Unknown");
        const k = p[v].split(`
`), O = f[v].split(`
`), $ = h[v].split(`
`), ie = V.getValue(k, "BitsPerPixel"), se = V.getValue(k, "Bounds").replace("{", "").replace("}", "").replace(/=/g, ":").split(","), ne = V.getValue(k, "Primary"), fe = V.getValue(O, "MaxHorizontalImageSize"), W = V.getValue(O, "MaxVerticalImageSize"), ye = V.getValue(O, "InstanceName").toLowerCase(), R = V.getValue($, "VideoOutputTechnology"), G = V.getValue(k, "DeviceName");
        let z = "", q = "";
        y.forEach((U) => {
          U.instanceId.toLowerCase().startsWith(ye) && x.startsWith("(") && S.startsWith("PnP") && (z = U.vendor, q = U.model);
        }), g.push({
          vendor: ye.startsWith(w) && z === "" ? x : z,
          model: ye.startsWith(w) && q === "" ? S : q,
          deviceName: G,
          main: ne.toLowerCase() === "true",
          builtin: R === "2147483648",
          connection: R && Wi[R] ? Wi[R] : "",
          resolutionX: V.toInt(V.getValue(se, "Width", ":")),
          resolutionY: V.toInt(V.getValue(se, "Height", ":")),
          sizeX: fe ? parseInt(fe, 10) : null,
          sizeY: W ? parseInt(W, 10) : null,
          pixelDepth: ie,
          currentResX: V.toInt(V.getValue(se, "Width", ":")),
          currentResY: V.toInt(V.getValue(se, "Height", ":")),
          positionX: V.toInt(V.getValue(se, "X", ":")),
          positionY: V.toInt(V.getValue(se, "Y", ":"))
        });
      }
    return p.length === 0 && g.push({
      vendor: x,
      model: S,
      main: !0,
      sizeX: null,
      sizeY: null,
      resolutionX: C,
      resolutionY: A,
      pixelDepth: null,
      currentResX: C,
      currentResY: A,
      positionX: 0,
      positionY: 0
    }), g;
  }
}
$r.graphics = kc;
var Rt = {};
const _ = D, Ui = Ne, me = ee.exec, it = ee.execSync, Fc = _.promisifySave(ee.exec), pt = process.platform, Ae = pt === "linux" || pt === "android", rt = pt === "darwin", rn = pt === "win32", Ee = pt === "freebsd", Te = pt === "openbsd", De = pt === "netbsd", on = pt === "sunos", Z = {}, F = {};
function Rc(t, n) {
  _.isFunction(t) && (n = t, t = "");
  let e = [], s = [];
  function r(c) {
    if (!c.startsWith("/"))
      return "NFS";
    const l = c.split("/"), u = l[l.length - 1], d = e.filter((p) => p.indexOf(u) >= 0);
    return d.length === 1 && d[0].indexOf("APFS") >= 0 ? "APFS" : "HFS";
  }
  function i(c) {
    const l = ["rootfs", "unionfs", "squashfs", "cramfs", "initrd", "initramfs", "devtmpfs", "tmpfs", "udev", "devfs", "specfs", "type", "appimaged"];
    let u = !1;
    return l.forEach((d) => {
      c.toLowerCase().indexOf(d) >= 0 && (u = !0);
    }), u;
  }
  function o(c) {
    const l = c.toString().split(`
`);
    if (l.shift(), c.toString().toLowerCase().indexOf("filesystem")) {
      let u = 0;
      for (let d = 0; d < l.length; d++)
        l[d] && l[d].toLowerCase().startsWith("filesystem") && (u = d);
      for (let d = 0; d < u; d++)
        l.shift();
    }
    return l;
  }
  function a(c) {
    const l = [];
    return c.forEach((u) => {
      if (u !== "" && (u = u.replace(/ +/g, " ").split(" "), u && (u[0].startsWith("/") || u[6] && u[6] === "/" || u[0].indexOf("/") > 0 || u[0].indexOf(":") === 1 || !rt && !i(u[1])))) {
        const d = u[0], p = Ae || Ee || Te || De ? u[1] : r(u[0]), f = parseInt(Ae || Ee || Te || De ? u[2] : u[1], 10) * 1024, m = parseInt(Ae || Ee || Te || De ? u[3] : u[2], 10) * 1024, h = parseInt(Ae || Ee || Te || De ? u[4] : u[3], 10) * 1024, y = parseFloat((100 * (m / (m + h))).toFixed(2)), g = s && Object.keys(s).length > 0 ? s[d] || !1 : null;
        u.splice(0, Ae || Ee || Te || De ? 6 : 5);
        const x = u.join(" ");
        l.find((S) => S.fs === d && S.type === p && S.mount === x) || l.push({
          fs: d,
          type: p,
          size: f,
          used: m,
          available: h,
          use: y,
          mount: x,
          rw: g
        });
      }
    }), l;
  }
  return new Promise((c) => {
    process.nextTick(() => {
      let l = [];
      if (Ae || Ee || Te || De || rt) {
        let u = "";
        if (e = [], s = {}, rt) {
          u = "df -kP";
          try {
            e = it("diskutil list").toString().split(`
`).filter((d) => !d.startsWith("/") && d.indexOf(":") > 0), it("mount").toString().split(`
`).filter((d) => d.startsWith("/")).forEach((d) => {
              s[d.split(" ")[0]] = d.toLowerCase().indexOf("read-only") === -1;
            });
          } catch {
            _.noop();
          }
        }
        if (Ae)
          try {
            u = "export LC_ALL=C; df -kPTx squashfs; unset LC_ALL", it("cat /proc/mounts 2>/dev/null", _.execOptsLinux).toString().split(`
`).filter((d) => d.startsWith("/")).forEach((d) => {
              s[d.split(" ")[0]] = s[d.split(" ")[0]] || !1, d.toLowerCase().indexOf("/snap/") === -1 && (s[d.split(" ")[0]] = d.toLowerCase().indexOf("rw,") >= 0 || d.toLowerCase().indexOf(" rw ") >= 0);
            });
          } catch {
            _.noop();
          }
        if (Ee || Te || De)
          try {
            u = "df -kPT", it("mount").toString().split(`
`).forEach((d) => {
              s[d.split(" ")[0]] = d.toLowerCase().indexOf("read-only") === -1;
            });
          } catch {
            _.noop();
          }
        me(u, { maxBuffer: 1024 * 1024 }, (d, p) => {
          const f = o(p);
          l = a(f), t && (l = l.filter((m) => m.fs.toLowerCase().indexOf(t.toLowerCase()) >= 0 || m.mount.toLowerCase().indexOf(t.toLowerCase()) >= 0)), (!d || l.length) && p.toString().trim() !== "" ? (n && n(l), c(l)) : me("df -kPT 2>/dev/null", { maxBuffer: 1024 * 1024 }, (m, h) => {
            const y = o(h);
            l = a(y), n && n(l), c(l);
          });
        });
      }
      if (on && (n && n(l), c(l)), rn)
        try {
          const u = t ? _.sanitizeString(t, !0) : "", d = `Get-WmiObject Win32_logicaldisk | select Access,Caption,FileSystem,FreeSpace,Size ${u ? "| where -property Caption -eq " + u : ""} | fl`;
          _.powerShell(d).then((p, f) => {
            f || p.toString().split(/\n\s*\n/).forEach((h) => {
              const y = h.split(`\r
`), g = _.toInt(_.getValue(y, "size", ":")), x = _.toInt(_.getValue(y, "freespace", ":")), S = _.getValue(y, "caption", ":"), w = _.getValue(y, "access", ":"), C = w ? _.toInt(w) !== 1 : null;
              g && l.push({
                fs: S,
                type: _.getValue(y, "filesystem", ":"),
                size: g,
                used: g - x,
                available: x,
                use: parseFloat((100 * (g - x) / g).toFixed(2)),
                mount: S,
                rw: C
              });
            }), n && n(l), c(l);
          });
        } catch {
          n && n(l), c(l);
        }
    });
  });
}
Rt.fsSize = Rc;
function Gc(t) {
  return new Promise((n) => {
    process.nextTick(() => {
      const e = {
        max: null,
        allocated: null,
        available: null
      };
      (Ee || Te || De || rt) && me("sysctl -i kern.maxfiles kern.num_files kern.open_files", { maxBuffer: 1024 * 1024 }, (r, i) => {
        if (!r) {
          const o = i.toString().split(`
`);
          e.max = parseInt(_.getValue(o, "kern.maxfiles", ":"), 10), e.allocated = parseInt(_.getValue(o, "kern.num_files", ":"), 10) || parseInt(_.getValue(o, "kern.open_files", ":"), 10), e.available = e.max - e.allocated;
        }
        t && t(e), n(e);
      }), Ae && Ui.readFile("/proc/sys/fs/file-nr", (s, r) => {
        if (s)
          Ui.readFile("/proc/sys/fs/file-max", (i, o) => {
            if (!i) {
              const a = o.toString().split(`
`);
              a[0] && (e.max = parseInt(a[0], 10));
            }
            t && t(e), n(e);
          });
        else {
          const i = r.toString().split(`
`);
          if (i[0]) {
            const o = i[0].replace(/\s+/g, " ").split(" ");
            o.length === 3 && (e.allocated = parseInt(o[0], 10), e.available = parseInt(o[1], 10), e.max = parseInt(o[2], 10), e.available || (e.available = e.max - e.allocated));
          }
          t && t(e), n(e);
        }
      }), on && (t && t(null), n(null)), rn && (t && t(null), n(null));
    });
  });
}
Rt.fsOpenFiles = Gc;
function Wc(t) {
  return parseInt(t.substr(t.indexOf(" (") + 2, t.indexOf(" Bytes)") - 10), 10);
}
function zc(t) {
  const n = [];
  let e = 0;
  return t.forEach((s) => {
    if (s.length > 0)
      if (s[0] === "*")
        e++;
      else {
        const r = s.split(":");
        r.length > 1 && (n[e] || (n[e] = {
          name: "",
          identifier: "",
          type: "disk",
          fsType: "",
          mount: "",
          size: 0,
          physical: "HDD",
          uuid: "",
          label: "",
          model: "",
          serial: "",
          removable: !1,
          protocol: "",
          group: "",
          device: ""
        }), r[0] = r[0].trim().toUpperCase().replace(/ +/g, ""), r[1] = r[1].trim(), r[0] === "DEVICEIDENTIFIER" && (n[e].identifier = r[1]), r[0] === "DEVICENODE" && (n[e].name = r[1]), r[0] === "VOLUMENAME" && r[1].indexOf("Not applicable") === -1 && (n[e].label = r[1]), r[0] === "PROTOCOL" && (n[e].protocol = r[1]), r[0] === "DISKSIZE" && (n[e].size = Wc(r[1])), r[0] === "FILESYSTEMPERSONALITY" && (n[e].fsType = r[1]), r[0] === "MOUNTPOINT" && (n[e].mount = r[1]), r[0] === "VOLUMEUUID" && (n[e].uuid = r[1]), r[0] === "READ-ONLYMEDIA" && r[1] === "Yes" && (n[e].physical = "CD/DVD"), r[0] === "SOLIDSTATE" && r[1] === "Yes" && (n[e].physical = "SSD"), r[0] === "VIRTUAL" && (n[e].type = "virtual"), r[0] === "REMOVABLEMEDIA" && (n[e].removable = r[1] === "Removable"), r[0] === "PARTITIONTYPE" && (n[e].type = "part"), r[0] === "DEVICE/MEDIANAME" && (n[e].model = r[1]));
      }
  }), n;
}
function ei(t) {
  let n = [];
  return t.filter((e) => e !== "").forEach((e) => {
    try {
      e = decodeURIComponent(e.replace(/\\x/g, "%")), e = e.replace(/\\/g, "\\\\");
      const s = JSON.parse(e);
      n.push({
        name: _.sanitizeShellString(s.name),
        type: s.type,
        fsType: s.fsType,
        mount: s.mountpoint,
        size: parseInt(s.size, 10),
        physical: s.type === "disk" ? s.rota === "0" ? "SSD" : "HDD" : s.type === "rom" ? "CD/DVD" : "",
        uuid: s.uuid,
        label: s.label,
        model: (s.model || "").trim(),
        serial: s.serial,
        removable: s.rm === "1",
        protocol: s.tran,
        group: s.group || ""
      });
    } catch {
      _.noop();
    }
  }), n = _.unique(n), n = _.sortByKey(n, ["type", "name"]), n;
}
function Uc(t) {
  const n = _.getValue(t, "md_level", "="), e = _.getValue(t, "md_name", "="), s = _.getValue(t, "md_uuid", "="), r = [];
  return t.forEach((i) => {
    i.toLowerCase().startsWith("md_device_dev") && i.toLowerCase().indexOf("/dev/") > 0 && r.push(i.split("/dev/")[1]);
  }), {
    raid: n,
    label: e,
    uuid: s,
    members: r
  };
}
function $i(t) {
  let n = t;
  try {
    t.forEach((e) => {
      if (e.type.startsWith("raid")) {
        const s = it(`mdadm --export --detail /dev/${_.sanitizeString(e.name, !0)}`, _.execOptsLinux).toString().split(`
`), r = Uc(s);
        e.label = r.label, e.uuid = r.uuid, r && r.members && r.members.length && r.raid === e.type && (n = n.map((i) => (i.fsType === "linux_raid_member" && r.members.indexOf(i.name) >= 0 && (i.group = e.name), i)));
      }
    });
  } catch {
    _.noop();
  }
  return n;
}
function $c(t) {
  const n = [];
  return t.forEach((e) => {
    e.type.startsWith("disk") && n.push(e.name);
  }), n;
}
function Hc(t) {
  let n = t;
  try {
    const e = $c(t);
    n = n.map((s) => ((s.type.startsWith("part") || s.type.startsWith("disk")) && e.forEach((r) => {
      s.name.startsWith(r) && (s.device = "/dev/" + r);
    }), s));
  } catch {
    _.noop();
  }
  return n;
}
function Xc(t) {
  const n = [];
  return t.forEach((e) => {
    if (e.type.startsWith("disk") && n.push({ name: e.name, model: e.model, device: e.name }), e.type.startsWith("virtual")) {
      let s = "";
      n.forEach((r) => {
        r.model === e.model && (s = r.device);
      }), s && n.push({ name: e.name, model: e.model, device: s });
    }
  }), n;
}
function Kc(t) {
  let n = t;
  try {
    const e = Xc(t);
    n = n.map((s) => ((s.type.startsWith("part") || s.type.startsWith("disk") || s.type.startsWith("virtual")) && e.forEach((r) => {
      s.name.startsWith(r.name) && (s.device = r.device);
    }), s));
  } catch {
    _.noop();
  }
  return n;
}
function jc(t) {
  const n = [];
  return t.forEach((e) => {
    const s = e.split(`\r
`), r = _.getValue(s, "DeviceID", ":");
    let i = e.split("@{DeviceID=");
    i.length > 1 && (i = i.slice(1), i.forEach((o) => {
      n.push({ name: o.split(";")[0].toUpperCase(), device: r });
    }));
  }), n;
}
function qc(t, n) {
  const e = jc(n);
  return t.map((s) => {
    const r = e.filter((i) => i.name === s.name.toUpperCase());
    return r.length > 0 && (s.device = r[0].device), s;
  }), t;
}
function ti(t) {
  return t.toString().replace(/NAME=/g, '{"name":').replace(/FSTYPE=/g, ',"fsType":').replace(/TYPE=/g, ',"type":').replace(/SIZE=/g, ',"size":').replace(/MOUNTPOINT=/g, ',"mountpoint":').replace(/UUID=/g, ',"uuid":').replace(/ROTA=/g, ',"rota":').replace(/RO=/g, ',"ro":').replace(/RM=/g, ',"rm":').replace(/TRAN=/g, ',"tran":').replace(/SERIAL=/g, ',"serial":').replace(/LABEL=/g, ',"label":').replace(/MODEL=/g, ',"model":').replace(/OWNER=/g, ',"owner":').replace(/GROUP=/g, ',"group":').replace(/\n/g, `}
`);
}
function Yc(t) {
  return new Promise((n) => {
    process.nextTick(() => {
      let e = [];
      if (Ae && me("lsblk -bPo NAME,TYPE,SIZE,FSTYPE,MOUNTPOINT,UUID,ROTA,RO,RM,TRAN,SERIAL,LABEL,MODEL,OWNER 2>/dev/null", { maxBuffer: 1048576 }, (r, i) => {
        if (r)
          me("lsblk -bPo NAME,TYPE,SIZE,FSTYPE,MOUNTPOINT,UUID,ROTA,RO,RM,LABEL,MODEL,OWNER 2>/dev/null", { maxBuffer: 1048576 }, (a, c) => {
            if (!a) {
              const l = ti(c).split(`
`);
              e = ei(l), e = $i(e);
            }
            t && t(e), n(e);
          }).on("error", () => {
            t && t(e), n(e);
          });
        else {
          const o = ti(i).split(`
`);
          e = ei(o), e = $i(e), e = Hc(e), t && t(e), n(e);
        }
      }).on("error", () => {
        t && t(e), n(e);
      }), rt && me("diskutil info -all", { maxBuffer: 1048576 }, (r, i) => {
        if (!r) {
          const o = i.toString().split(`
`);
          e = zc(o), e = Kc(e);
        }
        t && t(e), n(e);
      }).on("error", () => {
        t && t(e), n(e);
      }), on && (t && t(e), n(e)), rn) {
        const s = ["Unknown", "NoRoot", "Removable", "Local", "Network", "CD/DVD", "RAM"];
        try {
          const r = [];
          r.push(_.powerShell("Get-CimInstance -ClassName Win32_LogicalDisk | select Caption,DriveType,Name,FileSystem,Size,VolumeSerialNumber,VolumeName | fl")), r.push(
            _.powerShell(
              "Get-WmiObject -Class Win32_diskdrive | Select-Object -Property PNPDeviceId,DeviceID, Model, Size, @{L='Partitions'; E={$_.GetRelated('Win32_DiskPartition').GetRelated('Win32_LogicalDisk') | Select-Object -Property DeviceID, VolumeName, Size, FreeSpace}} | fl"
            )
          ), _.promiseAll(r).then((i) => {
            const o = i.results[0].toString().split(/\n\s*\n/), a = i.results[1].toString().split(/\n\s*\n/);
            o.forEach((c) => {
              const l = c.split(`\r
`), u = _.getValue(l, "drivetype", ":");
              u && e.push({
                name: _.getValue(l, "name", ":"),
                identifier: _.getValue(l, "caption", ":"),
                type: "disk",
                fsType: _.getValue(l, "filesystem", ":").toLowerCase(),
                mount: _.getValue(l, "caption", ":"),
                size: _.getValue(l, "size", ":"),
                physical: u >= 0 && u <= 6 ? s[u] : s[0],
                uuid: _.getValue(l, "volumeserialnumber", ":"),
                label: _.getValue(l, "volumename", ":"),
                model: "",
                serial: _.getValue(l, "volumeserialnumber", ":"),
                removable: u === "2",
                protocol: "",
                group: "",
                device: ""
              });
            }), e = qc(e, a), t && t(e), n(e);
          });
        } catch {
          t && t(e), n(e);
        }
      }
      (Ee || Te || De) && (t && t(null), n(null));
    });
  });
}
Rt.blockDevices = Yc;
function Hi(t, n) {
  const e = {
    rx: 0,
    wx: 0,
    tx: 0,
    rx_sec: null,
    wx_sec: null,
    tx_sec: null,
    ms: 0
  };
  return Z && Z.ms ? (e.rx = t, e.wx = n, e.tx = e.rx + e.wx, e.ms = Date.now() - Z.ms, e.rx_sec = (e.rx - Z.bytes_read) / (e.ms / 1e3), e.wx_sec = (e.wx - Z.bytes_write) / (e.ms / 1e3), e.tx_sec = e.rx_sec + e.wx_sec, Z.rx_sec = e.rx_sec, Z.wx_sec = e.wx_sec, Z.tx_sec = e.tx_sec, Z.bytes_read = e.rx, Z.bytes_write = e.wx, Z.bytes_overall = e.rx + e.wx, Z.ms = Date.now(), Z.last_ms = e.ms) : (e.rx = t, e.wx = n, e.tx = e.rx + e.wx, Z.rx_sec = null, Z.wx_sec = null, Z.tx_sec = null, Z.bytes_read = e.rx, Z.bytes_write = e.wx, Z.bytes_overall = e.rx + e.wx, Z.ms = Date.now(), Z.last_ms = 0), e;
}
function Jc(t) {
  return new Promise((n) => {
    process.nextTick(() => {
      if (rn || Ee || Te || De || on)
        return n(null);
      let e = {
        rx: 0,
        wx: 0,
        tx: 0,
        rx_sec: null,
        wx_sec: null,
        tx_sec: null,
        ms: 0
      }, s = 0, r = 0;
      Z && !Z.ms || Z && Z.ms && Date.now() - Z.ms >= 500 ? (Ae && me("lsblk -r 2>/dev/null | grep /", { maxBuffer: 1048576 }, (o, a) => {
        if (o)
          t && t(e), n(e);
        else {
          const c = a.toString().split(`
`), l = [];
          c.forEach((p) => {
            p !== "" && (p = p.trim().split(" "), l.indexOf(p[0]) === -1 && l.push(p[0]));
          });
          const u = l.join("|");
          me('cat /proc/diskstats | egrep "' + u + '"', { maxBuffer: 1024 * 1024 }, (p, f) => {
            p || (f.toString().split(`
`).forEach((h) => {
              h = h.trim(), h !== "" && (h = h.replace(/ +/g, " ").split(" "), s += parseInt(h[5], 10) * 512, r += parseInt(h[9], 10) * 512);
            }), e = Hi(s, r)), t && t(e), n(e);
          }).on("error", () => {
            t && t(e), n(e);
          });
        }
      }).on("error", () => {
        t && t(e), n(e);
      }), rt && me(
        `ioreg -c IOBlockStorageDriver -k Statistics -r -w0 | sed -n "/IOBlockStorageDriver/,/Statistics/p" | grep "Statistics" | tr -cd "01234567890,
"`,
        { maxBuffer: 1048576 },
        (o, a) => {
          o || (a.toString().split(`
`).forEach((l) => {
            l = l.trim(), l !== "" && (l = l.split(","), s += parseInt(l[2], 10), r += parseInt(l[9], 10));
          }), e = Hi(s, r)), t && t(e), n(e);
        }
      ).on("error", () => {
        t && t(e), n(e);
      })) : (e.ms = Z.last_ms, e.rx = Z.bytes_read, e.wx = Z.bytes_write, e.tx = Z.bytes_read + Z.bytes_write, e.rx_sec = Z.rx_sec, e.wx_sec = Z.wx_sec, e.tx_sec = Z.tx_sec, t && t(e), n(e));
    });
  });
}
Rt.fsStats = Jc;
function Xi(t, n, e, s, r) {
  const i = {
    rIO: 0,
    wIO: 0,
    tIO: 0,
    rIO_sec: null,
    wIO_sec: null,
    tIO_sec: null,
    rWaitTime: 0,
    wWaitTime: 0,
    tWaitTime: 0,
    rWaitPercent: null,
    wWaitPercent: null,
    tWaitPercent: null,
    ms: 0
  };
  return F && F.ms ? (i.rIO = t, i.wIO = n, i.tIO = t + n, i.ms = Date.now() - F.ms, i.rIO_sec = (i.rIO - F.rIO) / (i.ms / 1e3), i.wIO_sec = (i.wIO - F.wIO) / (i.ms / 1e3), i.tIO_sec = i.rIO_sec + i.wIO_sec, i.rWaitTime = e, i.wWaitTime = s, i.tWaitTime = r, i.rWaitPercent = (i.rWaitTime - F.rWaitTime) * 100 / i.ms, i.wWaitPercent = (i.wWaitTime - F.wWaitTime) * 100 / i.ms, i.tWaitPercent = (i.tWaitTime - F.tWaitTime) * 100 / i.ms, F.rIO = t, F.wIO = n, F.rIO_sec = i.rIO_sec, F.wIO_sec = i.wIO_sec, F.tIO_sec = i.tIO_sec, F.rWaitTime = e, F.wWaitTime = s, F.tWaitTime = r, F.rWaitPercent = i.rWaitPercent, F.wWaitPercent = i.wWaitPercent, F.tWaitPercent = i.tWaitPercent, F.last_ms = i.ms, F.ms = Date.now()) : (i.rIO = t, i.wIO = n, i.tIO = t + n, i.rWaitTime = e, i.wWaitTime = s, i.tWaitTime = r, F.rIO = t, F.wIO = n, F.rIO_sec = null, F.wIO_sec = null, F.tIO_sec = null, F.rWaitTime = e, F.wWaitTime = s, F.tWaitTime = r, F.rWaitPercent = null, F.wWaitPercent = null, F.tWaitPercent = null, F.last_ms = 0, F.ms = Date.now()), i;
}
function Qc(t) {
  return new Promise((n) => {
    process.nextTick(() => {
      if (rn || on)
        return n(null);
      let e = {
        rIO: 0,
        wIO: 0,
        tIO: 0,
        rIO_sec: null,
        wIO_sec: null,
        tIO_sec: null,
        rWaitTime: 0,
        wWaitTime: 0,
        tWaitTime: 0,
        rWaitPercent: null,
        wWaitPercent: null,
        tWaitPercent: null,
        ms: 0
      }, s = 0, r = 0, i = 0, o = 0, a = 0;
      F && !F.ms || F && F.ms && Date.now() - F.ms >= 500 ? ((Ae || Ee || Te || De) && me('for mount in `lsblk 2>/dev/null | grep " disk " | sed "s/[│└─├]//g" | awk \'{$1=$1};1\' | cut -d " " -f 1 | sort -u`; do cat /sys/block/$mount/stat | sed -r "s/ +/;/g" | sed -r "s/^;//"; done', { maxBuffer: 1024 * 1024 }, (l, u) => {
        l ? (t && t(e), n(e)) : (u.split(`
`).forEach((p) => {
          if (!p)
            return;
          const f = p.split(";");
          s += parseInt(f[0], 10), r += parseInt(f[4], 10), i += parseInt(f[3], 10), o += parseInt(f[7], 10), a += parseInt(f[10], 10);
        }), e = Xi(s, r, i, o, a), t && t(e), n(e));
      }), rt && me(
        `ioreg -c IOBlockStorageDriver -k Statistics -r -w0 | sed -n "/IOBlockStorageDriver/,/Statistics/p" | grep "Statistics" | tr -cd "01234567890,
"`,
        { maxBuffer: 1024 * 1024 },
        (c, l) => {
          c || (l.toString().split(`
`).forEach((d) => {
            d = d.trim(), d !== "" && (d = d.split(","), s += parseInt(d[10], 10), r += parseInt(d[0], 10));
          }), e = Xi(s, r, i, o, a)), t && t(e), n(e);
        }
      )) : (e.rIO = F.rIO, e.wIO = F.wIO, e.tIO = F.rIO + F.wIO, e.ms = F.last_ms, e.rIO_sec = F.rIO_sec, e.wIO_sec = F.wIO_sec, e.tIO_sec = F.tIO_sec, e.rWaitTime = F.rWaitTime, e.wWaitTime = F.wWaitTime, e.tWaitTime = F.tWaitTime, e.rWaitPercent = F.rWaitPercent, e.wWaitPercent = F.wWaitPercent, e.tWaitPercent = F.tWaitPercent, t && t(e), n(e));
    });
  });
}
Rt.disksIO = Qc;
function Zc(t) {
  function n(e) {
    const s = [
      { pattern: "WESTERN.*", manufacturer: "Western Digital" },
      { pattern: "^WDC.*", manufacturer: "Western Digital" },
      { pattern: "WD.*", manufacturer: "Western Digital" },
      { pattern: "TOSHIBA.*", manufacturer: "Toshiba" },
      { pattern: "HITACHI.*", manufacturer: "Hitachi" },
      { pattern: "^IC.*", manufacturer: "Hitachi" },
      { pattern: "^HTS.*", manufacturer: "Hitachi" },
      { pattern: "SANDISK.*", manufacturer: "SanDisk" },
      { pattern: "KINGSTON.*", manufacturer: "Kingston Technology" },
      { pattern: "^SONY.*", manufacturer: "Sony" },
      { pattern: "TRANSCEND.*", manufacturer: "Transcend" },
      { pattern: "SAMSUNG.*", manufacturer: "Samsung" },
      { pattern: "^ST(?!I\\ ).*", manufacturer: "Seagate" },
      { pattern: "^STI\\ .*", manufacturer: "SimpleTech" },
      { pattern: "^D...-.*", manufacturer: "IBM" },
      { pattern: "^IBM.*", manufacturer: "IBM" },
      { pattern: "^FUJITSU.*", manufacturer: "Fujitsu" },
      { pattern: "^MP.*", manufacturer: "Fujitsu" },
      { pattern: "^MK.*", manufacturer: "Toshiba" },
      { pattern: "MAXTO.*", manufacturer: "Maxtor" },
      { pattern: "PIONEER.*", manufacturer: "Pioneer" },
      { pattern: "PHILIPS.*", manufacturer: "Philips" },
      { pattern: "QUANTUM.*", manufacturer: "Quantum Technology" },
      { pattern: "FIREBALL.*", manufacturer: "Quantum Technology" },
      { pattern: "^VBOX.*", manufacturer: "VirtualBox" },
      { pattern: "CORSAIR.*", manufacturer: "Corsair Components" },
      { pattern: "CRUCIAL.*", manufacturer: "Crucial" },
      { pattern: "ECM.*", manufacturer: "ECM" },
      { pattern: "INTEL.*", manufacturer: "INTEL" },
      { pattern: "EVO.*", manufacturer: "Samsung" },
      { pattern: "APPLE.*", manufacturer: "Apple" }
    ];
    let r = "";
    return e && (e = e.toUpperCase(), s.forEach((i) => {
      RegExp(i.pattern).test(e) && (r = i.manufacturer);
    })), r;
  }
  return new Promise((e) => {
    process.nextTick(() => {
      const s = (o) => {
        for (let a = 0; a < o.length; a++)
          delete o[a].BSDName;
        t && t(o), e(o);
      }, r = [];
      let i = "";
      if (Ae) {
        let o = "";
        me("export LC_ALL=C; lsblk -ablJO 2>/dev/null; unset LC_ALL", { maxBuffer: 1024 * 1024 }, (a, c) => {
          if (!a)
            try {
              const l = c.toString().trim();
              let u = [];
              try {
                const d = JSON.parse(l);
                d && Object.hasOwn(d, "blockdevices") && (u = d.blockdevices.filter((p) => p.type === "disk" && p.size > 0 && (p.model !== null || p.mountpoint === null && p.label === null && p.fstype === null && p.parttype === null && p.path && p.path.indexOf("/ram") !== 0 && p.path.indexOf("/loop") !== 0 && p["disc-max"] && p["disc-max"] !== 0)));
              } catch {
                try {
                  const d = it(
                    "export LC_ALL=C; lsblk -bPo NAME,TYPE,SIZE,FSTYPE,MOUNTPOINT,UUID,ROTA,RO,RM,LABEL,MODEL,OWNER,GROUP 2>/dev/null; unset LC_ALL",
                    _.execOptsLinux
                  ).toString(), p = ti(d).split(`
`);
                  u = ei(p).filter((m) => m.type === "disk" && m.size > 0 && (m.model !== null && m.model !== "" || m.mount === "" && m.label === "" && m.fsType === ""));
                } catch {
                  _.noop();
                }
              }
              u.forEach((d) => {
                let p = "";
                const f = "/dev/" + d.name, m = d.name;
                try {
                  p = it("cat /sys/block/" + m + "/queue/rotational 2>/dev/null", _.execOptsLinux).toString().split(`
`)[0];
                } catch {
                  _.noop();
                }
                let h = d.tran ? d.tran.toUpperCase().trim() : "";
                h === "NVME" && (p = "2", h = "PCIe"), r.push({
                  device: f,
                  type: p === "0" ? "SSD" : p === "1" ? "HD" : p === "2" ? "NVMe" : d.model && d.model.indexOf("SSD") > -1 ? "SSD" : d.model && d.model.indexOf("NVM") > -1 ? "NVMe" : "HD",
                  name: d.model || "",
                  vendor: n(d.model) || (d.vendor ? d.vendor.trim() : ""),
                  size: d.size || 0,
                  bytesPerSector: null,
                  totalCylinders: null,
                  totalHeads: null,
                  totalSectors: null,
                  totalTracks: null,
                  tracksPerCylinder: null,
                  sectorsPerTrack: null,
                  firmwareRevision: d.rev ? d.rev.trim() : "",
                  serialNum: d.serial ? d.serial.trim() : "",
                  interfaceType: h,
                  smartStatus: "unknown",
                  temperature: null,
                  BSDName: f
                }), i += `printf "
${f}|"; smartctl -H ${f} | grep overall;`, o += `${o ? 'printf ",";' : ""}smartctl -a -j ${f};`;
              });
            } catch {
              _.noop();
            }
          o ? me(o, { maxBuffer: 1024 * 1024 }, (l, u) => {
            try {
              JSON.parse(`[${u}]`).forEach((p) => {
                const f = p.smartctl.argv[p.smartctl.argv.length - 1];
                for (let m = 0; m < r.length; m++)
                  r[m].BSDName === f && (r[m].smartStatus = p.smart_status.passed ? "Ok" : p.smart_status.passed === !1 ? "Predicted Failure" : "unknown", p.temperature && p.temperature.current && (r[m].temperature = p.temperature.current), r[m].smartData = p);
              }), s(r);
            } catch {
              i ? (i = i + `printf "
"`, me(i, { maxBuffer: 1024 * 1024 }, (d, p) => {
                p.toString().split(`
`).forEach((m) => {
                  if (m) {
                    const h = m.split("|");
                    if (h.length === 2) {
                      const y = h[0];
                      h[1] = h[1].trim();
                      const g = h[1].split(":");
                      if (g.length === 2) {
                        g[1] = g[1].trim();
                        const x = g[1].toLowerCase();
                        for (let S = 0; S < r.length; S++)
                          r[S].BSDName === y && (r[S].smartStatus = x === "passed" ? "Ok" : x === "failed!" ? "Predicted Failure" : "unknown");
                      }
                    }
                  }
                }), s(r);
              })) : s(r);
            }
          }) : s(r);
        });
      }
      if ((Ee || Te || De) && (t && t(r), e(r)), on && (t && t(r), e(r)), rt) {
        let o = "";
        me("system_profiler SPSerialATADataType SPNVMeDataType SPUSBDataType SPStorageDataType", { maxBuffer: 1024 * 1024 }, (a, c) => {
          if (a)
            s(r);
          else {
            const l = c.toString().split(`
`), u = [], d = [], p = [], f = [];
            let m = "SATA";
            l.forEach((h) => {
              h === "NVMExpress:" ? m = "NVMe" : h === "Storage:" ? m = "Storage" : h === "USB:" ? m = "USB" : h === "SATA/SATA Express:" ? m = "SATA" : m === "SATA" ? u.push(h) : m === "NVMe" ? d.push(h) : m === "Storage" ? p.push(h) : m === "USB" && f.push(h);
            });
            try {
              const h = u.join(`
`).split(" Physical Interconnect: ");
              h.shift(), h.forEach((y) => {
                y = "InterfaceType: " + y;
                const g = y.split(`
`), x = _.getValue(g, "Medium Type", ":", !0).trim(), S = _.getValue(g, "capacity", ":", !0).trim(), w = _.getValue(g, "BSD Name", ":", !0).trim();
                if (S) {
                  let C = 0;
                  if (S.indexOf("(") >= 0 && (C = parseInt(
                    S.match(/\(([^)]+)\)/)[1].replace(/\./g, "").replace(/,/g, "").replace(/\s/g, ""),
                    10
                  )), C || (C = parseInt(S, 10)), C) {
                    const A = _.getValue(g, "S.M.A.R.T. status", ":", !0).trim().toLowerCase();
                    r.push({
                      device: w,
                      type: x.startsWith("Solid") ? "SSD" : "HD",
                      name: _.getValue(g, "Model", ":", !0).trim(),
                      vendor: n(_.getValue(g, "Model", ":", !0).trim()) || _.getValue(g, "Manufacturer", ":", !0),
                      size: C,
                      bytesPerSector: null,
                      totalCylinders: null,
                      totalHeads: null,
                      totalSectors: null,
                      totalTracks: null,
                      tracksPerCylinder: null,
                      sectorsPerTrack: null,
                      firmwareRevision: _.getValue(g, "Revision", ":", !0).trim(),
                      serialNum: _.getValue(g, "Serial Number", ":", !0).trim(),
                      interfaceType: _.getValue(g, "InterfaceType", ":", !0).trim(),
                      smartStatus: A === "verified" ? "OK" : A || "unknown",
                      temperature: null,
                      BSDName: w
                    }), i = i + `printf "
` + w + '|"; diskutil info /dev/' + w + " | grep SMART;", o += `${o ? 'printf ",";' : ""}smartctl -a -j ${w};`;
                  }
                }
              });
            } catch {
              _.noop();
            }
            try {
              const h = d.join(`
`).split(`

          Capacity:`);
              h.shift(), h.forEach((y) => {
                y = `!Capacity: ${y}`;
                const g = y.split(`
`), x = _.getValue(g, "link width", ":", !0).trim(), S = _.getValue(g, "!capacity", ":", !0).trim(), w = _.getValue(g, "BSD Name", ":", !0).trim();
                if (S) {
                  let C = 0;
                  if (S.indexOf("(") >= 0 && (C = parseInt(
                    S.match(/\(([^)]+)\)/)[1].replace(/\./g, "").replace(/,/g, "").replace(/\s/g, ""),
                    10
                  )), C || (C = parseInt(S, 10)), C) {
                    const A = _.getValue(g, "S.M.A.R.T. status", ":", !0).trim().toLowerCase();
                    r.push({
                      device: w,
                      type: "NVMe",
                      name: _.getValue(g, "Model", ":", !0).trim(),
                      vendor: n(_.getValue(g, "Model", ":", !0).trim()),
                      size: C,
                      bytesPerSector: null,
                      totalCylinders: null,
                      totalHeads: null,
                      totalSectors: null,
                      totalTracks: null,
                      tracksPerCylinder: null,
                      sectorsPerTrack: null,
                      firmwareRevision: _.getValue(g, "Revision", ":", !0).trim(),
                      serialNum: _.getValue(g, "Serial Number", ":", !0).trim(),
                      interfaceType: ("PCIe " + x).trim(),
                      smartStatus: A === "verified" ? "OK" : A || "unknown",
                      temperature: null,
                      BSDName: w
                    }), i = `${i}printf "
${w}|"; diskutil info /dev/${w} | grep SMART;`, o += `${o ? 'printf ",";' : ""}smartctl -a -j ${w};`;
                  }
                }
              });
            } catch {
              _.noop();
            }
            try {
              const h = f.join(`
`).replaceAll(`Media:
 `, "Model:").split(`

          Product ID:`);
              h.shift(), h.forEach((y) => {
                const g = y.split(`
`), x = _.getValue(g, "Capacity", ":", !0).trim(), S = _.getValue(g, "BSD Name", ":", !0).trim();
                if (x) {
                  let w = 0;
                  if (x.indexOf("(") >= 0 && (w = parseInt(
                    x.match(/\(([^)]+)\)/)[1].replace(/\./g, "").replace(/,/g, "").replace(/\s/g, ""),
                    10
                  )), w || (w = parseInt(x, 10)), w) {
                    const C = _.getValue(g, "S.M.A.R.T. status", ":", !0).trim().toLowerCase();
                    r.push({
                      device: S,
                      type: "USB",
                      name: _.getValue(g, "Model", ":", !0).trim().replaceAll(":", ""),
                      vendor: n(_.getValue(g, "Model", ":", !0).trim()),
                      size: w,
                      bytesPerSector: null,
                      totalCylinders: null,
                      totalHeads: null,
                      totalSectors: null,
                      totalTracks: null,
                      tracksPerCylinder: null,
                      sectorsPerTrack: null,
                      firmwareRevision: _.getValue(g, "Revision", ":", !0).trim(),
                      serialNum: _.getValue(g, "Serial Number", ":", !0).trim(),
                      interfaceType: "USB",
                      smartStatus: C === "verified" ? "OK" : C || "unknown",
                      temperature: null,
                      BSDName: S
                    }), i = i + `printf "
` + S + '|"; diskutil info /dev/' + S + " | grep SMART;", o += `${o ? 'printf ",";' : ""}smartctl -a -j ${S};`;
                  }
                }
              });
            } catch {
              _.noop();
            }
            try {
              const h = {};
              r.forEach((g) => {
                const x = (g.BSDName || "").match(/disk\d+/);
                x && (h[x[0]] = !0);
              });
              const y = p.join(`
`).split("      Free:");
              y.shift(), y.forEach((g) => {
                const x = g.split(`
`);
                if (_.getValue(x, "Internal", ":", !0).trim().toLowerCase() !== "no")
                  return;
                const w = _.getValue(x, "BSD Name", ":", !0).trim().match(/disk\d+/), C = w ? w[0] : "";
                if (!C || h[C])
                  return;
                const A = _.getValue(x, "Capacity", ":", !0).trim();
                if (A) {
                  let v = 0;
                  if (A.indexOf("(") >= 0 && (v = parseInt(
                    A.match(/\(([^)]+)\)/)[1].replace(/\./g, "").replace(/,/g, "").replace(/\s/g, ""),
                    10
                  )), v || (v = parseInt(A, 10)), v) {
                    h[C] = !0;
                    const k = _.getValue(x, "Protocol", ":", !0).trim(), O = _.getValue(x, "Device Name", ":", !0).trim();
                    r.push({
                      device: C,
                      type: k && k !== "USB" ? k : "USB",
                      name: O,
                      vendor: n(O),
                      size: v,
                      bytesPerSector: null,
                      totalCylinders: null,
                      totalHeads: null,
                      totalSectors: null,
                      totalTracks: null,
                      tracksPerCylinder: null,
                      sectorsPerTrack: null,
                      firmwareRevision: "",
                      serialNum: "",
                      interfaceType: k || "USB",
                      smartStatus: "unknown",
                      temperature: null,
                      BSDName: C
                    }), i = i + `printf "
` + C + '|"; diskutil info /dev/' + C + " | grep SMART;", o += `${o ? 'printf ",";' : ""}smartctl -a -j ${C};`;
                  }
                }
              });
            } catch {
              _.noop();
            }
            o ? me(o, { maxBuffer: 1024 * 1024 }, (h, y) => {
              try {
                JSON.parse(`[${y}]`).forEach((x) => {
                  const S = x.smartctl.argv[x.smartctl.argv.length - 1];
                  for (let w = 0; w < r.length; w++)
                    r[w].BSDName === S && (r[w].smartStatus = x.smart_status.passed ? "Ok" : x.smart_status.passed === !1 ? "Predicted Failure" : "unknown", x.temperature && x.temperature.current && (r[w].temperature = x.temperature.current), r[w].smartData = x);
                }), s(r);
              } catch {
                i ? (i = i + `printf "
"`, me(i, { maxBuffer: 1024 * 1024 }, (x, S) => {
                  S.toString().split(`
`).forEach((C) => {
                    if (C) {
                      const A = C.split("|");
                      if (A.length === 2) {
                        const v = A[0];
                        A[1] = A[1].trim();
                        const k = A[1].split(":");
                        if (k.length === 2) {
                          k[1] = k[1].trim();
                          const O = k[1].toLowerCase();
                          for (let $ = 0; $ < r.length; $++)
                            r[$].BSDName === v && (r[$].smartStatus = O === "passed" ? "Ok" : O === "failed!" ? "Predicted Failure" : "unknown");
                        }
                      }
                    }
                  }), s(r);
                })) : s(r);
              }
            }) : i ? (i = i + `printf "
"`, me(i, { maxBuffer: 1024 * 1024 }, (h, y) => {
              y.toString().split(`
`).forEach((x) => {
                if (x) {
                  const S = x.split("|");
                  if (S.length === 2) {
                    const w = S[0];
                    S[1] = S[1].trim();
                    const C = S[1].split(":");
                    if (C.length === 2) {
                      C[1] = C[1].trim();
                      const A = C[1].toLowerCase();
                      for (let v = 0; v < r.length; v++)
                        r[v].BSDName === w && (r[v].smartStatus = A === "not supported" ? "not supported" : A === "verified" ? "Ok" : A === "failing" ? "Predicted Failure" : "unknown");
                    }
                  }
                }
              }), s(r);
            })) : s(r);
          }
        });
      }
      if (rn)
        try {
          const o = [];
          if (o.push(
            _.powerShell(
              "Get-CimInstance Win32_DiskDrive | select Caption,Size,Status,PNPDeviceId,DeviceId,BytesPerSector,TotalCylinders,TotalHeads,TotalSectors,TotalTracks,TracksPerCylinder,SectorsPerTrack,FirmwareRevision,SerialNumber,InterfaceType | fl"
            )
          ), o.push(_.powerShell("Get-PhysicalDisk | select BusType,MediaType,FriendlyName,Model,SerialNumber,Size | fl")), _.smartMonToolsInstalled())
            try {
              const a = JSON.parse(it("smartctl --scan -j").toString());
              a && a.devices && a.devices.length > 0 && a.devices.forEach((c) => {
                o.push(Fc(`smartctl -j -a ${c.name}`, _.execOptsWin));
              });
            } catch {
              _.noop();
            }
          _.promiseAll(o).then((a) => {
            let c = a.results[0].toString().split(/\n\s*\n/);
            c.forEach((l) => {
              const u = l.split(`\r
`), d = _.getValue(u, "Size", ":").trim(), p = _.getValue(u, "Status", ":").trim().toLowerCase();
              d && r.push({
                device: _.getValue(u, "DeviceId", ":"),
                // changed from PNPDeviceId to DeviceID (be be able to match devices)
                type: l.indexOf("SSD") > -1 ? "SSD" : "HD",
                // just a starting point ... better: MSFT_PhysicalDisk - Media Type ... see below
                name: _.getValue(u, "Caption", ":"),
                vendor: n(_.getValue(u, "Caption", ":", !0).trim()),
                size: parseInt(d, 10),
                bytesPerSector: parseInt(_.getValue(u, "BytesPerSector", ":"), 10),
                totalCylinders: parseInt(_.getValue(u, "TotalCylinders", ":"), 10),
                totalHeads: parseInt(_.getValue(u, "TotalHeads", ":"), 10),
                totalSectors: parseInt(_.getValue(u, "TotalSectors", ":"), 10),
                totalTracks: parseInt(_.getValue(u, "TotalTracks", ":"), 10),
                tracksPerCylinder: parseInt(_.getValue(u, "TracksPerCylinder", ":"), 10),
                sectorsPerTrack: parseInt(_.getValue(u, "SectorsPerTrack", ":"), 10),
                firmwareRevision: _.getValue(u, "FirmwareRevision", ":").trim(),
                serialNum: _.getValue(u, "SerialNumber", ":").trim(),
                interfaceType: _.getValue(u, "InterfaceType", ":").trim(),
                smartStatus: p === "ok" ? "Ok" : p === "degraded" ? "Degraded" : p === "pred fail" ? "Predicted Failure" : "Unknown",
                temperature: null
              });
            }), c = a.results[1].split(/\n\s*\n/), c.forEach((l) => {
              const u = l.split(`\r
`), d = _.getValue(u, "SerialNumber", ":").trim(), p = _.getValue(u, "FriendlyName", ":").trim().replace("Msft ", "Microsoft"), f = _.getValue(u, "Size", ":").trim(), m = _.getValue(u, "Model", ":").trim(), h = _.getValue(u, "BusType", ":").trim();
              let y = _.getValue(u, "MediaType", ":").trim();
              if ((y === "3" || y === "HDD") && (y = "HD"), y === "4" && (y = "SSD"), y === "5" && (y = "SCM"), y === "Unspecified" && (m.toLowerCase().indexOf("virtual") > -1 || m.toLowerCase().indexOf("vbox") > -1) && (y = "Virtual"), f) {
                let g = _.findObjectByKey(r, "serialNum", d);
                (g === -1 || d === "") && (g = _.findObjectByKey(r, "name", p)), g !== -1 && (r[g].type = y, r[g].interfaceType = h);
              }
            }), a.results.shift(), a.results.shift(), a.results.length && a.results.forEach((l) => {
              try {
                const u = JSON.parse(l);
                if (u.serial_number) {
                  const d = u.serial_number, p = _.findObjectByKey(r, "serialNum", d);
                  p !== -1 && (r[p].smartStatus = u.smart_status && u.smart_status.passed ? "Ok" : u.smart_status && u.smart_status.passed === !1 ? "Predicted Failure" : "unknown", u.temperature && u.temperature.current && (r[p].temperature = u.temperature.current), r[p].smartData = u);
                }
              } catch {
                _.noop();
              }
            }), t && t(r), e(r);
          });
        } catch {
          t && t(r), e(r);
        }
    });
  });
}
Rt.diskLayout = Zc;
var Gt = {};
const ss = je, _e = ee.exec, Oe = ee.execSync, Vn = ee.execFileSync, el = Ne.readFileSync, tl = Ne, T = D, dt = process.platform, qe = dt === "linux" || dt === "android", Ye = dt === "darwin", Nn = dt === "win32", ft = dt === "freebsd", mt = dt === "openbsd", gt = dt === "netbsd", Ki = dt === "sunos", Q = {};
let ji = "", Ht = {}, qi = [], Xt = [], Kt = {}, Tt;
function Bt() {
  let t = "", n = "";
  try {
    const e = ss.networkInterfaces();
    let s = 9999;
    for (let r in e)
      ({}).hasOwnProperty.call(e, r) && e[r].forEach((i) => {
        i && i.internal === !1 && (n = n || r, i.scopeid && i.scopeid < s && (t = r, s = i.scopeid));
      });
    if (t = t || n || "", Nn) {
      let r = "";
      if (Oe("netstat -r", T.execOptsWin).toString().split(ss.EOL).forEach((c) => {
        if (c = c.replace(/\s+/g, " ").trim(), c.indexOf("0.0.0.0 0.0.0.0") > -1 && !/[a-zA-Z]/.test(c)) {
          const l = c.split(" ");
          l.length >= 5 && (r = l[l.length - 2]);
        }
      }), r)
        for (let c in e)
          ({}).hasOwnProperty.call(e, c) && e[c].forEach((l) => {
            l && l.address && l.address === r && (t = c);
          });
    }
    if (qe) {
      const o = Oe("ip route 2> /dev/null | grep default", T.execOptsLinux).toString().split(`
`)[0].split(/\s+/);
      o[0] === "none" && o[5] ? t = o[5] : o[4] && (t = o[4]), t.indexOf(":") > -1 && (t = t.split(":")[1].trim());
    }
    if (Ye || ft || mt || gt || Ki) {
      let r = "";
      qe && (r = "ip route 2> /dev/null | grep default | awk '{print $5}'"), Ye && (r = "route -n get default 2>/dev/null | grep interface: | awk '{print $2}'"), (ft || mt || gt || Ki) && (r = "route get 0.0.0.0 | grep interface:"), t = Oe(r).toString().split(`
`)[0], t.indexOf(":") > -1 && (t = t.split(":")[1].trim());
    }
  } catch {
    T.noop();
  }
  return t && (ji = t), ji;
}
Gt.getDefaultNetworkInterface = Bt;
function Yi() {
  let t = "", n = "";
  const e = {};
  if (qe || ft || mt || gt) {
    if (typeof Tt > "u")
      try {
        const s = Oe("which ip", T.execOptsLinux).toString().split(`
`);
        s.length && s[0].indexOf(":") === -1 && s[0].indexOf("/") === 0 ? Tt = s[0] : Tt = "";
      } catch {
        Tt = "";
      }
    try {
      const s = "export LC_ALL=C; " + (Tt ? Tt + " link show up" : "/sbin/ifconfig") + "; unset LC_ALL", i = Oe(s, T.execOptsLinux).toString().split(`
`);
      for (let o = 0; o < i.length; o++)
        if (i[o] && i[o][0] !== " ") {
          if (Tt) {
            const a = i[o + 1].trim().split(" ");
            a[0] === "link/ether" && (t = i[o].split(" ")[1], t = t.slice(0, t.length - 1), n = a[1]);
          } else
            t = i[o].split(" ")[0], n = i[o].split("HWaddr ")[1];
          t && n && (e[t] = n.trim(), t = "", n = "");
        }
    } catch {
      T.noop();
    }
  }
  if (Ye)
    try {
      const i = Oe("/sbin/ifconfig").toString().split(`
`);
      for (let o = 0; o < i.length; o++)
        i[o] && i[o][0] !== "	" && i[o].indexOf(":") > 0 ? t = i[o].split(":")[0] : i[o].indexOf("	ether ") === 0 && (n = i[o].split("	ether ")[1], t && n && (e[t] = n.trim(), t = "", n = ""));
    } catch {
      T.noop();
    }
  return e;
}
function nl(t) {
  return new Promise((n) => {
    process.nextTick(() => {
      const e = Bt();
      t && t(e), n(e);
    });
  });
}
Gt.networkInterfaceDefault = nl;
function sl(t, n) {
  const e = [];
  for (let s in t)
    try {
      if ({}.hasOwnProperty.call(t, s) && t[s].trim() !== "") {
        const r = t[s].trim().split(`\r
`);
        let i = null;
        try {
          i = n && n[s] ? n[s].trim().split(`\r
`) : [];
        } catch {
          T.noop();
        }
        const o = T.getValue(r, "NetEnabled", ":");
        let a = T.getValue(r, "AdapterTypeID", ":") === "9" ? "wireless" : "wired";
        const c = T.getValue(r, "Name", ":").replace(/\]/g, ")").replace(/\[/g, "("), l = T.getValue(r, "NetConnectionID", ":").replace(/\]/g, ")").replace(/\[/g, "(");
        if ((c.toLowerCase().indexOf("wi-fi") >= 0 || c.toLowerCase().indexOf("wireless") >= 0) && (a = "wireless"), o !== "") {
          const u = parseInt(T.getValue(r, "speed", ":").trim(), 10) / 1e6;
          e.push({
            mac: T.getValue(r, "MACAddress", ":").toLowerCase(),
            dhcp: T.getValue(i, "dhcpEnabled", ":").toLowerCase() === "true",
            name: c,
            iface: l,
            netEnabled: o === "TRUE",
            speed: isNaN(u) ? null : u,
            operstate: T.getValue(r, "NetConnectionStatus", ":") === "2" ? "up" : "down",
            type: a
          });
        }
      }
    } catch {
      T.noop();
    }
  return e;
}
function il() {
  return new Promise((t) => {
    process.nextTick(() => {
      let n = "Get-CimInstance Win32_NetworkAdapter | fl *; echo '#-#-#-#';";
      n += "Get-CimInstance Win32_NetworkAdapterConfiguration | fl DHCPEnabled";
      try {
        T.powerShell(n).then((e) => {
          e = e.split("#-#-#-#");
          const s = (e[0] || "").split(/\n\s*\n/), r = (e[1] || "").split(/\n\s*\n/);
          t(sl(s, r));
        });
      } catch {
        t([]);
      }
    });
  });
}
function rl() {
  let t = {};
  const n = {
    primaryDNS: "",
    exitCode: 0,
    ifaces: []
  };
  try {
    return Oe("ipconfig /all", T.execOptsWin).split(`\r
\r
`).forEach((r, i) => {
      if (i === 1) {
        const o = r.split(`\r
`).filter((c) => c.toUpperCase().includes("DNS")), a = o[0].substring(o[0].lastIndexOf(":") + 1);
        n.primaryDNS = a.trim(), n.primaryDNS || (n.primaryDNS = "Not defined");
      }
      if (i > 1)
        if (i % 2 === 0) {
          const o = r.substring(r.lastIndexOf(" ") + 1).replace(":", "");
          t.name = o;
        } else {
          const o = r.split(`\r
`).filter((c) => c.toUpperCase().includes("DNS")), a = o[0].substring(o[0].lastIndexOf(":") + 1);
          t.dnsSuffix = a.trim(), n.ifaces.push(t), t = {};
        }
    }), n;
  } catch {
    return {
      primaryDNS: "",
      exitCode: 0,
      ifaces: []
    };
  }
}
function ol(t, n) {
  let e = "";
  const s = n + ".";
  try {
    const r = t.filter((i) => s.includes(i.name + ".")).map((i) => i.dnsSuffix);
    return r[0] && (e = r[0]), e || (e = ""), e;
  } catch {
    return "Unknown";
  }
}
function al() {
  try {
    return Oe("netsh lan show profiles", T.execOptsWin).split(`\r
Profile on interface`);
  } catch (t) {
    return t.status === 1 && t.stdout.includes("AutoConfig") ? "Disabled" : [];
  }
}
function cl(t) {
  try {
    return Oe(`netsh wlan show  interface name="${t}" | findstr "SSID"`, T.execOptsWin).split(`\r
`).shift().split(":").pop().trim();
  } catch {
    return "Unknown";
  }
}
function ll(t, n, e) {
  const s = {
    state: "Unknown",
    protocol: "Unknown"
  };
  if (e === "Disabled")
    return s.state = "Disabled", s.protocol = "Not defined", s;
  if (t === "wired" && e.length > 0)
    try {
      const i = e.find((a) => a.includes(n + `\r
`)).split(`\r
`), o = i.find((a) => a.includes("802.1x"));
      if (o.includes("Disabled"))
        s.state = "Disabled", s.protocol = "Not defined";
      else if (o.includes("Enabled")) {
        const a = i.find((c) => c.includes("EAP"));
        s.protocol = a.split(":").pop(), s.state = "Enabled";
      }
    } catch {
      return s;
    }
  else if (t === "wireless") {
    let r = "", i = "";
    try {
      const o = cl(n);
      if (o !== "Unknown") {
        const a = T.sanitizeString(o), c = Oe(`netsh wlan show profiles "${a}"`, T.execOptsWin).split(`\r
`);
        r = (c.find((l) => l.indexOf("802.1X") >= 0) || "").trim(), i = (c.find((l) => l.indexOf("EAP") >= 0) || "").trim();
      }
      r.includes(":") && i.includes(":") && (s.state = r.split(":").pop(), s.protocol = i.split(":").pop());
    } catch (o) {
      return o.status === 1 && o.stdout.includes("AutoConfig") && (s.state = "Disabled", s.protocol = "Not defined"), s;
    }
  }
  return s;
}
function Hr(t) {
  const n = [];
  let e = [];
  return t.forEach((s) => {
    !s.startsWith("	") && !s.startsWith(" ") && e.length && (n.push(e), e = []), e.push(s);
  }), e.length && n.push(e), n;
}
function ul(t) {
  const n = [];
  return t.forEach((e) => {
    const s = {
      iface: "",
      mtu: null,
      mac: "",
      ip6: "",
      ip4: "",
      speed: null,
      type: "",
      operstate: "",
      duplex: "",
      internal: !1
    }, r = e[0];
    s.iface = r.split(":")[0].trim();
    const i = r.split("> mtu");
    s.mtu = i.length > 1 ? parseInt(i[1], 10) : null, isNaN(s.mtu) && (s.mtu = null), s.internal = i[0].toLowerCase().indexOf("loopback") > -1, e.forEach((c) => {
      c.trim().startsWith("ether ") && (s.mac = c.split("ether ")[1].toLowerCase().trim()), c.trim().startsWith("inet6 ") && !s.ip6 && (s.ip6 = c.split("inet6 ")[1].toLowerCase().split("%")[0].split(" ")[0]), c.trim().startsWith("inet ") && !s.ip4 && (s.ip4 = c.split("inet ")[1].toLowerCase().split(" ")[0]);
    });
    let o = T.getValue(e, "link rate");
    s.speed = o ? parseFloat(o) : null, s.speed === null ? (o = T.getValue(e, "uplink rate"), s.speed = o ? parseFloat(o) : null, s.speed !== null && o.toLowerCase().indexOf("gbps") >= 0 && (s.speed = s.speed * 1e3)) : o.toLowerCase().indexOf("gbps") >= 0 && (s.speed = s.speed * 1e3), s.type = T.getValue(e, "type").toLowerCase().indexOf("wi-fi") > -1 ? "wireless" : "wired";
    const a = T.getValue(e, "status").toLowerCase();
    s.operstate = a === "active" ? "up" : a === "inactive" ? "down" : "unknown", s.duplex = T.getValue(e, "media").toLowerCase().indexOf("half-duplex") > -1 ? "half" : "full", (s.ip6 || s.ip4 || s.mac) && n.push(s);
  }), n;
}
function pl() {
  const t = "/sbin/ifconfig -v";
  try {
    const n = Oe(t, { maxBuffer: 104857600 }).toString().split(`
`), e = Hr(n);
    return ul(e);
  } catch {
    return [];
  }
}
function dl(t) {
  try {
    const n = Vn("nmcli", ["device", "status"], { ...T.execOptsLinux, stdio: ["ignore", "pipe", "ignore"] }).toString(), i = T.grep(n, t).replace(/\s+/g, " ").trim().split(" ").slice(3).join(" "), o = T.sanitizeString(i, !1);
    return o !== "--" ? o : "";
  } catch {
    return "";
  }
}
function Xr(t) {
  let n = [];
  try {
    el(t, { encoding: "utf8" }).split(`
`).filter((r) => /iface|source/.test(r)).forEach((r) => {
      const i = r.replace(/\s+/g, " ").trim().split(" ");
      if (i.length >= 4 && r.toLowerCase().indexOf(" inet ") >= 0 && r.toLowerCase().indexOf("dhcp") >= 0 && n.push(i[1]), r.toLowerCase().includes("source")) {
        const o = r.split(" ")[1];
        n = n.concat(Xr(o));
      }
    });
  } catch {
    T.noop();
  }
  return n;
}
function fl() {
  const t = "ip a 2> /dev/null";
  let n = [];
  try {
    const e = Oe(t, T.execOptsLinux).toString().split(`
`), s = Hr(e);
    n = ml(s);
  } catch {
    T.noop();
  }
  try {
    n = Xr("/etc/network/interfaces");
  } catch {
    T.noop();
  }
  return n;
}
function ml(t) {
  const n = [];
  return t && t.length && t.forEach((e) => {
    if (e && e.length && e[0].split(":").length > 2) {
      for (let r of e)
        if (r.indexOf(" inet ") >= 0 && r.indexOf(" dynamic ") >= 0) {
          const i = r.split(" "), o = i[i.length - 1].trim();
          n.push(o);
          break;
        }
    }
  }), n;
}
function gl(t, n, e) {
  let s = !1;
  if (n)
    try {
      const r = Vn("nmcli", ["connection", "show", n], { ...T.execOptsLinux, stdio: ["ignore", "pipe", "ignore"] }).toString();
      switch (T.grep(r, "ipv4.method").replace(/\s+/g, " ").trim().split(" ").slice(1).toString()) {
        case "auto":
          s = !0;
          break;
        default:
          s = !1;
          break;
      }
      return s;
    } catch {
      return e.indexOf(t) >= 0;
    }
  else
    return e.indexOf(t) >= 0;
}
function hl(t) {
  let n = !1;
  try {
    const e = Vn("ipconfig", ["getpacket", t], { ...T.execOptsLinux, stdio: ["ignore", "pipe", "ignore"] }).toString(), s = T.grep(e, "lease_time");
    s.length && s[0].startsWith("lease_time") && (n = !0);
  } catch {
    T.noop();
  }
  return n;
}
function xl(t) {
  if (t)
    try {
      const n = Vn("nmcli", ["connection", "show", t], { ...T.execOptsLinux, stdio: ["ignore", "pipe", "ignore"] }).toString(), r = T.grep(n, "ipv4.dns-search").replace(/\s+/g, " ").trim().split(" ").slice(1).toString();
      return r === "--" ? "Not defined" : r;
    } catch {
      return "Unknown";
    }
  else
    return "Unknown";
}
function yl(t) {
  if (t)
    try {
      const n = Vn("nmcli", ["connection", "show", t], { ...T.execOptsLinux, stdio: ["ignore", "pipe", "ignore"] }).toString(), r = T.grep(n, "802-1x.eap").replace(/\s+/g, " ").trim().split(" ").slice(1).toString();
      return r === "--" ? "" : r;
    } catch {
      return "Not defined";
    }
  else
    return "Not defined";
}
function Sl(t) {
  return t ? t === "Not defined" ? "Disabled" : "Enabled" : "Unknown";
}
function Rs(t, n, e) {
  const s = [
    "00:00:00:00:00:00",
    "00:03:FF",
    "00:05:69",
    "00:0C:29",
    "00:0F:4B",
    "00:13:07",
    "00:13:BE",
    "00:15:5d",
    "00:16:3E",
    "00:1C:42",
    "00:21:F6",
    "00:24:0B",
    "00:50:56",
    "00:A0:B1",
    "00:E0:C8",
    "08:00:27",
    "0A:00:27",
    "18:92:2C",
    "16:DF:49",
    "3C:F3:92",
    "54:52:00",
    "FC:15:97"
  ];
  return e ? s.filter((r) => e.toUpperCase().toUpperCase().startsWith(r.substring(0, e.length))).length > 0 || t.toLowerCase().indexOf(" virtual ") > -1 || n.toLowerCase().indexOf(" virtual ") > -1 || t.toLowerCase().indexOf("vethernet ") > -1 || n.toLowerCase().indexOf("vethernet ") > -1 || t.toLowerCase().startsWith("veth") || n.toLowerCase().startsWith("veth") || t.toLowerCase().startsWith("vboxnet") || n.toLowerCase().startsWith("vboxnet") : !1;
}
function xi(t, n, e) {
  return typeof t == "string" && (e = t, n = !0, t = null), typeof t == "boolean" && (n = t, t = null, e = ""), typeof n > "u" && (n = !0), e = e || "", e = "" + e, new Promise((s) => {
    process.nextTick(() => {
      const r = ss.networkInterfaces();
      let i = [], o = [], a = [], c = [];
      if (Ye || ft || mt || gt)
        if (JSON.stringify(r) === JSON.stringify(Ht) && !n)
          i = Xt, t && t(i), s(i);
        else {
          const l = Bt();
          Ht = JSON.parse(JSON.stringify(r)), o = pl(), o.forEach((u) => {
            let d = "", p = "", f = "", m = "";
            u.ip4 = "", u.ip6 = "", {}.hasOwnProperty.call(r, u.iface) && r[u.iface].forEach((y) => {
              (y.family === "IPv4" || y.family === 4) && (!u.ip4 && !u.ip4.match(/^169.254/i) && (u.ip4 = y.address, u.ip4subnet = y.netmask), u.ip4.match(/^169.254/i) && (d = y.address, p = y.netmask)), (y.family === "IPv6" || y.family === 6) && (!u.ip6 && !u.ip6.match(/^fe80::/i) && (u.ip6 = y.address, u.ip6subnet = y.netmask), u.ip6.match(/^fe80::/i) && (f = y.address, m = y.netmask));
            }), !u.ip4 && d && (u.ip4 = d, u.ip4subnet = p), !u.ip6 && f && (u.ip6 = f, u.ip6subnet = m);
            const h = T.sanitizeString(u.iface);
            i.push({
              iface: u.iface,
              ifaceName: u.iface,
              default: u.iface === l,
              ip4: u.ip4,
              ip4subnet: u.ip4subnet || "",
              ip6: u.ip6,
              ip6subnet: u.ip6subnet || "",
              mac: u.mac,
              internal: u.internal,
              virtual: u.internal ? !1 : Rs(u.iface, u.iface, u.mac),
              operstate: u.operstate,
              type: u.type,
              duplex: u.duplex,
              mtu: u.mtu,
              speed: u.speed,
              dhcp: hl(h),
              dnsSuffix: "",
              ieee8021xAuth: "",
              ieee8021xState: "",
              carrierChanges: 0
            });
          }), Xt = i, e.toLowerCase().indexOf("default") >= 0 && (i = i.filter((u) => u.default), i.length > 0 ? i = i[0] : i = []), t && t(i), s(i);
        }
      if (qe)
        if (JSON.stringify(r) === JSON.stringify(Ht) && !n)
          i = Xt, t && t(i), s(i);
        else {
          Ht = JSON.parse(JSON.stringify(r)), qi = fl();
          const l = Bt();
          for (let u in r) {
            let d = "", p = "", f = "", m = "", h = "", y = "", g = "", x = null, S = 0, w = !1, C = "", A = "", v = "", k = "", O = "", $ = "", ie = "", se = "";
            if ({}.hasOwnProperty.call(r, u)) {
              const ne = u;
              r[u].forEach((b) => {
                (b.family === "IPv4" || b.family === 4) && (!d && !d.match(/^169.254/i) && (d = b.address, p = b.netmask), d.match(/^169.254/i) && (O = b.address, $ = b.netmask)), (b.family === "IPv6" || b.family === 6) && (!f && !f.match(/^fe80::/i) && (f = b.address, m = b.netmask), f.match(/^fe80::/i) && (ie = b.address, se = b.netmask)), h = b.mac;
                const xe = parseInt(process.versions.node.split("."), 10);
                h.indexOf("00:00:0") > -1 && (qe || Ye) && !b.internal && xe >= 8 && xe <= 11 && (Object.keys(Kt).length === 0 && (Kt = Yi()), h = Kt[u] || "");
              }), !d && O && (d = O, p = $), !f && ie && (f = ie, m = se);
              const fe = u.split(":")[0].trim(), W = T.sanitizeString(fe), ye = `echo -n "addr_assign_type: "; cat /sys/class/net/${W}/addr_assign_type 2>/dev/null; echo;
            echo -n "address: "; cat /sys/class/net/${W}/address 2>/dev/null; echo;
            echo -n "addr_len: "; cat /sys/class/net/${W}/addr_len 2>/dev/null; echo;
            echo -n "broadcast: "; cat /sys/class/net/${W}/broadcast 2>/dev/null; echo;
            echo -n "carrier: "; cat /sys/class/net/${W}/carrier 2>/dev/null; echo;
            echo -n "carrier_changes: "; cat /sys/class/net/${W}/carrier_changes 2>/dev/null; echo;
            echo -n "dev_id: "; cat /sys/class/net/${W}/dev_id 2>/dev/null; echo;
            echo -n "dev_port: "; cat /sys/class/net/${W}/dev_port 2>/dev/null; echo;
            echo -n "dormant: "; cat /sys/class/net/${W}/dormant 2>/dev/null; echo;
            echo -n "duplex: "; cat /sys/class/net/${W}/duplex 2>/dev/null; echo;
            echo -n "flags: "; cat /sys/class/net/${W}/flags 2>/dev/null; echo;
            echo -n "gro_flush_timeout: "; cat /sys/class/net/${W}/gro_flush_timeout 2>/dev/null; echo;
            echo -n "ifalias: "; cat /sys/class/net/${W}/ifalias 2>/dev/null; echo;
            echo -n "ifindex: "; cat /sys/class/net/${W}/ifindex 2>/dev/null; echo;
            echo -n "iflink: "; cat /sys/class/net/${W}/iflink 2>/dev/null; echo;
            echo -n "link_mode: "; cat /sys/class/net/${W}/link_mode 2>/dev/null; echo;
            echo -n "mtu: "; cat /sys/class/net/${W}/mtu 2>/dev/null; echo;
            echo -n "netdev_group: "; cat /sys/class/net/${W}/netdev_group 2>/dev/null; echo;
            echo -n "operstate: "; cat /sys/class/net/${W}/operstate 2>/dev/null; echo;
            echo -n "proto_down: "; cat /sys/class/net/${W}/proto_down 2>/dev/null; echo;
            echo -n "speed: "; cat /sys/class/net/${W}/speed 2>/dev/null; echo;
            echo -n "tx_queue_len: "; cat /sys/class/net/${W}/tx_queue_len 2>/dev/null; echo;
            echo -n "type: "; cat /sys/class/net/${W}/type 2>/dev/null; echo;
            echo -n "wireless: "; cat /proc/net/wireless 2>/dev/null | grep ${W}; echo;
            echo -n "wirelessspeed: "; iw dev ${W} link 2>&1 | grep bitrate; echo;`;
              let R = [];
              try {
                R = Oe(ye, T.execOptsLinux).toString().split(`
`);
                const b = dl(W);
                w = gl(W, b, qi), C = xl(b), A = yl(b), v = Sl(A);
              } catch {
                T.noop();
              }
              y = T.getValue(R, "duplex"), y = y.startsWith("cat") ? "" : y, g = parseInt(T.getValue(R, "mtu"), 10);
              let G = parseInt(T.getValue(R, "speed"), 10);
              x = isNaN(G) ? null : G;
              const z = T.getValue(R, "tx bitrate");
              x === null && z && (G = parseFloat(z), x = isNaN(G) ? null : G), S = parseInt(T.getValue(R, "carrier_changes"), 10);
              const q = T.getValue(R, "operstate");
              k = q === "up" ? T.getValue(R, "wireless").trim() ? "wireless" : "wired" : "unknown", (W === "lo" || W.startsWith("bond")) && (k = "virtual");
              let U = r[u] && r[u][0] ? r[u][0].internal : !1;
              (u.toLowerCase().indexOf("loopback") > -1 || ne.toLowerCase().indexOf("loopback") > -1) && (U = !0);
              const j = U ? !1 : Rs(u, ne, h);
              i.push({
                iface: W,
                ifaceName: ne,
                default: fe === l,
                ip4: d,
                ip4subnet: p,
                ip6: f,
                ip6subnet: m,
                mac: h,
                internal: U,
                virtual: j,
                operstate: q,
                type: k,
                duplex: y,
                mtu: g,
                speed: x,
                dhcp: w,
                dnsSuffix: C,
                ieee8021xAuth: A,
                ieee8021xState: v,
                carrierChanges: S
              });
            }
          }
          Xt = i, e.toLowerCase().indexOf("default") >= 0 && (i = i.filter((u) => u.default), i.length > 0 ? i = i[0] : i = []), t && t(i), s(i);
        }
      if (Nn)
        if (JSON.stringify(r) === JSON.stringify(Ht) && !n)
          i = Xt, t && t(i), s(i);
        else {
          Ht = JSON.parse(JSON.stringify(r));
          const l = Bt();
          il().then((u) => {
            u.forEach((d) => {
              let p = !1;
              Object.keys(r).forEach((f) => {
                p || r[f].forEach((m) => {
                  Object.keys(m).indexOf("mac") >= 0 && (p = m.mac === d.mac);
                });
              }), p || (r[d.name] = [{ mac: d.mac }]);
            }), c = al(), a = rl();
            for (let d in r) {
              const p = T.sanitizeString(d);
              let f = d, m = "", h = "", y = "", g = "", x = "", S = "", w = "", C = null, A = 0, v = "down", k = !1, O = "", $ = "", ie = "", se = "";
              if ({}.hasOwnProperty.call(r, d)) {
                let ne = d;
                r[d].forEach((G) => {
                  (G.family === "IPv4" || G.family === 4) && (m = G.address, h = G.netmask), (G.family === "IPv6" || G.family === 6) && (!y || y.match(/^fe80::/i)) && (y = G.address, g = G.netmask), x = G.mac;
                  const z = parseInt(process.versions.node.split("."), 10);
                  x.indexOf("00:00:0") > -1 && (qe || Ye) && !G.internal && z >= 8 && z <= 11 && (Object.keys(Kt).length === 0 && (Kt = Yi()), x = Kt[d] || "");
                }), O = ol(a.ifaces, p);
                let fe = !1;
                u.forEach((G) => {
                  G.mac === x && !fe && (f = G.iface || f, ne = G.name, k = G.dhcp, v = G.operstate, C = v === "up" ? G.speed : 0, se = G.type, fe = !0);
                }), (d.toLowerCase().indexOf("wlan") >= 0 || ne.toLowerCase().indexOf("wlan") >= 0 || ne.toLowerCase().indexOf("802.11n") >= 0 || ne.toLowerCase().indexOf("wireless") >= 0 || ne.toLowerCase().indexOf("wi-fi") >= 0 || ne.toLowerCase().indexOf("wifi") >= 0) && (se = "wireless");
                const W = ll(se, p, c);
                $ = W.protocol, ie = W.state;
                let ye = r[d] && r[d][0] ? r[d][0].internal : !1;
                (d.toLowerCase().indexOf("loopback") > -1 || ne.toLowerCase().indexOf("loopback") > -1) && (ye = !0);
                const R = ye ? !1 : Rs(d, ne, x);
                i.push({
                  iface: f,
                  ifaceName: ne,
                  default: f === l,
                  ip4: m,
                  ip4subnet: h,
                  ip6: y,
                  ip6subnet: g,
                  mac: x,
                  internal: ye,
                  virtual: R,
                  operstate: v,
                  type: se,
                  duplex: S,
                  mtu: w,
                  speed: C,
                  dhcp: k,
                  dnsSuffix: O,
                  ieee8021xAuth: $,
                  ieee8021xState: ie,
                  carrierChanges: A
                });
              }
            }
            Xt = i, e.toLowerCase().indexOf("default") >= 0 && (i = i.filter((d) => d.default), i.length > 0 ? i = i[0] : i = []), t && t(i), s(i);
          });
        }
    });
  });
}
Gt.networkInterfaces = xi;
function Hn(t, n, e, s, r, i, o, a) {
  const c = {
    iface: t,
    operstate: s,
    rx_bytes: n,
    rx_dropped: r,
    rx_errors: i,
    tx_bytes: e,
    tx_dropped: o,
    tx_errors: a,
    rx_sec: null,
    tx_sec: null,
    ms: 0
  };
  return Q[t] && Q[t].ms ? (c.ms = Date.now() - Q[t].ms, c.rx_sec = n - Q[t].rx_bytes >= 0 ? (n - Q[t].rx_bytes) / (c.ms / 1e3) : 0, c.tx_sec = e - Q[t].tx_bytes >= 0 ? (e - Q[t].tx_bytes) / (c.ms / 1e3) : 0, Q[t].rx_bytes = n, Q[t].tx_bytes = e, Q[t].rx_sec = c.rx_sec, Q[t].tx_sec = c.tx_sec, Q[t].ms = Date.now(), Q[t].last_ms = c.ms, Q[t].operstate = s) : (Q[t] || (Q[t] = {}), Q[t].rx_bytes = n, Q[t].tx_bytes = e, Q[t].rx_sec = null, Q[t].tx_sec = null, Q[t].ms = Date.now(), Q[t].last_ms = 0, Q[t].operstate = s), c;
}
function Kr(t, n) {
  let e = [];
  return new Promise((s) => {
    process.nextTick(() => {
      if (T.isFunction(t) && !n)
        n = t, e = [Bt()];
      else {
        if (typeof t != "string" && t !== void 0)
          return n && n([]), s([]);
        t = t || Bt();
        try {
          t.__proto__.toLowerCase = T.stringToLower, t.__proto__.replace = T.stringReplace, t.__proto__.toString = T.stringToString, t.__proto__.substr = T.stringSubstr, t.__proto__.substring = T.stringSubstring, t.__proto__.trim = T.stringTrim, t.__proto__.startsWith = T.stringStartWith;
        } catch {
          Object.setPrototypeOf(t, T.stringObj);
        }
        t = t.trim().replace(/,+/g, "|"), e = t.split("|");
      }
      const r = [], i = [];
      if (e.length && e[0].trim() === "*")
        e = [], xi(!1).then((o) => {
          for (let a of o)
            e.push(a.iface);
          Kr(e.join(",")).then((a) => {
            n && n(a), s(a);
          });
        });
      else {
        for (let o of e)
          i.push(Cl(o.trim()));
        i.length ? Promise.all(i).then((o) => {
          n && n(o), s(o);
        }) : (n && n(r), s(r));
      }
    });
  });
}
function Cl(t) {
  function n(e) {
    const s = [];
    for (let r in e)
      if ({}.hasOwnProperty.call(e, r) && e[r].trim() !== "") {
        const i = e[r].trim().split(`\r
`);
        s.push({
          name: T.getValue(i, "Name", ":").replace(/[()[\] ]+/g, "").replace(/#|\//g, "_").toLowerCase(),
          rx_bytes: parseInt(T.getValue(i, "BytesReceivedPersec", ":"), 10),
          rx_errors: parseInt(T.getValue(i, "PacketsReceivedErrors", ":"), 10),
          rx_dropped: parseInt(T.getValue(i, "PacketsReceivedDiscarded", ":"), 10),
          tx_bytes: parseInt(T.getValue(i, "BytesSentPersec", ":"), 10),
          tx_errors: parseInt(T.getValue(i, "PacketsOutboundErrors", ":"), 10),
          tx_dropped: parseInt(T.getValue(i, "PacketsOutboundDiscarded", ":"), 10)
        });
      }
    return s;
  }
  return new Promise((e) => {
    process.nextTick(() => {
      const s = T.sanitizeString(t, !0);
      let r = {
        iface: s,
        operstate: "unknown",
        rx_bytes: 0,
        rx_dropped: 0,
        rx_errors: 0,
        tx_bytes: 0,
        tx_dropped: 0,
        tx_errors: 0,
        rx_sec: null,
        tx_sec: null,
        ms: 0
      }, i = "unknown", o = 0, a = 0, c = 0, l = 0, u = 0, d = 0, p, f, m;
      if (!Q[s] || Q[s] && !Q[s].ms || Q[s] && Q[s].ms && Date.now() - Q[s].ms >= 500) {
        if (qe && (tl.existsSync("/sys/class/net/" + s) ? (p = "cat /sys/class/net/" + s + "/operstate; cat /sys/class/net/" + s + "/statistics/rx_bytes; cat /sys/class/net/" + s + "/statistics/tx_bytes; cat /sys/class/net/" + s + "/statistics/rx_dropped; cat /sys/class/net/" + s + "/statistics/rx_errors; cat /sys/class/net/" + s + "/statistics/tx_dropped; cat /sys/class/net/" + s + "/statistics/tx_errors; ", _e(p, (h, y) => {
          h || (f = y.toString().split(`
`), i = f[0].trim(), o = parseInt(f[1], 10), a = parseInt(f[2], 10), c = parseInt(f[3], 10), l = parseInt(f[4], 10), u = parseInt(f[5], 10), d = parseInt(f[6], 10), r = Hn(s, o, a, i, c, l, u, d)), e(r);
        })) : e(r)), (ft || mt || gt) && (p = "netstat -ibndI " + s, _e(p, (h, y) => {
          if (!h) {
            f = y.toString().split(`
`);
            for (let g = 1; g < f.length; g++) {
              const x = f[g].replace(/ +/g, " ").split(" ");
              x && x[0] && x[7] && x[10] && (o = o + parseInt(x[7]), x[6].trim() !== "-" && (c = c + parseInt(x[6])), x[5].trim() !== "-" && (l = l + parseInt(x[5])), a = a + parseInt(x[10]), x[12].trim() !== "-" && (u = u + parseInt(x[12])), x[9].trim() !== "-" && (d = d + parseInt(x[9])), i = "up");
            }
            r = Hn(s, o, a, i, c, l, u, d);
          }
          e(r);
        })), Ye && (p = "ifconfig " + s + ' | grep "status"', _e(p, (h, y) => {
          r.operstate = (y.toString().split(":")[1] || "").trim(), r.operstate = (r.operstate || "").toLowerCase(), r.operstate = r.operstate === "active" ? "up" : r.operstate === "inactive" ? "down" : "unknown", p = "netstat -bdnI " + s, _e(p, (g, x) => {
            if (!g && (f = x.toString().split(`
`), f.length > 1 && f[1].trim() !== "")) {
              m = f[1].replace(/ +/g, " ").split(" ");
              const S = m.length > 11 ? 1 : 0;
              o = parseInt(m[S + 5]), c = parseInt(m[S + 10]), l = parseInt(m[S + 4]), a = parseInt(m[S + 8]), u = parseInt(m[S + 10]), d = parseInt(m[S + 7]), r = Hn(s, o, a, r.operstate, c, l, u, d);
            }
            e(r);
          });
        })), Nn) {
          let h = [], y = s;
          T.powerShell(
            "Get-CimInstance Win32_PerfRawData_Tcpip_NetworkInterface | select Name,BytesReceivedPersec,PacketsReceivedErrors,PacketsReceivedDiscarded,BytesSentPersec,PacketsOutboundErrors,PacketsOutboundDiscarded | fl"
          ).then((g, x) => {
            if (!x) {
              const S = g.toString().split(/\n\s*\n/);
              h = n(S);
            }
            xi(!1).then((S) => {
              o = 0, a = 0, h.forEach((w) => {
                S.forEach((C) => {
                  (C.iface.toLowerCase() === s.toLowerCase() || C.mac.toLowerCase() === s.toLowerCase() || C.ip4.toLowerCase() === s.toLowerCase() || C.ip6.toLowerCase() === s.toLowerCase() || C.ifaceName.replace(/[()[\] ]+/g, "").replace(/#|\//g, "_").toLowerCase() === s.replace(/[()[\] ]+/g, "").replace("#", "_").toLowerCase()) && C.ifaceName.replace(/[()[\] ]+/g, "").replace(/#|\//g, "_").toLowerCase() === w.name && (y = C.iface, o = w.rx_bytes, c = w.rx_dropped, l = w.rx_errors, a = w.tx_bytes, u = w.tx_dropped, d = w.tx_errors, i = C.operstate);
                });
              }), o && a && (r = Hn(y, parseInt(o), parseInt(a), i, c, l, u, d)), e(r);
            });
          });
        }
      } else
        r.rx_bytes = Q[s].rx_bytes, r.tx_bytes = Q[s].tx_bytes, r.rx_sec = Q[s].rx_sec, r.tx_sec = Q[s].tx_sec, r.ms = Q[s].last_ms, r.operstate = Q[s].operstate, e(r);
    });
  });
}
Gt.networkStats = Kr;
function wl(t, n) {
  let e = "";
  return t.forEach((s) => {
    const r = s.split(" ");
    (parseInt(r[0], 10) || -1) === n && (r.shift(), e = r.join(" ").split(":")[0]);
  }), e = e.split(" -")[0], e = e.split(" /")[0], e;
}
function Ll(t) {
  return new Promise((n) => {
    process.nextTick(() => {
      const e = [];
      if (qe || ft || mt || gt) {
        let s = 'export LC_ALL=C; netstat -tunap | grep "ESTABLISHED\\|SYN_SENT\\|SYN_RECV\\|FIN_WAIT1\\|FIN_WAIT2\\|TIME_WAIT\\|CLOSE\\|CLOSE_WAIT\\|LAST_ACK\\|LISTEN\\|CLOSING\\|UNKNOWN"; unset LC_ALL';
        (ft || mt || gt) && (s = 'export LC_ALL=C; netstat -na | grep "ESTABLISHED\\|SYN_SENT\\|SYN_RECV\\|FIN_WAIT1\\|FIN_WAIT2\\|TIME_WAIT\\|CLOSE\\|CLOSE_WAIT\\|LAST_ACK\\|LISTEN\\|CLOSING\\|UNKNOWN"; unset LC_ALL'), _e(s, { maxBuffer: 1024 * 102400 }, (r, i) => {
          let o = i.toString().split(`
`);
          !r && (o.length > 1 || o[0] !== "") ? (o.forEach((a) => {
            if (a = a.replace(/ +/g, " ").split(" "), a.length >= 7) {
              let c = a[3], l = "";
              const u = a[3].split(":");
              u.length > 1 && (l = u[u.length - 1], u.pop(), c = u.join(":"));
              let d = a[4], p = "";
              const f = a[4].split(":");
              f.length > 1 && (p = f[f.length - 1], f.pop(), d = f.join(":"));
              const m = a[5], h = a[6].split("/");
              m && e.push({
                protocol: a[0],
                localAddress: c,
                localPort: l,
                peerAddress: d,
                peerPort: p,
                state: m,
                pid: h[0] && h[0] !== "-" ? parseInt(h[0], 10) : null,
                process: h[1] ? h[1].split(" ")[0].split(":")[0] : ""
              });
            }
          }), t && t(e), n(e)) : (s = 'ss -tunap | grep "ESTAB\\|SYN-SENT\\|SYN-RECV\\|FIN-WAIT1\\|FIN-WAIT2\\|TIME-WAIT\\|CLOSE\\|CLOSE-WAIT\\|LAST-ACK\\|LISTEN\\|CLOSING"', _e(s, { maxBuffer: 1024 * 102400 }, (a, c) => {
            a || c.toString().split(`
`).forEach((u) => {
              if (u = u.replace(/ +/g, " ").split(" "), u.length >= 6) {
                let d = u[4], p = "";
                const f = u[4].split(":");
                f.length > 1 && (p = f[f.length - 1], f.pop(), d = f.join(":"));
                let m = u[5], h = "";
                const y = u[5].split(":");
                y.length > 1 && (h = y[y.length - 1], y.pop(), m = y.join(":"));
                let g = u[1];
                g === "ESTAB" && (g = "ESTABLISHED"), g === "TIME-WAIT" && (g = "TIME_WAIT");
                let x = null, S = "";
                if (u.length >= 7 && u[6].indexOf("users:") > -1) {
                  const w = u[6].replace('users:(("', "").replace(/"/g, "").replace("pid=", "").split(",");
                  if (w.length > 2) {
                    S = w[0];
                    const C = parseInt(w[1], 10);
                    C > 0 && (x = C);
                  }
                }
                g && e.push({
                  protocol: u[0],
                  localAddress: d,
                  localPort: p,
                  peerAddress: m,
                  peerPort: h,
                  state: g,
                  pid: x,
                  process: S
                });
              }
            }), t && t(e), n(e);
          }));
        });
      }
      if (Ye) {
        const s = 'netstat -natvln | head -n2; netstat -natvln | grep "tcp4\\|tcp6\\|udp4\\|udp6"', r = "ESTABLISHED|SYN_SENT|SYN_RECV|FIN_WAIT1|FIN_WAIT_1|FIN_WAIT2|FIN_WAIT_2|TIME_WAIT|CLOSE|CLOSE_WAIT|LAST_ACK|LISTEN|CLOSING|UNKNOWN".split("|");
        _e(s, { maxBuffer: 1024 * 102400 }, (i, o) => {
          i || _e("ps -axo pid,command", { maxBuffer: 1024 * 102400 }, (a, c) => {
            let l = c.toString().split(`
`);
            l = l.map((p) => p.trim().replace(/ +/g, " "));
            const u = o.toString().split(`
`);
            u.shift();
            let d = 8;
            u.length > 1 && u[0].indexOf("pid") > 0 && (d = (u.shift() || "").replace(/ Address/g, "_Address").replace(/process:/g, "").replace(/ +/g, " ").split(" ").indexOf("pid")), u.forEach((p) => {
              if (p = p.replace(/ +/g, " ").split(" "), p.length >= 8) {
                let f = p[3], m = "";
                const h = p[3].split(".");
                h.length > 1 && (m = h[h.length - 1], h.pop(), f = h.join("."));
                let y = p[4], g = "";
                const x = p[4].split(".");
                x.length > 1 && (g = x[x.length - 1], x.pop(), y = x.join("."));
                const S = r.indexOf(p[5]) >= 0, w = S ? p[5] : "UNKNOWN";
                let C = "";
                p[p.length - 9].indexOf(":") >= 0 ? C = p[p.length - 9].split(":")[1] : (C = p[d + (S ? 0 : -1)], C.indexOf(":") >= 0 && (C = C.split(":")[1]));
                const A = parseInt(C, 10);
                w && e.push({
                  protocol: p[0],
                  localAddress: f,
                  localPort: m,
                  peerAddress: y,
                  peerPort: g,
                  state: w,
                  pid: A,
                  process: wl(l, A)
                });
              }
            }), t && t(e), n(e);
          });
        });
      }
      if (Nn) {
        let s = "netstat -nao";
        try {
          _e(s, T.execOptsWin, (r, i) => {
            r || (i.toString().split(`\r
`).forEach((a) => {
              if (a = a.trim().replace(/ +/g, " ").split(" "), a.length >= 4) {
                let c = a[1], l = "";
                const u = a[1].split(":");
                u.length > 1 && (l = u[u.length - 1], u.pop(), c = u.join(":")), c = c.replace(/\[/g, "").replace(/\]/g, "");
                let d = a[2], p = "";
                const f = a[2].split(":");
                f.length > 1 && (p = f[f.length - 1], f.pop(), d = f.join(":")), d = d.replace(/\[/g, "").replace(/\]/g, "");
                const m = T.toInt(a[4]);
                let h = a[3];
                h === "HERGESTELLT" && (h = "ESTABLISHED"), h.startsWith("ABH") && (h = "LISTEN"), h === "SCHLIESSEN_WARTEN" && (h = "CLOSE_WAIT"), h === "WARTEND" && (h = "TIME_WAIT"), h === "SYN_GESENDET" && (h = "SYN_SENT"), h === "LISTENING" && (h = "LISTEN"), h === "SYN_RECEIVED" && (h = "SYN_RECV"), h === "FIN_WAIT_1" && (h = "FIN_WAIT1"), h === "FIN_WAIT_2" && (h = "FIN_WAIT2"), a[0].toLowerCase() !== "udp" && h ? e.push({
                  protocol: a[0].toLowerCase(),
                  localAddress: c,
                  localPort: l,
                  peerAddress: d,
                  peerPort: p,
                  state: h,
                  pid: m,
                  process: ""
                }) : a[0].toLowerCase() === "udp" && e.push({
                  protocol: a[0].toLowerCase(),
                  localAddress: c,
                  localPort: l,
                  peerAddress: d,
                  peerPort: p,
                  state: "",
                  pid: parseInt(a[3], 10),
                  process: ""
                });
              }
            }), t && t(e), n(e));
          });
        } catch {
          t && t(e), n(e);
        }
      }
    });
  });
}
Gt.networkConnections = Ll;
function Il(t) {
  return new Promise((n) => {
    process.nextTick(() => {
      let e = "";
      if (qe || ft || mt || gt) {
        const s = "ip route get 1";
        try {
          _e(s, { maxBuffer: 1024 * 102400 }, (r, i) => {
            if (r)
              t && t(e), n(e);
            else {
              let o = i.toString().split(`
`), c = (o && o[0] ? o[0] : "").split(" via ");
              c && c[1] && (c = c[1].split(" "), e = c[0]), t && t(e), n(e);
            }
          });
        } catch {
          t && t(e), n(e);
        }
      }
      if (Ye) {
        let s = "route -n get default";
        try {
          _e(s, { maxBuffer: 1024 * 102400 }, (r, i) => {
            if (!r) {
              const o = i.toString().split(`
`).map((a) => a.trim());
              e = T.getValue(o, "gateway");
            }
            e ? (t && t(e), n(e)) : (s = "netstat -rn | awk '/default/ {print $2}'", _e(s, { maxBuffer: 1024 * 102400 }, (o, a) => {
              e = a.toString().split(`
`).map((l) => l.trim()).find(
                (l) => /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(l)
              ), t && t(e), n(e);
            }));
          });
        } catch {
          t && t(e), n(e);
        }
      }
      if (Nn)
        try {
          _e("netstat -r", T.execOptsWin, (s, r) => {
            r.toString().split(ss.EOL).forEach((o) => {
              if (o = o.replace(/\s+/g, " ").trim(), o.indexOf("0.0.0.0 0.0.0.0") > -1 && !/[a-zA-Z]/.test(o)) {
                const a = o.split(" ");
                a.length >= 5 && a[a.length - 3].indexOf(".") > -1 && (e = a[a.length - 3]);
              }
            }), e ? (t && t(e), n(e)) : T.powerShell("Get-CimInstance -ClassName Win32_IP4RouteTable | Where-Object { $_.Destination -eq '0.0.0.0' -and $_.Mask -eq '0.0.0.0' }").then((o) => {
              let a = o.toString().split(`\r
`);
              a.length > 1 && !e && (e = T.getValue(a, "NextHop"), t && t(e), n(e));
            });
          });
        } catch {
          t && t(e), n(e);
        }
    });
  });
}
Gt.networkGatewayDefault = Il;
var Ps = {};
const gn = je, yi = ee.exec, ht = ee.execSync, E = D;
let is = process.platform;
const Si = is === "linux" || is === "android", Ci = is === "darwin", wi = is === "win32";
function Li(t) {
  const n = parseFloat(t);
  return n < 0 ? 0 : n >= 100 ? -50 : n / 2 - 100;
}
function rs(t) {
  const n = 2 * (parseFloat(t) + 100);
  return n <= 100 ? n : 100;
}
const yn = {
  1: 2412,
  2: 2417,
  3: 2422,
  4: 2427,
  5: 2432,
  6: 2437,
  7: 2442,
  8: 2447,
  9: 2452,
  10: 2457,
  11: 2462,
  12: 2467,
  13: 2472,
  14: 2484,
  32: 5160,
  34: 5170,
  36: 5180,
  38: 5190,
  40: 5200,
  42: 5210,
  44: 5220,
  46: 5230,
  48: 5240,
  50: 5250,
  52: 5260,
  54: 5270,
  56: 5280,
  58: 5290,
  60: 5300,
  62: 5310,
  64: 5320,
  68: 5340,
  96: 5480,
  100: 5500,
  102: 5510,
  104: 5520,
  106: 5530,
  108: 5540,
  110: 5550,
  112: 5560,
  114: 5570,
  116: 5580,
  118: 5590,
  120: 5600,
  122: 5610,
  124: 5620,
  126: 5630,
  128: 5640,
  132: 5660,
  134: 5670,
  136: 5680,
  138: 5690,
  140: 5700,
  142: 5710,
  144: 5720,
  149: 5745,
  151: 5755,
  153: 5765,
  155: 5775,
  157: 5785,
  159: 5795,
  161: 5805,
  165: 5825,
  169: 5845,
  173: 5865,
  183: 4915,
  184: 4920,
  185: 4925,
  187: 4935,
  188: 4940,
  189: 4945,
  192: 4960,
  196: 4980
};
function Sn(t) {
  return {}.hasOwnProperty.call(yn, t) ? yn[t] : null;
}
function _l(t) {
  let n = 0;
  for (let e in yn)
    ({}).hasOwnProperty.call(yn, e) && yn[e] === t && (n = E.toInt(e));
  return n;
}
function jr() {
  const t = [], n = "iw dev 2>/dev/null";
  try {
    const s = ht(n, E.execOptsLinux).toString().split(`
`).map((r) => r.trim()).join(`
`).split(`
Interface `);
    return s.shift(), s.forEach((r) => {
      const i = r.split(`
`), o = i[0], a = E.toInt(E.getValue(i, "ifindex", " ")), c = E.getValue(i, "addr", " "), l = E.toInt(E.getValue(i, "channel", " "));
      t.push({
        id: a,
        iface: o,
        mac: c,
        channel: l
      });
    }), t;
  } catch {
    try {
      const s = ht("nmcli -t -f general,wifi-properties,wired-properties,interface-flags,capabilities,nsp device show 2>/dev/null", E.execOptsLinux).toString().split(`

`);
      let r = 1;
      return s.forEach((i) => {
        const o = i.split(`
`), a = E.getValue(o, "GENERAL.DEVICE"), c = E.getValue(o, "GENERAL.TYPE"), l = r++, u = E.getValue(o, "GENERAL.HWADDR");
        c.toLowerCase() === "wifi" && t.push({
          id: l,
          iface: a,
          mac: u,
          channel: ""
        });
      }), t;
    } catch {
      return [];
    }
  }
}
function qr(t) {
  const n = `nmcli -t -f general,wifi-properties,capabilities,ip4,ip6 device show ${t} 2> /dev/null`;
  try {
    const e = ht(n, E.execOptsLinux).toString().split(`
`), s = E.getValue(e, "GENERAL.CONNECTION");
    return {
      iface: t,
      type: E.getValue(e, "GENERAL.TYPE"),
      vendor: E.getValue(e, "GENERAL.VENDOR"),
      product: E.getValue(e, "GENERAL.PRODUCT"),
      mac: E.getValue(e, "GENERAL.HWADDR").toLowerCase(),
      ssid: s !== "--" ? s : null
    };
  } catch {
    return {};
  }
}
function Ol(t) {
  const n = sanitizeShellString(t, !0);
  if (!n)
    return {};
  const e = `nmcli -t connection show ${n} 2>/dev/null`;
  try {
    const s = ht(e, E.execOptsLinux).toString().split(`
`), r = E.getValue(s, "802-11-wireless.seen-bssids").toLowerCase();
    return {
      ssid: t !== "--" ? t : null,
      uuid: E.getValue(s, "connection.uuid"),
      type: E.getValue(s, "connection.type"),
      autoconnect: E.getValue(s, "connection.autoconnect") === "yes",
      security: E.getValue(s, "802-11-wireless-security.key-mgmt"),
      bssid: r !== "--" ? r : null
    };
  } catch {
    return {};
  }
}
function Pl(t) {
  if (!t)
    return {};
  const n = `wpa_cli -i ${E.sanitizeString(t, !0)} status 2>&1`;
  try {
    const e = ht(n, E.execOptsLinux).toString().split(`
`), s = E.toInt(E.getValue(e, "freq", "="));
    return {
      ssid: E.getValue(e, "ssid", "="),
      uuid: E.getValue(e, "uuid", "="),
      security: E.getValue(e, "key_mgmt", "="),
      freq: s,
      channel: _l(s),
      bssid: E.getValue(e, "bssid", "=").toLowerCase()
    };
  } catch {
    return {};
  }
}
function Yr() {
  const t = [], n = "nmcli -t -m multiline --fields active,ssid,bssid,mode,chan,freq,signal,security,wpa-flags,rsn-flags device wifi list 2>/dev/null";
  try {
    const s = ht(n, E.execOptsLinux).toString().split("ACTIVE:");
    return s.shift(), s.forEach((r) => {
      r = "ACTIVE:" + r;
      const i = r.split(gn.EOL), o = E.getValue(i, "CHAN"), a = E.getValue(i, "FREQ").toLowerCase().replace("mhz", "").trim(), c = E.getValue(i, "SECURITY").replace("(", "").replace(")", ""), l = E.getValue(i, "WPA-FLAGS").replace("(", "").replace(")", ""), u = E.getValue(i, "RSN-FLAGS").replace("(", "").replace(")", ""), d = E.getValue(i, "SIGNAL");
      t.push({
        ssid: E.getValue(i, "SSID"),
        bssid: E.getValue(i, "BSSID").toLowerCase(),
        mode: E.getValue(i, "MODE"),
        channel: o ? parseInt(o, 10) : null,
        frequency: a ? parseInt(a, 10) : null,
        signalLevel: Li(d),
        quality: d ? parseInt(d, 10) : null,
        security: c && c !== "none" ? c.split(" ") : [],
        wpaFlags: l && l !== "none" ? l.split(" ") : [],
        rsnFlags: u && u !== "none" ? u.split(" ") : []
      });
    }), t;
  } catch {
    return [];
  }
}
function Ji(t) {
  const n = [];
  try {
    let e = ht(`export LC_ALL=C; iwlist ${E.sanitizeString(t, !0)} scan 2>&1; unset LC_ALL`, E.execOptsLinux).toString().split("        Cell ");
    return e[0].indexOf("resource busy") >= 0 ? -1 : (e.length > 1 && (e.shift(), e.forEach((s) => {
      const r = s.split(`
`), i = E.getValue(r, "channel", ":", !0), o = r && r.length && r[0].indexOf("Address:") >= 0 ? r[0].split("Address:")[1].trim().toLowerCase() : "", a = E.getValue(r, "mode", ":", !0), c = E.getValue(r, "frequency", ":", !0), u = E.getValue(r, "Quality", "=", !0).toLowerCase().split("signal level="), d = u.length > 1 ? E.toInt(u[1]) : 0, p = d ? rs(d) : 0, f = E.getValue(r, "essid", ":", !0), m = s.indexOf(" WPA ") >= 0, h = s.indexOf("WPA2 ") >= 0, y = [];
      m && y.push("WPA"), h && y.push("WPA2");
      const g = [];
      let x = "";
      r.forEach((S) => {
        const w = S.trim().toLowerCase();
        if (w.indexOf("group cipher") >= 0) {
          x && g.push(x);
          const C = w.split(":");
          C.length > 1 && (x = C[1].trim().toUpperCase());
        }
        if (w.indexOf("pairwise cipher") >= 0) {
          const C = w.split(":");
          C.length > 1 && (C[1].indexOf("tkip") ? x = x ? "TKIP/" + x : "TKIP" : C[1].indexOf("ccmp") ? x = x ? "CCMP/" + x : "CCMP" : C[1].indexOf("proprietary") && (x = x ? "PROP/" + x : "PROP"));
        }
        if (w.indexOf("authentication suites") >= 0) {
          const C = w.split(":");
          C.length > 1 && (C[1].indexOf("802.1x") ? x = x ? "802.1x/" + x : "802.1x" : C[1].indexOf("psk") && (x = x ? "PSK/" + x : "PSK"));
        }
      }), x && g.push(x), n.push({
        ssid: f,
        bssid: o,
        mode: a,
        channel: i ? E.toInt(i) : null,
        frequency: c ? E.toInt(c.replace(".", "")) : null,
        signalLevel: d,
        quality: p,
        security: y,
        wpaFlags: g,
        rsnFlags: []
      });
    })), n);
  } catch {
    return -1;
  }
}
function vl(t) {
  const n = [];
  try {
    let e = JSON.parse(t);
    return e = e.SPAirPortDataType[0].spairport_airport_interfaces[0].spairport_airport_other_local_wireless_networks, e.forEach((s) => {
      const r = [], i = s.spairport_security_mode || "";
      i === "spairport_security_mode_wep" ? r.push("WEP") : i === "spairport_security_mode_wpa2_personal" ? r.push("WPA2") : i.startsWith("spairport_security_mode_wpa2_enterprise") ? r.push("WPA2 EAP") : i.startsWith("pairport_security_mode_wpa3_transition") ? r.push("WPA2/WPA3") : i.startsWith("pairport_security_mode_wpa3") && r.push("WPA3");
      const o = parseInt(("" + s.spairport_network_channel).split(" ")[0]) || 0, a = s.spairport_signal_noise || null;
      n.push({
        ssid: s._name || "",
        bssid: s.spairport_network_bssid || null,
        mode: s.spairport_network_phymode,
        channel: o,
        frequency: Sn(o),
        signalLevel: a ? parseInt(a, 10) : null,
        quality: rs(a),
        security: r,
        wpaFlags: [],
        rsnFlags: []
      });
    }), n;
  } catch {
    return n;
  }
}
function Ml(t) {
  return new Promise((n) => {
    process.nextTick(() => {
      let e = [];
      if (Si)
        if (e = Yr(), e.length === 0)
          try {
            const s = ht("export LC_ALL=C; iwconfig 2>/dev/null; unset LC_ALL", E.execOptsLinux).toString().split(`

`);
            let r = "";
            if (s.forEach((i) => {
              i.indexOf("no wireless") === -1 && i.trim() !== "" && (r = i.split(" ")[0]);
            }), r) {
              const i = E.sanitizeString(r, !0), o = Ji(i);
              o === -1 ? setTimeout(() => {
                const a = Ji(i);
                a !== -1 && (e = a), t && t(e), n(e);
              }, 4e3) : (e = o, t && t(e), n(e));
            } else
              t && t(e), n(e);
          } catch {
            t && t(e), n(e);
          }
        else
          t && t(e), n(e);
      else Ci ? yi("system_profiler SPAirPortDataType -json 2>/dev/null", { maxBuffer: 1024 * 4e4 }, (r, i) => {
        e = vl(i.toString()), t && t(e), n(e);
      }) : wi ? E.powerShell("netsh wlan show networks mode=Bssid").then((r) => {
        const i = r.toString("utf8").split(gn.EOL + gn.EOL + "SSID ");
        i.shift(), i.forEach((o) => {
          const a = o.split(gn.EOL);
          if (a && a.length >= 8 && a[0].indexOf(":") >= 0) {
            const c = o.split(" BSSID");
            c.shift(), c.forEach((l) => {
              const u = l.split(gn.EOL), d = u[0].split(":");
              d.shift();
              const p = d.join(":").trim().toLowerCase(), f = u[3].split(":").pop().trim(), m = u[1].split(":").pop().trim();
              e.push({
                ssid: a[0].split(":").pop().trim(),
                bssid: p,
                mode: "",
                channel: f ? parseInt(f, 10) : null,
                frequency: Sn(f),
                signalLevel: Li(m),
                quality: m ? parseInt(m, 10) : null,
                security: [a[2].split(":").pop().trim()],
                wpaFlags: [a[3].split(":").pop().trim()],
                rsnFlags: []
              });
            });
          }
        }), t && t(e), n(e);
      }) : (t && t(e), n(e));
    });
  });
}
Ps.wifiNetworks = Ml;
function Al(t) {
  t = t.toLowerCase();
  let n = "";
  return t.indexOf("intel") >= 0 ? n = "Intel" : t.indexOf("realtek") >= 0 ? n = "Realtek" : t.indexOf("qualcom") >= 0 ? n = "Qualcom" : t.indexOf("broadcom") >= 0 ? n = "Broadcom" : t.indexOf("cavium") >= 0 ? n = "Cavium" : t.indexOf("cisco") >= 0 ? n = "Cisco" : t.indexOf("marvel") >= 0 ? n = "Marvel" : t.indexOf("zyxel") >= 0 ? n = "Zyxel" : t.indexOf("melanox") >= 0 ? n = "Melanox" : t.indexOf("d-link") >= 0 ? n = "D-Link" : t.indexOf("tp-link") >= 0 ? n = "TP-Link" : t.indexOf("asus") >= 0 ? n = "Asus" : t.indexOf("linksys") >= 0 && (n = "Linksys"), n;
}
function El(t) {
  return new Promise((n) => {
    process.nextTick(() => {
      const e = [];
      if (Si) {
        const s = jr(), r = Yr();
        s.forEach((i) => {
          const o = E.sanitizeString(i.iface, !0), a = qr(o), c = Pl(o), l = a.ssid || c.ssid, u = r.filter((y) => y.ssid === l), d = E.sanitizeString(l, !0), p = Ol(d), f = u && u.length && u[0].channel ? u[0].channel : c.channel ? c.channel : null, m = u && u.length && u[0].bssid ? u[0].bssid : c.bssid ? c.bssid : null, h = u && u.length && u[0].signalLevel ? u[0].signalLevel : null;
          l && m && e.push({
            id: i.id,
            iface: i.iface,
            model: a.product,
            ssid: l,
            bssid: u && u.length && u[0].bssid ? u[0].bssid : c.bssid ? c.bssid : null,
            channel: f,
            frequency: f ? Sn(f) : null,
            type: p.type ? p.type : "802.11",
            security: p.security ? p.security : c.security ? c.security : null,
            signalLevel: h,
            quality: rs(h),
            txRate: null
          });
        }), t && t(e), n(e);
      } else Ci ? yi('system_profiler SPNetworkDataType SPAirPortDataType -xml 2>/dev/null; echo "######" ; ioreg -n AppleBCMWLANSkywalkInterface -r 2>/dev/null', (r, i) => {
        try {
          const o = i.toString().split("######"), a = E.plistParser(o[0]), c = a[0]._SPCommandLineArguments.indexOf("SPNetworkDataType") >= 0 ? a[0]._items : a[1]._items, l = a[0]._SPCommandLineArguments.indexOf("SPAirPortDataType") >= 0 ? a[0]._items[0].spairport_airport_interfaces : a[1]._items[0].spairport_airport_interfaces;
          let u = [];
          o[1].indexOf("  | {") > 0 && o[1].indexOf("  | }") > o[1].indexOf("  | {") && (u = o[1].split("  | {")[1].split("  | }")[0].replace(/ \| /g, "").replace(/"/g, "").split(`
`));
          const d = c.find((g) => g._name === "Wi-Fi"), p = l[0].spairport_current_network_information, f = parseInt(("" + p.spairport_network_channel).split(" ")[0], 10) || 0, m = p.spairport_signal_noise || null, h = [], y = p.spairport_security_mode || "";
          y === "spairport_security_mode_wep" ? h.push("WEP") : y === "spairport_security_mode_wpa2_personal" ? h.push("WPA2") : y.startsWith("spairport_security_mode_wpa2_enterprise") ? h.push("WPA2 EAP") : y.startsWith("pairport_security_mode_wpa3_transition") ? h.push("WPA2/WPA3") : y.startsWith("pairport_security_mode_wpa3") && h.push("WPA3"), e.push({
            id: d._name || "Wi-Fi",
            iface: d.interface || "",
            model: d.hardware || "",
            ssid: (p._name || "").replace("&lt;", "<").replace("&gt;", ">"),
            bssid: p.spairport_network_bssid || "",
            channel: f,
            frequency: f ? Sn(f) : null,
            type: p.spairport_network_phymode || "802.11",
            security: h,
            signalLevel: m ? parseInt(m, 10) : null,
            quality: rs(m),
            txRate: p.spairport_network_rate || null
          });
        } catch {
          E.noop();
        }
        t && t(e), n(e);
      }) : wi ? E.powerShell("netsh wlan show interfaces").then((r) => {
        const i = r.toString().split(`\r
`);
        for (let a = 0; a < i.length; a++)
          i[a] = i[a].trim();
        const o = i.join(`\r
`).split(`:\r
\r
`);
        o.shift(), o.forEach((a) => {
          const c = a.split(`\r
`);
          if (c.length >= 5) {
            const l = c[0].indexOf(":") >= 0 ? c[0].split(":")[1].trim() : "", u = c[1].indexOf(":") >= 0 ? c[1].split(":")[1].trim() : "", d = c[2].indexOf(":") >= 0 ? c[2].split(":")[1].trim() : "", p = E.getValue(c, "SSID", ":", !0), f = E.getValue(c, "BSSID", ":", !0) || E.getValue(c, "AP BSSID", ":", !0), m = E.getValue(c, "Signal", ":", !0), h = Li(m), y = E.getValue(c, "Radio type", ":", !0) || E.getValue(c, "Type de radio", ":", !0) || E.getValue(c, "Funktyp", ":", !0) || null, g = E.getValue(c, "authentication", ":", !0) || E.getValue(c, "Authentification", ":", !0) || E.getValue(c, "Authentifizierung", ":", !0) || null, x = E.getValue(c, "Channel", ":", !0) || E.getValue(c, "Canal", ":", !0) || E.getValue(c, "Kanal", ":", !0) || null, S = E.getValue(c, "Transmit rate (mbps)", ":", !0) || E.getValue(c, "Transmission (mbit/s)", ":", !0) || E.getValue(c, "Empfangsrate (MBit/s)", ":", !0) || null;
            u && d && p && f && e.push({
              id: d,
              iface: l,
              model: u,
              ssid: p,
              bssid: f,
              channel: E.toInt(x),
              frequency: x ? Sn(x) : null,
              type: y,
              security: g,
              signalLevel: h,
              quality: m ? parseInt(m, 10) : null,
              txRate: E.toInt(S) || null
            });
          }
        }), t && t(e), n(e);
      }) : (t && t(e), n(e));
    });
  });
}
Ps.wifiConnections = El;
function Tl(t) {
  return new Promise((n) => {
    process.nextTick(() => {
      const e = [];
      Si ? (jr().forEach((r) => {
        const i = E.sanitizeString(r.iface, !0), o = qr(i);
        e.push({
          id: r.id,
          iface: r.iface,
          model: o.product ? o.product : null,
          vendor: o.vendor ? o.vendor : null,
          mac: r.mac
        });
      }), t && t(e), n(e)) : Ci ? yi("system_profiler SPNetworkDataType", (r, i) => {
        const o = i.toString().split(`

    Wi-Fi:

`);
        if (o.length > 1) {
          const a = o[1].split(`

`)[0].split(`
`), c = E.getValue(a, "BSD Device Name", ":", !0), l = E.getValue(a, "MAC Address", ":", !0), u = E.getValue(a, "hardware", ":", !0);
          e.push({
            id: "Wi-Fi",
            iface: c,
            model: u,
            vendor: "",
            mac: l
          });
        }
        t && t(e), n(e);
      }) : wi ? E.powerShell("netsh wlan show interfaces").then((r) => {
        const i = r.toString().split(`\r
`);
        for (let a = 0; a < i.length; a++)
          i[a] = i[a].trim();
        const o = i.join(`\r
`).split(`:\r
\r
`);
        o.shift(), o.forEach((a) => {
          const c = a.split(`\r
`);
          if (c.length >= 5) {
            const l = c[0].indexOf(":") >= 0 ? c[0].split(":")[1].trim() : "", u = c[1].indexOf(":") >= 0 ? c[1].split(":")[1].trim() : "", d = c[2].indexOf(":") >= 0 ? c[2].split(":")[1].trim() : "", p = c[3].indexOf(":") >= 0 ? c[3].split(":") : [];
            p.shift();
            const f = p.join(":").trim(), m = Al(u);
            l && u && d && f && e.push({
              id: d,
              iface: l,
              model: u,
              vendor: m,
              mac: f
            });
          }
        }), t && t(e), n(e);
      }) : (t && t(e), n(e));
    });
  });
}
Ps.wifiInterfaces = Tl;
var vs = {};
const os = je, Dl = Ne, bl = ps, Cn = ee.exec, Gs = ee.execSync, X = D;
let xt = process.platform;
const $e = xt === "linux" || xt === "android", Nt = xt === "darwin", Ii = xt === "win32", An = xt === "freebsd", En = xt === "openbsd", Tn = xt === "netbsd", Xn = xt === "sunos", ue = {
  all: 0,
  all_utime: 0,
  all_stime: 0,
  list: {},
  ms: 0,
  result: {}
}, jt = {
  all: 0,
  list: {},
  ms: 0,
  result: {}
}, Le = {
  all: 0,
  all_utime: 0,
  all_stime: 0,
  list: {},
  ms: 0,
  result: {}
}, Qi = {
  0: "unknown",
  1: "other",
  2: "ready",
  3: "running",
  4: "blocked",
  5: "suspended blocked",
  6: "suspended ready",
  7: "terminated",
  8: "stopped",
  9: "growing"
};
function Vl(t) {
  let n = t, e = t.replace(/ +/g, " ").split(" ");
  return e.length === 5 && (n = e[4] + "-" + ("0" + ("JANFEBMARAPRMAYJUNJULAUGSEPOCTNOVDEC".indexOf(e[1].toUpperCase()) / 3 + 1)).slice(-2) + "-" + ("0" + e[2]).slice(-2) + " " + e[3]), n;
}
function Nl(t) {
  let n = /* @__PURE__ */ new Date();
  n = new Date(n.getTime() - n.getTimezoneOffset() * 6e4);
  const e = t.split("-"), s = e.length - 1, r = s > 0 ? parseInt(e[s - 1]) : 0, i = e[s].split(":"), o = i.length === 3 ? parseInt(i[0] || 0) : 0, a = parseInt(i[i.length === 3 ? 1 : 0] || 0), c = parseInt(i[i.length === 3 ? 2 : 1] || 0), l = (((r * 24 + o) * 60 + a) * 60 + c) * 1e3;
  let u = new Date(n.getTime()), d = u.toISOString().substring(0, 10) + " " + u.toISOString().substring(11, 19);
  try {
    u = new Date(n.getTime() - l), d = u.toISOString().substring(0, 10) + " " + u.toISOString().substring(11, 19);
  } catch {
    X.noop();
  }
  return d;
}
function Bl(t, n) {
  return X.isFunction(t) && !n && (n = t, t = ""), new Promise((e) => {
    process.nextTick(() => {
      if (typeof t != "string")
        return n && n([]), e([]);
      if (t) {
        let s = "";
        try {
          s.__proto__.toLowerCase = X.stringToLower, s.__proto__.replace = X.stringReplace, s.__proto__.toString = X.stringToString, s.__proto__.substr = X.stringSubstr, s.__proto__.substring = X.stringSubstring, s.__proto__.trim = X.stringTrim, s.__proto__.startsWith = X.stringStartWith;
        } catch {
          Object.setPrototypeOf(s, X.stringObj);
        }
        const r = X.sanitizeShellString(t), i = X.mathMin(r.length, 2e3);
        for (let l = 0; l <= i; l++)
          r[l] !== void 0 && (s = s + r[l]);
        s = s.trim().toLowerCase().replace(/, /g, "|").replace(/,+/g, "|"), s === "" && (s = "*"), X.isPrototypePolluted() && s !== "*" && (s = "------");
        let o = s.split("|"), a = [], c = [];
        if ($e || An || En || Tn || Nt) {
          if (($e || An || En || Tn) && s === "*")
            try {
              const u = Gs("systemctl --all --type=service --no-legend 2> /dev/null", X.execOptsLinux).toString().split(`
`);
              o = [];
              for (const d of u) {
                const p = d.split(".service")[0];
                p && d.indexOf(" not-found ") === -1 && o.push(p.trim());
              }
              s = o.join("|");
            } catch {
              try {
                s = "";
                const d = Gs("service --status-all 2> /dev/null", X.execOptsLinux).toString().split(`
`);
                for (const p of d) {
                  const f = p.split("]");
                  f.length === 2 && (s += (s !== "" ? "|" : "") + f[1].trim());
                }
                o = s.split("|");
              } catch {
                try {
                  const p = Gs("ls /etc/init.d/ -m 2> /dev/null", X.execOptsLinux).toString().split(`
`).join("");
                  if (s = "", p) {
                    const f = p.split(",");
                    for (const m of f) {
                      const h = m.trim();
                      h && (s += (s !== "" ? "|" : "") + h);
                    }
                    o = s.split("|");
                  }
                } catch {
                  s = "", o = [];
                }
              }
            }
          Nt && s === "*" && (n && n(a), e(a));
          let l = Nt ? ["-caxo", "pcpu,pmem,pid,command"] : ["-axo", "pcpu,pmem,pid,command"];
          s !== "" && o.length > 0 ? X.execSafe("ps", l).then((u) => {
            if (u) {
              let d = u.replace(/ +/g, " ").replace(/,+/g, ".").split(`
`);
              if (o.forEach(function(p) {
                let f;
                Nt ? f = d.filter(function(h) {
                  return h.toLowerCase().indexOf(p) !== -1;
                }) : f = d.filter(function(h) {
                  return h.toLowerCase().indexOf(" " + p.toLowerCase() + ":") !== -1 || h.toLowerCase().indexOf("(" + p.toLowerCase() + " ") !== -1 || h.toLowerCase().indexOf("(" + p.toLowerCase() + ")") !== -1 || h.toLowerCase().indexOf(" " + p.toLowerCase().replace(/[0-9.]/g, "") + ":") !== -1 || h.toLowerCase().indexOf("/" + p.toLowerCase()) !== -1;
                });
                const m = [];
                for (const h of f) {
                  const y = h.trim().split(" ")[2];
                  y && m.push(parseInt(y, 10));
                }
                a.push({
                  name: p,
                  running: f.length > 0,
                  startmode: "",
                  pids: m,
                  cpu: parseFloat(
                    f.reduce(function(h, y) {
                      return h + parseFloat(y.trim().split(" ")[0]);
                    }, 0).toFixed(2)
                  ),
                  mem: parseFloat(
                    f.reduce(function(h, y) {
                      return h + parseFloat(y.trim().split(" ")[1]);
                    }, 0).toFixed(2)
                  )
                });
              }), $e) {
                let p = 'cat /proc/stat | grep "cpu "';
                for (let f in a)
                  for (let m in a[f].pids)
                    p += ";cat /proc/" + a[f].pids[m] + "/stat";
                Cn(p, { maxBuffer: 1024 * 102400 }, function(f, m) {
                  let h = m.toString().split(`
`), y = _i(h.shift()), g = {}, x = {};
                  h.forEach((S) => {
                    if (x = Oi(S, y, jt), x.pid) {
                      let w = -1;
                      for (let C in a)
                        for (let A in a[C].pids)
                          parseInt(a[C].pids[A]) === parseInt(x.pid) && (w = C);
                      w >= 0 && (a[w].cpu += x.cpuu + x.cpus), g[x.pid] = {
                        cpuu: x.cpuu,
                        cpus: x.cpus,
                        utime: x.utime,
                        stime: x.stime,
                        cutime: x.cutime,
                        cstime: x.cstime
                      };
                    }
                  }), jt.all = y, jt.list = Object.assign({}, g), jt.ms = Date.now() - jt.ms, jt.result = Object.assign({}, a), n && n(a), e(a);
                });
              } else
                n && n(a), e(a);
            } else
              l = ["-o", "comm"], X.execSafe("ps", l).then((d) => {
                if (d) {
                  let p = d.replace(/ +/g, " ").replace(/,+/g, ".").split(`
`);
                  o.forEach(function(f) {
                    let m = p.filter(function(h) {
                      return h.indexOf(f) !== -1;
                    });
                    a.push({
                      name: f,
                      running: m.length > 0,
                      startmode: "",
                      cpu: 0,
                      mem: 0
                    });
                  }), n && n(a), e(a);
                } else
                  o.forEach(function(p) {
                    a.push({
                      name: p,
                      running: !1,
                      startmode: "",
                      cpu: 0,
                      mem: 0
                    });
                  }), n && n(a), e(a);
              });
          }) : (n && n(a), e(a));
        }
        if (Ii)
          try {
            let l = "Get-CimInstance Win32_Service";
            o[0] !== "*" && (l += ' -Filter "', o.forEach((u) => {
              l += `Name='${u}' or `;
            }), l = `${l.slice(0, -4)}"`), l += " | select Name,Caption,Started,StartMode,ProcessId | fl", X.powerShell(l).then((u, d) => {
              d ? (o.forEach((p) => {
                a.push({
                  name: p,
                  running: !1,
                  startmode: "",
                  cpu: 0,
                  mem: 0
                });
              }), n && n(a), e(a)) : (u.split(/\n\s*\n/).forEach((f) => {
                if (f.trim() !== "") {
                  let m = f.trim().split(`\r
`), h = X.getValue(m, "Name", ":", !0).toLowerCase(), y = X.getValue(m, "Caption", ":", !0).toLowerCase(), g = X.getValue(m, "Started", ":", !0), x = X.getValue(m, "StartMode", ":", !0), S = X.getValue(m, "ProcessId", ":", !0);
                  (s === "*" || o.indexOf(h) >= 0 || o.indexOf(y) >= 0) && (a.push({
                    name: h,
                    running: g.toLowerCase() === "true",
                    startmode: x,
                    pids: [S],
                    cpu: 0,
                    mem: 0
                  }), c.push(h), c.push(y));
                }
              }), s !== "*" && o.filter((m) => c.indexOf(m) === -1).forEach((m) => {
                a.push({
                  name: m,
                  running: !1,
                  startmode: "",
                  pids: [],
                  cpu: 0,
                  mem: 0
                });
              }), n && n(a), e(a));
            });
          } catch {
            n && n(a), e(a);
          }
      } else
        n && n([]), e([]);
    });
  });
}
vs.services = Bl;
function _i(t) {
  const n = t.replace(/ +/g, " ").split(" "), e = n.length >= 2 ? parseInt(n[1]) : 0, s = n.length >= 3 ? parseInt(n[2]) : 0, r = n.length >= 4 ? parseInt(n[3]) : 0, i = n.length >= 5 ? parseInt(n[4]) : 0, o = n.length >= 6 ? parseInt(n[5]) : 0, a = n.length >= 7 ? parseInt(n[6]) : 0, c = n.length >= 8 ? parseInt(n[7]) : 0, l = n.length >= 9 ? parseInt(n[8]) : 0, u = n.length >= 10 ? parseInt(n[9]) : 0, d = n.length >= 11 ? parseInt(n[10]) : 0;
  return e + s + r + i + o + a + c + l + u + d;
}
function Oi(t, n, e) {
  let s = t.replace(/ +/g, " ").split(")");
  if (s.length >= 2) {
    let r = s[1].split(" ");
    if (r.length >= 16) {
      let i = parseInt(s[0].split(" ")[0]), o = parseInt(r[12]), a = parseInt(r[13]), c = parseInt(r[14]), l = parseInt(r[15]), u = 0, d = 0;
      return e.all > 0 && e.list[i] ? (u = (o + c - e.list[i].utime - e.list[i].cutime) / (n - e.all) * 100, d = (a + l - e.list[i].stime - e.list[i].cstime) / (n - e.all) * 100) : (u = (o + c) / n * 100, d = (a + l) / n * 100), {
        pid: i,
        utime: o,
        stime: a,
        cutime: c,
        cstime: l,
        cpuu: u,
        cpus: d
      };
    } else
      return {
        pid: 0,
        utime: 0,
        stime: 0,
        cutime: 0,
        cstime: 0,
        cpuu: 0,
        cpus: 0
      };
  } else
    return {
      pid: 0,
      utime: 0,
      stime: 0,
      cutime: 0,
      cstime: 0,
      cpuu: 0,
      cpus: 0
    };
}
function Jr(t, n, e) {
  let s = 0, r = 0;
  return e.all > 0 && e.list[t.pid] ? (s = (t.utime - e.list[t.pid].utime) / (n - e.all) * 100, r = (t.stime - e.list[t.pid].stime) / (n - e.all) * 100) : (s = t.utime / n * 100, r = t.stime / n * 100), {
    pid: t.pid,
    utime: t.utime,
    stime: t.stime,
    cpuu: s > 0 ? s : 0,
    cpus: r > 0 ? r : 0
  };
}
function kl(t) {
  let n = [];
  function e(o) {
    o = o || "";
    let a = o.split(" ")[0];
    if (a.substr(-1) === ":" && (a = a.substr(0, a.length - 1)), a.substr(0, 1) !== "[") {
      let c = a.split("/");
      isNaN(parseInt(c[c.length - 1])) ? a = c[c.length - 1] : a = c[0];
    }
    return a;
  }
  function s(o) {
    let a = 0, c = 0;
    function l($) {
      a = c, n[$] ? c = o.substring(n[$].to + a, 1e4).indexOf(" ") : c = 1e4;
    }
    l(0);
    const u = parseInt(o.substring(n[0].from + a, n[0].to + c));
    l(1);
    const d = parseInt(o.substring(n[1].from + a, n[1].to + c));
    l(2);
    const p = parseFloat(o.substring(n[2].from + a, n[2].to + c).replace(/,/g, "."));
    l(3);
    const f = parseFloat(o.substring(n[3].from + a, n[3].to + c).replace(/,/g, "."));
    l(4);
    const m = parseInt(o.substring(n[4].from + a, n[4].to + c));
    l(5);
    const h = parseInt(o.substring(n[5].from + a, n[5].to + c));
    l(6);
    const y = parseInt(o.substring(n[6].from + a, n[6].to + c));
    l(7);
    const g = parseInt(o.substring(n[7].from + a, n[7].to + c)) || 0;
    l(8);
    const x = Xn ? Vl(o.substring(n[8].from + a, n[8].to + c).trim()) : Nl(o.substring(n[8].from + a, n[8].to + c).trim());
    l(9);
    let S = o.substring(n[9].from + a, n[9].to + c).trim();
    S = S[0] === "R" ? "running" : S[0] === "S" ? "sleeping" : S[0] === "T" ? "stopped" : S[0] === "W" ? "paging" : S[0] === "X" ? "dead" : S[0] === "Z" ? "zombie" : S[0] === "D" || S[0] === "U" ? "blocked" : "unknown", l(10);
    let w = o.substring(n[10].from + a, n[10].to + c).trim();
    (w === "?" || w === "??") && (w = ""), l(11);
    const C = o.substring(n[11].from + a, n[11].to + c).trim();
    l(12);
    let A = "", v = "", k = "", O = o.substring(n[12].from + a, n[12].to + c).trim();
    if (O.substr(O.length - 1) === "]" && (O = O.slice(0, -1)), O.substr(0, 1) === "[")
      v = O.substring(1);
    else {
      const $ = O.indexOf("("), ie = O.indexOf(")"), se = O.indexOf("/"), ne = O.indexOf(":");
      if ($ < ie && $ < se && se < ie)
        v = O.split(" ")[0], v = v.replace(/:/g, "");
      else if (ne > 0 && (se === -1 || se > 3))
        v = O.split(" ")[0], v = v.replace(/:/g, "");
      else {
        let fe = O.indexOf(" -"), W = O.indexOf(" /");
        fe = fe >= 0 ? fe : 1e4, W = W >= 0 ? W : 1e4;
        const ye = Math.min(fe, W);
        let R = O.substr(0, ye);
        const G = O.substr(ye), z = R.lastIndexOf("/");
        if (z >= 0 && (A = R.substr(0, z), R = R.substr(z + 1)), ye === 1e4 && R.indexOf(" ") > -1) {
          const q = R.split(" ");
          Dl.existsSync(bl.join(A, q[0])) ? (v = q.shift(), k = (q.join(" ") + " " + G).trim()) : (v = R.trim(), k = G.trim());
        } else
          v = R.trim(), k = G.trim();
      }
    }
    return {
      pid: u,
      parentPid: d,
      name: $e ? e(v) : v,
      cpu: p,
      cpuu: 0,
      cpus: 0,
      mem: f,
      priority: m,
      memVsz: h,
      memRss: y,
      nice: g,
      started: x,
      state: S,
      tty: w,
      user: C,
      command: v,
      params: k,
      path: A
    };
  }
  function r(o) {
    let a = [];
    if (o.length > 1) {
      let c = o[0];
      n = X.parseHead(c, 8), o.shift(), o.forEach((l) => {
        l.trim() !== "" && a.push(s(l));
      });
    }
    return a;
  }
  function i(o) {
    function a(u) {
      const d = ("0" + (u.getMonth() + 1).toString()).slice(-2), p = u.getFullYear().toString(), f = ("0" + u.getDate().toString()).slice(-2), m = ("0" + u.getHours().toString()).slice(-2), h = ("0" + u.getMinutes().toString()).slice(-2), y = ("0" + u.getSeconds().toString()).slice(-2);
      return p + "-" + d + "-" + f + " " + m + ":" + h + ":" + y;
    }
    function c(u) {
      let d = "";
      if (u.indexOf("d") >= 0) {
        const p = u.split("d");
        d = a(new Date(Date.now() - (p[0] * 24 + p[1] * 1) * 60 * 60 * 1e3));
      } else if (u.indexOf("h") >= 0) {
        const p = u.split("h");
        d = a(new Date(Date.now() - (p[0] * 60 + p[1] * 1) * 60 * 1e3));
      } else if (u.indexOf(":") >= 0) {
        const p = u.split(":");
        d = a(new Date(Date.now() - (p.length > 1 ? (p[0] * 60 + p[1]) * 1e3 : p[0] * 1e3)));
      }
      return d;
    }
    let l = [];
    return o.forEach((u) => {
      if (u.trim() !== "") {
        u = u.trim().replace(/ +/g, " ").replace(/,+/g, ".");
        const d = u.split(" "), p = d.slice(9).join(" "), f = parseFloat((1 * parseInt(d[3]) * 1024 / os.totalmem()).toFixed(1)), m = c(d[5]);
        l.push({
          pid: parseInt(d[0]),
          parentPid: parseInt(d[1]),
          name: e(p),
          cpu: 0,
          cpuu: 0,
          cpus: 0,
          mem: f,
          priority: 0,
          memVsz: parseInt(d[2]),
          memRss: parseInt(d[3]),
          nice: parseInt(d[4]),
          started: m,
          state: d[6] === "R" ? "running" : d[6] === "S" ? "sleeping" : d[6] === "T" ? "stopped" : d[6] === "W" ? "paging" : d[6] === "X" ? "dead" : d[6] === "Z" ? "zombie" : d[6] === "D" || d[6] === "U" ? "blocked" : "unknown",
          tty: d[7],
          user: d[8],
          command: p
        });
      }
    }), l;
  }
  return new Promise((o) => {
    process.nextTick(() => {
      let a = {
        all: 0,
        running: 0,
        blocked: 0,
        sleeping: 0,
        unknown: 0,
        list: []
      }, c = "";
      if (ue.ms && Date.now() - ue.ms >= 500 || ue.ms === 0)
        if ($e || An || En || Tn || Nt || Xn) {
          $e && (c = "export LC_ALL=C; ps -axo pid:11,ppid:11,pcpu:6,pmem:6,pri:5,vsz:11,rss:11,ni:5,etime:30,state:5,tty:15,user:20,command; unset LC_ALL"), (An || En || Tn) && (c = "export LC_ALL=C; ps -axo pid,ppid,pcpu,pmem,pri,vsz,rss,ni,etime,state,tty,user,command; unset LC_ALL"), Nt && (c = "ps -axo pid,ppid,pcpu,pmem,pri,vsz=temp_title_1,rss=temp_title_2,nice,etime=temp_title_3,state,tty,user,command -r"), Xn && (c = "ps -Ao pid,ppid,pcpu,pmem,pri,vsz,rss,nice,stime,s,tty,user,comm");
          try {
            Cn(c, { maxBuffer: 1024 * 102400 }, (l, u) => {
              !l && u.toString().trim() ? (a.list = r(u.toString().split(`
`)).slice(), a.all = a.list.length, a.running = a.list.filter((d) => d.state === "running").length, a.blocked = a.list.filter((d) => d.state === "blocked").length, a.sleeping = a.list.filter((d) => d.state === "sleeping").length, $e ? (c = 'cat /proc/stat | grep "cpu "', a.list.forEach((d) => {
                c += ";cat /proc/" + d.pid + "/stat";
              }), Cn(c, { maxBuffer: 1024 * 102400 }, (d, p) => {
                let f = p.toString().split(`
`), m = _i(f.shift()), h = {}, y = {};
                f.forEach((g) => {
                  if (y = Oi(g, m, ue), y.pid) {
                    let x = a.list.map((S) => S.pid).indexOf(y.pid);
                    x >= 0 && (a.list[x].cpu = y.cpuu + y.cpus, a.list[x].cpuu = y.cpuu, a.list[x].cpus = y.cpus), h[y.pid] = {
                      cpuu: y.cpuu,
                      cpus: y.cpus,
                      utime: y.utime,
                      stime: y.stime,
                      cutime: y.cutime,
                      cstime: y.cstime
                    };
                  }
                }), ue.all = m, ue.list = Object.assign({}, h), ue.ms = Date.now() - ue.ms, ue.result = Object.assign({}, a), t && t(a), o(a);
              })) : (t && t(a), o(a))) : (c = "ps -o pid,ppid,vsz,rss,nice,etime,stat,tty,user,comm", Xn && (c = "ps -o pid,ppid,vsz,rss,nice,etime,s,tty,user,comm"), Cn(c, { maxBuffer: 1024 * 102400 }, (d, p) => {
                if (d)
                  t && t(a), o(a);
                else {
                  let f = p.toString().split(`
`);
                  f.shift(), a.list = i(f).slice(), a.all = a.list.length, a.running = a.list.filter((m) => m.state === "running").length, a.blocked = a.list.filter((m) => m.state === "blocked").length, a.sleeping = a.list.filter((m) => m.state === "sleeping").length, t && t(a), o(a);
                }
              }));
            });
          } catch {
            t && t(a), o(a);
          }
        } else if (Ii)
          try {
            X.powerShell(
              `Get-CimInstance Win32_Process | select-Object ProcessId,ParentProcessId,ExecutionState,Caption,CommandLine,ExecutablePath,UserModeTime,KernelModeTime,WorkingSetSize,Priority,PageFileUsage,
                @{n="CreationDate";e={$_.CreationDate.ToString("yyyy-MM-dd HH:mm:ss")}} | ConvertTo-Json -compress`
            ).then((l, u) => {
              if (!u) {
                const d = [], p = [], f = {};
                let m = 0, h = 0, y = [];
                try {
                  l = l.trim().replace(/^\uFEFF/, ""), y = JSON.parse(l);
                } catch {
                }
                y.forEach((g) => {
                  const x = g.ProcessId, S = g.ParentProcessId, w = g.ExecutionState || null, C = g.Caption, A = g.CommandLine, v = g.ExecutablePath, k = g.UserModeTime, O = g.KernelModeTime, $ = g.WorkingSetSize;
                  m = m + k, h = h + O, a.all++, w || a.unknown++, w === "3" && a.running++, (w === "4" || w === "5") && a.blocked++, p.push({
                    pid: x,
                    utime: k,
                    stime: O,
                    cpu: 0,
                    cpuu: 0,
                    cpus: 0
                  }), d.push({
                    pid: x,
                    parentPid: S,
                    name: C,
                    cpu: 0,
                    cpuu: 0,
                    cpus: 0,
                    mem: $ / os.totalmem() * 100,
                    priority: g.Priority | null,
                    memVsz: g.PageFileUsage || null,
                    memRss: Math.floor((g.WorkingSetSize || 0) / 1024),
                    nice: 0,
                    started: g.CreationDate,
                    state: w ? Qi[w] : Qi[0],
                    tty: "",
                    user: "",
                    command: A || C,
                    path: v,
                    params: ""
                  });
                }), a.sleeping = a.all - a.running - a.blocked - a.unknown, a.list = d, p.forEach((g) => {
                  let x = Jr(g, m + h, ue), S = a.list.map((w) => w.pid).indexOf(x.pid);
                  S >= 0 && (a.list[S].cpu = x.cpuu + x.cpus, a.list[S].cpuu = x.cpuu, a.list[S].cpus = x.cpus), f[x.pid] = {
                    cpuu: x.cpuu,
                    cpus: x.cpus,
                    utime: x.utime,
                    stime: x.stime
                  };
                }), ue.all = m + h, ue.all_utime = m, ue.all_stime = h, ue.list = Object.assign({}, f), ue.ms = Date.now() - ue.ms, ue.result = Object.assign({}, a);
              }
              t && t(a), o(a);
            });
          } catch {
            t && t(a), o(a);
          }
        else
          t && t(a), o(a);
      else
        t && t(ue.result), o(ue.result);
    });
  });
}
vs.processes = kl;
function Fl(t, n) {
  return X.isFunction(t) && !n && (n = t, t = ""), new Promise((e) => {
    process.nextTick(() => {
      if (t = t || "", typeof t != "string")
        return n && n([]), e([]);
      let s = "";
      try {
        s.__proto__.toLowerCase = X.stringToLower, s.__proto__.replace = X.stringReplace, s.__proto__.toString = X.stringToString, s.__proto__.substr = X.stringSubstr, s.__proto__.substring = X.stringSubstring, s.__proto__.trim = X.stringTrim, s.__proto__.startsWith = X.stringStartWith;
      } catch {
        Object.setPrototypeOf(s, X.stringObj);
      }
      const r = X.sanitizeShellString(t), i = X.mathMin(r.length, 2e3);
      for (let l = 0; l <= i; l++)
        r[l] !== void 0 && (s = s + r[l]);
      s = s.trim().toLowerCase().replace(/, /g, "|").replace(/,+/g, "|"), s === "" && (s = "*"), X.isPrototypePolluted() && s !== "*" && (s = "------");
      let o = s.split("|"), a = [];
      if ((X.isPrototypePolluted() ? "" : X.sanitizeShellString(t) || "*") && o.length && o[0] !== "------") {
        if (Ii)
          try {
            X.powerShell("Get-CimInstance Win32_Process | select ProcessId,Caption,UserModeTime,KernelModeTime,WorkingSetSize | ConvertTo-Json -compress").then((l, u) => {
              if (!u) {
                const d = [], p = {};
                let f = 0, m = 0, h = [];
                try {
                  l = l.trim().replace(/^\uFEFF/, ""), h = JSON.parse(l);
                } catch {
                }
                h.forEach((y) => {
                  const g = y.ProcessId, x = y.Caption, S = y.UserModeTime, w = y.KernelModeTime, C = y.WorkingSetSize;
                  f = f + S, m = m + w, d.push({
                    pid: g,
                    name: x,
                    utime: S,
                    stime: w,
                    cpu: 0,
                    cpuu: 0,
                    cpus: 0,
                    mem: C
                  });
                  let A = "", v = !1;
                  if (o.forEach((k) => {
                    x.toLowerCase().indexOf(k.toLowerCase()) >= 0 && !v && (v = !0, A = k);
                  }), s === "*" || v) {
                    let k = !1;
                    a.forEach((O) => {
                      O.proc.toLowerCase() === A.toLowerCase() && (O.pids.push(g), O.mem += C / os.totalmem() * 100, k = !0);
                    }), k || a.push({
                      proc: A,
                      pid: g,
                      pids: [g],
                      cpu: 0,
                      mem: C / os.totalmem() * 100
                    });
                  }
                }), s !== "*" && o.filter((g) => d.filter((x) => x.name.toLowerCase().indexOf(g) >= 0).length === 0).forEach((g) => {
                  a.push({
                    proc: g,
                    pid: null,
                    pids: [],
                    cpu: 0,
                    mem: 0
                  });
                }), d.forEach((y) => {
                  let g = Jr(y, f + m, Le), x = -1;
                  for (let S = 0; S < a.length; S++)
                    (a[S].pid === g.pid || a[S].pids.indexOf(g.pid) >= 0) && (x = S);
                  x >= 0 && (a[x].cpu += g.cpuu + g.cpus), p[g.pid] = {
                    cpuu: g.cpuu,
                    cpus: g.cpus,
                    utime: g.utime,
                    stime: g.stime
                  };
                }), Le.all = f + m, Le.all_utime = f, Le.all_stime = m, Le.list = Object.assign({}, p), Le.ms = Date.now() - Le.ms, Le.result = JSON.parse(JSON.stringify(a)), n && n(a), e(a);
              }
            });
          } catch {
            n && n(a), e(a);
          }
        if (Nt || $e || An || En || Tn) {
          const l = ["-axo", "pid,ppid,pcpu,pmem,comm"];
          X.execSafe("ps", l).then((u) => {
            if (u) {
              const d = [], p = u.toString().split(`
`).filter((f) => {
                if (s === "*")
                  return !0;
                if (f.toLowerCase().indexOf("grep") !== -1)
                  return !1;
                let m = !1;
                return o.forEach((h) => {
                  m = m || f.toLowerCase().indexOf(h.toLowerCase()) >= 0;
                }), m;
              });
              if (p.shift(), p.forEach((f) => {
                const m = f.trim().replace(/ +/g, " ").split(" ");
                if (m.length > 4) {
                  const h = m[4].indexOf("/") >= 0 ? m[4].substring(0, m[4].indexOf("/")) : m[4], y = $e ? h : m[4].substring(m[4].lastIndexOf("/") + 1);
                  d.push({
                    name: y,
                    pid: parseInt(m[0]) || 0,
                    ppid: parseInt(m[1]) || 0,
                    cpu: parseFloat(m[2].replace(",", ".")),
                    mem: parseFloat(m[3].replace(",", "."))
                  });
                }
              }), d.forEach((f) => {
                let m = -1, h = !1, y = f.name;
                for (let g = 0; g < a.length; g++)
                  f.name.toLowerCase().indexOf(a[g].proc.toLowerCase()) >= 0 && (m = g);
                o.forEach((g) => {
                  f.name.toLowerCase().indexOf(g.toLowerCase()) >= 0 && !h && (h = !0, y = g);
                }), (s === "*" || h) && (m < 0 ? y && a.push({
                  proc: y,
                  pid: f.pid,
                  pids: [f.pid],
                  cpu: f.cpu,
                  mem: f.mem
                }) : (f.ppid < 10 && (a[m].pid = f.pid), a[m].pids.push(f.pid), a[m].cpu += f.cpu, a[m].mem += f.mem));
              }), s !== "*" && o.filter((m) => d.filter((h) => h.name.toLowerCase().indexOf(m) >= 0).length === 0).forEach((m) => {
                a.push({
                  proc: m,
                  pid: null,
                  pids: [],
                  cpu: 0,
                  mem: 0
                });
              }), $e) {
                a.forEach((m) => {
                  m.cpu = 0;
                });
                let f = 'cat /proc/stat | grep "cpu "';
                for (let m in a)
                  for (let h in a[m].pids)
                    f += ";cat /proc/" + a[m].pids[h] + "/stat";
                Cn(f, { maxBuffer: 1024 * 102400 }, (m, h) => {
                  let y = h.toString().split(`
`), g = _i(y.shift()), x = {}, S = {};
                  y.forEach((w) => {
                    if (S = Oi(w, g, Le), S.pid) {
                      let C = -1;
                      for (let A in a)
                        a[A].pids.indexOf(S.pid) >= 0 && (C = A);
                      C >= 0 && (a[C].cpu += S.cpuu + S.cpus), x[S.pid] = {
                        cpuu: S.cpuu,
                        cpus: S.cpus,
                        utime: S.utime,
                        stime: S.stime,
                        cutime: S.cutime,
                        cstime: S.cstime
                      };
                    }
                  }), a.forEach((w) => {
                    w.cpu = Math.round(w.cpu * 100) / 100;
                  }), Le.all = g, Le.list = Object.assign({}, x), Le.ms = Date.now() - Le.ms, Le.result = Object.assign({}, a), n && n(a), e(a);
                });
              } else
                n && n(a), e(a);
            } else
              n && n(a), e(a);
          });
        }
      }
    });
  });
}
vs.processLoad = Fl;
var Qr = {};
const fn = ee.exec, Je = D, yt = process.platform, Rl = yt === "linux" || yt === "android", Gl = yt === "darwin", Wl = yt === "win32", zl = yt === "freebsd", Ul = yt === "openbsd", $l = yt === "netbsd", Hl = yt === "sunos";
function Zr(t, n) {
  let e = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  try {
    e = "" + (/* @__PURE__ */ new Date()).getFullYear() + "-" + ("0" + ("JANFEBMARAPRMAYJUNJULAUGSEPOCTNOVDEC".indexOf(t.toUpperCase()) / 3 + 1)).slice(-2) + "-" + ("0" + n).slice(-2), new Date(e) > /* @__PURE__ */ new Date() && (e = "" + ((/* @__PURE__ */ new Date()).getFullYear() - 1) + "-" + ("0" + ("JANFEBMARAPRMAYJUNJULAUGSEPOCTNOVDEC".indexOf(t.toUpperCase()) / 3 + 1)).slice(-2) + "-" + ("0" + n).slice(-2));
  } catch {
    Je.noop();
  }
  return e;
}
function Zi(t, n) {
  const e = [];
  let s = [];
  const r = {};
  let i = !0, o = [];
  const a = [];
  let c = {}, l = !0, u = !1;
  return t.forEach((d) => {
    if (d === "---")
      l = !1;
    else {
      const p = d.replace(/ +/g, " ").split(" ");
      if (l) {
        if ((d.toLowerCase().indexOf("unexpected") >= 0 || d.toLowerCase().indexOf("unrecognized") >= 0) && (u = !0, s = []), !u) {
          const f = p && p.length > 4 && p[4].indexOf(":") > 0 ? 4 : 3;
          s.push({
            user: p[0],
            tty: p[1],
            date: f === 4 ? Zr(p[2], p[3]) : p[2],
            time: p[f],
            ip: p && p.length > f + 1 ? p[f + 1].replace(/\(/g, "").replace(/\)/g, "") : "",
            command: ""
          });
        }
      } else
        i ? d[0] !== " " && (o = p, o.forEach((f) => {
          a.push(d.indexOf(f));
        }), i = !1) : (r.user = d.substring(a[0], a[1] - 1).trim(), r.tty = d.substring(a[1], a[2] - 1).trim(), r.ip = d.substring(a[2], a[3] - 1).replace(/\(/g, "").replace(/\)/g, "").trim(), r.command = d.substring(a[7], 1e3).trim(), s.length || n === 1 ? c = s.filter((f) => f.user.substring(0, 8).trim() === r.user && f.tty === r.tty) : c = [{ user: r.user, tty: r.tty, date: "", time: "", ip: "" }], c.length === 1 && c[0].user !== "" && e.push({
          user: c[0].user,
          tty: c[0].tty,
          date: c[0].date,
          time: c[0].time,
          ip: c[0].ip,
          command: r.command
        }));
    }
  }), e.length === 0 && n === 2 ? s : e;
}
function Ws(t) {
  const n = [], e = [], s = {};
  let r = {}, i = !0;
  return t.forEach((o) => {
    if (o === "---")
      i = !1;
    else {
      const a = o.replace(/ +/g, " ").split(" ");
      i ? e.push({
        user: a[0],
        tty: a[1],
        date: Zr(a[2], a[3]),
        time: a[4]
      }) : (s.user = a[0], s.tty = a[1], s.ip = a[2] !== "-" ? a[2] : "", s.command = a.slice(5, 1e3).join(" "), r = e.filter((c) => c.user.substring(0, 10) === s.user.substring(0, 10) && (c.tty.substring(3, 1e3) === s.tty || c.tty === s.tty)), r.length === 1 && n.push({
        user: r[0].user,
        tty: r[0].tty,
        date: r[0].date,
        time: r[0].time,
        ip: s.ip,
        command: s.command
      }));
    }
  }), n;
}
function Xl(t) {
  return new Promise((n) => {
    process.nextTick(() => {
      let e = [];
      if (Rl && fn('export LC_ALL=C; who --ips; echo "---"; w; unset LC_ALL | tail -n +2', (s, r) => {
        if (s)
          t && t(e), n(e);
        else {
          let i = r.toString().split(`
`);
          e = Zi(i, 1), e.length === 0 ? fn('who; echo "---"; w | tail -n +2', (o, a) => {
            o || (i = a.toString().split(`
`), e = Zi(i, 2)), t && t(e), n(e);
          }) : (t && t(e), n(e));
        }
      }), (zl || Ul || $l) && fn('who; echo "---"; w -ih', (s, r) => {
        if (!s) {
          const i = r.toString().split(`
`);
          e = Ws(i);
        }
        t && t(e), n(e);
      }), Hl && fn('who; echo "---"; w -h', (s, r) => {
        if (!s) {
          const i = r.toString().split(`
`);
          e = Ws(i);
        }
        t && t(e), n(e);
      }), Gl && fn('export LC_ALL=C; who; echo "---"; w -ih; unset LC_ALL', (s, r) => {
        if (!s) {
          const i = r.toString().split(`
`);
          e = Ws(i);
        }
        t && t(e), n(e);
      }), Wl)
        try {
          let s = `Get-CimInstance Win32_LogonSession | select LogonId,@{n="StartTime";e={$_.StartTime.ToString("yyyy-MM-dd HH:mm:ss")}} | fl; echo '#-#-#-#';`;
          s += "Get-CimInstance Win32_LoggedOnUser | select antecedent,dependent | fl ; echo '#-#-#-#';", s += `$process = (Get-CimInstance Win32_Process -Filter "name = 'explorer.exe'"); Invoke-CimMethod -InputObject $process[0] -MethodName GetOwner | select user, domain | fl; get-process -name explorer | select-object sessionid | fl; echo '#-#-#-#';`, s += "query user", Je.powerShell(s).then((r) => {
            if (r) {
              r = r.split("#-#-#-#");
              const i = Kl((r[0] || "").split(/\n\s*\n/)), o = Yl((r[1] || "").split(/\n\s*\n/)), a = Jl((r[3] || "").split(`\r
`)), c = ql((r[2] || "").split(/\n\s*\n/), a);
              for (let l in o)
                ({}).hasOwnProperty.call(o, l) && (o[l].dateTime = {}.hasOwnProperty.call(i, l) ? i[l] : "");
              c.forEach((l) => {
                let u = "";
                for (let d in o)
                  ({}).hasOwnProperty.call(o, d) && o[d].user === l.user && (!u || u < o[d].dateTime) && (u = o[d].dateTime);
                e.push({
                  user: l.user,
                  tty: l.tty,
                  date: `${u.substring(0, 10)}`,
                  time: `${u.substring(11, 19)}`,
                  ip: "",
                  command: ""
                });
              });
            }
            t && t(e), n(e);
          });
        } catch {
          t && t(e), n(e);
        }
    });
  });
}
function Kl(t) {
  const n = {};
  return t.forEach((e) => {
    const s = e.split(`\r
`), r = Je.getValue(s, "LogonId"), i = Je.getValue(s, "starttime");
    r && (n[r] = i);
  }), n;
}
function jl(t, n) {
  t = t.toLowerCase(), n = n.toLowerCase();
  let e = 0, s = t.length;
  n.length > s && (s = n.length);
  for (let r = 0; r < s; r++) {
    const i = t[r] || "", o = n[r] || "";
    i === o && e++;
  }
  return s > 10 ? e / s > 0.9 : s > 0 ? e / s > 0.8 : !1;
}
function ql(t, n) {
  const e = [];
  return t.forEach((s) => {
    const r = s.split(`\r
`), i = Je.getValue(r, "domain", ":", !0), o = Je.getValue(r, "user", ":", !0), a = Je.getValue(r, "sessionid", ":", !0);
    if (o) {
      const c = n.filter((l) => jl(l.user, o));
      e.push({
        domain: i,
        user: o,
        tty: c && c[0] && c[0].tty ? c[0].tty : a
      });
    }
  }), e;
}
function Yl(t) {
  const n = {};
  return t.forEach((e) => {
    const s = e.split(`\r
`);
    let i = Je.getValue(s, "antecedent", ":", !0).split("=");
    const o = i.length > 2 ? i[1].split(",")[0].replace(/"/g, "").trim() : "", a = i.length > 2 ? i[2].replace(/"/g, "").replace(/\)/g, "").trim() : "";
    i = Je.getValue(s, "dependent", ":", !0).split("=");
    const l = i.length > 1 ? i[1].replace(/"/g, "").replace(/\)/g, "").trim() : "";
    l && (n[l] = {
      domain: a,
      user: o
    });
  }), n;
}
function Jl(t) {
  t = t.filter((r) => r);
  let n = [];
  const e = t[0], s = [];
  if (e) {
    const r = e[0] === " " ? 1 : 0;
    s.push(r - 1);
    let i = 0;
    for (let o = r + 1; o < e.length; o++)
      e[o] === " " && (e[o - 1] === " " || e[o - 1] === ".") ? i = o : i && (s.push(i), i = 0);
    for (let o = 1; o < t.length; o++)
      if (t[o].trim()) {
        const a = t[o].substring(s[0] + 1, s[1]).trim() || "", c = t[o].substring(s[1] + 1, s[2] - 2).trim() || "";
        n.push({
          user: a,
          tty: c
        });
      }
  }
  return n;
}
Qr.users = Xl;
var Pi = {};
const le = D, St = process.platform, er = St === "linux" || St === "android", tr = St === "darwin", Ql = St === "win32", nr = St === "freebsd", sr = St === "openbsd", ir = St === "netbsd", Zl = St === "sunos";
function e0(t, n) {
  return new Promise((e) => {
    process.nextTick(() => {
      let s = {
        url: t,
        ok: !1,
        status: 404,
        ms: null
      };
      if (typeof t != "string")
        return n && n(s), e(s);
      let r = "";
      const i = le.sanitizeShellString(t, !0), o = le.mathMin(i.length, 2e3);
      for (let a = 0; a <= o; a++)
        if (i[a] !== void 0) {
          try {
            i[a].__proto__.toLowerCase = le.stringToLower;
          } catch {
            Object.setPrototypeOf(i[a], le.stringObj);
          }
          const c = i[a].toLowerCase();
          c && c[0] && !c[1] && c[0].length === 1 && (r = r + c[0]);
        }
      s.url = r;
      try {
        if (r && !le.isPrototypePolluted()) {
          try {
            r.__proto__.startsWith = le.stringStartWith;
          } catch {
            Object.setPrototypeOf(r, le.stringObj);
          }
          if (r.startsWith("file:") || r.startsWith("gopher:") || r.startsWith("telnet:") || r.startsWith("mailto:") || r.startsWith("news:") || r.startsWith("nntp:"))
            return n && n(s), e(s);
          le.checkWebsite(r).then((a) => {
            s.status = a.statusCode, s.ok = a.statusCode >= 200 && a.statusCode <= 399, s.ms = s.ok ? a.time : null, n && n(s), e(s);
          });
        } else
          n && n(s), e(s);
      } catch {
        n && n(s), e(s);
      }
    });
  });
}
Pi.inetChecksite = e0;
function t0(t, n) {
  return le.isFunction(t) && !n && (n = t, t = ""), t = t || "8.8.8.8", new Promise((e) => {
    process.nextTick(() => {
      if (typeof t != "string")
        return n && n(null), e(null);
      let s = "";
      const r = (le.isPrototypePolluted() ? "8.8.8.8" : le.sanitizeShellString(t, !0)).trim(), i = le.mathMin(r.length, 2e3);
      for (let a = 0; a <= i; a++)
        if (r[a] !== void 0) {
          try {
            r[a].__proto__.toLowerCase = le.stringToLower;
          } catch {
            Object.setPrototypeOf(r[a], le.stringObj);
          }
          const c = r[a].toLowerCase();
          c && c[0] && !c[1] && (s = s + c[0]);
        }
      try {
        s.__proto__.startsWith = le.stringStartWith;
      } catch {
        Object.setPrototypeOf(s, le.stringObj);
      }
      if (s.startsWith("file:") || s.startsWith("gopher:") || s.startsWith("telnet:") || s.startsWith("mailto:") || s.startsWith("news:") || s.startsWith("nntp:"))
        return n && n(null), e(null);
      let o;
      if ((er || nr || sr || ir || tr) && (er && (o = ["-c", "2", "-w", "3", s]), (nr || sr || ir) && (o = ["-c", "2", "-t", "3", s]), tr && (o = ["-c2", "-t3", s]), le.execSafe("ping", o).then((a) => {
        let c = null;
        if (a) {
          const u = a.split(`
`).filter((d) => d.indexOf("rtt") >= 0 || d.indexOf("round-trip") >= 0 || d.indexOf("avg") >= 0).join(`
`).split("=");
          if (u.length > 1) {
            const d = u[1].split("/");
            d.length > 1 && (c = parseFloat(d[1]));
          }
        }
        n && n(c), e(c);
      })), Zl) {
        const a = ["-s", "-a", s, "56", "2"], c = "avg";
        le.execSafe("ping", a, { timeout: 3e3 }).then((l) => {
          let u = null;
          if (l) {
            const p = l.split(`
`).filter((f) => f.indexOf(c) >= 0).join(`
`).split("=");
            if (p.length > 1) {
              const f = p[1].split("/");
              f.length > 1 && (u = parseFloat(f[1].replace(",", ".")));
            }
          }
          n && n(u), e(u);
        });
      }
      if (Ql) {
        let a = null;
        try {
          const c = [s, "-n", "1"];
          le.execSafe("ping", c, le.execOptsWin).then((l) => {
            if (l) {
              const u = l.split(`\r
`);
              u.shift(), u.forEach((d) => {
                if ((d.toLowerCase().match(/ms/g) || []).length === 3) {
                  let p = d.replace(/ +/g, " ").split(" ");
                  p.length > 6 && (a = parseFloat(p[p.length - 1]));
                }
              });
            }
            n && n(a), e(a);
          });
        } catch {
          n && n(a), e(a);
        }
      }
    });
  });
}
Pi.inetLatency = t0;
var Ot = {};
const et = Lo, n0 = je.type() === "Windows_NT", tt = n0 ? "//./pipe/docker_engine" : "/var/run/docker.sock";
let s0 = class {
  getInfo(n) {
    try {
      let e = et.createConnection({ path: tt }), s = "", r;
      e.on("connect", () => {
        e.write(`GET http:/info HTTP/1.0\r
\r
`);
      }), e.on("data", (i) => {
        s = s + i.toString();
      }), e.on("error", () => {
        e = !1, n({});
      }), e.on("end", () => {
        const i = s.indexOf(`\r
\r
`);
        s = s.substring(i + 4), e = !1;
        try {
          r = JSON.parse(s), n(r);
        } catch {
          n({});
        }
      });
    } catch {
      n({});
    }
  }
  listImages(n, e) {
    try {
      let s = et.createConnection({ path: tt }), r = "", i;
      s.on("connect", () => {
        s.write("GET http:/images/json" + (n ? "?all=1" : "") + ` HTTP/1.0\r
\r
`);
      }), s.on("data", (o) => {
        r = r + o.toString();
      }), s.on("error", () => {
        s = !1, e({});
      }), s.on("end", () => {
        const o = r.indexOf(`\r
\r
`);
        r = r.substring(o + 4), s = !1;
        try {
          i = JSON.parse(r), e(i);
        } catch {
          e({});
        }
      });
    } catch {
      e({});
    }
  }
  inspectImage(n, e) {
    if (n = n || "", n)
      try {
        let s = et.createConnection({ path: tt }), r = "", i;
        s.on("connect", () => {
          s.write("GET http:/images/" + n + `/json?stream=0 HTTP/1.0\r
\r
`);
        }), s.on("data", (o) => {
          r = r + o.toString();
        }), s.on("error", () => {
          s = !1, e({});
        }), s.on("end", () => {
          const o = r.indexOf(`\r
\r
`);
          r = r.substring(o + 4), s = !1;
          try {
            i = JSON.parse(r), e(i);
          } catch {
            e({});
          }
        });
      } catch {
        e({});
      }
    else
      e({});
  }
  listContainers(n, e) {
    try {
      let s = et.createConnection({ path: tt }), r = "", i;
      s.on("connect", () => {
        s.write("GET http:/containers/json" + (n ? "?all=1" : "") + ` HTTP/1.0\r
\r
`);
      }), s.on("data", (o) => {
        r = r + o.toString();
      }), s.on("error", () => {
        s = !1, e({});
      }), s.on("end", () => {
        const o = r.indexOf(`\r
\r
`);
        r = r.substring(o + 4), s = !1;
        try {
          i = JSON.parse(r), e(i);
        } catch {
          e({});
        }
      });
    } catch {
      e({});
    }
  }
  getStats(n, e) {
    if (n = n || "", n)
      try {
        let s = et.createConnection({ path: tt }), r = "", i;
        s.on("connect", () => {
          s.write("GET http:/containers/" + n + `/stats?stream=0 HTTP/1.0\r
\r
`);
        }), s.on("data", (o) => {
          r = r + o.toString();
        }), s.on("error", () => {
          s = !1, e({});
        }), s.on("end", () => {
          const o = r.indexOf(`\r
\r
`);
          r = r.substring(o + 4), s = !1;
          try {
            i = JSON.parse(r), e(i);
          } catch {
            e({});
          }
        });
      } catch {
        e({});
      }
    else
      e({});
  }
  getInspect(n, e) {
    if (n = n || "", n)
      try {
        let s = et.createConnection({ path: tt }), r = "", i;
        s.on("connect", () => {
          s.write("GET http:/containers/" + n + `/json?stream=0 HTTP/1.0\r
\r
`);
        }), s.on("data", (o) => {
          r = r + o.toString();
        }), s.on("error", () => {
          s = !1, e({});
        }), s.on("end", () => {
          const o = r.indexOf(`\r
\r
`);
          r = r.substring(o + 4), s = !1;
          try {
            i = JSON.parse(r), e(i);
          } catch {
            e({});
          }
        });
      } catch {
        e({});
      }
    else
      e({});
  }
  getProcesses(n, e) {
    if (n = n || "", n)
      try {
        let s = et.createConnection({ path: tt }), r = "", i;
        s.on("connect", () => {
          s.write("GET http:/containers/" + n + `/top?ps_args=-opid,ppid,pgid,vsz,time,etime,nice,ruser,user,rgroup,group,stat,rss,args HTTP/1.0\r
\r
`);
        }), s.on("data", (o) => {
          r = r + o.toString();
        }), s.on("error", () => {
          s = !1, e({});
        }), s.on("end", () => {
          const o = r.indexOf(`\r
\r
`);
          r = r.substring(o + 4), s = !1;
          try {
            i = JSON.parse(r), e(i);
          } catch {
            e({});
          }
        });
      } catch {
        e({});
      }
    else
      e({});
  }
  listVolumes(n) {
    try {
      let e = et.createConnection({ path: tt }), s = "", r;
      e.on("connect", () => {
        e.write(`GET http:/volumes HTTP/1.0\r
\r
`);
      }), e.on("data", (i) => {
        s = s + i.toString();
      }), e.on("error", () => {
        e = !1, n({});
      }), e.on("end", () => {
        const i = s.indexOf(`\r
\r
`);
        s = s.substring(i + 4), e = !1;
        try {
          r = JSON.parse(s), n(r);
        } catch {
          n({});
        }
      });
    } catch {
      n({});
    }
  }
};
var i0 = s0;
const re = D, Pt = i0, r0 = process.platform, o0 = r0 === "win32", qt = {};
let oe, zs = 0;
function a0(t) {
  return new Promise((n) => {
    process.nextTick(() => {
      oe || (oe = new Pt());
      const e = {};
      oe.getInfo((s) => {
        e.id = s.ID, e.containers = s.Containers, e.containersRunning = s.ContainersRunning, e.containersPaused = s.ContainersPaused, e.containersStopped = s.ContainersStopped, e.images = s.Images, e.driver = s.Driver, e.memoryLimit = s.MemoryLimit, e.swapLimit = s.SwapLimit, e.kernelMemory = s.KernelMemory, e.cpuCfsPeriod = s.CpuCfsPeriod, e.cpuCfsQuota = s.CpuCfsQuota, e.cpuShares = s.CPUShares, e.cpuSet = s.CPUSet, e.ipv4Forwarding = s.IPv4Forwarding, e.bridgeNfIptables = s.BridgeNfIptables, e.bridgeNfIp6tables = s.BridgeNfIp6tables, e.debug = s.Debug, e.nfd = s.NFd, e.oomKillDisable = s.OomKillDisable, e.ngoroutines = s.NGoroutines, e.systemTime = s.SystemTime, e.loggingDriver = s.LoggingDriver, e.cgroupDriver = s.CgroupDriver, e.nEventsListener = s.NEventsListener, e.kernelVersion = s.KernelVersion, e.operatingSystem = s.OperatingSystem, e.osType = s.OSType, e.architecture = s.Architecture, e.ncpu = s.NCPU, e.memTotal = s.MemTotal, e.dockerRootDir = s.DockerRootDir, e.httpProxy = s.HttpProxy, e.httpsProxy = s.HttpsProxy, e.noProxy = s.NoProxy, e.name = s.Name, e.labels = s.Labels, e.experimentalBuild = s.ExperimentalBuild, e.serverVersion = s.ServerVersion, e.clusterStore = s.ClusterStore, e.clusterAdvertise = s.ClusterAdvertise, e.defaultRuntime = s.DefaultRuntime, e.liveRestoreEnabled = s.LiveRestoreEnabled, e.isolation = s.Isolation, e.initBinary = s.InitBinary, e.productLicense = s.ProductLicense, t && t(e), n(e);
      });
    });
  });
}
Ot.dockerInfo = a0;
function c0(t, n) {
  re.isFunction(t) && !n && (n = t, t = !1), typeof t == "string" && t === "true" && (t = !0), typeof t != "boolean" && t !== void 0 && (t = !1), t = t || !1;
  let e = [];
  return new Promise((s) => {
    process.nextTick(() => {
      oe || (oe = new Pt());
      const r = [];
      oe.listImages(t, (i) => {
        let o = {};
        try {
          o = i, o && Object.prototype.toString.call(o) === "[object Array]" && o.length > 0 ? (o.forEach((a) => {
            a.Names && Object.prototype.toString.call(a.Names) === "[object Array]" && a.Names.length > 0 && (a.Name = a.Names[0].replace(/^\/|\/$/g, "")), r.push(l0(a.Id.trim(), a));
          }), r.length ? Promise.all(r).then((a) => {
            n && n(a), s(a);
          }) : (n && n(e), s(e))) : (n && n(e), s(e));
        } catch {
          n && n(e), s(e);
        }
      });
    });
  });
}
function l0(t, n) {
  return new Promise((e) => {
    process.nextTick(() => {
      if (t = t || "", typeof t != "string")
        return e();
      const s = (re.isPrototypePolluted() ? "" : re.sanitizeShellString(t, !0)).trim();
      s ? (oe || (oe = new Pt()), oe.inspectImage(s.trim(), (r) => {
        try {
          e({
            id: n.Id,
            container: r.Container,
            comment: r.Comment,
            os: r.Os,
            architecture: r.Architecture,
            parent: r.Parent,
            dockerVersion: r.DockerVersion,
            size: r.Size,
            sharedSize: n.SharedSize,
            virtualSize: r.VirtualSize,
            author: r.Author,
            created: r.Created ? Math.round(new Date(r.Created).getTime() / 1e3) : 0,
            containerConfig: r.ContainerConfig ? r.ContainerConfig : {},
            graphDriver: r.GraphDriver ? r.GraphDriver : {},
            repoDigests: r.RepoDigests ? r.RepoDigests : {},
            repoTags: r.RepoTags ? r.RepoTags : {},
            config: r.Config ? r.Config : {},
            rootFS: r.RootFS ? r.RootFS : {}
          });
        } catch {
          e();
        }
      })) : e();
    });
  });
}
Ot.dockerImages = c0;
function vi(t, n) {
  function e(r, i) {
    return r.filter((a) => a.Id && a.Id === i).length > 0;
  }
  re.isFunction(t) && !n && (n = t, t = !1), typeof t == "string" && t === "true" && (t = !0), typeof t != "boolean" && t !== void 0 && (t = !1), t = t || !1;
  let s = [];
  return new Promise((r) => {
    process.nextTick(() => {
      oe || (oe = new Pt());
      const i = [];
      oe.listContainers(t, (o) => {
        let a = {};
        try {
          if (a = o, a && Object.prototype.toString.call(a) === "[object Array]" && a.length > 0) {
            for (let c in qt)
              ({}).hasOwnProperty.call(qt, c) && (e(a, c) || delete qt[c]);
            a.forEach((c) => {
              c.Names && Object.prototype.toString.call(c.Names) === "[object Array]" && c.Names.length > 0 && (c.Name = c.Names[0].replace(/^\/|\/$/g, "")), i.push(u0(c.Id.trim(), c));
            }), i.length ? Promise.all(i).then((c) => {
              n && n(c), r(c);
            }) : (n && n(s), r(s));
          } else
            n && n(s), r(s);
        } catch {
          for (let l in qt)
            ({}).hasOwnProperty.call(qt, l) && (e(a, l) || delete qt[l]);
          n && n(s), r(s);
        }
      });
    });
  });
}
function u0(t, n) {
  return new Promise((e) => {
    process.nextTick(() => {
      if (t = t || "", typeof t != "string")
        return e();
      const s = (re.isPrototypePolluted() ? "" : re.sanitizeShellString(t, !0)).trim();
      s ? (oe || (oe = new Pt()), oe.getInspect(s.trim(), (r) => {
        try {
          e({
            id: n.Id,
            name: n.Name,
            image: n.Image,
            imageID: n.ImageID,
            command: n.Command,
            created: n.Created,
            started: r.State && r.State.StartedAt ? Math.round(new Date(r.State.StartedAt).getTime() / 1e3) : 0,
            finished: r.State && r.State.FinishedAt && !r.State.FinishedAt.startsWith("0001-01-01") ? Math.round(new Date(r.State.FinishedAt).getTime() / 1e3) : 0,
            createdAt: r.Created ? r.Created : "",
            startedAt: r.State && r.State.StartedAt ? r.State.StartedAt : "",
            finishedAt: r.State && r.State.FinishedAt && !r.State.FinishedAt.startsWith("0001-01-01") ? r.State.FinishedAt : "",
            state: n.State,
            restartCount: r.RestartCount || 0,
            platform: r.Platform || "",
            driver: r.Driver || "",
            ports: n.Ports,
            mounts: n.Mounts
            // hostconfig: payload.HostConfig,
            // network: payload.NetworkSettings
          });
        } catch {
          e();
        }
      })) : e();
    });
  });
}
Ot.dockerContainers = vi;
function p0(t, n) {
  if (o0) {
    let e = re.nanoSeconds(), s = 0;
    if (zs > 0) {
      let r = e - zs, i = t.cpu_usage.total_usage - n.cpu_usage.total_usage;
      r > 0 && (s = 100 * i / r);
    }
    return zs = e, s;
  } else {
    let e = 0, s = t.cpu_usage.total_usage - n.cpu_usage.total_usage, r = t.system_cpu_usage - n.system_cpu_usage;
    return r > 0 && s > 0 && (n.online_cpus ? e = s / r * n.online_cpus * 100 : e = s / r * t.cpu_usage.percpu_usage.length * 100), e;
  }
}
function d0(t) {
  let n, e;
  for (let s in t) {
    if (!{}.hasOwnProperty.call(t, s))
      continue;
    const r = t[s];
    n = +r.rx_bytes, e = +r.tx_bytes;
  }
  return {
    rx: n,
    wx: e
  };
}
function f0(t) {
  let n = {
    r: 0,
    w: 0
  };
  return t && t.io_service_bytes_recursive && Object.prototype.toString.call(t.io_service_bytes_recursive) === "[object Array]" && t.io_service_bytes_recursive.length > 0 && t.io_service_bytes_recursive.forEach((e) => {
    e.op && e.op.toLowerCase() === "read" && e.value && (n.r += e.value), e.op && e.op.toLowerCase() === "write" && e.value && (n.w += e.value);
  }), n;
}
function Mi(t, n) {
  let e = [];
  return new Promise((s) => {
    process.nextTick(() => {
      if (re.isFunction(t) && !n)
        n = t, e = ["*"];
      else {
        if (t = t || "*", typeof t != "string")
          return n && n([]), s([]);
        let o = "";
        try {
          o.__proto__.toLowerCase = re.stringToLower, o.__proto__.replace = re.stringReplace, o.__proto__.toString = re.stringToString, o.__proto__.substr = re.stringSubstr, o.__proto__.substring = re.stringSubstring, o.__proto__.trim = re.stringTrim, o.__proto__.startsWith = re.stringStartWith;
        } catch {
          Object.setPrototypeOf(o, re.stringObj);
        }
        if (o = t, o = o.trim(), o !== "*") {
          o = "";
          const a = (re.isPrototypePolluted() ? "" : re.sanitizeShellString(t, !0)).trim(), c = re.mathMin(a.length, 2e3);
          for (let l = 0; l <= c; l++)
            if (a[l] !== void 0) {
              a[l].__proto__.toLowerCase = re.stringToLower;
              const u = a[l].toLowerCase();
              u && u[0] && !u[1] && (o = o + u[0]);
            }
        }
        o = o.trim().toLowerCase().replace(/,+/g, "|"), e = o.split("|");
      }
      const r = [], i = [];
      if (e.length && e[0].trim() === "*")
        e = [], vi().then((o) => {
          for (let a of o)
            e.push(a.id.substring(0, 12));
          e.length ? Mi(e.join(",")).then((a) => {
            n && n(a), s(a);
          }) : (n && n(r), s(r));
        });
      else {
        for (let o of e)
          i.push(m0(o.trim()));
        i.length ? Promise.all(i).then((o) => {
          n && n(o), s(o);
        }) : (n && n(r), s(r));
      }
    });
  });
}
function m0(t) {
  t = t || "";
  const n = {
    id: t,
    memUsage: 0,
    memLimit: 0,
    memPercent: 0,
    cpuPercent: 0,
    pids: 0,
    netIO: {
      rx: 0,
      wx: 0
    },
    blockIO: {
      r: 0,
      w: 0
    },
    restartCount: 0,
    cpuStats: {},
    precpuStats: {},
    memoryStats: {},
    networks: {}
  };
  return new Promise((e) => {
    process.nextTick(() => {
      t ? (oe || (oe = new Pt()), oe.getInspect(t, (s) => {
        try {
          oe.getStats(t, (r) => {
            try {
              let i = r;
              i.message || (r.id && (n.id = r.id), n.memUsage = i.memory_stats && i.memory_stats.usage ? i.memory_stats.usage : 0, n.memLimit = i.memory_stats && i.memory_stats.limit ? i.memory_stats.limit : 0, n.memPercent = i.memory_stats && i.memory_stats.usage && i.memory_stats.limit ? i.memory_stats.usage / i.memory_stats.limit * 100 : 0, n.cpuPercent = i.cpu_stats && i.precpu_stats ? p0(i.cpu_stats, i.precpu_stats) : 0, n.pids = i.pids_stats && i.pids_stats.current ? i.pids_stats.current : 0, n.restartCount = s.RestartCount ? s.RestartCount : 0, i.networks && (n.netIO = d0(i.networks)), i.blkio_stats && (n.blockIO = f0(i.blkio_stats)), n.cpuStats = i.cpu_stats ? i.cpu_stats : {}, n.precpuStats = i.precpu_stats ? i.precpu_stats : {}, n.memoryStats = i.memory_stats ? i.memory_stats : {}, n.networks = i.networks ? i.networks : {});
            } catch {
              re.noop();
            }
            e(n);
          });
        } catch {
          re.noop();
        }
      })) : e(n);
    });
  });
}
Ot.dockerContainerStats = Mi;
function eo(t, n) {
  let e = [];
  return new Promise((s) => {
    process.nextTick(() => {
      if (t = t || "", typeof t != "string")
        return s(e);
      const r = (re.isPrototypePolluted() ? "" : re.sanitizeShellString(t, !0)).trim();
      r ? (oe || (oe = new Pt()), oe.getProcesses(r, (i) => {
        try {
          if (i && i.Titles && i.Processes) {
            let o = i.Titles.map(function(C) {
              return C.toUpperCase();
            }), a = o.indexOf("PID"), c = o.indexOf("PPID"), l = o.indexOf("PGID"), u = o.indexOf("VSZ"), d = o.indexOf("TIME"), p = o.indexOf("ELAPSED"), f = o.indexOf("NI"), m = o.indexOf("RUSER"), h = o.indexOf("USER"), y = o.indexOf("RGROUP"), g = o.indexOf("GROUP"), x = o.indexOf("STAT"), S = o.indexOf("RSS"), w = o.indexOf("COMMAND");
            i.Processes.forEach((C) => {
              e.push({
                pidHost: a >= 0 ? C[a] : "",
                ppid: c >= 0 ? C[c] : "",
                pgid: l >= 0 ? C[l] : "",
                user: h >= 0 ? C[h] : "",
                ruser: m >= 0 ? C[m] : "",
                group: g >= 0 ? C[g] : "",
                rgroup: y >= 0 ? C[y] : "",
                stat: x >= 0 ? C[x] : "",
                time: d >= 0 ? C[d] : "",
                elapsed: p >= 0 ? C[p] : "",
                nice: f >= 0 ? C[f] : "",
                rss: S >= 0 ? C[S] : "",
                vsz: u >= 0 ? C[u] : "",
                command: w >= 0 ? C[w] : ""
              });
            });
          }
        } catch {
          re.noop();
        }
        n && n(e), s(e);
      })) : (n && n(e), s(e));
    });
  });
}
Ot.dockerContainerProcesses = eo;
function g0(t) {
  let n = [];
  return new Promise((e) => {
    process.nextTick(() => {
      oe || (oe = new Pt()), oe.listVolumes((s) => {
        let r = {};
        try {
          r = s, r && r.Volumes && Object.prototype.toString.call(r.Volumes) === "[object Array]" && r.Volumes.length > 0 ? (r.Volumes.forEach((i) => {
            n.push({
              name: i.Name,
              driver: i.Driver,
              labels: i.Labels,
              mountpoint: i.Mountpoint,
              options: i.Options,
              scope: i.Scope,
              created: i.CreatedAt ? Math.round(new Date(i.CreatedAt).getTime() / 1e3) : 0
            });
          }), t && t(n), e(n)) : (t && t(n), e(n));
        } catch {
          t && t(n), e(n);
        }
      });
    });
  });
}
Ot.dockerVolumes = g0;
function h0(t) {
  return new Promise((n) => {
    process.nextTick(() => {
      vi(!0).then((e) => {
        if (e && Object.prototype.toString.call(e) === "[object Array]" && e.length > 0) {
          let s = e.length;
          e.forEach((r) => {
            Mi(r.id).then((i) => {
              r.memUsage = i[0].memUsage, r.memLimit = i[0].memLimit, r.memPercent = i[0].memPercent, r.cpuPercent = i[0].cpuPercent, r.pids = i[0].pids, r.netIO = i[0].netIO, r.blockIO = i[0].blockIO, r.cpuStats = i[0].cpuStats, r.precpuStats = i[0].precpuStats, r.memoryStats = i[0].memoryStats, r.networks = i[0].networks, eo(r.id).then((o) => {
                r.processes = o, s -= 1, s === 0 && (t && t(e), n(e));
              });
            });
          });
        } else
          t && t(e), n(e);
      });
    });
  });
}
Ot.dockerAll = h0;
var to = {};
const Us = je, x0 = ee.exec, J = D;
function y0(t) {
  let n = [];
  return new Promise((e) => {
    process.nextTick(() => {
      try {
        x0(J.getVboxmanage() + " list vms --long", (s, r) => {
          let i = (Us.EOL + r.toString()).split(Us.EOL + "Name:");
          i.shift(), i.forEach((o) => {
            const a = ("Name:" + o).split(Us.EOL), c = J.getValue(a, "State"), l = c.startsWith("running"), u = l ? c.replace("running (since ", "").replace(")", "").trim() : "";
            let d = 0;
            try {
              if (l) {
                const m = new Date(u), h = m.getTimezoneOffset();
                d = Math.round((Date.now() - Date.parse(m)) / 1e3) + h * 60;
              }
            } catch {
              J.noop();
            }
            const p = l ? "" : c.replace("powered off (since", "").replace(")", "").trim();
            let f = 0;
            try {
              if (!l) {
                const m = new Date(p), h = m.getTimezoneOffset();
                f = Math.round((Date.now() - Date.parse(m)) / 1e3) + h * 60;
              }
            } catch {
              J.noop();
            }
            n.push({
              id: J.getValue(a, "UUID"),
              name: J.getValue(a, "Name"),
              running: l,
              started: u,
              runningSince: d,
              stopped: p,
              stoppedSince: f,
              guestOS: J.getValue(a, "Guest OS"),
              hardwareUUID: J.getValue(a, "Hardware UUID"),
              memory: parseInt(J.getValue(a, "Memory size", "     "), 10),
              vram: parseInt(J.getValue(a, "VRAM size"), 10),
              cpus: parseInt(J.getValue(a, "Number of CPUs"), 10),
              cpuExepCap: J.getValue(a, "CPU exec cap"),
              cpuProfile: J.getValue(a, "CPUProfile"),
              chipset: J.getValue(a, "Chipset"),
              firmware: J.getValue(a, "Firmware"),
              pageFusion: J.getValue(a, "Page Fusion") === "enabled",
              configFile: J.getValue(a, "Config file"),
              snapshotFolder: J.getValue(a, "Snapshot folder"),
              logFolder: J.getValue(a, "Log folder"),
              hpet: J.getValue(a, "HPET") === "enabled",
              pae: J.getValue(a, "PAE") === "enabled",
              longMode: J.getValue(a, "Long Mode") === "enabled",
              tripleFaultReset: J.getValue(a, "Triple Fault Reset") === "enabled",
              apic: J.getValue(a, "APIC") === "enabled",
              x2Apic: J.getValue(a, "X2APIC") === "enabled",
              acpi: J.getValue(a, "ACPI") === "enabled",
              ioApic: J.getValue(a, "IOAPIC") === "enabled",
              biosApicMode: J.getValue(a, "BIOS APIC mode"),
              bootMenuMode: J.getValue(a, "Boot menu mode"),
              bootDevice1: J.getValue(a, "Boot Device 1"),
              bootDevice2: J.getValue(a, "Boot Device 2"),
              bootDevice3: J.getValue(a, "Boot Device 3"),
              bootDevice4: J.getValue(a, "Boot Device 4"),
              timeOffset: J.getValue(a, "Time offset"),
              rtc: J.getValue(a, "RTC")
            });
          }), t && t(n), e(n);
        });
      } catch {
        t && t(n), e(n);
      }
    });
  });
}
to.vboxInfo = y0;
var no = {};
const $s = ee.exec, ge = D;
let Ct = process.platform;
const rr = Ct === "linux" || Ct === "android", S0 = Ct === "darwin", C0 = Ct === "win32", w0 = Ct === "freebsd", L0 = Ct === "openbsd", I0 = Ct === "netbsd", _0 = Ct === "sunos", or = {
  1: "Other",
  2: "Unknown",
  3: "Idle",
  4: "Printing",
  5: "Warmup",
  6: "Stopped Printing",
  7: "Offline"
};
function O0(t) {
  const n = {};
  if (t && t.length && t[0].indexOf(" CUPS v") > 0) {
    const e = t[0].split(" CUPS v");
    n.cupsVersion = e[1];
  }
  return n;
}
function P0(t) {
  const n = {}, e = ge.getValue(t, "PrinterId", " ");
  return n.id = e ? parseInt(e, 10) : null, n.name = ge.getValue(t, "Info", " "), n.model = t.length > 0 && t[0] ? t[0].split(" ")[0] : "", n.uri = ge.getValue(t, "DeviceURI", " "), n.uuid = ge.getValue(t, "UUID", " "), n.status = ge.getValue(t, "State", " "), n.local = ge.getValue(t, "Location", " ").toLowerCase().startsWith("local"), n.default = null, n.shared = ge.getValue(t, "Shared", " ").toLowerCase().startsWith("yes"), n;
}
function v0(t, n) {
  const e = {};
  return e.id = n, e.name = ge.getValue(t, "Description", ":", !0), e.model = t.length > 0 && t[0] ? t[0].split(" ")[0] : "", e.uri = null, e.uuid = null, e.status = t.length > 0 && t[0] ? t[0].indexOf(" idle") > 0 ? "idle" : t[0].indexOf(" printing") > 0 ? "printing" : "unknown" : null, e.local = ge.getValue(t, "Location", ":", !0).toLowerCase().startsWith("local"), e.default = null, e.shared = ge.getValue(t, "Shared", " ").toLowerCase().startsWith("yes"), e;
}
function M0(t, n) {
  const e = {}, s = t.uri.split("/");
  return e.id = n, e.name = t._name, e.model = s.length ? s[s.length - 1] : "", e.uri = t.uri, e.uuid = null, e.status = t.status, e.local = t.printserver === "local", e.default = t.default === "yes", e.shared = t.shared === "yes", e;
}
function A0(t, n) {
  const e = {}, s = parseInt(ge.getValue(t, "PrinterStatus", ":"), 10);
  return e.id = n, e.name = ge.getValue(t, "name", ":"), e.model = ge.getValue(t, "DriverName", ":"), e.uri = null, e.uuid = null, e.status = or[s] ? or[s] : null, e.local = ge.getValue(t, "Local", ":").toUpperCase() === "TRUE", e.default = ge.getValue(t, "Default", ":").toUpperCase() === "TRUE", e.shared = ge.getValue(t, "Shared", ":").toUpperCase() === "TRUE", e;
}
function E0(t) {
  return new Promise((n) => {
    process.nextTick(() => {
      let e = [];
      if (rr || w0 || L0 || I0) {
        let s = "cat /etc/cups/printers.conf 2>/dev/null";
        $s(s, (r, i) => {
          if (!r) {
            const o = i.toString().split("<Printer "), a = O0(o[0]);
            for (let c = 1; c < o.length; c++) {
              const l = P0(o[c].split(`
`));
              l.name && (l.engine = "CUPS", l.engineVersion = a.cupsVersion, e.push(l));
            }
          }
          e.length === 0 && rr ? (s = "export LC_ALL=C; lpstat -lp 2>/dev/null; unset LC_ALL", $s(s, (o, a) => {
            const c = (`
` + a.toString()).split(`
printer `);
            for (let l = 1; l < c.length; l++) {
              const u = v0(c[l].split(`
`), l);
              e.push(u);
            }
          }), t && t(e), n(e)) : (t && t(e), n(e));
        });
      }
      S0 && $s("system_profiler SPPrintersDataType -json", (r, i) => {
        if (!r)
          try {
            const o = JSON.parse(i.toString());
            if (o.SPPrintersDataType && o.SPPrintersDataType.length)
              for (let a = 0; a < o.SPPrintersDataType.length; a++) {
                const c = M0(o.SPPrintersDataType[a], a);
                e.push(c);
              }
          } catch {
            ge.noop();
          }
        t && t(e), n(e);
      }), C0 && ge.powerShell("Get-CimInstance Win32_Printer | select PrinterStatus,Name,DriverName,Local,Default,Shared | fl").then((s, r) => {
        if (!r) {
          const i = s.toString().split(/\n\s*\n/);
          for (let o = 0; o < i.length; o++) {
            const a = A0(i[o].split(`
`), o);
            (a.name || a.model) && e.push(a);
          }
        }
        t && t(e), n(e);
      }), _0 && n(null);
    });
  });
}
no.printer = E0;
var so = {};
const ar = ee.exec, be = D;
let wt = process.platform;
const T0 = wt === "linux" || wt === "android", D0 = wt === "darwin", b0 = wt === "win32", V0 = wt === "freebsd", N0 = wt === "openbsd", B0 = wt === "netbsd", k0 = wt === "sunos";
function F0(t, n) {
  let e = t;
  const s = (n + " " + t).toLowerCase();
  return s.indexOf("camera") >= 0 ? e = "Camera" : s.indexOf("hub") >= 0 ? e = "Hub" : s.indexOf("keybrd") >= 0 || s.indexOf("keyboard") >= 0 ? e = "Keyboard" : s.indexOf("mouse") >= 0 ? e = "Mouse" : s.indexOf("stora") >= 0 ? e = "Storage" : s.indexOf("microp") >= 0 ? e = "Microphone" : (s.indexOf("headset") >= 0 || s.indexOf("audio") >= 0) && (e = "Audio"), e;
}
function R0(t) {
  const n = {}, e = t.split(`
`);
  if (e && e.length && e[0].indexOf("Device") >= 0) {
    const x = e[0].split(" ");
    n.bus = parseInt(x[0], 10), x[2] ? n.deviceId = parseInt(x[2], 10) : n.deviceId = null;
  } else
    n.bus = null, n.deviceId = null;
  const s = be.getValue(e, "idVendor", " ", !0).trim();
  let r = s.split(" ");
  r.shift();
  const i = r.join(" "), o = be.getValue(e, "idProduct", " ", !0).trim();
  let a = o.split(" ");
  a.shift();
  const c = a.join(" ");
  let u = be.getValue(e, "bInterfaceClass", " ", !0).trim().split(" ");
  u.shift();
  const d = u.join(" ");
  let f = be.getValue(e, "iManufacturer", " ", !0).trim().split(" ");
  f.shift();
  const m = f.join(" ");
  let y = be.getValue(e, "iSerial", " ", !0).trim().split(" ");
  y.shift();
  const g = y.join(" ");
  return n.id = (s.startsWith("0x") ? s.split(" ")[0].substr(2, 10) : "") + ":" + (o.startsWith("0x") ? o.split(" ")[0].substr(2, 10) : ""), n.name = c, n.type = F0(d, c), n.removable = null, n.vendor = i, n.manufacturer = m, n.maxPower = be.getValue(e, "MaxPower", " ", !0), n.serialNumber = g, n;
}
function G0(t) {
  let n = "";
  return t.indexOf("camera") >= 0 ? n = "Camera" : t.indexOf("touch bar") >= 0 ? n = "Touch Bar" : t.indexOf("controller") >= 0 ? n = "Controller" : t.indexOf("headset") >= 0 ? n = "Audio" : t.indexOf("keyboard") >= 0 ? n = "Keyboard" : t.indexOf("trackpad") >= 0 ? n = "Trackpad" : t.indexOf("sensor") >= 0 ? n = "Sensor" : t.indexOf("bthusb") >= 0 || t.indexOf("bth") >= 0 || t.indexOf("rfcomm") >= 0 ? n = "Bluetooth" : t.indexOf("usbhub") >= 0 || t.indexOf(" hub") >= 0 ? n = "Hub" : t.indexOf("mouse") >= 0 ? n = "Mouse" : t.indexOf("microp") >= 0 ? n = "Microphone" : t.indexOf("removable") >= 0 && (n = "Storage"), n;
}
function W0(t, n) {
  const e = {};
  e.id = n, t = t.replace(/ \|/g, ""), t = t.trim();
  let s = t.split(`
`);
  s.shift();
  try {
    for (let o = 0; o < s.length; o++) {
      s[o] = s[o].trim(), s[o] = s[o].replace(/=/g, ":"), s[o] !== "{" && s[o] !== "}" && s[o + 1] && s[o + 1].trim() !== "}" && (s[o] = s[o] + ","), s[o] = s[o].replace(":Yes,", ':"Yes",'), s[o] = s[o].replace(": Yes,", ': "Yes",'), s[o] = s[o].replace(": Yes", ': "Yes"'), s[o] = s[o].replace(":No,", ':"No",'), s[o] = s[o].replace(": No,", ': "No",'), s[o] = s[o].replace(": No", ': "No"'), s[o] = s[o].replace("((", "").replace("))", "");
      const a = /<(\w+)>/.exec(s[o]);
      if (a) {
        const c = a[0];
        s[o] = s[o].replace(c, `"${c}"`);
      }
    }
    const r = JSON.parse(s.join(`
`)), i = (r["Built-In"] ? r["Built-In"].toLowerCase() !== "yes" : !0) && (r["non-removable"] ? r["non-removable"].toLowerCase() === "no" : !0);
    return e.bus = null, e.deviceId = null, e.id = r["USB Address"] || null, e.name = r.kUSBProductString || r["USB Product Name"] || null, e.type = G0((r.kUSBProductString || r["USB Product Name"] || "").toLowerCase() + (i ? " removable" : "")), e.removable = r["non-removable"] ? r["non-removable"].toLowerCase() || !1 : !0, e.vendor = r.kUSBVendorString || r["USB Vendor Name"] || null, e.manufacturer = r.kUSBVendorString || r["USB Vendor Name"] || null, e.maxPower = null, e.serialNumber = r.kUSBSerialNumberString || null, e.name ? e : null;
  } catch {
    return null;
  }
}
function z0(t, n) {
  let e = "";
  return n.indexOf("storage") >= 0 || n.indexOf("speicher") >= 0 ? e = "Storage" : t.indexOf("usbhub") >= 0 ? e = "Hub" : t.indexOf("storage") >= 0 ? e = "Storage" : t.indexOf("usbcontroller") >= 0 ? e = "Controller" : t.indexOf("keyboard") >= 0 ? e = "Keyboard" : t.indexOf("pointing") >= 0 ? e = "Mouse" : t.indexOf("microp") >= 0 ? e = "Microphone" : t.indexOf("disk") >= 0 && (e = "Storage"), e;
}
function U0(t, n) {
  const e = z0(be.getValue(t, "CreationClassName", ":").toLowerCase(), be.getValue(t, "name", ":").toLowerCase());
  if (e) {
    const s = {};
    return s.bus = null, s.deviceId = be.getValue(t, "deviceid", ":"), s.id = n, s.name = be.getValue(t, "name", ":"), s.type = e, s.removable = null, s.vendor = null, s.manufacturer = be.getValue(t, "Manufacturer", ":"), s.maxPower = null, s.serialNumber = null, s;
  } else
    return null;
}
function $0(t) {
  return new Promise((n) => {
    process.nextTick(() => {
      let e = [];
      T0 && ar("export LC_ALL=C; lsusb -v 2>/dev/null; unset LC_ALL", { maxBuffer: 1024 * 1024 * 128 }, function(r, i) {
        if (!r) {
          const o = (`

` + i.toString()).split(`

Bus `);
          for (let a = 1; a < o.length; a++) {
            const c = R0(o[a]);
            e.push(c);
          }
        }
        t && t(e), n(e);
      }), D0 && ar("ioreg -p IOUSB -c AppleUSBRootHubDevice -w0 -l", { maxBuffer: 1024 * 1024 * 128 }, function(r, i) {
        if (!r) {
          const o = i.toString().split(" +-o ");
          for (let a = 1; a < o.length; a++) {
            const c = W0(o[a]);
            c && e.push(c);
          }
          t && t(e), n(e);
        }
        t && t(e), n(e);
      }), b0 && be.powerShell('Get-CimInstance CIM_LogicalDevice | where { $_.Description -match "USB"} | select Name,CreationClassName,DeviceId,Manufacturer | fl').then((s, r) => {
        if (!r) {
          const i = s.toString().split(/\n\s*\n/);
          for (let o = 0; o < i.length; o++) {
            const a = U0(i[o].split(`
`), o);
            a && e.filter((c) => c.deviceId === a.deviceId).length === 0 && e.push(a);
          }
        }
        t && t(e), n(e);
      }), (k0 || V0 || N0 || B0) && n(null);
    });
  });
}
so.usb = $0;
var io = {};
const cr = ee.exec, H0 = ee.execSync, Ce = D, Lt = process.platform, X0 = Lt === "linux" || Lt === "android", K0 = Lt === "darwin", j0 = Lt === "win32", q0 = Lt === "freebsd", Y0 = Lt === "openbsd", J0 = Lt === "netbsd", Q0 = Lt === "sunos";
function Ai(t, n, e) {
  t = t.toLowerCase();
  let s = "";
  return t.indexOf("input") >= 0 && (s = "Microphone"), t.indexOf("display audio") >= 0 && (s = "Speaker"), t.indexOf("speak") >= 0 && (s = "Speaker"), t.indexOf("laut") >= 0 && (s = "Speaker"), t.indexOf("loud") >= 0 && (s = "Speaker"), t.indexOf("head") >= 0 && (s = "Headset"), t.indexOf("mic") >= 0 && (s = "Microphone"), t.indexOf("mikr") >= 0 && (s = "Microphone"), t.indexOf("phone") >= 0 && (s = "Phone"), t.indexOf("controll") >= 0 && (s = "Controller"), t.indexOf("line o") >= 0 && (s = "Line Out"), t.indexOf("digital o") >= 0 && (s = "Digital Out"), t.indexOf("smart sound technology") >= 0 && (s = "Digital Signal Processor"), t.indexOf("high definition audio") >= 0 && (s = "Sound Driver"), !s && e ? s = "Speaker" : !s && n && (s = "Microphone"), s;
}
function Z0() {
  const t = "lspci -v 2>/dev/null", n = [];
  try {
    return H0(t, Ce.execOptsLinux).toString().split(`

`).forEach((s) => {
      const r = s.split(`
`);
      if (r && r.length && r[0].toLowerCase().indexOf("audio") >= 0) {
        const i = {};
        i.slotId = r[0].split(" ")[0], i.driver = Ce.getValue(r, "Kernel driver in use", ":", !0) || Ce.getValue(r, "Kernel modules", ":", !0), n.push(i);
      }
    }), n;
  } catch {
    return n;
  }
}
function eu(t) {
  let n = t;
  return t === 1 ? n = "other" : t === 2 ? n = "unknown" : t === 3 ? n = "enabled" : t === 4 ? n = "disabled" : t === 5 && (n = "not applicable"), n;
}
function tu(t, n) {
  const e = {}, s = Ce.getValue(t, "Slot"), r = n.filter((i) => i.slotId === s);
  return e.id = s, e.name = Ce.getValue(t, "SDevice"), e.manufacturer = Ce.getValue(t, "SVendor"), e.revision = Ce.getValue(t, "Rev"), e.driver = r && r.length === 1 && r[0].driver ? r[0].driver : "", e.default = null, e.channel = "PCIe", e.type = Ai(e.name, null, null), e.in = null, e.out = null, e.status = "online", e;
}
function nu(t) {
  let n = "";
  return t.indexOf("builtin") >= 0 && (n = "Built-In"), t.indexOf("extern") >= 0 && (n = "Audio-Jack"), t.indexOf("hdmi") >= 0 && (n = "HDMI"), t.indexOf("displayport") >= 0 && (n = "Display-Port"), t.indexOf("usb") >= 0 && (n = "USB"), t.indexOf("pci") >= 0 && (n = "PCIe"), n;
}
function su(t, n) {
  const e = {}, s = ((t.coreaudio_device_transport || "") + " " + (t._name || "")).toLowerCase();
  return e.id = n, e.name = t._name, e.manufacturer = t.coreaudio_device_manufacturer, e.revision = null, e.driver = null, e.default = !!t.coreaudio_default_audio_input_device || !!t.coreaudio_default_audio_output_device, e.channel = nu(s), e.type = Ai(e.name, !!t.coreaudio_device_input, !!t.coreaudio_device_output), e.in = !!t.coreaudio_device_input, e.out = !!t.coreaudio_device_output, e.status = "online", e;
}
function iu(t) {
  const n = {}, e = eu(Ce.getValue(t, "StatusInfo", ":"));
  return n.id = Ce.getValue(t, "DeviceID", ":"), n.name = Ce.getValue(t, "name", ":"), n.manufacturer = Ce.getValue(t, "manufacturer", ":"), n.revision = null, n.driver = null, n.default = null, n.channel = null, n.type = Ai(n.name, null, null), n.in = null, n.out = null, n.status = e, n;
}
function ru(t) {
  return new Promise((n) => {
    process.nextTick(() => {
      const e = [];
      (X0 || q0 || Y0 || J0) && cr("lspci -vmm 2>/dev/null", (r, i) => {
        if (!r) {
          const o = Z0();
          i.toString().split(`

`).forEach((c) => {
            const l = c.split(`
`);
            if (Ce.getValue(l, "class", ":", !0).toLowerCase().indexOf("audio") >= 0) {
              const u = tu(l, o);
              e.push(u);
            }
          });
        }
        t && t(e), n(e);
      }), K0 && cr("system_profiler SPAudioDataType -json", (r, i) => {
        if (!r)
          try {
            const o = JSON.parse(i.toString());
            if (o.SPAudioDataType && o.SPAudioDataType.length && o.SPAudioDataType[0] && o.SPAudioDataType[0]._items && o.SPAudioDataType[0]._items.length)
              for (let a = 0; a < o.SPAudioDataType[0]._items.length; a++) {
                const c = su(o.SPAudioDataType[0]._items[a], a);
                e.push(c);
              }
          } catch {
            Ce.noop();
          }
        t && t(e), n(e);
      }), j0 && Ce.powerShell("Get-CimInstance Win32_SoundDevice | select DeviceID,StatusInfo,Name,Manufacturer | fl").then((s, r) => {
        r || s.toString().split(/\n\s*\n/).forEach((o) => {
          const a = o.split(`
`);
          Ce.getValue(a, "name", ":") && e.push(iu(a));
        }), t && t(e), n(e);
      }), Q0 && n(null);
    });
  });
}
io.audio = ru;
var ro = {}, ou = {
  0: "Ericsson Technology Licensing",
  1: "Nokia Mobile Phones",
  2: "Intel Corp.",
  3: "IBM Corp.",
  4: "Toshiba Corp.",
  5: "3Com",
  6: "Microsoft",
  7: "Lucent",
  8: "Motorola",
  9: "Infineon Technologies AG",
  10: "Cambridge Silicon Radio",
  11: "Silicon Wave",
  12: "Digianswer A/S",
  13: "Texas Instruments Inc.",
  14: "Ceva, Inc. (formerly Parthus Technologies, Inc.)",
  15: "Broadcom Corporation",
  16: "Mitel Semiconductor",
  17: "Widcomm, Inc",
  18: "Zeevo, Inc.",
  19: "Atmel Corporation",
  20: "Mitsubishi Electric Corporation",
  21: "RTX Telecom A/S",
  22: "KC Technology Inc.",
  23: "NewLogic",
  24: "Transilica, Inc.",
  25: "Rohde & Schwarz GmbH & Co. KG",
  26: "TTPCom Limited",
  27: "Signia Technologies, Inc.",
  28: "Conexant Systems Inc.",
  29: "Qualcomm",
  30: "Inventel",
  31: "AVM Berlin",
  32: "BandSpeed, Inc.",
  33: "Mansella Ltd",
  34: "NEC Corporation",
  35: "WavePlus Technology Co., Ltd.",
  36: "Alcatel",
  37: "NXP Semiconductors (formerly Philips Semiconductors)",
  38: "C Technologies",
  39: "Open Interface",
  40: "R F Micro Devices",
  41: "Hitachi Ltd",
  42: "Symbol Technologies, Inc.",
  43: "Tenovis",
  44: "Macronix International Co. Ltd.",
  45: "GCT Semiconductor",
  46: "Norwood Systems",
  47: "MewTel Technology Inc.",
  48: "ST Microelectronics",
  49: "Synopsis",
  50: "Red-M (Communications) Ltd",
  51: "Commil Ltd",
  52: "Computer Access Technology Corporation (CATC)",
  53: "Eclipse (HQ Espana) S.L.",
  54: "Renesas Electronics Corporation",
  55: "Mobilian Corporation",
  56: "Terax",
  57: "Integrated System Solution Corp.",
  58: "Matsushita Electric Industrial Co., Ltd.",
  59: "Gennum Corporation",
  60: "BlackBerry Limited (formerly Research In Motion)",
  61: "IPextreme, Inc.",
  62: "Systems and Chips, Inc.",
  63: "Bluetooth SIG, Inc.",
  64: "Seiko Epson Corporation",
  65: "Integrated Silicon Solution Taiwan, Inc.",
  66: "CONWISE Technology Corporation Ltd",
  67: "PARROT SA",
  68: "Socket Mobile",
  69: "Atheros Communications, Inc.",
  70: "MediaTek, Inc.",
  71: "Bluegiga",
  72: "Marvell Technology Group Ltd.",
  73: "3DSP Corporation",
  74: "Accel Semiconductor Ltd.",
  75: "Continental Automotive Systems",
  76: "Apple, Inc.",
  77: "Staccato Communications, Inc.",
  78: "Avago Technologies",
  79: "APT Licensing Ltd.",
  80: "SiRF Technology",
  81: "Tzero Technologies, Inc.",
  82: "J&M Corporation",
  83: "Free2move AB",
  84: "3DiJoy Corporation",
  85: "Plantronics, Inc.",
  86: "Sony Ericsson Mobile Communications",
  87: "Harman International Industries, Inc.",
  88: "Vizio, Inc.",
  89: "Nordic Semiconductor ASA",
  90: "EM Microelectronic-Marin SA",
  91: "Ralink Technology Corporation",
  92: "Belkin International, Inc.",
  93: "Realtek Semiconductor Corporation",
  94: "Stonestreet One, LLC",
  95: "Wicentric, Inc.",
  96: "RivieraWaves S.A.S",
  97: "RDA Microelectronics",
  98: "Gibson Guitars",
  99: "MiCommand Inc.",
  100: "Band XI International, LLC",
  101: "Hewlett-Packard Company",
  102: "9Solutions Oy",
  103: "GN Netcom A/S",
  104: "General Motors",
  105: "A&D Engineering, Inc.",
  106: "MindTree Ltd.",
  107: "Polar Electro OY",
  108: "Beautiful Enterprise Co., Ltd.",
  109: "BriarTek, Inc.",
  110: "Summit Data Communications, Inc.",
  111: "Sound ID",
  112: "Monster, LLC",
  113: "connectBlue AB",
  114: "ShangHai Super Smart Electronics Co. Ltd.",
  115: "Group Sense Ltd.",
  116: "Zomm, LLC",
  117: "Samsung Electronics Co. Ltd.",
  118: "Creative Technology Ltd.",
  119: "Laird Technologies",
  120: "Nike, Inc.",
  121: "lesswire AG",
  122: "MStar Semiconductor, Inc.",
  123: "Hanlynn Technologies",
  124: "A & R Cambridge",
  125: "Seers Technology Co. Ltd",
  126: "Sports Tracking Technologies Ltd.",
  127: "Autonet Mobile",
  128: "DeLorme Publishing Company, Inc.",
  129: "WuXi Vimicro",
  130: "Sennheiser Communications A/S",
  131: "TimeKeeping Systems, Inc.",
  132: "Ludus Helsinki Ltd.",
  133: "BlueRadios, Inc.",
  134: "equinox AG",
  135: "Garmin International, Inc.",
  136: "Ecotest",
  137: "GN ReSound A/S",
  138: "Jawbone",
  139: "Topcorn Positioning Systems, LLC",
  140: "Gimbal Inc. (formerly Qualcomm Labs, Inc. and Qualcomm Retail Solutions, Inc.)",
  141: "Zscan Software",
  142: "Quintic Corp.",
  143: "Stollman E+V GmbH",
  144: "Funai Electric Co., Ltd.",
  145: "Advanced PANMOBIL Systems GmbH & Co. KG",
  146: "ThinkOptics, Inc.",
  147: "Universal Electronics, Inc.",
  148: "Airoha Technology Corp.",
  149: "NEC Lighting, Ltd.",
  150: "ODM Technology, Inc.",
  151: "ConnecteDevice Ltd.",
  152: "zer01.tv GmbH",
  153: "i.Tech Dynamic Global Distribution Ltd.",
  154: "Alpwise",
  155: "Jiangsu Toppower Automotive Electronics Co., Ltd.",
  156: "Colorfy, Inc.",
  157: "Geoforce Inc.",
  158: "Bose Corporation",
  159: "Suunto Oy",
  160: "Kensington Computer Products Group",
  161: "SR-Medizinelektronik",
  162: "Vertu Corporation Limited",
  163: "Meta Watch Ltd.",
  164: "LINAK A/S",
  165: "OTL Dynamics LLC",
  166: "Panda Ocean Inc.",
  167: "Visteon Corporation",
  168: "ARP Devices Limited",
  169: "Magneti Marelli S.p.A",
  170: "CAEN RFID srl",
  171: "Ingenieur-Systemgruppe Zahn GmbH",
  172: "Green Throttle Games",
  173: "Peter Systemtechnik GmbH",
  174: "Omegawave Oy",
  175: "Cinetix",
  176: "Passif Semiconductor Corp",
  177: "Saris Cycling Group, Inc",
  178: "Bekey A/S",
  179: "Clarinox Technologies Pty. Ltd.",
  180: "BDE Technology Co., Ltd.",
  181: "Swirl Networks",
  182: "Meso international",
  183: "TreLab Ltd",
  184: "Qualcomm Innovation Center, Inc. (QuIC)",
  185: "Johnson Controls, Inc.",
  186: "Starkey Laboratories Inc.",
  187: "S-Power Electronics Limited",
  188: "Ace Sensor Inc",
  189: "Aplix Corporation",
  190: "AAMP of America",
  191: "Stalmart Technology Limited",
  192: "AMICCOM Electronics Corporation",
  193: "Shenzhen Excelsecu Data Technology Co.,Ltd",
  194: "Geneq Inc.",
  195: "adidas AG",
  196: "LG Electronics",
  197: "Onset Computer Corporation",
  198: "Selfly BV",
  199: "Quuppa Oy.",
  200: "GeLo Inc",
  201: "Evluma",
  202: "MC10",
  203: "Binauric SE",
  204: "Beats Electronics",
  205: "Microchip Technology Inc.",
  206: "Elgato Systems GmbH",
  207: "ARCHOS SA",
  208: "Dexcom, Inc.",
  209: "Polar Electro Europe B.V.",
  210: "Dialog Semiconductor B.V.",
  211: "Taixingbang Technology (HK) Co,. LTD.",
  212: "Kawantech",
  213: "Austco Communication Systems",
  214: "Timex Group USA, Inc.",
  215: "Qualcomm Technologies, Inc.",
  216: "Qualcomm Connected Experiences, Inc.",
  217: "Voyetra Turtle Beach",
  218: "txtr GmbH",
  219: "Biosentronics",
  220: "Procter & Gamble",
  221: "Hosiden Corporation",
  222: "Muzik LLC",
  223: "Misfit Wearables Corp",
  224: "Google",
  225: "Danlers Ltd",
  226: "Semilink Inc",
  227: "inMusic Brands, Inc",
  228: "L.S. Research Inc.",
  229: "Eden Software Consultants Ltd.",
  230: "Freshtemp",
  231: "KS Technologies",
  232: "ACTS Technologies",
  233: "Vtrack Systems",
  234: "Nielsen-Kellerman Company",
  235: "Server Technology, Inc.",
  236: "BioResearch Associates",
  237: "Jolly Logic, LLC",
  238: "Above Average Outcomes, Inc.",
  239: "Bitsplitters GmbH",
  240: "PayPal, Inc.",
  241: "Witron Technology Limited",
  242: "Aether Things Inc. (formerly Morse Project Inc.)",
  243: "Kent Displays Inc.",
  244: "Nautilus Inc.",
  245: "Smartifier Oy",
  246: "Elcometer Limited",
  247: "VSN Technologies Inc.",
  248: "AceUni Corp., Ltd.",
  249: "StickNFind",
  250: "Crystal Code AB",
  251: "KOUKAAM a.s.",
  252: "Delphi Corporation",
  253: "ValenceTech Limited",
  254: "Reserved",
  255: "Typo Products, LLC",
  256: "TomTom International BV",
  257: "Fugoo, Inc",
  258: "Keiser Corporation",
  259: "Bang & Olufsen A/S",
  260: "PLUS Locations Systems Pty Ltd",
  261: "Ubiquitous Computing Technology Corporation",
  262: "Innovative Yachtter Solutions",
  263: "William Demant Holding A/S",
  264: "Chicony Electronics Co., Ltd.",
  265: "Atus BV",
  266: "Codegate Ltd.",
  267: "ERi, Inc.",
  268: "Transducers Direct, LLC",
  269: "Fujitsu Ten Limited",
  270: "Audi AG",
  271: "HiSilicon Technologies Co., Ltd.",
  272: "Nippon Seiki Co., Ltd.",
  273: "Steelseries ApS",
  274: "vyzybl Inc.",
  275: "Openbrain Technologies, Co., Ltd.",
  276: "Xensr",
  277: "e.solutions",
  278: "1OAK Technologies",
  279: "Wimoto Technologies Inc",
  280: "Radius Networks, Inc.",
  281: "Wize Technology Co., Ltd.",
  282: "Qualcomm Labs, Inc.",
  283: "Aruba Networks",
  284: "Baidu",
  285: "Arendi AG",
  286: "Skoda Auto a.s.",
  287: "Volkswagon AG",
  288: "Porsche AG",
  289: "Sino Wealth Electronic Ltd.",
  290: "AirTurn, Inc.",
  291: "Kinsa, Inc.",
  292: "HID Global",
  293: "SEAT es",
  294: "Promethean Ltd.",
  295: "Salutica Allied Solutions",
  296: "GPSI Group Pty Ltd",
  297: "Nimble Devices Oy",
  298: "Changzhou Yongse Infotech Co., Ltd",
  299: "SportIQ",
  300: "TEMEC Instruments B.V.",
  301: "Sony Corporation",
  302: "ASSA ABLOY",
  303: "Clarion Co., Ltd.",
  304: "Warehouse Innovations",
  305: "Cypress Semiconductor Corporation",
  306: "MADS Inc",
  307: "Blue Maestro Limited",
  308: "Resolution Products, Inc.",
  309: "Airewear LLC",
  310: "Seed Labs, Inc. (formerly ETC sp. z.o.o.)",
  311: "Prestigio Plaza Ltd.",
  312: "NTEO Inc.",
  313: "Focus Systems Corporation",
  314: "Tencent Holdings Limited",
  315: "Allegion",
  316: "Murata Manufacuring Co., Ltd.",
  318: "Nod, Inc.",
  319: "B&B Manufacturing Company",
  320: "Alpine Electronics (China) Co., Ltd",
  321: "FedEx Services",
  322: "Grape Systems Inc.",
  323: "Bkon Connect",
  324: "Lintech GmbH",
  325: "Novatel Wireless",
  326: "Ciright",
  327: "Mighty Cast, Inc.",
  328: "Ambimat Electronics",
  329: "Perytons Ltd.",
  330: "Tivoli Audio, LLC",
  331: "Master Lock",
  332: "Mesh-Net Ltd",
  333: "Huizhou Desay SV Automotive CO., LTD.",
  334: "Tangerine, Inc.",
  335: "B&W Group Ltd.",
  336: "Pioneer Corporation",
  337: "OnBeep",
  338: "Vernier Software & Technology",
  339: "ROL Ergo",
  340: "Pebble Technology",
  341: "NETATMO",
  342: "Accumulate AB",
  343: "Anhui Huami Information Technology Co., Ltd.",
  344: "Inmite s.r.o.",
  345: "ChefSteps, Inc.",
  346: "micas AG",
  347: "Biomedical Research Ltd.",
  348: "Pitius Tec S.L.",
  349: "Estimote, Inc.",
  350: "Unikey Technologies, Inc.",
  351: "Timer Cap Co.",
  352: "AwoX",
  353: "yikes",
  354: "MADSGlobal NZ Ltd.",
  355: "PCH International",
  356: "Qingdao Yeelink Information Technology Co., Ltd.",
  357: "Milwaukee Tool (formerly Milwaukee Electric Tools)",
  358: "MISHIK Pte Ltd",
  359: "Bayer HealthCare",
  360: "Spicebox LLC",
  361: "emberlight",
  362: "Cooper-Atkins Corporation",
  363: "Qblinks",
  364: "MYSPHERA",
  365: "LifeScan Inc",
  366: "Volantic AB",
  367: "Podo Labs, Inc",
  368: "Roche Diabetes Care AG",
  369: "Amazon Fulfillment Service",
  370: "Connovate Technology Private Limited",
  371: "Kocomojo, LLC",
  372: "Everykey LLC",
  373: "Dynamic Controls",
  374: "SentriLock",
  375: "I-SYST inc.",
  376: "CASIO COMPUTER CO., LTD.",
  377: "LAPIS Semiconductor Co., Ltd.",
  378: "Telemonitor, Inc.",
  379: "taskit GmbH",
  380: "Daimler AG",
  381: "BatAndCat",
  382: "BluDotz Ltd",
  383: "XTel ApS",
  384: "Gigaset Communications GmbH",
  385: "Gecko Health Innovations, Inc.",
  386: "HOP Ubiquitous",
  387: "To Be Assigned",
  388: "Nectar",
  389: "bel’apps LLC",
  390: "CORE Lighting Ltd",
  391: "Seraphim Sense Ltd",
  392: "Unico RBC",
  393: "Physical Enterprises Inc.",
  394: "Able Trend Technology Limited",
  395: "Konica Minolta, Inc.",
  396: "Wilo SE",
  397: "Extron Design Services",
  398: "Fitbit, Inc.",
  399: "Fireflies Systems",
  400: "Intelletto Technologies Inc.",
  401: "FDK CORPORATION",
  402: "Cloudleaf, Inc",
  403: "Maveric Automation LLC",
  404: "Acoustic Stream Corporation",
  405: "Zuli",
  406: "Paxton Access Ltd",
  407: "WiSilica Inc",
  408: "Vengit Limited",
  409: "SALTO SYSTEMS S.L.",
  410: "TRON Forum (formerly T-Engine Forum)",
  411: "CUBETECH s.r.o.",
  412: "Cokiya Incorporated",
  413: "CVS Health",
  414: "Ceruus",
  415: "Strainstall Ltd",
  416: "Channel Enterprises (HK) Ltd.",
  417: "FIAMM",
  418: "GIGALANE.CO.,LTD",
  419: "EROAD",
  420: "Mine Safety Appliances",
  421: "Icon Health and Fitness",
  422: "Asandoo GmbH",
  423: "ENERGOUS CORPORATION",
  424: "Taobao",
  425: "Canon Inc.",
  426: "Geophysical Technology Inc.",
  427: "Facebook, Inc.",
  428: "Nipro Diagnostics, Inc.",
  429: "FlightSafety International",
  430: "Earlens Corporation",
  431: "Sunrise Micro Devices, Inc.",
  432: "Star Micronics Co., Ltd.",
  433: "Netizens Sp. z o.o.",
  434: "Nymi Inc.",
  435: "Nytec, Inc.",
  436: "Trineo Sp. z o.o.",
  437: "Nest Labs Inc.",
  438: "LM Technologies Ltd",
  439: "General Electric Company",
  440: "i+D3 S.L.",
  441: "HANA Micron",
  442: "Stages Cycling LLC",
  443: "Cochlear Bone Anchored Solutions AB",
  444: "SenionLab AB",
  445: "Syszone Co., Ltd",
  446: "Pulsate Mobile Ltd.",
  447: "Hong Kong HunterSun Electronic Limited",
  448: "pironex GmbH",
  449: "BRADATECH Corp.",
  450: "Transenergooil AG",
  451: "Bunch",
  452: "DME Microelectronics",
  453: "Bitcraze AB",
  454: "HASWARE Inc.",
  455: "Abiogenix Inc.",
  456: "Poly-Control ApS",
  457: "Avi-on",
  458: "Laerdal Medical AS",
  459: "Fetch My Pet",
  460: "Sam Labs Ltd.",
  461: "Chengdu Synwing Technology Ltd",
  462: "HOUWA SYSTEM DESIGN, k.k.",
  463: "BSH",
  464: "Primus Inter Pares Ltd",
  465: "August",
  466: "Gill Electronics",
  467: "Sky Wave Design",
  468: "Newlab S.r.l.",
  469: "ELAD srl",
  470: "G-wearables inc.",
  471: "Squadrone Systems Inc.",
  472: "Code Corporation",
  473: "Savant Systems LLC",
  474: "Logitech International SA",
  475: "Innblue Consulting",
  476: "iParking Ltd.",
  477: "Koninklijke Philips Electronics N.V.",
  478: "Minelab Electronics Pty Limited",
  479: "Bison Group Ltd.",
  480: "Widex A/S",
  481: "Jolla Ltd",
  482: "Lectronix, Inc.",
  483: "Caterpillar Inc",
  484: "Freedom Innovations",
  485: "Dynamic Devices Ltd",
  486: "Technology Solutions (UK) Ltd",
  487: "IPS Group Inc.",
  488: "STIR",
  489: "Sano, Inc",
  490: "Advanced Application Design, Inc.",
  491: "AutoMap LLC",
  492: "Spreadtrum Communications Shanghai Ltd",
  493: "CuteCircuit LTD",
  494: "Valeo Service",
  495: "Fullpower Technologies, Inc.",
  496: "KloudNation",
  497: "Zebra Technologies Corporation",
  498: "Itron, Inc.",
  499: "The University of Tokyo",
  500: "UTC Fire and Security",
  501: "Cool Webthings Limited",
  502: "DJO Global",
  503: "Gelliner Limited",
  504: "Anyka (Guangzhou) Microelectronics Technology Co, LTD",
  505: "Medtronic, Inc.",
  506: "Gozio, Inc.",
  507: "Form Lifting, LLC",
  508: "Wahoo Fitness, LLC",
  509: "Kontakt Micro-Location Sp. z o.o.",
  510: "Radio System Corporation",
  511: "Freescale Semiconductor, Inc.",
  512: "Verifone Systems PTe Ltd. Taiwan Branch",
  513: "AR Timing",
  514: "Rigado LLC",
  515: "Kemppi Oy",
  516: "Tapcentive Inc.",
  517: "Smartbotics Inc.",
  518: "Otter Products, LLC",
  519: "STEMP Inc.",
  520: "LumiGeek LLC",
  521: "InvisionHeart Inc.",
  522: "Macnica Inc. ",
  523: "Jaguar Land Rover Limited",
  524: "CoroWare Technologies, Inc",
  525: "Simplo Technology Co., LTD",
  526: "Omron Healthcare Co., LTD",
  527: "Comodule GMBH",
  528: "ikeGPS",
  529: "Telink Semiconductor Co. Ltd",
  530: "Interplan Co., Ltd",
  531: "Wyler AG",
  532: "IK Multimedia Production srl",
  533: "Lukoton Experience Oy",
  534: "MTI Ltd",
  535: "Tech4home, Lda",
  536: "Hiotech AB",
  537: "DOTT Limited",
  538: "Blue Speck Labs, LLC",
  539: "Cisco Systems, Inc",
  540: "Mobicomm Inc",
  541: "Edamic",
  542: "Goodnet, Ltd",
  543: "Luster Leaf Products Inc",
  544: "Manus Machina BV",
  545: "Mobiquity Networks Inc",
  546: "Praxis Dynamics",
  547: "Philip Morris Products S.A.",
  548: "Comarch SA",
  549: "Nestl Nespresso S.A.",
  550: "Merlinia A/S",
  551: "LifeBEAM Technologies",
  552: "Twocanoes Labs, LLC",
  553: "Muoverti Limited",
  554: "Stamer Musikanlagen GMBH",
  555: "Tesla Motors",
  556: "Pharynks Corporation",
  557: "Lupine",
  558: "Siemens AG",
  559: "Huami (Shanghai) Culture Communication CO., LTD",
  560: "Foster Electric Company, Ltd",
  561: "ETA SA",
  562: "x-Senso Solutions Kft",
  563: "Shenzhen SuLong Communication Ltd",
  564: "FengFan (BeiJing) Technology Co, Ltd",
  565: "Qrio Inc",
  566: "Pitpatpet Ltd",
  567: "MSHeli s.r.l.",
  568: "Trakm8 Ltd",
  569: "JIN CO, Ltd",
  570: "Alatech Tehnology",
  571: "Beijing CarePulse Electronic Technology Co, Ltd",
  572: "Awarepoint",
  573: "ViCentra B.V.",
  574: "Raven Industries",
  575: "WaveWare Technologies Inc.",
  576: "Argenox Technologies",
  577: "Bragi GmbH",
  578: "16Lab Inc",
  579: "Masimo Corp",
  580: "Iotera Inc",
  581: "Endress+Hauser",
  582: "ACKme Networks, Inc.",
  583: "FiftyThree Inc.",
  584: "Parker Hannifin Corp",
  585: "Transcranial Ltd",
  586: "Uwatec AG",
  587: "Orlan LLC",
  588: "Blue Clover Devices",
  589: "M-Way Solutions GmbH",
  590: "Microtronics Engineering GmbH",
  591: "Schneider Schreibgerte GmbH",
  592: "Sapphire Circuits LLC",
  593: "Lumo Bodytech Inc.",
  594: "UKC Technosolution",
  595: "Xicato Inc.",
  596: "Playbrush",
  597: "Dai Nippon Printing Co., Ltd.",
  598: "G24 Power Limited",
  599: "AdBabble Local Commerce Inc.",
  600: "Devialet SA",
  601: "ALTYOR",
  602: "University of Applied Sciences Valais/Haute Ecole Valaisanne",
  603: "Five Interactive, LLC dba Zendo",
  604: "NetEaseHangzhouNetwork co.Ltd.",
  605: "Lexmark International Inc.",
  606: "Fluke Corporation",
  607: "Yardarm Technologies",
  608: "SensaRx",
  609: "SECVRE GmbH",
  610: "Glacial Ridge Technologies",
  611: "Identiv, Inc.",
  612: "DDS, Inc.",
  613: "SMK Corporation",
  614: "Schawbel Technologies LLC",
  615: "XMI Systems SA",
  616: "Cerevo",
  617: "Torrox GmbH & Co KG",
  618: "Gemalto",
  619: "DEKA Research & Development Corp.",
  620: "Domster Tadeusz Szydlowski",
  621: "Technogym SPA",
  622: "FLEURBAEY BVBA",
  623: "Aptcode Solutions",
  624: "LSI ADL Technology",
  625: "Animas Corp",
  626: "Alps Electric Co., Ltd.",
  627: "OCEASOFT",
  628: "Motsai Research",
  629: "Geotab",
  630: "E.G.O. Elektro-Gertebau GmbH",
  631: "bewhere inc",
  632: "Johnson Outdoors Inc",
  633: "steute Schaltgerate GmbH & Co. KG",
  634: "Ekomini inc.",
  635: "DEFA AS",
  636: "Aseptika Ltd",
  637: "HUAWEI Technologies Co., Ltd. ( )",
  638: "HabitAware, LLC",
  639: "ruwido austria gmbh",
  640: "ITEC corporation",
  641: "StoneL",
  642: "Sonova AG",
  643: "Maven Machines, Inc.",
  644: "Synapse Electronics",
  645: "Standard Innovation Inc.",
  646: "RF Code, Inc.",
  647: "Wally Ventures S.L.",
  648: "Willowbank Electronics Ltd",
  649: "SK Telecom",
  650: "Jetro AS",
  651: "Code Gears LTD",
  652: "NANOLINK APS",
  653: "IF, LLC",
  654: "RF Digital Corp",
  655: "Church & Dwight Co., Inc",
  656: "Multibit Oy",
  657: "CliniCloud Inc",
  658: "SwiftSensors",
  659: "Blue Bite",
  660: "ELIAS GmbH",
  661: "Sivantos GmbH",
  662: "Petzl",
  663: "storm power ltd",
  664: "EISST Ltd",
  665: "Inexess Technology Simma KG",
  666: "Currant, Inc.",
  667: "C2 Development, Inc.",
  668: "Blue Sky Scientific, LLC",
  669: "ALOTTAZS LABS, LLC",
  670: "Kupson spol. s r.o.",
  671: "Areus Engineering GmbH",
  672: "Impossible Camera GmbH",
  673: "InventureTrack Systems",
  674: "LockedUp",
  675: "Itude",
  676: "Pacific Lock Company",
  677: "Tendyron Corporation ( )",
  678: "Robert Bosch GmbH",
  679: "Illuxtron international B.V.",
  680: "miSport Ltd.",
  681: "Chargelib",
  682: "Doppler Lab",
  683: "BBPOS Limited",
  684: "RTB Elektronik GmbH & Co. KG",
  685: "Rx Networks, Inc.",
  686: "WeatherFlow, Inc.",
  687: "Technicolor USA Inc.",
  688: "Bestechnic(Shanghai),Ltd",
  689: "Raden Inc",
  690: "JouZen Oy",
  691: "CLABER S.P.A.",
  692: "Hyginex, Inc.",
  693: "HANSHIN ELECTRIC RAILWAY CO.,LTD.",
  694: "Schneider Electric",
  695: "Oort Technologies LLC",
  696: "Chrono Therapeutics",
  697: "Rinnai Corporation",
  698: "Swissprime Technologies AG",
  699: "Koha.,Co.Ltd",
  700: "Genevac Ltd",
  701: "Chemtronics",
  702: "Seguro Technology Sp. z o.o.",
  703: "Redbird Flight Simulations",
  704: "Dash Robotics",
  705: "LINE Corporation",
  706: "Guillemot Corporation",
  707: "Techtronic Power Tools Technology Limited",
  708: "Wilson Sporting Goods",
  709: "Lenovo (Singapore) Pte Ltd. ( )",
  710: "Ayatan Sensors",
  711: "Electronics Tomorrow Limited",
  712: "VASCO Data Security International, Inc.",
  713: "PayRange Inc.",
  714: "ABOV Semiconductor",
  715: "AINA-Wireless Inc.",
  716: "Eijkelkamp Soil & Water",
  717: "BMA ergonomics b.v.",
  718: "Teva Branded Pharmaceutical Products R&D, Inc.",
  719: "Anima",
  720: "3M",
  721: "Empatica Srl",
  722: "Afero, Inc.",
  723: "Powercast Corporation",
  724: "Secuyou ApS",
  725: "OMRON Corporation",
  726: "Send Solutions",
  727: "NIPPON SYSTEMWARE CO.,LTD.",
  728: "Neosfar",
  729: "Fliegl Agrartechnik GmbH",
  730: "Gilvader",
  731: "Digi International Inc (R)",
  732: "DeWalch Technologies, Inc.",
  733: "Flint Rehabilitation Devices, LLC",
  734: "Samsung SDS Co., Ltd.",
  735: "Blur Product Development",
  736: "University of Michigan",
  737: "Victron Energy BV",
  738: "NTT docomo",
  739: "Carmanah Technologies Corp.",
  740: "Bytestorm Ltd.",
  741: "Espressif Incorporated ( () )",
  742: "Unwire",
  743: "Connected Yard, Inc.",
  744: "American Music Environments",
  745: "Sensogram Technologies, Inc.",
  746: "Fujitsu Limited",
  747: "Ardic Technology",
  748: "Delta Systems, Inc",
  749: "HTC Corporation",
  750: "Citizen Holdings Co., Ltd.",
  751: "SMART-INNOVATION.inc",
  752: "Blackrat Software",
  753: "The Idea Cave, LLC",
  754: "GoPro, Inc.",
  755: "AuthAir, Inc",
  756: "Vensi, Inc.",
  757: "Indagem Tech LLC",
  758: "Intemo Technologies",
  759: "DreamVisions co., Ltd.",
  760: "Runteq Oy Ltd",
  761: "IMAGINATION TECHNOLOGIES LTD",
  762: "CoSTAR TEchnologies",
  763: "Clarius Mobile Health Corp.",
  764: "Shanghai Frequen Microelectronics Co., Ltd.",
  765: "Uwanna, Inc.",
  766: "Lierda Science & Technology Group Co., Ltd.",
  767: "Silicon Laboratories",
  768: "World Moto Inc.",
  769: "Giatec Scientific Inc.",
  770: "Loop Devices, Inc",
  771: "IACA electronique",
  772: "Martians Inc",
  773: "Swipp ApS",
  774: "Life Laboratory Inc.",
  775: "FUJI INDUSTRIAL CO.,LTD.",
  776: "Surefire, LLC",
  777: "Dolby Labs",
  778: "Ellisys",
  779: "Magnitude Lighting Converters",
  780: "Hilti AG",
  781: "Devdata S.r.l.",
  782: "Deviceworx",
  783: "Shortcut Labs",
  784: "SGL Italia S.r.l.",
  785: "PEEQ DATA",
  786: "Ducere Technologies Pvt Ltd",
  787: "DiveNav, Inc.",
  788: "RIIG AI Sp. z o.o.",
  789: "Thermo Fisher Scientific",
  790: "AG Measurematics Pvt. Ltd.",
  791: "CHUO Electronics CO., LTD.",
  792: "Aspenta International",
  793: "Eugster Frismag AG",
  794: "Amber wireless GmbH",
  795: "HQ Inc",
  796: "Lab Sensor Solutions",
  797: "Enterlab ApS",
  798: "Eyefi, Inc.",
  799: "MetaSystem S.p.A.",
  800: "SONO ELECTRONICS. CO., LTD",
  801: "Jewelbots",
  802: "Compumedics Limited",
  803: "Rotor Bike Components",
  804: "Astro, Inc.",
  805: "Amotus Solutions",
  806: "Healthwear Technologies (Changzhou)Ltd",
  807: "Essex Electronics",
  808: "Grundfos A/S",
  809: "Eargo, Inc.",
  810: "Electronic Design Lab",
  811: "ESYLUX",
  812: "NIPPON SMT.CO.,Ltd",
  813: "BM innovations GmbH",
  814: "indoormap",
  815: "OttoQ Inc",
  816: "North Pole Engineering",
  817: "3flares Technologies Inc.",
  818: "Electrocompaniet A.S.",
  819: "Mul-T-Lock",
  820: "Corentium AS",
  821: "Enlighted Inc",
  822: "GISTIC",
  823: "AJP2 Holdings, LLC",
  824: "COBI GmbH",
  825: "Blue Sky Scientific, LLC",
  826: "Appception, Inc.",
  827: "Courtney Thorne Limited",
  828: "Virtuosys",
  829: "TPV Technology Limited",
  830: "Monitra SA",
  831: "Automation Components, Inc.",
  832: "Letsense s.r.l.",
  833: "Etesian Technologies LLC",
  834: "GERTEC BRASIL LTDA.",
  835: "Drekker Development Pty. Ltd.",
  836: "Whirl Inc",
  837: "Locus Positioning",
  838: "Acuity Brands Lighting, Inc",
  839: "Prevent Biometrics",
  840: "Arioneo",
  841: "VersaMe",
  842: "Vaddio",
  843: "Libratone A/S",
  844: "HM Electronics, Inc.",
  845: "TASER International, Inc.",
  846: "SafeTrust Inc.",
  847: "Heartland Payment Systems",
  848: "Bitstrata Systems Inc.",
  849: "Pieps GmbH",
  850: "iRiding(Xiamen)Technology Co.,Ltd.",
  851: "Alpha Audiotronics, Inc.",
  852: "TOPPAN FORMS CO.,LTD.",
  853: "Sigma Designs, Inc.",
  854: "Spectrum Brands, Inc.",
  855: "Polymap Wireless",
  856: "MagniWare Ltd.",
  857: "Novotec Medical GmbH",
  858: "Medicom Innovation Partner a/s",
  859: "Matrix Inc.",
  860: "Eaton Corporation",
  861: "KYS",
  862: "Naya Health, Inc.",
  863: "Acromag",
  864: "Insulet Corporation",
  865: "Wellinks Inc.",
  866: "ON Semiconductor",
  867: "FREELAP SA",
  868: "Favero Electronics Srl",
  869: "BioMech Sensor LLC",
  870: "BOLTT Sports technologies Private limited",
  871: "Saphe International",
  872: "Metormote AB",
  873: "littleBits",
  874: "SetPoint Medical",
  875: "BRControls Products BV",
  876: "Zipcar",
  877: "AirBolt Pty Ltd",
  878: "KeepTruckin Inc",
  879: "Motiv, Inc.",
  880: "Wazombi Labs O",
  881: "ORBCOMM",
  882: "Nixie Labs, Inc.",
  883: "AppNearMe Ltd",
  884: "Holman Industries",
  885: "Expain AS",
  886: "Electronic Temperature Instruments Ltd",
  887: "Plejd AB",
  888: "Propeller Health",
  889: "Shenzhen iMCO Electronic Technology Co.,Ltd",
  890: "Algoria",
  891: "Apption Labs Inc.",
  892: "Cronologics Corporation",
  893: "MICRODIA Ltd.",
  894: "lulabytes S.L.",
  895: "Nestec S.A.",
  896: "LLC MEGA - F service",
  897: "Sharp Corporation",
  898: "Precision Outcomes Ltd",
  899: "Kronos Incorporated",
  900: "OCOSMOS Co., Ltd.",
  901: "Embedded Electronic Solutions Ltd. dba e2Solutions",
  902: "Aterica Inc.",
  903: "BluStor PMC, Inc.",
  904: "Kapsch TrafficCom AB",
  905: "ActiveBlu Corporation",
  906: "Kohler Mira Limited",
  907: "Noke",
  908: "Appion Inc.",
  909: "Resmed Ltd",
  910: "Crownstone B.V.",
  911: "Xiaomi Inc.",
  912: "INFOTECH s.r.o.",
  913: "Thingsquare AB",
  914: "T&D",
  915: "LAVAZZA S.p.A.",
  916: "Netclearance Systems, Inc.",
  917: "SDATAWAY",
  918: "BLOKS GmbH",
  919: "LEGO System A/S",
  920: "Thetatronics Ltd",
  921: "Nikon Corporation",
  922: "NeST",
  923: "South Silicon Valley Microelectronics",
  924: "ALE International",
  925: "CareView Communications, Inc.",
  926: "SchoolBoard Limited",
  927: "Molex Corporation",
  928: "IVT Wireless Limited",
  929: "Alpine Labs LLC",
  930: "Candura Instruments",
  931: "SmartMovt Technology Co., Ltd",
  932: "Token Zero Ltd",
  933: "ACE CAD Enterprise Co., Ltd. (ACECAD)",
  934: "Medela, Inc",
  935: "AeroScout",
  936: "Esrille Inc.",
  937: "THINKERLY SRL",
  938: "Exon Sp. z o.o.",
  939: "Meizu Technology Co., Ltd.",
  940: "Smablo LTD",
  941: "XiQ",
  942: "Allswell Inc.",
  943: "Comm-N-Sense Corp DBA Verigo",
  944: "VIBRADORM GmbH",
  945: "Otodata Wireless Network Inc.",
  946: "Propagation Systems Limited",
  947: "Midwest Instruments & Controls",
  948: "Alpha Nodus, inc.",
  949: "petPOMM, Inc",
  950: "Mattel",
  951: "Airbly Inc.",
  952: "A-Safe Limited",
  953: "FREDERIQUE CONSTANT SA",
  954: "Maxscend Microelectronics Company Limited",
  955: "Abbott Diabetes Care",
  956: "ASB Bank Ltd",
  957: "amadas",
  958: "Applied Science, Inc.",
  959: "iLumi Solutions Inc.",
  960: "Arch Systems Inc.",
  961: "Ember Technologies, Inc.",
  962: "Snapchat Inc",
  963: "Casambi Technologies Oy",
  964: "Pico Technology Inc.",
  965: "St. Jude Medical, Inc.",
  966: "Intricon",
  967: "Structural Health Systems, Inc.",
  968: "Avvel International",
  969: "Gallagher Group",
  970: "In2things Automation Pvt. Ltd.",
  971: "SYSDEV Srl",
  972: "Vonkil Technologies Ltd",
  973: "Wynd Technologies, Inc.",
  974: "CONTRINEX S.A.",
  975: "MIRA, Inc.",
  976: "Watteam Ltd",
  977: "Density Inc.",
  978: "IOT Pot India Private Limited",
  979: "Sigma Connectivity AB",
  980: "PEG PEREGO SPA",
  981: "Wyzelink Systems Inc.",
  982: "Yota Devices LTD",
  983: "FINSECUR",
  984: "Zen-Me Labs Ltd",
  985: "3IWare Co., Ltd.",
  986: "EnOcean GmbH",
  987: "Instabeat, Inc",
  988: "Nima Labs",
  989: "Andreas Stihl AG & Co. KG",
  990: "Nathan Rhoades LLC",
  991: "Grob Technologies, LLC",
  992: "Actions (Zhuhai) Technology Co., Limited",
  993: "SPD Development Company Ltd",
  994: "Sensoan Oy",
  995: "Qualcomm Life Inc",
  996: "Chip-ing AG",
  997: "ffly4u",
  998: "IoT Instruments Oy",
  999: "TRUE Fitness Technology",
  1e3: "Reiner Kartengeraete GmbH & Co. KG.",
  1001: "SHENZHEN LEMONJOY TECHNOLOGY CO., LTD.",
  1002: "Hello Inc.",
  1003: "Evollve Inc.",
  1004: "Jigowatts Inc.",
  1005: "BASIC MICRO.COM,INC.",
  1006: "CUBE TECHNOLOGIES",
  1007: "foolography GmbH",
  1008: "CLINK",
  1009: "Hestan Smart Cooking Inc.",
  1010: "WindowMaster A/S",
  1011: "Flowscape AB",
  1012: "PAL Technologies Ltd",
  1013: "WHERE, Inc.",
  1014: "Iton Technology Corp.",
  1015: "Owl Labs Inc.",
  1016: "Rockford Corp.",
  1017: "Becon Technologies Co.,Ltd.",
  1018: "Vyassoft Technologies Inc",
  1019: "Nox Medical",
  1020: "Kimberly-Clark",
  1021: "Trimble Navigation Ltd.",
  1022: "Littelfuse",
  1023: "Withings",
  1024: "i-developer IT Beratung UG",
  1026: "Sears Holdings Corporation",
  1027: "Gantner Electronic GmbH",
  1028: "Authomate Inc",
  1029: "Vertex International, Inc.",
  1030: "Airtago",
  1031: "Swiss Audio SA",
  1032: "ToGetHome Inc.",
  1033: "AXIS",
  1034: "Openmatics",
  1035: "Jana Care Inc.",
  1036: "Senix Corporation",
  1037: "NorthStar Battery Company, LLC",
  1038: "SKF (U.K.) Limited",
  1039: "CO-AX Technology, Inc.",
  1040: "Fender Musical Instruments",
  1041: "Luidia Inc",
  1042: "SEFAM",
  1043: "Wireless Cables Inc",
  1044: "Lightning Protection International Pty Ltd",
  1045: "Uber Technologies Inc",
  1046: "SODA GmbH",
  1047: "Fatigue Science",
  1048: "Alpine Electronics Inc.",
  1049: "Novalogy LTD",
  1050: "Friday Labs Limited",
  1051: "OrthoAccel Technologies",
  1052: "WaterGuru, Inc.",
  1053: "Benning Elektrotechnik und Elektronik GmbH & Co. KG",
  1054: "Dell Computer Corporation",
  1055: "Kopin Corporation",
  1056: "TecBakery GmbH",
  1057: "Backbone Labs, Inc.",
  1058: "DELSEY SA",
  1059: "Chargifi Limited",
  1060: "Trainesense Ltd.",
  1061: "Unify Software and Solutions GmbH & Co. KG",
  1062: "Husqvarna AB",
  1063: "Focus fleet and fuel management inc",
  1064: "SmallLoop, LLC",
  1065: "Prolon Inc.",
  1066: "BD Medical",
  1067: "iMicroMed Incorporated",
  1068: "Ticto N.V.",
  1069: "Meshtech AS",
  1070: "MemCachier Inc.",
  1071: "Danfoss A/S",
  1072: "SnapStyk Inc.",
  1073: "Amyway Corporation",
  1074: "Silk Labs, Inc.",
  1075: "Pillsy Inc.",
  1076: "Hatch Baby, Inc.",
  1077: "Blocks Wearables Ltd.",
  1078: "Drayson Technologies (Europe) Limited",
  1079: "eBest IOT Inc.",
  1080: "Helvar Ltd",
  1081: "Radiance Technologies",
  1082: "Nuheara Limited",
  1083: "Appside co., ltd.",
  1084: "DeLaval",
  1085: "Coiler Corporation",
  1086: "Thermomedics, Inc.",
  1087: "Tentacle Sync GmbH",
  1088: "Valencell, Inc.",
  1089: "iProtoXi Oy",
  1090: "SECOM CO., LTD.",
  1091: "Tucker International LLC",
  1092: "Metanate Limited",
  1093: "Kobian Canada Inc.",
  1094: "NETGEAR, Inc.",
  1095: "Fabtronics Australia Pty Ltd",
  1096: "Grand Centrix GmbH",
  1097: "1UP USA.com llc",
  1098: "SHIMANO INC.",
  1099: "Nain Inc.",
  1100: "LifeStyle Lock, LLC",
  1101: "VEGA Grieshaber KG",
  1102: "Xtrava Inc.",
  1103: "TTS Tooltechnic Systems AG & Co. KG",
  1104: "Teenage Engineering AB",
  1105: "Tunstall Nordic AB",
  1106: "Svep Design Center AB",
  1107: "GreenPeak Technologies BV",
  1108: "Sphinx Electronics GmbH & Co KG",
  1109: "Atomation",
  1110: "Nemik Consulting Inc",
  1111: "RF INNOVATION",
  1112: "Mini Solution Co., Ltd.",
  1113: "Lumenetix, Inc",
  1114: "2048450 Ontario Inc",
  1115: "SPACEEK LTD",
  1116: "Delta T Corporation",
  1117: "Boston Scientific Corporation",
  1118: "Nuviz, Inc.",
  1119: "Real Time Automation, Inc.",
  1120: "Kolibree",
  1121: "vhf elektronik GmbH",
  1122: "Bonsai Systems GmbH",
  1123: "Fathom Systems Inc.",
  1124: "Bellman & Symfon",
  1125: "International Forte Group LLC",
  1126: "CycleLabs Solutions inc.",
  1127: "Codenex Oy",
  1128: "Kynesim Ltd",
  1129: "Palago AB",
  1130: "INSIGMA INC.",
  1131: "PMD Solutions",
  1132: "Qingdao Realtime Technology Co., Ltd.",
  1133: "BEGA Gantenbrink-Leuchten KG",
  1134: "Pambor Ltd.",
  65535: "SPECIAL USE/DEFAULT"
};
const au = ee.exec, cu = ee.execSync, lu = ps, ke = D, uu = ou, pu = Ne, It = process.platform, du = It === "linux" || It === "android", fu = It === "darwin", mu = It === "win32", gu = It === "freebsd", hu = It === "openbsd", xu = It === "netbsd", yu = It === "sunos";
function Ei(t) {
  let n = "";
  return t.indexOf("keyboard") >= 0 && (n = "Keyboard"), t.indexOf("mouse") >= 0 && (n = "Mouse"), t.indexOf("trackpad") >= 0 && (n = "Trackpad"), t.indexOf("audio") >= 0 && (n = "Audio"), t.indexOf("sound") >= 0 && (n = "Audio"), t.indexOf("microph") >= 0 && (n = "Microphone"), t.indexOf("speaker") >= 0 && (n = "Speaker"), t.indexOf("headset") >= 0 && (n = "Headset"), t.indexOf("phone") >= 0 && (n = "Phone"), t.indexOf("macbook") >= 0 && (n = "Computer"), t.indexOf("imac") >= 0 && (n = "Computer"), t.indexOf("ipad") >= 0 && (n = "Tablet"), t.indexOf("watch") >= 0 && (n = "Watch"), t.indexOf("headphone") >= 0 && (n = "Headset"), n;
}
function Su(t) {
  let n = t.split(" ")[0];
  return t = t.toLowerCase(), t.indexOf("apple") >= 0 && (n = "Apple"), t.indexOf("ipad") >= 0 && (n = "Apple"), t.indexOf("imac") >= 0 && (n = "Apple"), t.indexOf("iphone") >= 0 && (n = "Apple"), t.indexOf("magic mouse") >= 0 && (n = "Apple"), t.indexOf("magic track") >= 0 && (n = "Apple"), t.indexOf("macbook") >= 0 && (n = "Apple"), n;
}
function Cu(t) {
  const n = parseInt(t);
  if (!isNaN(n)) return uu[n];
}
function wu(t, n, e) {
  const s = {};
  return s.device = null, s.name = ke.getValue(t, "name", "="), s.manufacturer = null, s.macDevice = n, s.macHost = e, s.batteryPercent = null, s.type = Ei(s.name.toLowerCase()), s.connected = !1, s;
}
function Hs(t, n) {
  const e = {}, s = ((t.device_minorClassOfDevice_string || t.device_majorClassOfDevice_string || t.device_minorType || "") + (t.device_name || "")).toLowerCase();
  return e.device = t.device_services || "", e.name = t.device_name || "", e.manufacturer = t.device_manufacturer || Cu(t.device_vendorID) || Su(t.device_name || "") || "", e.macDevice = (t.device_addr || t.device_address || "").toLowerCase().replace(/-/g, ":"), e.macHost = n, e.batteryPercent = t.device_batteryPercent || null, e.type = Ei(s), e.connected = t.device_isconnected === "attrib_Yes" || !1, e;
}
function Lu(t) {
  const n = {};
  return n.device = null, n.name = ke.getValue(t, "name", ":"), n.manufacturer = ke.getValue(t, "manufacturer", ":"), n.macDevice = null, n.macHost = null, n.batteryPercent = null, n.type = Ei(n.name.toLowerCase()), n.connected = null, n;
}
function Iu(t) {
  return new Promise((n) => {
    process.nextTick(() => {
      let e = [];
      if (du) {
        ke.getFilesInPath("/var/lib/bluetooth/").forEach((r) => {
          const i = lu.basename(r), o = r.split("/"), a = o.length >= 6 ? o[o.length - 2] : null, c = o.length >= 7 ? o[o.length - 3] : null;
          if (i === "info") {
            const l = pu.readFileSync(r, { encoding: "utf8" }).split(`
`);
            e.push(wu(l, a, c));
          }
        });
        try {
          const r = cu("hcitool con", ke.execOptsLinux).toString().toLowerCase();
          for (let i = 0; i < e.length; i++)
            e[i].macDevice && e[i].macDevice.length > 10 && r.indexOf(e[i].macDevice.toLowerCase()) >= 0 && (e[i].connected = !0);
        } catch {
          ke.noop();
        }
        t && t(e), n(e);
      }
      fu && au("system_profiler SPBluetoothDataType -json", (r, i) => {
        if (!r)
          try {
            const o = JSON.parse(i.toString());
            if (o.SPBluetoothDataType && o.SPBluetoothDataType.length && o.SPBluetoothDataType[0] && o.SPBluetoothDataType[0].device_title && o.SPBluetoothDataType[0].device_title.length) {
              let a = null;
              o.SPBluetoothDataType[0].local_device_title && o.SPBluetoothDataType[0].local_device_title.general_address && (a = o.SPBluetoothDataType[0].local_device_title.general_address.toLowerCase().replace(/-/g, ":")), o.SPBluetoothDataType[0].device_title.forEach((c) => {
                const l = c, u = Object.keys(l);
                if (u && u.length === 1) {
                  const d = l[u[0]];
                  d.device_name = u[0];
                  const p = Hs(d, a);
                  e.push(p);
                }
              });
            }
            if (o.SPBluetoothDataType && o.SPBluetoothDataType.length && o.SPBluetoothDataType[0] && o.SPBluetoothDataType[0].device_connected && o.SPBluetoothDataType[0].device_connected.length) {
              const a = o.SPBluetoothDataType[0].controller_properties && o.SPBluetoothDataType[0].controller_properties.controller_address ? o.SPBluetoothDataType[0].controller_properties.controller_address.toLowerCase().replace(/-/g, ":") : null;
              o.SPBluetoothDataType[0].device_connected.forEach((c) => {
                const l = c, u = Object.keys(l);
                if (u && u.length === 1) {
                  const d = l[u[0]];
                  d.device_name = u[0], d.device_isconnected = "attrib_Yes";
                  const p = Hs(d, a);
                  e.push(p);
                }
              });
            }
            if (o.SPBluetoothDataType && o.SPBluetoothDataType.length && o.SPBluetoothDataType[0] && o.SPBluetoothDataType[0].device_not_connected && o.SPBluetoothDataType[0].device_not_connected.length) {
              const a = o.SPBluetoothDataType[0].controller_properties && o.SPBluetoothDataType[0].controller_properties.controller_address ? o.SPBluetoothDataType[0].controller_properties.controller_address.toLowerCase().replace(/-/g, ":") : null;
              o.SPBluetoothDataType[0].device_not_connected.forEach((c) => {
                const l = c, u = Object.keys(l);
                if (u && u.length === 1) {
                  const d = l[u[0]];
                  d.device_name = u[0], d.device_isconnected = "attrib_No";
                  const p = Hs(d, a);
                  e.push(p);
                }
              });
            }
          } catch {
            ke.noop();
          }
        t && t(e), n(e);
      }), mu && ke.powerShell("Get-CimInstance Win32_PNPEntity | select PNPClass, Name, Manufacturer, Status, Service, ConfigManagerErrorCode, Present | fl").then((s, r) => {
        r || s.toString().split(/\n\s*\n/).forEach((o) => {
          const a = o.split(`
`), c = ke.getValue(a, "Service", ":"), l = ke.getValue(a, "ConfigManagerErrorCode", ":");
          ke.getValue(a, "PNPClass", ":").toLowerCase() === "bluetooth" && l === "0" && c === "" && e.push(Lu(a));
        }), t && t(e), n(e);
      }), (gu || xu || hu || yu) && n(null);
    });
  });
}
ro.bluetoothDevices = Iu;
(function(t) {
  const n = Zo.version, e = D, s = bn, r = Ft, i = _t, o = hi, a = Mc, c = $r, l = Rt, u = Gt, d = Ps, p = vs, f = Qr, m = Pi, h = Ot, y = to, g = no, x = so, S = io, w = ro, C = process.platform, A = C === "win32", v = C === "freebsd", k = C === "openbsd", O = C === "netbsd", $ = C === "sunos";
  A && (e.getCodepage(), e.getPowershell());
  function ie() {
    return n;
  }
  function se(R) {
    return new Promise((G) => {
      process.nextTick(() => {
        const z = {};
        z.version = ie(), Promise.all([
          s.system(),
          s.bios(),
          s.baseboard(),
          s.chassis(),
          r.osInfo(),
          r.uuid(),
          r.versions(),
          i.cpu(),
          i.cpuFlags(),
          c.graphics(),
          u.networkInterfaces(),
          o.memLayout(),
          l.diskLayout(),
          S.audio(),
          w.bluetoothDevices(),
          x.usb(),
          g.printer()
        ]).then((q) => {
          z.system = q[0], z.bios = q[1], z.baseboard = q[2], z.chassis = q[3], z.os = q[4], z.uuid = q[5], z.versions = q[6], z.cpu = q[7], z.cpu.flags = q[8], z.graphics = q[9], z.net = q[10], z.memLayout = q[11], z.diskLayout = q[12], z.audio = q[13], z.bluetooth = q[14], z.usb = q[15], z.printer = q[16], R && R(z), G(z);
        });
      });
    });
  }
  function ne(R, G, z) {
    return e.isFunction(G) && (z = G, G = ""), e.isFunction(R) && (z = R, R = ""), new Promise((q) => {
      process.nextTick(() => {
        G = G || u.getDefaultNetworkInterface(), R = R || "";
        let U = (() => {
          let b = 15;
          return A && (b = 13), (v || k || O) && (b = 11), $ && (b = 6), function() {
            --b === 0 && (z && z(j), q(j));
          };
        })();
        const j = {};
        j.time = r.time(), j.node = process.versions.node, j.v8 = process.versions.v8, i.cpuCurrentSpeed().then((b) => {
          j.cpuCurrentSpeed = b, U();
        }), f.users().then((b) => {
          j.users = b, U();
        }), p.processes().then((b) => {
          j.processes = b, U();
        }), i.currentLoad().then((b) => {
          j.currentLoad = b, U();
        }), $ || i.cpuTemperature().then((b) => {
          j.temp = b, U();
        }), !k && !v && !O && !$ && u.networkStats(G).then((b) => {
          j.networkStats = b, U();
        }), $ || u.networkConnections().then((b) => {
          j.networkConnections = b, U();
        }), o.mem().then((b) => {
          j.mem = b, U();
        }), $ || a().then((b) => {
          j.battery = b, U();
        }), $ || p.services(R).then((b) => {
          j.services = b, U();
        }), $ || l.fsSize().then((b) => {
          j.fsSize = b, U();
        }), !A && !k && !v && !O && !$ && l.fsStats().then((b) => {
          j.fsStats = b, U();
        }), !A && !k && !v && !O && !$ && l.disksIO().then((b) => {
          j.disksIO = b, U();
        }), !k && !v && !O && !$ && d.wifiNetworks().then((b) => {
          j.wifiNetworks = b, U();
        }), m.inetLatency().then((b) => {
          j.inetLatency = b, U();
        });
      });
    });
  }
  function fe(R, G, z) {
    return new Promise((q) => {
      process.nextTick(() => {
        let U = {};
        G && e.isFunction(G) && !z && (z = G, G = ""), R && e.isFunction(R) && !G && !z && (z = R, R = "", G = ""), se().then((j) => {
          U = j, ne(R, G).then((b) => {
            for (let xe in b)
              ({}).hasOwnProperty.call(b, xe) && (U[xe] = b[xe]);
            z && z(U), q(U);
          });
        });
      });
    });
  }
  function W(R, G) {
    return new Promise((z) => {
      process.nextTick(() => {
        const q = Object.keys(R).filter((U) => ({}).hasOwnProperty.call(t, U)).map((U) => {
          const j = R[U].substring(R[U].lastIndexOf("(") + 1, R[U].lastIndexOf(")"));
          let b = U.indexOf(")") >= 0 ? U.split(")")[1].trim() : U;
          return b = U.indexOf("|") >= 0 ? U.split("|")[0].trim() : b, j ? t[b](j) : t[b]("");
        });
        Promise.all(q).then((U) => {
          const j = {};
          let b = 0;
          for (let xe in R)
            if ({}.hasOwnProperty.call(R, xe) && {}.hasOwnProperty.call(t, xe) && U.length > b) {
              if (R[xe] === "*" || R[xe] === "all")
                j[xe] = U[b];
              else {
                let we = R[xe], Ms = "", Wt = [];
                if (we.indexOf(")") >= 0 && (we = we.split(")")[1].trim()), we.indexOf("|") >= 0 && (Ms = we.split("|")[1].trim(), Wt = Ms.split(":"), we = we.split("|")[0].trim()), we = we.replace(/,/g, " ").replace(/ +/g, " ").split(" "), U[b])
                  if (Array.isArray(U[b])) {
                    const vt = [];
                    U[b].forEach((Mt) => {
                      let At = {};
                      if (we.length === 1 && (we[0] === "*" || we[0] === "all") ? At = Mt : we.forEach((Qe) => {
                        ({}).hasOwnProperty.call(Mt, Qe) && (At[Qe] = Mt[Qe]);
                      }), Ms && Wt.length === 2) {
                        if ({}.hasOwnProperty.call(At, Wt[0].trim())) {
                          const Qe = At[Wt[0].trim()];
                          typeof Qe == "number" ? Qe === parseFloat(Wt[1].trim()) && vt.push(At) : typeof Qe == "string" && Qe.toLowerCase() === Wt[1].trim().toLowerCase() && vt.push(At);
                        }
                      } else
                        vt.push(At);
                    }), j[xe] = vt;
                  } else {
                    const vt = {};
                    we.forEach((Mt) => {
                      ({}).hasOwnProperty.call(U[b], Mt) && (vt[Mt] = U[b][Mt]);
                    }), j[xe] = vt;
                  }
                else
                  j[xe] = {};
              }
              b++;
            }
          G && G(j), z(j);
        });
      });
    });
  }
  function ye(R, G, z) {
    let q = null;
    return setInterval(() => {
      W(R).then((j) => {
        JSON.stringify(q) !== JSON.stringify(j) && (q = Object.assign({}, j), z(j));
      });
    }, G);
  }
  t.version = ie, t.system = s.system, t.bios = s.bios, t.baseboard = s.baseboard, t.chassis = s.chassis, t.time = r.time, t.osInfo = r.osInfo, t.versions = r.versions, t.shell = r.shell, t.uuid = r.uuid, t.cpu = i.cpu, t.cpuFlags = i.cpuFlags, t.cpuCache = i.cpuCache, t.cpuCurrentSpeed = i.cpuCurrentSpeed, t.cpuTemperature = i.cpuTemperature, t.currentLoad = i.currentLoad, t.fullLoad = i.fullLoad, t.mem = o.mem, t.memLayout = o.memLayout, t.battery = a, t.graphics = c.graphics, t.fsSize = l.fsSize, t.fsOpenFiles = l.fsOpenFiles, t.blockDevices = l.blockDevices, t.fsStats = l.fsStats, t.disksIO = l.disksIO, t.diskLayout = l.diskLayout, t.networkInterfaceDefault = u.networkInterfaceDefault, t.networkGatewayDefault = u.networkGatewayDefault, t.networkInterfaces = u.networkInterfaces, t.networkStats = u.networkStats, t.networkConnections = u.networkConnections, t.wifiNetworks = d.wifiNetworks, t.wifiInterfaces = d.wifiInterfaces, t.wifiConnections = d.wifiConnections, t.services = p.services, t.processes = p.processes, t.processLoad = p.processLoad, t.users = f.users, t.inetChecksite = m.inetChecksite, t.inetLatency = m.inetLatency, t.dockerInfo = h.dockerInfo, t.dockerImages = h.dockerImages, t.dockerContainers = h.dockerContainers, t.dockerContainerStats = h.dockerContainerStats, t.dockerContainerProcesses = h.dockerContainerProcesses, t.dockerVolumes = h.dockerVolumes, t.dockerAll = h.dockerAll, t.vboxInfo = y.vboxInfo, t.printer = g.printer, t.usb = x.usb, t.audio = S.audio, t.bluetoothDevices = w.bluetoothDevices, t.getStaticData = se, t.getDynamicData = ne, t.getAllData = fe, t.get = W, t.observe = ye, t.powerShellStart = e.powerShellStart, t.powerShellRelease = e.powerShellRelease;
})(yr);
const Ue = /* @__PURE__ */ Jo(yr);
async function _u() {
  const [t, n, e, s, r, i, o] = await Promise.all([
    Ue.mem(),
    Ue.cpu(),
    Ue.battery(),
    Ue.system(),
    Ue.processes(),
    Ue.networkInterfaces(),
    Ue.graphics()
  ]);
  return { mem: t, cpu: n, battery: e, system: s, processes: r, networkInterfaces: i, graphics: o };
}
const Kn = /* @__PURE__ */ new Map();
function oo(t) {
  if (!t) return null;
  if (process.platform === "darwin") {
    const n = t.match(/(.+\.app)(?:\/|$)/i);
    if (n) return n[1];
  }
  return process.platform === "win32" && /\.(exe|dll|ico)$/i.test(t), t;
}
function Ou(t, n) {
  if (t) {
    if (process.platform === "darwin") {
      const s = t.match(/\/([^/]+)\.app(?:\/|$)/i);
      if (s) return s[1];
    }
    const e = He.basename(t).replace(/\.(exe|app)$/i, "");
    if (e && e.toLowerCase() !== n.toLowerCase())
      return e;
  }
  return n.replace(/\.exe$/i, "");
}
function Pu(t, n) {
  const e = oo(t.path);
  return e ? e.toLowerCase() : `${n}:${t.pid}`.toLowerCase();
}
async function vu(t) {
  const n = oo(t);
  if (n) {
    if (Kn.has(n))
      return Kn.get(n) ?? void 0;
    try {
      const e = await ce.getFileIcon(n, { size: "normal" }), s = e.isEmpty() ? null : e.toDataURL();
      return Kn.set(n, s), s ?? void 0;
    } catch {
      Kn.set(n, null);
      return;
    }
  }
}
async function ao(t) {
  const n = /* @__PURE__ */ new Set(), e = [];
  for (const s of t) {
    const r = Ou(s.path, s.name), i = Pu(s, r);
    if (n.has(i)) continue;
    n.add(i);
    const o = await vu(s.path);
    e.push({
      pid: s.pid,
      processName: s.name,
      displayName: r,
      path: s.path,
      iconDataUrl: o
    });
  }
  return e;
}
function Mu(t) {
  if (!t) return [];
  const n = [], e = t.processes;
  if (Array.isArray(e)) {
    for (const r of e) {
      if (!r || typeof r != "object") continue;
      const i = r, o = typeof i.name == "string" ? i.name : "", a = typeof i.pid == "number" ? i.pid : 0, c = typeof i.path == "string" ? i.path : void 0;
      o && n.push({ name: o, pid: a, path: c });
    }
    return n;
  }
  const s = t.flagged;
  if (Array.isArray(s))
    for (const r of s) {
      if (!r || typeof r != "object") continue;
      const i = r, o = typeof i.name == "string" ? i.name : "", a = typeof i.pid == "number" ? i.pid : 0, c = typeof i.path == "string" ? i.path : void 0;
      o && n.push({ name: o, pid: a, path: c });
    }
  return n;
}
async function Au(t) {
  return Promise.all(
    t.map(async (n) => {
      const e = Mu(n.details);
      if (e.length === 0) return n;
      const s = await ao(e);
      return {
        ...n,
        details: {
          ...n.details,
          detectedApps: s
        }
      };
    })
  );
}
function he(t) {
  const n = si.find((e) => e.id === t);
  if (!n) throw new Error(`Unknown check: ${t}`);
  return n;
}
function Eu(t) {
  const n = t.filter((i) => i.status === "failed").length, e = t.filter((i) => i.status === "warning").length, s = t.filter((i) => i.status === "passed").length, r = t.some(
    (i) => i.status === "failed" && i.severity === "block"
  );
  return {
    passed: !r,
    blocked: r,
    summary: { total: t.length, passed: s, failed: n, warnings: e }
  };
}
async function Tu(t) {
  const n = (/* @__PURE__ */ new Date()).toISOString(), e = Mo(), s = await _u(), r = /* @__PURE__ */ new Map();
  t && (r.set("webcam", t.webcam), r.set("microphone", t.microphone));
  const i = await vo(
    Ro(he("internet_speed")),
    he("internet_speed").timeoutMs,
    "internet_speed"
  );
  r.set("internet_speed", i);
  const o = [
    [
      "screen_resolution",
      Eo(he("screen_resolution"))
    ],
    [
      "multiple_monitors",
      To(he("multiple_monitors"))
    ],
    ["ram", Do(he("ram"), s)],
    ["cpu", bo(he("cpu"), s)],
    ["battery", Vo(he("battery"), s)],
    ["vpn", Go(he("vpn"), s)],
    [
      "virtual_machine",
      Yo(he("virtual_machine"), s)
    ],
    [
      "screen_recording",
      Ho(he("screen_recording"), s)
    ],
    [
      "running_applications",
      Xo(
        he("running_applications"),
        s
      )
    ],
    [
      "remote_desktop",
      $o(he("remote_desktop"), s)
    ],
    ["obs", Wo(he("obs"), s)],
    ["teamviewer", zo(he("teamviewer"), s)],
    ["anydesk", Uo(he("anydesk"), s)],
    ["clipboard", Ao(he("clipboard"))],
    [
      "browser_version",
      Ko(he("browser_version"))
    ]
  ];
  for (const [l, u] of o)
    r.set(l, u);
  const a = si.map(
    (l) => r.get(l.id)
  ).filter((l) => !!l), c = await Au(a);
  return {
    runId: e,
    startedAt: n,
    finishedAt: (/* @__PURE__ */ new Date()).toISOString(),
    platform: process.platform,
    appVersion: ce.getVersion(),
    electronVersion: process.versions.electron ?? "",
    chromiumVersion: process.versions.chrome ?? "",
    checks: c,
    ...Eu(c)
  };
}
function Du() {
  return si;
}
function bu() {
  Dt.handle(Ti.GET_DEFINITIONS, () => Du()), Dt.handle(Ti.RUN_ALL, async (t, n) => Tu(n));
}
const Yt = {
  START_LOCKDOWN: "proctoring:start-lockdown",
  END_LOCKDOWN: "proctoring:end-lockdown",
  LIST_RUNNING_APPS: "proctoring:list-running-apps",
  CLOSE_RUNNING_APPS: "proctoring:close-running-apps",
  CAPTURE_EXAM_SCREEN: "proctoring:capture-exam-screen",
  EVENT: "proctoring:event"
};
let Ie = null, ae = !1, wn = null, Ln = null, In = null, _n = null, On = null, Pn = null, Jn = "", Qn = "", as = !1, lr = !1, ur = !1;
const co = _o(Io), Vu = /* @__PURE__ */ new Set(["display-capture", "desktopCapturer"]), Nu = ["cursor", "electron", "electron-vite-project", "node"], lo = [
  ...ii,
  ...ri,
  ...oi,
  ...ai,
  ...ci
], pr = [
  "Finder",
  "Dock",
  "ControlCenter",
  "Spotlight",
  "NotificationCenter",
  "WindowManager",
  "SystemUIServer",
  "loginwindow",
  "WallpaperAgent",
  "TextInputSwitcher"
];
function pe(t, n) {
  !Ie || Ie.isDestroyed() || Ie.webContents.send(Yt.EVENT, {
    type: t,
    occurredAt: (/* @__PURE__ */ new Date()).toISOString(),
    details: n
  });
}
function cs(t) {
  t.isDestroyed() || (t.isKiosk() || t.setKiosk(!0), t.setAlwaysOnTop(!0, "screen-saver"), t.setVisibleOnAllWorkspaces(!0, { visibleOnFullScreen: !0 }));
}
function Ke(t = !1) {
  const n = Ie;
  if (!(!n || n.isDestroyed())) {
    try {
      ce.focus({ steal: !0 });
    } catch {
    }
    n.isMinimized() && n.restore(), t && cs(n), n.setAlwaysOnTop(!0, "screen-saver"), n.show(), n.moveTop(), n.focus();
  }
}
function Bu(t) {
  return t.pid === process.pid ? !0 : `${t.name} ${t.bundleIdentifier ?? ""}`.toLowerCase().includes(ce.getName().toLowerCase());
}
async function ku() {
  if (process.platform !== "darwin") return null;
  const t = `
const systemEvents = Application('System Events');
const app = systemEvents.applicationProcesses.whose({ frontmost: true })()[0];
app ? JSON.stringify({ name: app.name(), pid: app.unixId(), bundleIdentifier: app.bundleIdentifier() }) : '';
`;
  try {
    const { stdout: n } = await co("osascript", ["-l", "JavaScript", "-e", t], {
      timeout: 1e3
    }), e = n.trim();
    if (!e) return null;
    const s = JSON.parse(e);
    return s.name ? s : null;
  } catch {
    return null;
  }
}
function Fu() {
  if (as) return;
  const t = [
    "CommandOrControl+Tab",
    "CommandOrControl+Shift+Tab",
    "CommandOrControl+`",
    "CommandOrControl+Q",
    "CommandOrControl+H",
    "CommandOrControl+M",
    "CommandOrControl+C",
    "CommandOrControl+V",
    "CommandOrControl+X",
    "CommandOrControl+A",
    "CommandOrControl+P",
    "CommandOrControl+S",
    "Alt+Tab",
    "Alt+Shift+Tab",
    "Control+Left",
    "Control+Right",
    "Control+Up",
    "Control+Down",
    "CommandOrControl+Left",
    "CommandOrControl+Right",
    // macOS Screenshot / Screen Recording UI (best-effort; OS may retain some)
    "CommandOrControl+Shift+3",
    "CommandOrControl+Shift+4",
    "CommandOrControl+Shift+5",
    "CommandOrControl+Shift+6"
  ];
  for (const n of t)
    !mr.register(n, () => {
      const s = n.includes("Shift+3") || n.includes("Shift+4") || n.includes("Shift+5") || n.includes("Shift+6");
      pe(s ? "screen_capture_attempted" : "shortcut_blocked", {
        key: n,
        global: !0,
        blocked: !0
      }), Ke(!0), ls();
    }) && (n.includes("Shift+3") || n.includes("Shift+4") || n.includes("Shift+5"));
  as = !0;
}
function Ru() {
  as && (mr.unregisterAll(), as = !1);
}
function Gu() {
  In || (Jn = "", In = setInterval(() => {
    ae && ku().then((t) => {
      if (!t || Bu(t)) return;
      const n = `${t.name}:${t.pid}`;
      n !== Jn && (Jn = n, pe("another_app_active", {
        appName: t.name,
        pid: t.pid,
        bundleIdentifier: t.bundleIdentifier
      })), Ke(!0);
    });
  }, 150));
}
function Wu() {
  In && (clearInterval(In), In = null, Jn = "");
}
function zu() {
  _n || (_n = setInterval(() => {
    const t = Ie;
    !ae || !t || t.isDestroyed() || t.isFocused() && t.isVisible() && !t.isMinimized() || (pe("focus_lost", { reason: "lockdown_watchdog" }), Ke(!0));
  }, 250));
}
function Uu() {
  _n && (clearInterval(_n), _n = null);
}
function ls() {
  try {
    Ks.clear();
  } catch {
  }
}
function $u() {
  Pn || (ls(), Pn = setInterval(() => {
    ae && ls();
  }, 1200));
}
function Hu() {
  Pn && (clearInterval(Pn), Pn = null);
}
function Xu(t) {
  const n = t.toLowerCase();
  return lo.some((e) => n.includes(e.toLowerCase()));
}
async function Ku() {
  try {
    return (await Ue.processes()).list.filter((n) => typeof n.name == "string" && Xu(n.name)).filter((n) => n.pid !== process.pid).map((n) => ({ pid: n.pid, name: n.name }));
  } catch {
    return [];
  }
}
function ju() {
  On || (On = setInterval(() => {
    ae && Ku().then((t) => {
      if (t.length === 0) {
        Qn = "";
        return;
      }
      const n = t.map((e) => `${e.name}:${e.pid}`).sort().join("|");
      n !== Qn && (Qn = n, pe("screen_recording_detected", {
        apps: t.slice(0, 12),
        count: t.length
      }));
      for (const e of t)
        try {
          process.kill(e.pid);
        } catch {
        }
      Ke(!0);
    });
  }, 1800));
}
function qu() {
  On && (clearInterval(On), On = null, Qn = "");
}
function Yu() {
  try {
    lr || (js.defaultSession.setDisplayMediaRequestHandler((t, n) => {
      if (ae) {
        pe("screen_capture_attempted", { source: "display_media_api", blocked: !0 }), n({});
        return;
      }
      n({});
    }), lr = !0);
  } catch {
  }
  try {
    ur || (js.defaultSession.setPermissionRequestHandler((t, n, e) => {
      if (!ae) {
        e(!0);
        return;
      }
      if (n === "media") {
        e(!0);
        return;
      }
      if (Vu.has(String(n))) {
        pe("screen_capture_attempted", { source: n, blocked: !0 }), e(!1);
        return;
      }
      e(!1);
    }), ur = !0);
  } catch {
  }
}
function Ju(t) {
  const n = t.key.toLowerCase(), e = t.meta || t.control, s = t.shift;
  return e && s && ["3", "4", "5", "6"].includes(n) ? !0 : e ? [
    "a",
    "c",
    "v",
    "x",
    "r",
    "l",
    "w",
    "p",
    "s",
    "o",
    "n",
    "t",
    "[",
    "]",
    "arrowleft",
    "arrowright",
    "arrowup",
    "arrowdown",
    "left",
    "right",
    "up",
    "down"
  ].includes(n) : !1;
}
function Qu(t) {
  Yu(), t.setResizable(!1), t.setMaximizable(!1), t.setMinimizable(!1), t.setContentProtection(!0), t.webContents.closeDevTools(), cs(t), Ke(!0), Fu(), wn = () => {
    pe("window_minimized"), Ke(!0);
  }, Ln = () => {
    !ae || t.isDestroyed() || (cs(t), Ke(!0));
  }, t.on("minimize", wn), t.on("leave-full-screen", Ln), Gu(), zu(), ju(), $u();
}
function Zu(t) {
  Wu(), Uu(), qu(), Hu(), Ru(), wn && (t.off("minimize", wn), wn = null), Ln && (t.off("leave-full-screen", Ln), Ln = null), t.setAlwaysOnTop(!1), t.setVisibleOnAllWorkspaces(!1), t.setContentProtection(!1), t.isKiosk() && t.setKiosk(!1), t.setResizable(!0), t.setMaximizable(!0), t.setMinimizable(!0);
}
function ep(t) {
  const n = `${t.displayName} ${t.processName} ${t.path ?? ""}`.toLowerCase();
  if (t.pid === process.pid) return "Exam application";
  if (ce.isPackaged) return null;
  const e = Nu.find((s) => n.includes(s));
  return e ? `Allowed for local testing: ${e}` : null;
}
function tp(t) {
  if (pr.includes(t.displayName) || pr.includes(t.processName)) return !0;
  const n = t.path ?? "";
  return n.startsWith("/System/Library/") || n.includes("/System/Library/CoreServices/");
}
async function np() {
  const t = `
const systemEvents = Application('System Events');
const apps = systemEvents.applicationProcesses.whose({ backgroundOnly: false })();
JSON.stringify(apps.map((item) => ({ pid: item.unixId(), name: item.name() })));
`;
  try {
    const { stdout: n } = await co("osascript", ["-l", "JavaScript", "-e", t], {
      timeout: 3e3
    }), e = JSON.parse(n.trim());
    return new Set(e.map((s) => s.pid).filter((s) => typeof s == "number"));
  } catch {
    return /* @__PURE__ */ new Set();
  }
}
async function uo() {
  const t = await Ue.processes(), n = process.platform === "darwin" ? await np() : /* @__PURE__ */ new Set(), s = t.list.filter((o) => typeof o.name == "string" && o.name.trim().length > 0).filter((o) => o.pid === process.pid ? !1 : n.has(o.pid) ? !0 : lo.some((a) => hr(o.name, [a]))).map((o) => ({
    name: o.name,
    pid: o.pid,
    path: typeof o.path == "string" ? o.path : void 0
  }));
  return (await ao(s)).map((o) => {
    const a = ep(o);
    return a ? { ...o, allowed: !0, allowReason: a } : o;
  }).filter((o) => o.allowed || !tp(o)).sort((o, a) => +!!o.allowed - +!!a.allowed || o.displayName.localeCompare(a.displayName));
}
async function sp(t) {
  const n = [...new Set(t.filter((l) => Number.isInteger(l) && l > 0))], e = await uo(), s = new Map(e.map((l) => [l.pid, l]));
  let r = /* @__PURE__ */ new Map();
  try {
    const l = await Ue.processes();
    r = new Map(
      l.list.map((u) => [
        u.pid,
        {
          name: typeof u.name == "string" ? u.name : void 0,
          path: typeof u.path == "string" ? u.path : void 0
        }
      ])
    );
  } catch {
  }
  const i = [], o = [], a = [], c = (l) => new Promise((u) => setTimeout(u, l));
  for (const l of n) {
    const u = s.get(l);
    if (u != null && u.allowed) {
      o.push(u);
      continue;
    }
    const d = r.get(l), p = (u == null ? void 0 : u.displayName) || (d == null ? void 0 : d.name) || `Process ${l}`;
    if (l === process.pid) {
      o.push(
        u || {
          pid: l,
          processName: p,
          displayName: p,
          allowed: !0,
          allowReason: "Exam application"
        }
      );
      continue;
    }
    try {
      process.kill(l, "SIGTERM"), await c(350);
      try {
        process.kill(l, 0), process.kill(l, "SIGKILL");
      } catch {
      }
      i.push(l);
    } catch (f) {
      a.push({
        pid: l,
        displayName: p,
        reason: f instanceof Error ? f.message : "Unable to close process"
      });
    }
  }
  return { closed: i, skipped: o, failed: a };
}
function ip(t) {
  Dt.handle(Yt.LIST_RUNNING_APPS, async () => uo()), Dt.handle(
    Yt.CLOSE_RUNNING_APPS,
    async (n, e) => sp(Array.isArray(e) ? e : [])
  ), Dt.handle(Yt.START_LOCKDOWN, async () => {
    const n = t();
    return n ? (Ie = n, ae = !0, Qu(n), await new Promise((e) => setTimeout(e, 150)), !n.isDestroyed() && !n.isKiosk() && (cs(n), Ke(), await new Promise((e) => setTimeout(e, 100))), { active: !n.isDestroyed() && n.isKiosk() }) : { active: !1 };
  }), Dt.handle(Yt.END_LOCKDOWN, () => {
    const n = Ie;
    return ae = !1, Ie = null, n && !n.isDestroyed() && Zu(n), { active: !1 };
  }), Dt.handle(Yt.CAPTURE_EXAM_SCREEN, async () => {
    const n = Ie && !Ie.isDestroyed() ? Ie : t();
    if (!n || n.isDestroyed()) return null;
    try {
      const e = await n.webContents.capturePage();
      return e.isEmpty() ? null : e.toJPEG(78).toString("base64");
    } catch {
      return null;
    }
  }), ce.on("browser-window-focus", (n, e) => {
    ae && e === Ie && pe("focus_restored");
  }), ce.on("browser-window-blur", (n, e) => {
    ae && e === Ie && (pe("focus_lost"), Ke(!0));
  }), Zn.on("display-added", (n, e) => {
    ae && pe("display_changed", { action: "added", id: e.id });
  }), Zn.on("display-removed", (n, e) => {
    ae && pe("display_changed", { action: "removed", id: e.id });
  }), js.defaultSession.on("will-download", (n) => {
    ae && (n.preventDefault(), pe("download_blocked"));
  }), Bn.on("suspend", () => {
    ae && pe("laptop_suspend");
  }), Bn.on("resume", () => {
    ae && pe("laptop_resume");
  }), Bn.on("lock-screen", () => {
    ae && pe("screen_locked");
  }), Bn.on("unlock-screen", () => {
    ae && pe("screen_unlocked");
  }), ce.on("web-contents-created", (n, e) => {
    e.setWindowOpenHandler(({ url: s }) => ae ? (pe("new_window_blocked", { url: s }), { action: "deny" }) : (ho.openExternal(s), { action: "deny" })), e.on("will-navigate", (s, r) => {
      ae && (s.preventDefault(), pe("navigation_blocked", { url: r }));
    }), e.on("context-menu", (s) => {
      ae && s.preventDefault();
    }), e.on("before-input-event", (s, r) => {
      if (!ae || !Ju(r)) return;
      s.preventDefault();
      const i = r.key.toLowerCase(), o = (r.meta || r.control) && r.shift && ["3", "4", "5", "6"].includes(i);
      pe(o ? "screen_capture_attempted" : "shortcut_blocked", {
        key: r.key,
        meta: r.meta,
        control: r.control,
        shift: r.shift
      }), o && ls(), Ke(!0);
    });
  });
}
const po = {
  EVENT: "deep-link:event"
}, us = "upgradexam";
let vn = null;
function Xs(t) {
  if (!(t != null && t.startsWith(`${us}://`))) return null;
  try {
    const n = new URL(t);
    return {
      action: n.hostname || "launch",
      code: n.searchParams.get("code"),
      examId: n.searchParams.get("examId")
    };
  } catch {
    return null;
  }
}
function dr(t) {
  return t.find((n) => n.startsWith(`${us}://`)) ?? null;
}
function fr(t, n) {
  if (!t) return;
  const e = n();
  if (!e || e.webContents.isLoading()) {
    vn = t;
    return;
  }
  e.isMinimized() && e.restore(), e.focus(), e.webContents.send(po.EVENT, t);
}
function rp(t) {
  if (!vn || !t) return;
  const n = vn;
  vn = null, t.webContents.send(po.EVENT, n);
}
function op(t) {
  if (process.defaultApp && process.argv.length >= 2 ? ce.setAsDefaultProtocolClient(us, process.execPath, [He.resolve(process.argv[1])]) : ce.setAsDefaultProtocolClient(us), !ce.requestSingleInstanceLock()) return !1;
  ce.on("second-instance", (e, s) => {
    fr(Xs(dr(s) ?? ""), t);
  }), ce.on("open-url", (e, s) => {
    e.preventDefault(), fr(Xs(s), t);
  });
  const n = Xs(dr(process.argv) ?? "");
  return n && (vn = n), !0;
}
const fo = He.dirname(yo(import.meta.url));
process.env.APP_ROOT = He.join(fo, "..");
const ni = process.env.VITE_DEV_SERVER_URL, Ip = He.join(process.env.APP_ROOT, "dist-electron"), mo = He.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = ni ? He.join(process.env.APP_ROOT, "public") : mo;
let Fe;
function go() {
  Fe = new gr({
    icon: He.join(
      process.env.VITE_PUBLIC ?? process.env.APP_ROOT,
      "electron-vite.svg"
    ),
    webPreferences: {
      preload: He.join(fo, "preload.mjs"),
      contextIsolation: !0,
      nodeIntegration: !1,
      devTools: !1
    }
  }), Fe.webContents.on("did-finish-load", () => {
    Fe == null || Fe.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString()), rp(Fe);
  }), ni ? Fe.loadURL(ni) : Fe.loadFile(He.join(mo, "index.html"));
}
ce.on("window-all-closed", () => {
  process.platform !== "darwin" && (ce.quit(), Fe = null);
});
ce.on("activate", () => {
  gr.getAllWindows().length === 0 && go();
});
const ap = op(() => Fe);
ap ? ce.whenReady().then(() => {
  ce.setName("upGrad Exam"), xo.setApplicationMenu(null), bu(), ip(() => Fe), go();
}) : ce.quit();
export {
  Ip as MAIN_DIST,
  mo as RENDERER_DIST,
  ni as VITE_DEV_SERVER_URL
};
