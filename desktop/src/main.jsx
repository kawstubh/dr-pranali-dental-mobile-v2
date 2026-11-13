import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  ClipboardList,
  FileText,
  Wallet,
  BarChart3,
  Settings,
  Search,
  Bell,
  Plus,
  ChevronRight,
  Clock,
  ArrowUpRight,
  Stethoscope,
  Sparkles,
  Syringe,
  AlignCenter,
  CircleDot,
  HeartPulse,
  ShieldCheck,
  Download,
  MoreHorizontal,
  CheckCircle2,
  MapPin,
  Activity,
  CalendarCheck,
  FileHeart,
  Receipt,
  Building2,
  Menu,
  MessageCircle,
  X,
} from "lucide-react";
import "./styles.css";
import { dentalApi } from "./api.js";
import ErrorBoundary from "./ErrorBoundary.jsx";
import { normaliseList, normaliseUser, formatTime, isSameLocalDay } from "./data.js";
import { DoctorCareManagement, DoctorClinicalNotes, PatientCommunication } from "./careScreens.jsx";
import AssistantApp, { AssistantManagement } from "./assistant.jsx";
import { createPortalNavigator, resolvePortalRoute } from "./routing.js";
import { createControllerChangeHandler } from "./serviceWorkerLifecycle.js";
function doctorDisplayName(user) {
  const candidate = String(
    user?.name || user?.full_name || user?.display_name || user?.email?.split("@")[0] || "",
  ).trim();
  if (!candidate) return "Doctor";
  return /^dr\.?\s/i.test(candidate) ? candidate : `Dr. ${candidate}`;
}

function doctorRoleLabel(user) {
  const role = String(user?.role || "").toLowerCase();
  if (role === "owner") return "Clinic owner";
  if (role === "admin" || role === "administrator") return "Clinic administrator";
  return "Doctor";
}

function App() {
  const initialRoute = resolvePortalRoute(window.location.pathname);
  const [role, R] = useState(initialRoute.role),
    [page, setPage] = useState(initialRoute.page),
    [search, S] = useState(""),
    [toast, T] = useState(""),
    [modal, M] = useState(false),
    [mobile, B] = useState(false),
    [tooth, Q] = useState("36"),
    [findings, F] = useState({}),
    [token, setToken] = useState(""),
    [user, setUser] = useState(null),
    [patients, setPatients] = useState([]),
    [appointments, setAppointments] = useState([]),
    [workspaces, setWorkspaces] = useState([]),
    [workspaceError, setWorkspaceError] = useState(""),
    [booting, setBooting] = useState(true),
    [authError, setAuthError] = useState(""),
    [dataError, setDataError] = useState(""),
    [dashboardSummary, setDashboardSummary] = useState(null),
    [dashboardSummaryLoading, setDashboardSummaryLoading] = useState(false),
    [dashboardSummaryError, setDashboardSummaryError] = useState(""),
    [pwaRegistration, setPwaRegistration] = useState(null),
    [pwaUpdateReady, setPwaUpdateReady] = useState(false);
  const portalNavigator = useRef(null);
  const P = (nextPage) => {
    setPage(nextPage);
    portalNavigator.current?.navigate("doctor", nextPage);
  };
  const navigateRole = (nextRole, nextPage) => {
    R(nextRole);
    setPage(nextPage);
    portalNavigator.current?.navigate(nextRole, nextPage);
  };
  useEffect(() => {
    const navigator = createPortalNavigator(window, (nextRoute) => {
      R(nextRoute.role);
      setPage(nextRoute.page);
    });
    portalNavigator.current = navigator;
    return () => {
      navigator.dispose();
      if (portalNavigator.current === navigator) portalNavigator.current = null;
    };
  }, []);
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return undefined;
    let live = true;
    const onControllerChange = createControllerChangeHandler(
      navigator.serviceWorker,
      () => window.location.reload()
    );
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    navigator.serviceWorker.register("/sw.js", { scope: "/" })
      .then((registration) => {
        if (!live) return;
        setPwaRegistration(registration);
        if (registration.waiting && navigator.serviceWorker.controller) setPwaUpdateReady(true);
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (live && worker.state === "installed" && navigator.serviceWorker.controller) {
              setPwaUpdateReady(true);
            }
          });
        });
        registration.update().catch(() => {});
      })
      .catch((error) => console.warn("[Oralyn PWA] Service worker registration failed.", error));
    return () => {
      live = false;
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);
  const applyPwaUpdate = () => {
    if (pwaRegistration?.waiting) {
      pwaRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
    } else {
      window.location.reload();
    }
  };
  useEffect(() => {
    const expireDoctorSession = () => {
      setToken("");
      setUser(null);
      setPatients([]);
      setAppointments([]);
      setWorkspaces([]);
      setWorkspaceError("");
      setDataError("");
      setDashboardSummary(null);
      setDashboardSummaryLoading(false);
      setDashboardSummaryError("");
      setAuthError("Your clinic session has expired. Please sign in again.");
    };
    window.addEventListener("oralyn:doctor-session-expired", expireDoctorSession);
    return () => window.removeEventListener("oralyn:doctor-session-expired", expireDoctorSession);
  }, []);

  useEffect(() => {
    let live = true;
    if (!token) {
      setUser(null);
      setPatients([]);
      setAppointments([]);
      setWorkspaces([]);
      setWorkspaceError("");
      setDataError("");
      setDashboardSummary(null);
      setDashboardSummaryLoading(false);
      setDashboardSummaryError("");
      setBooting(false);
      return () => {
        live = false;
      };
    }
    setBooting(true);
    setAuthError("");
    const loadSession = async () => {
      try {
        const me = await dentalApi.me(token);
        const currentUser = normaliseUser(me);
        if (!currentUser) throw new Error("The clinic service did not return an authenticated doctor profile.");
        if (!live) return;
        setUser(currentUser);
        setBooting(false);
        setDashboardSummaryLoading(true);
        const results = await Promise.allSettled([
          dentalApi.patients(token),
          dentalApi.appointments(token),
          dentalApi.workspaces(token),
          dentalApi.dashboardSummary(token),
        ]);
        if (!live) return;
        const [patientResult, appointmentResult, workspaceResult, summaryResult] = results;
        setPatients(patientResult.status === "fulfilled" ? normaliseList(patientResult.value, ["patients"]) : []);
        setAppointments(appointmentResult.status === "fulfilled" ? normaliseList(appointmentResult.value, ["appointments"]) : []);
        setWorkspaces(workspaceResult.status === "fulfilled" ? normaliseList(workspaceResult.value, ["workspaces"]) : []);
        setDashboardSummary(summaryResult.status === "fulfilled" ? (summaryResult.value?.result || summaryResult.value) : null);
        setDashboardSummaryError(summaryResult.status === "rejected" ? (summaryResult.reason?.message || "Live financial and treatment metrics are unavailable.") : "");
        setDashboardSummaryLoading(false);
        setWorkspaceError(workspaceResult.status === "rejected" ? "Your authorised workspace list could not be refreshed." : "");
        setDataError(results.slice(0, 3).some((result) => result.status === "rejected")
          ? "Some clinic data could not be loaded. Your doctor session remains active; retry when the clinic service is available."
          : "");
      } catch (err) {
        if (!live) return;
        if (err.status === 401) {
          setToken("");
          setUser(null);
          setAuthError("Your session expired. Please sign in again.");
        } else {
          setUser(null);
          setAuthError("We could not verify your saved clinic session. Your session has been preserved. Retry or sign in again. " + err.message);
        }
      } finally {
        if (live) setBooting(false);
      }
    };
    loadSession();
    return () => {
      live = false;
    };
  }, [token]);
  const refreshDoctorData = async () => {
    if (!token) return;
    setDashboardSummaryLoading(true);
    const results = await Promise.allSettled([
      dentalApi.patients(token),
      dentalApi.appointments(token),
      dentalApi.workspaces(token),
      dentalApi.dashboardSummary(token),
    ]);
    const [patientResult, appointmentResult, workspaceResult, summaryResult] = results;
    setPatients(patientResult.status === "fulfilled" ? normaliseList(patientResult.value, ["patients"]) : []);
    setAppointments(appointmentResult.status === "fulfilled" ? normaliseList(appointmentResult.value, ["appointments"]) : []);
    setWorkspaces(workspaceResult.status === "fulfilled" ? normaliseList(workspaceResult.value, ["workspaces"]) : []);
    setDashboardSummary(summaryResult.status === "fulfilled" ? (summaryResult.value?.result || summaryResult.value) : null);
    setDashboardSummaryError(summaryResult.status === "rejected" ? (summaryResult.reason?.message || "Live financial and treatment metrics are unavailable.") : "");
    setDashboardSummaryLoading(false);
    setWorkspaceError(workspaceResult.status === "rejected" ? "Your authorised workspace list could not be refreshed." : "");
    setDataError(results.slice(0, 3).some((result) => result.status === "rejected")
      ? "Some clinic data could not be refreshed. Your session remains active."
      : "");
  };
  const switchWorkspace = async (clinicId) => {
    if (!token || !clinicId) return;
    try {
      const session = await dentalApi.switchWorkspace(token, clinicId);
      const accessToken = session?.access_token || session?.result?.access_token;
      const sessionUser = normaliseUser(session);
      if (!accessToken || !sessionUser) throw new Error("The clinic service returned an incomplete workspace session.");
      // Clear the previous clinic's scoped records before the new token can render.
      setPatients([]);
      setAppointments([]);
      setWorkspaces([]);
      setDashboardSummary(null);
      setDashboardSummaryError("");
      setDashboardSummaryLoading(false);
      setWorkspaceError("");
      setDataError("");
      F({});
      Q("36");
      setToken(accessToken);
      setUser(sessionUser);
      setWorkspaces(normaliseList(session, ["workspaces"]));
      P("dashboard");
      T("Workspace switched successfully.");
      return true;
    } catch (error) {
      setWorkspaceError(error?.message || "Workspace switching failed.");
      return false;
    }
  };
  const activeWorkspace = workspaces.find((workspace) => String(workspace.id || workspace.clinic_id) === String(user?.clinic_id)) || null;
  const signOut = async () => {
    try {
      if (token) await dentalApi.logout(token);
    } catch {}
    setToken("");
    setUser(null);
    setPatients([]);
    setAppointments([]);
    setWorkspaces([]);
    setWorkspaceError("");
    setDataError("");
    setDashboardSummary(null);
    setDashboardSummaryError("");
    setDashboardSummaryLoading(false);
    navigateRole("doctor", "dashboard");
  };
  if (role === "doctor" && (!user || booting))
    return (
      <LoginScreen
        loading={booting}
        error={authError}
        onPatient={() => {
          window.location.assign("/patient/home/");
        }}
        onAssistant={() => {
          window.location.assign("/assistant/");
        }}
        onLogin={async (email, password) => {
          setAuthError("");
          try {
            const result = await dentalApi.login(email, password);
            setToken(result.access_token);
          } catch (e) {
            setAuthError(e.message);
          }
        }}
      />
    );
  const ping = (x) => {
    T(x);
    setTimeout(() => T(""), 2600);
  };
  const doctorNav = [
    [
      "Workspace",
      [
        ["dashboard", "Overview", LayoutDashboard],
        ["patients", "Patients", Users],
        ["clinical", "Clinical workspace", ClipboardList],
        ["notes", "Clinical notes", FileText],
        ["appointments", "Appointments", CalendarDays],
      ],
    ],
    [
      "Practice",
      [
        ["treatments", "Treatment plans", HeartPulse],
        ["billing", "Billing & invoices", Wallet],
        ["files", "Private documents", FileText],
        ["messages", "Patient messages", MessageCircle],
        ["reports", "Reports & analytics", BarChart3],
      ],
    ],
    [
      "Administration",
      [["workspaces", "Workspaces", Building2], ["settings", "Settings", Settings]],
    ],
  ];
  const nav = doctorNav;
  return (
    <div className="shell">
      {pwaUpdateReady && (
        <div className="pwa-update-banner" role="status">
          <span>A new Oralyn portal update is ready.</span>
          <button onClick={applyPwaUpdate}>Refresh portal</button>
          <button className="pwa-dismiss" aria-label="Dismiss update notice" onClick={() => setPwaUpdateReady(false)}>×</button>
        </div>
      )}
      <aside className={mobile ? "sidebar open" : "sidebar"}>
        <div className="brand"><img src="/oralyn-logo-approved.webp" alt="Oralyn official wordmark" /><button className="close" onClick={() => B(false)}>
            <X />
          </button>
        </div>
        <div className="workspace">{(activeWorkspace?.name || "CLINIC WORKSPACE").toUpperCase()}</div>
        {nav.map(([group, items]) => (
          <section className="navgroup" key={group}>
            <label>{group}</label>
            {items.map(([id, name, Icon]) => (
              <button
                key={id}
                className={page === id ? "nav active" : "nav"}
                onClick={() => {
                  P(id);
                  B(false);
                }}
              >
                <Icon size={18} />
                {name}
              </button>
            ))}
          </section>
        ))}
        <div className="sidefoot">
          <div className="help">
            <ShieldCheck />
            <b>Clinical workspace</b>
            <p>Your practice at a glance, with clinical tools in one place.</p>
          </div>

          <div className="user">
            <span>DP</span>
            <div>
              <b>{doctorDisplayName(user)}</b>
              <small>{doctorRoleLabel(user)}</small>
            </div>
            <MoreHorizontal />
          </div>
        </div>
      </aside>
      {mobile && <button className="sidebar-backdrop" aria-label="Close navigation menu" onClick={() => B(false)} />}
      <main>
        <header className="topbar">
          <button className="menu" onClick={() => B(true)}>
            <Menu />
          </button>
          <div className="crumb">
            Oralyn <ChevronRight size={14} />
            <b>
              {page === "dashboard"
                ? "Overview"
                : page === "clinical"
                  ? "Clinical workspace"
                  : page[0].toUpperCase() + page.slice(1)}
            </b>
          </div>
          <div className="topright">
            {role === "doctor" && (<div className="search">
              <Search />
              <input
                placeholder="Search patients, records…"
                value={search}
                onChange={(e) => S(e.target.value)}
              />
              <kbd>⌘ K</kbd>
            </div>)}
            {role === "doctor" && (workspaces.length > 1 ? (
              <select className="workspace-switcher" aria-label="Switch clinic workspace" value={activeWorkspace?.id || activeWorkspace?.clinic_id || ""} onChange={(event) => switchWorkspace(event.target.value)}>
                {workspaces.map((workspace) => <option key={workspace.id || workspace.clinic_id} value={workspace.id || workspace.clinic_id}>{workspace.name}</option>)}
              </select>
            ) : <span className={activeWorkspace ? "workspace-chip" : "workspace-chip missing"}>{activeWorkspace?.name || "No active workspace"}</span>)}
            <button
              className="bell"
              onClick={() => ping("You’re all caught up.")}
            >
              <Bell />
              <i />
            </button>
            <span className="userpic">DP</span>
            <span className="workspace-chip" aria-label="Doctor portal">Doctor portal</span>
            <button className="logoutbtn" onClick={signOut}>Sign out</button>
          </div>
        </header>
        <div className="content">
          {role === "doctor" && workspaceError && <div className="autherror" role="alert">{workspaceError} <button className="link" onClick={refreshDoctorData}>Retry</button></div>}
          {role === "doctor" && dataError && <div className="autherror" role="alert">{dataError} <button className="link" onClick={refreshDoctorData}>Retry</button></div>}
            <Doctor
              page={page}
              P={P}
              search={search}
              M={M}
              ping={ping}
              tooth={tooth}
              Q={Q}
              findings={findings}
              F={F}
              patients={patients}
              appointments={appointments}
              dashboardSummary={dashboardSummary}
              dashboardSummaryLoading={dashboardSummaryLoading}
              dashboardSummaryError={dashboardSummaryError}
              token={token}
              user={user}
              refresh={refreshDoctorData}
              workspaces={workspaces}
              activeWorkspace={activeWorkspace}
              workspaceError={workspaceError}
              onSwitchWorkspace={switchWorkspace}
              onRefreshWorkspaces={refreshDoctorData}
              onSignOut={signOut}
            />

        </div>
      </main>
      {toast && (
        <div className="toast">
          <CheckCircle2 />
          {toast}
        </div>
      )}
      {modal && (
        <ClinicModal
          page={page}
          patients={patients}
          token={token}
          onClose={() => M(false)}
          onSaved={refreshDoctorData}
          ping={ping}
        />
      )}
    </div>
  );
}
function OralynVectorBrand() {
  return <div className="oralyn-vector-brand" aria-label="Oralyn Dental Clinic Management">
    <img src="/oralyn-logo-approved.webp" alt="Oralyn approved logo" />
  </div>;
}
function OralynClinicIllustration() {
  return <svg className="oralyn-clinic-illustration" viewBox="0 0 700 760" aria-hidden="true">
    <defs>
      <linearGradient id="chair-blue" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#F8FDFF"/><stop offset=".55" stopColor="#D8EAF5"/><stop offset="1" stopColor="#7FAACB"/></linearGradient>
      <linearGradient id="chair-seat" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#19B9F0"/><stop offset="1" stopColor="#0756B8"/></linearGradient>
      <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#A9E9FF" stopOpacity=".6"/><stop offset="1" stopColor="#0A4B7E" stopOpacity=".08"/></linearGradient>
      <filter id="soft-glow"><feGaussianBlur stdDeviation="9"/></filter>
    </defs>
    <path d="M330 0H700V760H210L260 600 300 380Z" fill="url(#glass)" opacity=".7"/>
    <path d="M370 0V570M540 0V570M370 180H700" stroke="#B7E8FF" strokeOpacity=".28" strokeWidth="3"/>
    <path d="M455 82c-42-28-87-2-86 47 1 35 20 62 34 83 10 17 14 34 15 54 2 25 18 31 28 12l10-26 10 26c10 19 26 13 28-12 1-20 5-37 15-54 14-21 33-48 34-83 1-49-44-75-88-47Z" fill="none" stroke="#65DDFB" strokeWidth="8" filter="url(#soft-glow)" opacity=".65"/>
    <path d="M455 82c-42-28-87-2-86 47 1 35 20 62 34 83 10 17 14 34 15 54 2 25 18 31 28 12l10-26 10 26c10 19 26 13 28-12 1-20 5-37 15-54 14-21 33-48 34-83 1-49-44-75-88-47Z" fill="none" stroke="#B5F3FF" strokeWidth="5"/>
    <path d="M535 270h150l-28 23H540l-48 68-24-13 54-78Z" fill="#DCEFF8" stroke="#75B4D9" strokeWidth="4"/>
    <path d="M515 340c-45-22-99-4-122 36l-16 27 38 26 37-31 65 10 32-31Z" fill="#EAF7FD" stroke="#80B5D4" strokeWidth="5"/>
    <path d="M417 388c-34-18-83-10-99 25l-29 67 53 24 48-43 76 18 27-50Z" fill="#F6FBFF" stroke="#8FBBD6" strokeWidth="5"/>
    <path d="M344 480c-27 15-45 47-37 80l35 138c9 36 41 54 77 43l150-46c35-11 48-44 31-77l-50-101c-15-29-48-41-80-30l-55 18Z" fill="url(#chair-blue)" stroke="#7FAACB" strokeWidth="6"/>
    <path d="M387 537c-20 7-29 29-23 49l25 83c7 22 28 33 51 27l131-39c24-7 34-30 23-52l-31-63c-10-20-31-28-53-21l-80 25Z" fill="url(#chair-seat)"/>
    <path d="M408 680l-22 54m174-92 40 67" stroke="#A7C7DD" strokeWidth="16" strokeLinecap="round"/>
    <path d="M350 735h252" stroke="#A9C8DE" strokeWidth="11" strokeLinecap="round"/>
    <path d="M215 0h180M250 0v160" stroke="#C7F3FF" strokeOpacity=".3" strokeWidth="3"/>
    <ellipse cx="480" cy="690" rx="220" ry="26" fill="#4BBDEB" opacity=".12" filter="url(#soft-glow)"/>
  </svg>;
}
function LoginScreen({ loading, error, onLogin, onPatient, onAssistant }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  return (
    <main className="oralyn-auth-layout oralyn-reference-layout">
      <section className="oralyn-auth-story oralyn-reference-story" aria-label="About Oralyn">
        <div className="oralyn-reference-atmosphere" />
        <header className="oralyn-auth-brand"><OralynVectorBrand /></header>
        <div className="oralyn-reference-clinic-art"><OralynClinicIllustration /></div>
        <div className="oralyn-auth-copy">
          <span className="oralyn-auth-kicker">DENTAL CLINIC MANAGEMENT</span>
          <h1>Smarter dental care,<br/><em>beautifully organized.</em></h1>
          <div className="oralyn-reference-swoosh" />
          <p className="oralyn-auth-intro">Manage appointments, patients, treatment plans, and clinic workflows in one secure workspace.</p>
          <div className="oralyn-auth-features" aria-label="Oralyn features">
            <article><span className="oralyn-feature-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7"/><path d="M7 2v5M17 2v5M3 9h18M7 13h3M14 13h3M7 17h3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg></span><b>Appointments</b></article>
            <article><span className="oralyn-feature-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.7"/><path d="M3 20c0-3.5 2.3-5.5 6-5.5s6 2 6 5.5M16 8a3 3 0 1 1 0 6M17 16c2.5.4 4 1.7 4 4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg></span><b>Patients</b></article>
            <article><span className="oralyn-feature-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3C8 0 3 3 3 8c0 4 3 7 4 10 1 3 3 4 4 1l1-4 1 4c1 3 3 2 4-1 1-3 4-6 4-10 0-5-5-8-9-5Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg></span><b>Treatment plans</b></article>
            <article><span className="oralyn-feature-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 9 5-9 5-9-5 9-5ZM3 13l9 5 9-5M3 17l9 5 9-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg></span><b>Clinic workflows</b></article>
          </div>
        </div>
        <footer className="oralyn-auth-footnote"><span className="oralyn-footnote-dot"/> A clearer view of your clinic. A more connected way to care.</footer>
      </section>
      <section className="oralyn-auth-panel oralyn-reference-panel" aria-label="Doctor sign in">
        <div className="oralyn-auth-card oralyn-reference-card">
          <div className="oralyn-app-squircle"><img src="/oralyn-app-icon-approved.webp" alt="Oralyn approved app icon" /></div>
          <span className="oralyn-auth-label">DOCTOR PORTAL</span>
          <h2>Oralyn Doctor</h2>
          <p className="oralyn-auth-subtitle">Sign in with your clinic-issued email and password.</p>
          {error && <div className="autherror" role="alert">{error}</div>}
          <form onSubmit={async (e) => {
            e.preventDefault(); setBusy(true);
            try { await onLogin(email, password); } finally { setBusy(false); }
          }}>
            <label className="oralyn-field"><span>Clinic email</span>
              <span className="oralyn-input-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7"/><path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <input type="email" autoComplete="username" required value={email} placeholder="doctor@clinic.com" onChange={(e) => setEmail(e.target.value)} /></span>
            </label>
            <label className="oralyn-field"><span>Password</span>
              <span className="oralyn-password-wrap"><svg className="oralyn-input-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
                <input type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} placeholder="Enter your password" onChange={(e) => setPassword(e.target.value)} />
                <button type="button" className="oralyn-password-toggle" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button>
              </span>
            </label>
            <button className="oralyn-signin" disabled={busy || loading}>{(busy || loading) && <span className="oralyn-spinner" aria-hidden="true" />}{busy || loading ? "Signing in securely…" : "Sign in"}</button>
          </form>
          <div className="oralyn-auth-divider"><span>SECURE CLINIC ACCESS</span></div>
          <div className="oralyn-reference-admin-note">Your account is issued and managed by your clinic administrator. Public sign-up is disabled.</div>
          <button className="oralyn-team-link" onClick={onAssistant}>Clinic Assistant sign in <span>→</span></button>
          <button className="oralyn-patient-link" onClick={onPatient}>Patient services &amp; appointment requests <span>→</span></button>
        </div>
      </section>
    </main>
  );
}
function ClinicModal({ page, patients, token, onClose, onSaved, ping }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isPatient = page === "patients";
  return (
    <div className="overlay">
      <div className="modal clinicmodal">
        <button className="x" onClick={onClose}>
          <X />
        </button>
        <span className="modalicon">
          {isPatient ? <Users /> : <CalendarCheck />}
        </span>
        <h2>{isPatient ? "Add a patient" : "Create appointment"}</h2>
        <p>
          {isPatient
            ? "Create a secure patient record in the clinic workspace."
            : "Schedule a visit for an existing clinic patient."}
        </p>
        {error && <div className="autherror">{error}</div>}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const fd = new FormData(e.currentTarget);
            try {
              if (isPatient) {
                await dentalApi.createPatient(token, {
                  name: String(fd.get("name") || ""),
                  phone: String(fd.get("phone") || ""),
                  age: String(fd.get("age") || ""),
                });
              } else {
                await dentalApi.createAppointment(token, {
                  patient_id: String(fd.get("patient_id") || ""),
                  starts_at: new Date(
                    String(fd.get("starts_at")),
                  ).toISOString(),
                  treatment_type: String(fd.get("treatment_type") || ""),
                  note: String(fd.get("note") || ""),
                  status: "scheduled",
                });
              }
              await onSaved();
              onClose();
              ping(
                isPatient
                  ? "Patient record created successfully."
                  : "Appointment saved to the clinic schedule.",
              );
            } catch (err) {
              setError(err.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {isPatient ? (
            <>
              <label className="field">
                Patient full name
                <input
                  name="name"
                  required
                  minLength={2}
                  placeholder="Full name"
                />
              </label>
              <label className="field">
                Mobile number
                <input
                  name="phone"
                  required
                  minLength={7}
                  placeholder="Mobile number"
                />
              </label>
              <label className="field">
                Age
                <input
                  name="age"
                  type="number"
                  min="0"
                  max="120"
                  placeholder="Age"
                />
              </label>
            </>
          ) : (
            <>
              <label className="field">
                Patient
                <select name="patient_id" required defaultValue="">
                  <option value="" disabled>
                    Select a patient
                  </option>
                  {patients.map((p) => (
                    <option value={p.id}>
                      {p.name} · {p.phone || p.id}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Date & time
                <input name="starts_at" type="datetime-local" required />
              </label>
              <label className="field">
                Treatment / visit type
                <input
                  name="treatment_type"
                  required
                  placeholder="e.g. Dental consultation"
                />
              </label>
              <label className="field">
                Clinical note
                <input name="note" placeholder="Optional note" />
              </label>
            </>
          )}
          <button
            className="primary wide"
            disabled={busy || (!isPatient && !patients.length)}
          >
            {busy
              ? "Saving securely…"
              : isPatient
                ? "Save patient"
                : "Save appointment"}
          </button>
          {!isPatient && !patients.length && (
            <small className="authfoot">
              Add a patient before creating an appointment.
            </small>
          )}
        </form>
      </div>
    </div>
  );
}
function Title({ eyebrow, title, desc, action, M }) {
  return (
    <div className="heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{desc}</p>
      </div>
      {action && (
        <button className="primary" onClick={() => M(true)}>
          <Plus />
          {action}
        </button>
      )}
    </div>
  );
}
function Metric({ Icon, label, value, detail }) {
  return (
    <div className="metric">
      <div className="metrichead">
        <span>{label}</span>
        <i>
          <Icon />
        </i>
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}
function Panel({ title, sub, children, action }) {
  return (
    <section className="panel">
      <div className="panelhead">
        <div>
          <h2>{title}</h2>
          {sub && <p>{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
function AccountSettings({ user, activeWorkspace, onSignOut }) {
  return (
    <>
      <Title eyebrow="ACCOUNT & SECURITY" title="Settings" desc="Review the signed-in account and active clinic context." />
      <div className="care-grid">
        <Panel title="Signed-in account" sub="Identity returned by the authenticated service.">
          <div className="settings-list">
            <div><small>Account</small><b>{user?.email || user?.name || "Authenticated account"}</b></div>
            <div><small>Role</small><b>{user?.role || "Doctor"}</b></div>
            <div><small>Session</small><b>Authenticated · session-managed</b></div>
          </div>
        </Panel>
        <Panel title="Linked clinic" sub="The active record context used for protected portal requests.">
          <div className="settings-list">
            <div><small>Clinic</small><b>{activeWorkspace?.name || activeWorkspace?.clinic_name || "No clinic selected"}</b></div>
            <div><small>Organisation</small><b>{activeWorkspace?.organisation_name || "Not returned"}</b></div>
          </div>
        </Panel>
        <Panel title="Privacy and access" sub="Oralyn keeps clinical records behind role and clinic permissions.">
          <p className="care-hint">Patient-facing AI diagnosis and self-diagnosis are not available. Clinical notes remain private. Private document uploads, downloads, review and patient sharing are disabled until secure private storage and fail-closed malware scanning are configured and verified.</p>
          <button className="outline" onClick={onSignOut}>Sign out securely</button>
        </Panel>
      </div>
    </>
  );
}

function Doctor({
  page,
  P,
  search,
  M,
  ping,
  tooth,
  Q,
  findings,
  F,
  patients,
  appointments,
  dashboardSummary,
  dashboardSummaryLoading,
  dashboardSummaryError,
  token,
  user,
  refresh,
  workspaces,
  activeWorkspace,
  workspaceError,
  onSwitchWorkspace,
  onRefreshWorkspaces,
  onSignOut,
}) {
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [appointmentEdits, setAppointmentEdits] = useState({});
  const [appointmentBusyId, setAppointmentBusyId] = useState("");
  const [appointmentError, setAppointmentError] = useState("");
  const localDateTimeValue = (value) => {
    const date = new Date(value || "");
    if (!Number.isFinite(date.getTime())) return "";
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };
  useEffect(() => {
    setAppointmentEdits({});
  }, [appointments]);
  const saveAppointment = async (appointment) => {
    const draft = appointmentEdits[appointment.id] || {};
    const startValue = draft.starts_at ?? localDateTimeValue(appointment.starts_at);
    const parsedStart = new Date(startValue);
    if (!startValue || !Number.isFinite(parsedStart.getTime())) {
      setAppointmentError("Choose a valid clinic-local appointment date and time.");
      return;
    }
    const changes = {};
    const currentStart = new Date(appointment.starts_at || "");
    if (!Number.isFinite(currentStart.getTime()) || parsedStart.getTime() !== currentStart.getTime()) {
      changes.starts_at = parsedStart.toISOString();
    }
    const nextStatus = draft.status ?? appointment.status ?? "scheduled";
    if (nextStatus !== appointment.status) changes.status = nextStatus;
    if (!Object.keys(changes).length) {
      ping("There are no appointment changes to save.");
      return;
    }
    setAppointmentBusyId(String(appointment.id));
    setAppointmentError("");
    try {
      await dentalApi.updateAppointment(token, appointment.id, changes);
      setAppointmentEdits((current) => {
        const next = { ...current };
        delete next[appointment.id];
        return next;
      });
      await refresh();
      ping("Appointment updated successfully.");
    } catch (error) {
      setAppointmentError(error?.message || "Appointment could not be updated.");
    } finally {
      setAppointmentBusyId("");
    }
  };
  useEffect(() => {
    if (!patients.length) {
      if (selectedPatientId) setSelectedPatientId("");
      if (Object.keys(findings).length) F({});
      return;
    }
    if (!patients.some((patient) => String(patient.id) === String(selectedPatientId))) {
      setSelectedPatientId(String(patients[0].id));
    }
  }, [patients, selectedPatientId, findings, F]);
  const activePatient = patients.find((patient) => String(patient.id) === String(selectedPatientId)) || patients[0] || null;
  useEffect(() => {
    if (!activePatient?.id) return;
    let live = true;
    F({});
    dentalApi.chart(token, activePatient.id)
      .then((response) => {
        if (!live) return;
        const rows = normaliseList(response, ["chart", "entries", "records"]);
        F(Object.fromEntries(rows.map((row) => [String(row.tooth_fdi), row.status])));
      })
      .catch(() => {
        if (live) F({});
      });
    return () => { live = false; };
  }, [token, activePatient?.id, F]);
  const people = patients.map((p) => [
    (p.name || "Unknown patient").split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase(),
    p.name || "Unknown patient",
    p.id || "—",
    p.phone || "Phone not recorded",
  ]);
  const orderedAppointments = [...appointments].sort((a, b) => new Date(a.starts_at || "").getTime() - new Date(b.starts_at || "").getTime());
  const appts = orderedAppointments.map((a) => {
    const patient = patients.find((p) => String(p.id) === String(a.patient_id));
    return [formatTime(a.starts_at), a.patient_name || patient?.name || "Patient", a.treatment_type || "Visit", a.status || "Status not recorded", "teal"];
  });
  const todayAppointments = orderedAppointments.filter((a) => isSameLocalDay(a.starts_at));
  const todayRows = appts.filter((_, index) => isSameLocalDay(orderedAppointments[index]?.starts_at));
  const nextAppointment = orderedAppointments.find((a) => String(a.patient_id) === String(activePatient?.id) && Number.isFinite(new Date(a.starts_at || "").getTime()) && new Date(a.starts_at).getTime() >= Date.now()) || null;
  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";
  const todayLabel = now.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).toUpperCase();
  const dashboardCount = (key) => dashboardSummaryLoading ? "…" : dashboardSummary ? Number(dashboardSummary[key] || 0) : "—";
  const dashboardMoney = (key) => dashboardSummaryLoading ? "…" : dashboardSummary ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(dashboardSummary[key] || 0) / 100) : "—";
  const dashboardUnavailable = dashboardSummaryError
    ? "Live workspace metrics are unavailable: " + dashboardSummaryError
    : "Live workspace metrics are not available from this API environment yet.";
  const [aiBusy, setAiBusy] = useState(false);
  const [aiResult, setAiResult] = useState("");
  if (page === "workspaces")
    return (
      <WorkspaceManagement
        token={token}
        user={user}
        workspaces={workspaces}
        activeWorkspace={activeWorkspace}
        workspaceError={workspaceError}
        onSwitchWorkspace={onSwitchWorkspace}
        onRefreshWorkspaces={onRefreshWorkspaces}
      />
    );
  if (page === "clinical")
    return (
      <>
        <Title
          eyebrow="PATIENT CLINICAL RECORD"
          title="Clinical workspace"
          desc="Review findings and coordinate treatment with a complete patient view."
        />
        <div className="patientbar">
          <span className="patientavatar">
            {activePatient?.name
              ?.split(" ")
              .map((x) => x[0])
              .slice(0, 2)
              .join("")
              .toUpperCase() || "—"}
          </span>
          <div>
            <h2>
              {activePatient?.name || "No patient selected"}{" "}
              <em>{activePatient ? "Clinic patient" : "No active record"}</em>
            </h2>
            <p>
              {activePatient
                ? activePatient.id +
                  " · " +
                  (activePatient.phone || "Phone not recorded")
                : "Add a patient record to begin clinical charting."}
            </p>
          </div>
          <label className="patient-select-wrap">
            <small>Selected patient</small>
            <select className="patient-select" value={activePatient?.id || ""} onChange={(event) => setSelectedPatientId(event.target.value)} disabled={!patients.length}>
              <option value="">Select patient</option>
              {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name || patient.id}</option>)}
            </select>
          </label>
          <div className="next">
            <small>Next appointment</small>
            <b>{nextAppointment ? `${new Date(nextAppointment.starts_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} · ${formatTime(nextAppointment.starts_at)}` : "No appointment scheduled"}</b>
          </div>
          <button className="outline" onClick={() => P("patients")}>Open patient directory</button>
        </div>
        <div className="tabs">
          {[
            ["dashboard", "Overview"],
            ["clinical", "Dental Chart"],
            ["treatments", "Treatment Plan"],
            ["notes", "Notes"],
            ["files", "Files"],
            ["billing", "Invoices"],
          ].map(([id, label]) => (
            <button className={page === id ? "selected" : ""} onClick={() => P(id)}>{label}</button>
          ))}
        </div>
        <Panel
          title="Clinical intelligence"
          sub="Doctor-only decision support · Patient-facing AI is disabled."
        >
          <button
            className="primary"
            disabled={!activePatient || aiBusy}
            onClick={async () => {
              setAiBusy(true);
              setAiResult("");
              try {
                const r = await dentalApi.intelligence(token, {
                  goal: "Prepare a concise, neutral clinical summary of the supplied clinic record for the treating dentist. Summarize documented findings, identify missing information and list questions for clinician review. Do not diagnose, prescribe, or invent facts.",
                  patient_id: activePatient.id,
                  context: {
                    selected_tooth: tooth,
                    recorded_chart_findings: findings,
                  },
                });
                setAiResult(r.result || r);
              } catch (e) {
                setAiResult(
                  "Clinical intelligence is unavailable: " + e.message,
                );
              } finally {
                setAiBusy(false);
              }
            }}
          >
            {aiBusy ? "Preparing summary…" : "Generate clinician summary"}
          </button>
          {aiResult && (
            <div className="airesult" aria-live="polite">
              {typeof aiResult === "string" ? (
                <p className="airesult-message" role="status">{aiResult}</p>
              ) : (
                <>
                  {aiResult.summary && <p className="airesult-summary">{aiResult.summary}</p>}
                  <div className="airesult-grid">
                    {[
                      ["Documented findings", aiResult.documented_findings],
                      ["Missing information", aiResult.missing_information],
                      ["Questions for clinician review", aiResult.clinician_questions],
                    ].map(([heading, entries]) => (
                      <section className="airesult-section" key={heading}>
                        <h3>{heading}</h3>
                        {Array.isArray(entries) && entries.length ? (
                          <ul>{entries.map((entry, index) => <li key={index}>{String(entry)}</li>)}</ul>
                        ) : <p>None recorded.</p>}
                      </section>
                    ))}
                  </div>
                  {aiResult.safety_note && <p className="airesult-safety">{aiResult.safety_note}</p>}
                </>
              )}
            </div>
          )}
        </Panel>
        <div className="clinical">
          <Panel
            title="Dental chart"
            sub="FDI notation · Select a tooth to review or update findings"
          >
            <div className="legend">
              <span><i className="swatch snr" />Not recorded</span>
              {[
                "Healthy",
                "Caries",
                "Restored",
                "Root canal",
                "Crown",
                "Implant",
                "Missing",
              ].map((x, i) => (
                <span>
                  <i className={"swatch s" + i} />
                  {x}
                </span>
              ))}
            </div>
            <div className="archlabel">UPPER ARCH</div>
            <div className="teeth">
              {[
                18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
              ].map((n) => (
                <button
                  className={tooth == n ? "chosen" : ""}
                  onClick={() => Q(String(n))}
                  disabled={!activePatient}
                >
                  <small>{n}</small>
                  <span
                    style={{
                      background: {
                        "not-recorded": "#f4fbff",
                        healthy: "#e9f4fa",
                        caries: "#f5b8a9",
                        filled: "#8dc8f4",
                        rct: "#b8a9ef",
                        crown: "#f4d58b",
                        implant: "#91d8cc",
                        missing: "#f3f5f8",
                      }[findings[n] || "not-recorded"],
                    }}
                  >
                    ◒
                  </span>
                </button>
              ))}
            </div>
            <div className="archlabel">LOWER ARCH</div>
            <div className="teeth">
              {[
                48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
              ].map((n) => (
                <button
                  className={tooth == n ? "chosen" : ""}
                  onClick={() => Q(String(n))}
                  disabled={!activePatient}
                >
                  <span
                    style={{
                      background: {
                        "not-recorded": "#f4fbff",
                        healthy: "#e9f4fa",
                        caries: "#f5b8a9",
                        filled: "#8dc8f4",
                        rct: "#b8a9ef",
                        crown: "#f4d58b",
                        implant: "#91d8cc",
                        missing: "#f3f5f8",
                      }[findings[n] || "not-recorded"],
                    }}
                  >
                    ◒
                  </span>
                  <small>{n}</small>
                </button>
              ))}
            </div>
            <p className="disclaimer">
              Clinic chart · Changes are saved only when you select Save
              finding.
            </p>
          </Panel>
          <Panel title={"Tooth " + tooth} sub="Clinical finding">
            <div className="finding">
              <small>Current status</small>
              <b>{(findings[tooth] || "not recorded").replaceAll("-", " ").toUpperCase()}</b>
            </div>
            <label className="field">Update finding</label>
            <div className="findings">
              {[
                "healthy",
                "caries",
                "filled",
                "rct",
                "crown",
                "implant",
                "missing",
              ].map((x) => (
                <button
                  className={findings[tooth] === x ? "sel" : ""}
                  onClick={() => F({ ...findings, [tooth]: x })}
                  disabled={!activePatient}
                >
                  {x}
                </button>
              ))}
            </div>
            <button
              className="primary wide"
              disabled={!activePatient || !findings[tooth]}
              onClick={async () => {
                try {
                  await dentalApi.saveChart(token, activePatient.id, {
                    tooth_fdi: String(tooth),
                    status: findings[tooth],
                  });
                  ping("Dental chart saved to the clinic record.");
                } catch (e) {
                  ping("Could not save chart: " + e.message);
                }
              }}
            >
              Save finding to patient record
            </button>
            <h3 className="history">Clinical history</h3>
            <div className="empty-state">Verified clinical notes and document history are not yet available from the staging API. No sample history is shown.</div>
          </Panel>
        </div>
      </>
    );
  if (page === "patients")
    return (
      <>
        <Title
          eyebrow="PATIENT DIRECTORY"
          title="Patients"
          desc="A clear view of every patient and their ongoing care."
          action="Add patient"
          M={M}
        />
        <div className="panel tablewrap">
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Patient ID</th>
                <th>Phone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {people
                .filter((p) =>
                  (p[1] || "").toLowerCase().includes(search.toLowerCase()),
                )
                .map((p) => (
                  <tr>
                    <td>
                      <b>{p[1]}</b>
                    </td>
                    <td>{p[2]}</td>
                    <td>{p[3]}</td>
                    <td className="patient-actions-cell">
                      <div className="patient-row-actions">
                        <button className="link" onClick={() => { setSelectedPatientId(String(p[2])); P("clinical"); }}>
                          Open ›
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              {!people.length && (
                <tr>
                  <td colSpan={4}>
                    <div className="empty-state">
                      No patient records are available for this clinic account.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </>
    );
  if (page === "appointments")
    return (
      <>
        <Title
          eyebrow="SCHEDULE"
          title="Appointments"
          desc="Review, reschedule and update visits in the active clinic workspace."
          action="New appointment"
          M={M}
        />
        <div className="calendarbar">
          <b>
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </b>
          <span className="muted">All scheduled visits · clinic-local time</span>
        </div>
        {appointmentError && <div className="autherror" role="alert">{appointmentError}</div>}
        <div className="schedule">
          {orderedAppointments.length ? orderedAppointments.map((appointment) => {
            const draft = appointmentEdits[appointment.id] || {};
            const startsAt = draft.starts_at ?? localDateTimeValue(appointment.starts_at);
            const status = draft.status ?? appointment.status ?? "scheduled";
            const changed = startsAt !== localDateTimeValue(appointment.starts_at) || status !== (appointment.status || "scheduled");
            const patient = patients.find((item) => String(item.id) === String(appointment.patient_id));
            return (
              <div className="schedrow appointment-row" key={appointment.id}>
                <time>{formatTime(appointment.starts_at)}</time>
                <div className="appointment-main">
                  <div className="schedcard teal">
                    <div>
                      <b>{appointment.patient_name || patient?.name || "Patient"}</b>
                      <p>{appointment.treatment_type || "Dental visit"}</p>
                    </div>
                    <span>{appointment.status || "scheduled"}</span>
                  </div>
                  <div className="appointment-editor">
                    <label>Reschedule
                      <input
                        type="datetime-local"
                        value={startsAt}
                        onChange={(event) => {
                          setAppointmentEdits((current) => ({ ...current, [appointment.id]: { ...current[appointment.id], starts_at: event.target.value } }));
                          setAppointmentError("");
                        }}
                      />
                    </label>
                    <label>Status
                      <select
                        value={status}
                        onChange={(event) => {
                          setAppointmentEdits((current) => ({ ...current, [appointment.id]: { ...current[appointment.id], status: event.target.value } }));
                          setAppointmentError("");
                        }}
                      >
                        {["requested", "confirmed", "scheduled", "completed", "cancelled", "rescheduled", "no_show"].map((value) => (
                          <option key={value} value={value}>{value.replaceAll("_", " ")}</option>
                        ))}
                      </select>
                    </label>
                    <button className="outline" disabled={!changed || Boolean(appointmentBusyId)} onClick={() => saveAppointment(appointment)}>
                      {appointmentBusyId === String(appointment.id) ? "Saving…" : "Save changes"}
                    </button>
                  </div>
                </div>
              </div>
            );
          }) : <div className="empty-state">No appointments are available for this clinic account yet.</div>}
        </div>
      </>
    );
  if (page === "treatments")
    return <DoctorCareManagement page={page} token={token} activePatient={activePatient} ping={ping} />;
  if (page === "notes")
    return <DoctorClinicalNotes token={token} activePatient={activePatient} />;
  if (page === "messages")
    return <PatientCommunication token={token} activePatient={activePatient} />;
  if (page === "settings")
    return (
      <>
        <AssistantManagement token={token} user={user} />
        <AccountSettings user={user} activeWorkspace={activeWorkspace} onSignOut={onSignOut} />
      </>
    );
  if (page === "files")
    return <DoctorCareManagement page={page} token={token} activePatient={activePatient} ping={ping} />;
  if (page === "billing")
    return <DoctorCareManagement page={page} token={token} activePatient={activePatient} ping={ping} />;
  if (page === "reports")
    return (
      <>
        <Title
          eyebrow="PRACTICE MANAGEMENT"
          title="Reports & analytics"
          desc="Workspace-scoped totals from persistent treatment and billing records."
          action={<button className="outline" onClick={refresh}>Refresh reports</button>}
        />
        <div className="metricgrid three">
          <Metric
            Icon={Users}
            label="Patients loaded"
            value={dashboardSummary ? dashboardCount("patient_count") : patients.length}
            detail="Live clinic directory"
          />
          <Metric
            Icon={CalendarDays}
            label="Appointments loaded"
            value={dashboardSummary ? dashboardCount("appointment_count") : appointments.length}
            detail="Live clinic schedule"
          />
          <Metric
            Icon={Wallet}
            label="Issued invoices"
            value={dashboardCount("issued_invoice_count")}
            detail="Issued and paid invoices"
          />
        </div>
        <Panel title="Financial position" sub="All values are INR, derived from issued clinic invoices and recorded receipts.">
          {dashboardSummary ? (
            <>
              <div className="listrow">Invoiced total <b>{dashboardMoney("invoiced_total_paise")}</b></div>
              <div className="listrow">Collected to date <b>{dashboardMoney("collected_total_paise")}</b></div>
              <div className="listrow">Outstanding balance <b>{dashboardMoney("outstanding_balance_paise")}</b></div>
              <div className="listrow">Active treatment plans <b>{dashboardCount("active_treatment_plan_count")}</b></div>
            </>
          ) : (
            <div className="empty-state">{dashboardSummaryLoading ? "Loading live workspace metrics…" : dashboardUnavailable}</div>
          )}
        </Panel>
      </>
    );
  return (
    <>
      <div className="welcome">
        <div>
          <div className="eyebrow">{todayLabel}</div>
          <h1>
            {greeting}, {doctorDisplayName(user)} <span>✦</span>
          </h1>
          <p>Here’s your practice overview for today.</p>
        </div>
        <button className="primary" onClick={() => M(true)}>
          <Plus />
          New appointment
        </button>
      </div>
      <div className="metricgrid">
        <Metric
          Icon={CalendarDays}
          label="Today's appointments"
          value={todayAppointments.length}
          detail="Live appointments scheduled for today"
        />
        <Metric
          Icon={HeartPulse}
          label="Active treatments"
          value={dashboardCount("active_treatment_plan_count")}
          detail="Proposed, accepted and in-progress plans"
        />
        <Metric
          Icon={Users}
          label="Pending requests"
          value={dashboardSummary ? dashboardCount("pending_appointment_requests") : appointments.filter((a) => a.status === "requested").length}
          detail="Awaiting clinic confirmation"
        />
        <Metric
          Icon={Wallet}
          label="Collected to date"
          value={dashboardMoney("collected_total_paise")}
          detail="Receipts recorded against issued invoices"
        />
      </div>
      <div className="dashgrid">
        <Panel
          title="Today's schedule"
          sub="Your next appointments"
          action={
            <button className="link" onClick={() => P("appointments")}>
              Full calendar ↗
            </button>
          }
        >
          {todayRows.length ? (
            todayRows.map((a) => (
              <div className="apptrow">
                <time>{a[0]}</time>
                <i className={"dot " + a[4]} />
                <div>
                  <b>{a[1]}</b>
                  <p>{a[2]}</p>
                </div>
                <span className="status">{a[3]}</span>
                <MoreHorizontal />
              </div>
            ))
          ) : (
            <div className="empty-state">
              No appointments are available for this clinic account yet.
            </div>
          )}
        </Panel>
        <Panel title="Practice snapshot" sub="Live treatment and financial totals">
          {dashboardSummary ? (
            <>
              <div className="listrow">Active treatment plans <b>{dashboardCount("active_treatment_plan_count")}</b></div>
              <div className="listrow">Issued invoices <b>{dashboardCount("issued_invoice_count")}</b></div>
              <div className="listrow">Invoiced to date <b>{dashboardMoney("invoiced_total_paise")}</b></div>
              <div className="listrow">Outstanding balance <b>{dashboardMoney("outstanding_balance_paise")}</b></div>
            </>
          ) : (
            <div className="empty-state">{dashboardSummaryLoading ? "Loading live workspace metrics…" : dashboardUnavailable}</div>
          )}
          <div className="listrow">
            Patients in clinic <b>{dashboardSummary ? dashboardCount("patient_count") : patients.length}</b>
          </div>
          <div className="listrow">
            Appointments loaded <b>{dashboardSummary ? dashboardCount("appointment_count") : appointments.length}</b>
          </div>
        </Panel>
      </div>
      <div className="dashgrid">
        <Panel title="Recent patients" sub="Verified records from the active clinic workspace">
          {people.length ? people.slice(0, 3).map((p) => (
            <div className="listrow">
              <b>{p[1]}</b>
              <span>{p[3]}</span>
            </div>
          )) : <div className="empty-state">No patient records are available for this clinic account yet.</div>}
        </Panel>
        <div className="clinicalpromo">
          <Activity />
          <label>CLINICAL INTELLIGENCE</label>
          <h2>Clinical workspace, ready when you are.</h2>
          <p>
            Review patient history, explore the odontogram and document findings
            in one place.
          </p>
          <button onClick={() => P("clinical")}>
            Open clinical workspace ›
          </button>
        </div>
      </div>
    </>
  );
}
function WorkspaceManagement({ token, user, workspaces, activeWorkspace, workspaceError, onSwitchWorkspace, onRefreshWorkspaces }) {
  const [orgWorkspaces, setOrgWorkspaces] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceType, setWorkspaceType] = useState("branch");
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("clinic");
  const [firstWorkspaceName, setFirstWorkspaceName] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [newDoctorEmail, setNewDoctorEmail] = useState("");
  const [newDoctorPassword, setNewDoctorPassword] = useState("");
  const [newDoctorRole, setNewDoctorRole] = useState("doctor");
  const [targetWorkspace, setTargetWorkspace] = useState("");
  const [membershipRole, setMembershipRole] = useState("doctor");
  const orgId = activeWorkspace?.organisation_id || user?.organisation_id || "";
  const role = activeWorkspace?.role || user?.role || "";
  const canManage = !workspaceError && Boolean(orgId) && ["owner", "admin"].includes(role);
  const targets = orgWorkspaces.filter((item) => String(item.id || item.clinic_id) !== String(activeWorkspace?.id || activeWorkspace?.clinic_id));

  useEffect(() => {
    let live = true;
    if (!canManage || !orgId) { setOrgWorkspaces([]); return () => { live = false; }; }
    setLoading(true);
    dentalApi.organisationWorkspaces(token, orgId)
      .then((data) => { if (live) setOrgWorkspaces(normaliseList(data, ["workspaces"])); })
      .catch((err) => { if (live) setError(err?.message || "Organisation workspace list unavailable."); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [token, orgId, canManage]);

  useEffect(() => {
    if (targets.length && !targets.some((item) => String(item.id || item.clinic_id) === String(targetWorkspace))) {
      setTargetWorkspace(String(targets[0].id || targets[0].clinic_id));
    }
  }, [orgWorkspaces, activeWorkspace?.id, targetWorkspace]);

  const refreshOrg = async () => {
    if (!canManage || !orgId) return;
    const data = await dentalApi.organisationWorkspaces(token, orgId);
    setOrgWorkspaces(normaliseList(data, ["workspaces"]));
  };

  const createWorkspace = async (event) => {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await dentalApi.createWorkspace(token, orgId, { name: workspaceName.trim(), clinic_type: workspaceType });
      const item = result?.workspace || result?.result?.workspace || result?.result || result;
      const id = item?.id || item?.clinic_id;
      setWorkspaceName("");
      await onRefreshWorkspaces();
      await refreshOrg();
      const switched = id ? await onSwitchWorkspace(id) : false;
      setNotice(switched ? "Workspace created and selected." : "Workspace created. Use the workspace switcher to open it.");
    } catch (err) { setError(err?.message || "Workspace creation failed."); }
    finally { setBusy(false); }
  };

  const createOrganisation = async (event) => {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await dentalApi.createOrganisation(token, {
        name: orgName.trim(),
        organisation_type: orgType,
        workspace_name: firstWorkspaceName.trim() || orgName.trim(),
        clinic_type: orgType === "hospital" ? "hospital_department" : "clinic",
      });
      const item = result?.workspace || result?.result?.workspace;
      const id = item?.id || item?.clinic_id;
      setOrgName(""); setFirstWorkspaceName("");
      await onRefreshWorkspaces();
      const switched = id ? await onSwitchWorkspace(id) : false;
      setNotice(switched ? "Organisation and first workspace created and selected." : "Organisation created. Refresh and select its first workspace.");
    } catch (err) { setError(err?.message || "Organisation creation failed."); }
    finally { setBusy(false); }
  };

  const assignMembership = async (event) => {
    event.preventDefault();
    if (!doctorId.trim() || !targetWorkspace) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await dentalApi.createWorkspaceMembership(token, targetWorkspace, { doctor_id: doctorId.trim(), role: membershipRole });
      await refreshOrg();
      await onRefreshWorkspaces();
      setNotice("Membership assigned. The doctor can now switch to this workspace.");
    } catch (err) { setError(err?.message || "Membership assignment failed."); }
    finally { setBusy(false); }
  };

  const createDoctorAccount = async (event) => {
    event.preventDefault();
    const email = newDoctorEmail.trim().toLowerCase();
    if (!email || newDoctorPassword.length < 12) {
      setError("Enter a valid doctor email and an initial password of at least 12 characters.");
      return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await dentalApi.createDoctorAccount(token, {
        email,
        password: newDoctorPassword,
        role: newDoctorRole,
      });
      const doctor = response?.result || response;
      const createdId = doctor?.id || doctor?.doctor_id;
      if (!createdId) throw new Error("The clinic service did not return the new doctor ID.");
      setDoctorId(String(createdId));
      setNewDoctorEmail("");
      setNewDoctorPassword("");
      setNewDoctorRole("doctor");
      await onRefreshWorkspaces();
      await refreshOrg();
      setNotice("Doctor account created in the active workspace. Its ID is ready in the cross-workspace membership form. Share the initial password through an approved secure channel.");
    } catch (err) { setError(err?.message || "Doctor account creation failed."); }
    finally { setBusy(false); }
  };

  const visible = canManage && orgWorkspaces.length ? orgWorkspaces : workspaces;
  return (
    <>
      <Title eyebrow="CLINIC ADMINISTRATION" title="Workspaces & access" desc="Manage clinic locations and doctor membership within the active organisation." />
      {error && <div className="autherror" role="alert">{error}</div>}
      {notice && <div className="workspace-notice" role="status">{notice}</div>}
      <Panel title="Active organisation" sub="Organisation identity comes from the authenticated clinic workspace.">
        <div className="workspace-summary">
          <div><small>Organisation</small><b>{activeWorkspace?.organisation_name || user?.organisation_name || "Not returned"}</b></div>
          <div><small>Organisation ID</small><code>{orgId || "Not available"}</code></div>
          <div><small>Workspace role</small><b>{role || "Not available"}</b></div>
        </div>
      </Panel>
      <div className="workspace-grid">
        <Panel title="Available workspaces" sub="Only memberships returned for this doctor are displayed.">
          {loading && <div className="empty-state">Loading organisation workspaces…</div>}
          {visible.length ? visible.map((item) => {
            const id = item.id || item.clinic_id;
            const active = String(id) === String(activeWorkspace?.id || activeWorkspace?.clinic_id);
            return <div className="workspace-row" key={id}>
              <div><b>{item.name || "Clinic workspace"}</b><small>{item.clinic_type || item.organisation_type || "Clinic"} | {item.role || "Member"}</small><small>{Number.isFinite(Number(item.active_doctors)) ? Number(item.active_doctors) + " active doctors" : "Doctor count unavailable"}</small></div>
              {active ? <span className="workspace-active">Active</span> : <button className="outline" onClick={() => onSwitchWorkspace(id)}>Switch</button>}
            </div>;
          }) : <div className="empty-state">No workspace memberships were returned for this doctor account.</div>}
        </Panel>
        <Panel title="Create a workspace" sub="Creates a location inside the active organisation.">
          {canManage ? <form className="workspace-form" onSubmit={createWorkspace}>
            <label>Workspace name<input value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} required maxLength={200} /></label>
            <label>Workspace type<select value={workspaceType} onChange={(event) => setWorkspaceType(event.target.value)}><option value="clinic">Clinic</option><option value="branch">Branch</option><option value="hospital_department">Hospital department</option></select></label>
            <button className="primary" disabled={busy}>Create workspace</button>
          </form> : <div className="empty-state">Only an organisation owner or administrator can create workspaces.</div>}
        </Panel>
        <Panel title="Create an organisation" sub="The API grants the creator owner membership in its first workspace.">
          {canManage ? <form className="workspace-form" onSubmit={createOrganisation}>
            <label>Organisation name<input value={orgName} onChange={(event) => setOrgName(event.target.value)} required maxLength={200} /></label>
            <label>Organisation type<select value={orgType} onChange={(event) => setOrgType(event.target.value)}><option value="clinic">Clinic</option><option value="hospital">Hospital</option><option value="group">Clinic group</option></select></label>
            <label>First workspace name<input value={firstWorkspaceName} onChange={(event) => setFirstWorkspaceName(event.target.value)} maxLength={200} placeholder="Optional; defaults to organisation name" /></label>
            <button className="primary" disabled={busy}>Create organisation</button>
          </form> : <div className="empty-state">Organisation creation is restricted to an owner or administrator.</div>}
        </Panel>
        <Panel title="Create doctor account" sub="Create a clinic-issued email/password account in the active workspace.">
          {canManage ? <form className="workspace-form" onSubmit={createDoctorAccount}>
            <label>Doctor email<input type="email" autoComplete="off" value={newDoctorEmail} onChange={(event) => setNewDoctorEmail(event.target.value)} required maxLength={320} /></label>
            <label>Initial password (12+ characters)<input type="password" autoComplete="new-password" value={newDoctorPassword} onChange={(event) => setNewDoctorPassword(event.target.value)} required minLength={12} maxLength={256} /></label>
            <label>Account role<select value={newDoctorRole} onChange={(event) => setNewDoctorRole(event.target.value)}><option value="doctor">Doctor</option><option value="dentist">Dentist</option>{role === "owner" && <option value="admin">Administrator</option>}</select></label>
            <button className="primary" disabled={busy || newDoctorPassword.length < 12}>Create doctor account</button>
            <small className="form-note">The initial password is sent only to the clinic API and is not retained by this portal. Share it with the doctor through an approved secure channel.</small>
          </form> : <div className="empty-state">Only an organisation owner or administrator can create doctor accounts.</div>}
        </Panel>
        <Panel title="Cross-workspace membership" sub="Assign an existing doctor to another workspace in this same organisation.">
          {canManage ? <form className="workspace-form" onSubmit={assignMembership}>
            <label>Doctor ID<input value={doctorId} onChange={(event) => setDoctorId(event.target.value)} required maxLength={64} placeholder="Created above or paste an existing doctor ID" /></label>
            <label>Destination workspace<select value={targetWorkspace} onChange={(event) => setTargetWorkspace(event.target.value)} disabled={!targets.length}><option value="">Select workspace</option>{targets.map((item) => <option key={item.id || item.clinic_id} value={item.id || item.clinic_id}>{item.name}</option>)}</select></label>
            <label>Membership role<select value={membershipRole} onChange={(event) => setMembershipRole(event.target.value)}><option value="doctor">Doctor</option><option value="dentist">Dentist</option><option value="admin">Administrator</option>{role === "owner" && <option value="owner">Owner</option>}</select></label>
            <button className="primary" disabled={busy || !targets.length}>Assign membership</button>
            {!targets.length && <small className="form-note">Create another workspace before assigning cross-workspace membership.</small>}
          </form> : <div className="empty-state">Cross-workspace membership is restricted to an owner or administrator.</div>}
        </Panel>
      </div>
      <div className="workspace-footnote">All organisation and membership permissions are enforced by the authenticated staging API. This interface does not bypass tenant isolation.</div>
    </>
  );
}

const currentPath = window.location.pathname;
const normalizedPath = currentPath.replace(/\/+$/, "") || "/";
const publicPatientPaths = new Set(["/patient/home", "/patient/booking"]);
const isAssistantRoute = /^\/assistant(?:\/|$)/.test(currentPath);
const isLegacyAssistantAdminRoute = /^\/assistant-admin(?:\/|$)/.test(currentPath);
const isPublicPatientAlias = publicPatientPaths.has(normalizedPath) && !currentPath.endsWith("/");
const isDisabledPatientRoute =
  /^\/patient(?:\/|$)/.test(currentPath) && !publicPatientPaths.has(normalizedPath);
const redirectPatientRoute = isPublicPatientAlias || isDisabledPatientRoute;
if (redirectPatientRoute) {
  window.location.replace(
    isPublicPatientAlias
      ? normalizedPath + "/"
      : currentPath.includes("/booking")
        ? "/patient/booking/"
        : "/patient/home/"
  );
}
if (isLegacyAssistantAdminRoute) window.location.replace("/doctor/settings");
createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    {isAssistantRoute ? (
      <AssistantApp />
    ) : redirectPatientRoute || isLegacyAssistantAdminRoute ? (
      <main className="redirect-screen" role="status">Opening the secure clinic workspace…</main>
    ) : (
      <App />
    )}
  </ErrorBoundary>,
);
