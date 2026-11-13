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
import AssistantApp, { AssistantManagement } from "./assistant.jsx";
import { normaliseList, normaliseUser, localDateISO, localDateTimeFromParts, formatTime, isSameLocalDay } from "./data.js";
import { DoctorCareManagement, PatientCareManagement, DoctorClinicalNotes, PatientCommunication } from "./careScreens.jsx";
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
    [step, Z] = useState(1),
    [service, V] = useState("Dental check-up"),
    [date, D] = useState(localDateISO()),
    [slot, H] = useState(""),
    [done, G] = useState(false),
    [token, setToken] = useState(
      () => localStorage.getItem("oralyn_doctor_token") || "",
    ),
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
    [patientName, setPatientName] = useState(""),
    [patientPhone, setPatientPhone] = useState(""),
    [patientSession, setPatientSession] = useState(null),
    [patientBoot, setPatientBoot] = useState(true),
    [patientError, setPatientError] = useState(""),
    [patientLinks, setPatientLinks] = useState([]),
    [selectedPatientRecordId, setSelectedPatientRecordId] = useState(
      () => localStorage.getItem("oralyn_patient_record_id") || "",
    ),
    [patientAppointments, setPatientAppointments] = useState([]),
    [patientChart, setPatientChart] = useState([]),
    [patientInviteCode, setPatientInviteCode] = useState(""),
    [pwaRegistration, setPwaRegistration] = useState(null),
    [pwaUpdateReady, setPwaUpdateReady] = useState(false);
  const portalNavigator = useRef(null);
  const P = (nextPage) => {
    if (role === "patient") {
      window.location.assign(nextPage === "booking" ? "/patient/booking/" : "/patient/home/");
      return;
    }
    setPage(nextPage);
    portalNavigator.current?.navigate(role, nextPage);
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
      localStorage.removeItem("oralyn_doctor_token");
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
          localStorage.removeItem("oralyn_doctor_token");
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
  useEffect(() => {
    // Patient access is intentionally account-free. Public booking is the
    // patient-facing workflow; private clinical records stay in the Doctor workspace.
    setPatientBoot(false);
    setPatientSession(null);
    setPatientLinks([]);
    setSelectedPatientRecordId("");
    setPatientAppointments([]);
    setPatientChart([]);
  }, []);
  const patientSignOut = async () => {};
  const linkPatient = async () => {
    throw new Error("Patient accounts are not required. Please contact the clinic for private records.");
  };
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
      localStorage.setItem("oralyn_doctor_token", accessToken);
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
    localStorage.removeItem("oralyn_doctor_token");
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
            localStorage.setItem("oralyn_doctor_token", result.access_token);
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
  const patientNav = [
    [
      "Visit the clinic",
      [
        ["home", "Home", LayoutDashboard],
        ["booking", "Book appointment", CalendarDays],
      ],
    ],
  ];
  const nav = role === "doctor" ? doctorNav : patientNav;
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
        <div className="workspace">
          {role === "doctor" ? (activeWorkspace?.name || "CLINIC WORKSPACE").toUpperCase() : "PATIENT PORTAL"}
        </div>
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
            <b>
              {role === "doctor" ? "Clinical workspace" : "Care, made simpler"}
            </b>
            <p>
              {role === "doctor"
                ? "Your practice at a glance, with clinical tools in one place."
                : "Your appointments and care information together."}
            </p>
          </div>

          <div className="user">
            <span>{role === "doctor" ? "DP" : "G"}</span>
            <div>
              <b>
                {role === "doctor"
                  ? doctorDisplayName(user)
                  : patientSession?.user?.email || "Patient guest"}
              </b>
              <small>
                {role === "doctor"
                  ? doctorRoleLabel(user)
                  : patientSession
                    ? "Verified patient"
                    : "Guest access"}
              </small>
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
            {role === "patient" && patientSession && patientLinks.length > 0 && (
              <select
                className="workspace-switcher patient-clinic-switcher"
                aria-label="Switch linked patient clinic"
                value={selectedPatientRecordId}
                onChange={(event) => selectPatientRecord(event.target.value)}
              >
                {patientLinks.map((item) => (
                  <option key={item.patient_id} value={item.patient_id}>
                    {item.organisation_name || item.clinic_name} · {item.clinic_name} · {item.patient_name}
                  </option>
                ))}
              </select>
            )}
            <button
              className="bell"
              onClick={() => ping("You’re all caught up.")}
            >
              <Bell />
              <i />
            </button>
            <span className="userpic">{role === "doctor" ? "DP" : "G"}</span>
            <span className="workspace-chip" aria-label={role === "doctor" ? "Doctor portal" : "Patient portal"}>
              {role === "doctor" ? "Doctor portal" : "Patient portal"}
            </span>
            {role === "doctor" ? (
              <button className="logoutbtn" onClick={signOut}>
                Sign out
              </button>
            ) : (
              patientSession && (
                <button className="logoutbtn" onClick={patientSignOut}>
                  Sign out
                </button>
              )
            )}
          </div>
        </header>
        <div className="content">
          {role === "doctor" && workspaceError && <div className="autherror" role="alert">{workspaceError} <button className="link" onClick={refreshDoctorData}>Retry</button></div>}
          {role === "doctor" && dataError && <div className="autherror" role="alert">{dataError} <button className="link" onClick={refreshDoctorData}>Retry</button></div>}
          {role === "patient" && patientSession && patientError && <div className="autherror" role="alert">{patientError}</div>}
          {role === "doctor" ? (
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
          ) : (
            <Patient
              page={page}
              P={P}
              M={M}
              ping={ping}
              step={step}
              Z={Z}
              service={service}
              V={V}
              date={date}
              D={D}
              slot={slot}
              H={H}
              done={done}
              G={G}
              patientName={patientName}
              setPatientName={setPatientName}
              patientPhone={patientPhone}
              setPatientPhone={setPatientPhone}
              patientSession={patientSession}
              patientLinks={patientLinks}
              selectedPatientRecordId={selectedPatientRecordId}
              onSelectPatientRecord={selectPatientRecord}
              patientAppointments={patientAppointments}
              patientChart={patientChart}
              patientInviteCode={patientInviteCode}
              setPatientInviteCode={setPatientInviteCode}
              onLinkPatient={linkPatient}
              onSignOut={patientSignOut}
            />
          )}
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
function LoginScreen({ loading, error, onLogin, onPatient, onAssistant }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="authscreen">
      <div className="authcard">
        <div className="authbrand"><img src="/oralyn-logo-approved.webp" alt="Oralyn official wordmark" /></div>
        <div className="eyebrow">CLINIC WORKSPACE</div>
        <h1>Welcome back</h1>
        <p>
          Sign in with your clinic doctor account to access secure patient
          records.
        </p>
        {error && <div className="autherror">{error}</div>}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await onLogin(email, password);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Email address
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button className="primary wide" disabled={busy || loading}>
            {busy || loading ? "Connecting securely…" : "Sign in to Oralyn"}
          </button>
        </form>
        <button className="patientlink" onClick={onPatient}>
          Continue to patient portal
        </button>
        <button className="patientlink" onClick={onAssistant}>
          Clinic Assistant sign in
        </button>
        <small className="authfoot">
          Secure clinic access · Session verified by the Oralyn server
        </small>
      </div>
    </div>
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
    return <PatientCommunication mode="doctor" token={token} activePatient={activePatient} />;
  if (page === "settings")
    return (
      <>
        <AccountSettings user={user} activeWorkspace={activeWorkspace} onSignOut={onSignOut} />
        <AssistantManagement token={token} user={user} />
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

function Patient({
  page,
  P,
  M,
  ping,
  step,
  Z,
  service,
  V,
  date,
  D,
  slot,
  H,
  done,
  G,
  patientName,
  setPatientName,
  patientPhone,
  setPatientPhone,
  patientSession,
  patientLinks,
  selectedPatientRecordId,
  onSelectPatientRecord,
  patientAppointments,
  patientChart,
  patientInviteCode,
  setPatientInviteCode,
  onLinkPatient,
  onSignOut,
}) {
  const selectedPatientLink = patientLinks.find((item) => String(item.patient_id) === String(selectedPatientRecordId));
  if (page !== "booking") {
    return (
      <>
        <Title
          eyebrow="PATIENT PORTAL"
          title="Your smile, your care"
          desc="Book your visit with Dr. Pranali Dental Clinic. No patient account or password is needed."
        />
        <div className="care-grid">
          <Panel title="Book an appointment" sub="Choose a dental service and request a convenient clinic time.">
            <p className="care-hint">Tell us your name and mobile number, select a preferred time, and the clinic team will contact you to confirm.</p>
            <button className="primary" onClick={() => P("booking")}>
              <CalendarDays /> Book an appointment
            </button>
          </Panel>
          <Panel title="Your privacy matters" sub="No account creation or patient login is required for appointment requests.">
            <p className="care-hint">Your clinical records, prescriptions and invoices remain private in the clinic's protected Doctor workspace. Contact the clinic directly when you need a copy of your records.</p>
          </Panel>
        </div>
      </>
    );
  }
  if (page === "booking")
    return (
      <>
        <Title
          eyebrow="BOOK YOUR VISIT"
          title="Book an appointment"
          desc="Choose a service and a convenient time at the clinic."
        />
        <div className="booking panel">
          {done ? (
            <div className="success">
              <CheckCircle2 />
              <h2>Request received</h2>
              <p>
                Your request has been sent to Dr. Pranali Dental Clinic. The
                clinic will confirm the appointment.
              </p>
              <button
                className="primary"
                onClick={() => {
                  G(false);
                  P("home");
                }}
              >
                Back to home
              </button>
            </div>
          ) : (
            <>
              <div className="steps">
                <span className={step >= 1 ? "on" : ""}>
                  1 <b>Service</b>
                </span>
                <i />
                <span className={step >= 2 ? "on" : ""}>
                  2 <b>Date & time</b>
                </span>
                <i />
                <span className={step >= 3 ? "on" : ""}>
                  3 <b>Confirm</b>
                </span>
              </div>
              {step === 1 && (
                <>
                  <h2>Select a dental service</h2>
                  <div className="servicegrid">
                    {[
                      [ShieldCheck, "Dental check-up", "Preventive assessment and oral health review"],
                      [Sparkles, "Cleaning & polishing", "Professional cleaning and stain care"],
                      [Activity, "Tooth pain consultation", "Assessment for pain and sensitivity"],
                      [Syringe, "Root canal treatment", "Endodontic care consultation"],
                      [AlignCenter, "Braces & aligners", "Orthodontic treatment options"],
                      [CircleDot, "Dental implants", "Tooth replacement consultation"],
                    ].map(([Icon, x, description]) => (
                      <button
                        key={x}
                        className={service === x ? "service selected" : "service"}
                        onClick={() => V(x)}
                      >
                        <Icon aria-hidden="true" />
                        <b>{x}</b>
                        <small>{description}</small>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {step === 2 && (
                <>
                  <h2>Choose your preferred date and time</h2>
                  <label className="field">
                    Preferred date
                    <input
                      type="date"
                      min={localDateISO()}
                      value={date}
                      onChange={(e) => D(e.target.value)}
                    />
                  </label>
                  <div className="slots">
                    {[
                      "10:00 AM",
                      "11:00 AM",
                      "12:00 PM",
                      "01:00 PM",
                      "05:30 PM",
                      "06:30 PM",
                      "07:30 PM",
                      "08:30 PM",
                    ].map((x) => (
                      <button
                        className={slot === x ? "selected" : ""}
                        onClick={() => H(x)}
                      >
                        {x}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {step === 3 && (
                <>
                  <h2>Review your request</h2>
                  {patientSession?.access_token ? (
                    selectedPatientLink ? (
                      <div className="patient-linked-clinic" role="status">
                        Booking for <b>{selectedPatientLink.patient_name}</b> at <b>{selectedPatientLink.clinic_name}</b>. The request will be attached to this verified clinic record.
                      </div>
                    ) : (
                      <div className="autherror" role="alert">
                        Link your clinic record before booking from your patient account.
                        <button className="link" type="button" onClick={() => P("home")}>Go to home and link a record</button>
                      </div>
                    )
                  ) : (
                    <>
                      <label className="field">
                        Your full name
                        <input
                          value={patientName}
                          onChange={(e) => setPatientName(e.target.value)}
                          required
                          placeholder="Full name"
                        />
                      </label>
                      <label className="field">
                        Mobile number
                        <input
                          value={patientPhone}
                          onChange={(e) => setPatientPhone(e.target.value)}
                          required
                          minLength={7}
                          placeholder="10-digit mobile number"
                        />
                      </label>
                    </>
                  )}
                  <div className="review">
                    <span>Service</span>
                    <b>{service}</b>
                    <span>Date</span>
                    <b>{date}</b>
                    <span>Time</span>
                    <b>{slot}</b>
                    <span>Clinic</span>
                    <b>Dr. Pranali Dental Clinic · Taloja</b>
                  </div>
                </>
              )}
              <div className="bookingfoot">
                {step > 1 && (
                  <button className="outline" onClick={() => Z(step - 1)}>
                    Back
                  </button>
                )}
                <button
                  className="primary"
                  onClick={async () => {
                    if (step === 2 && (!date || !slot || !localDateTimeFromParts(date, slot))) {
                      ping("Choose a valid date and an available clinic time before continuing.");
                      return;
                    }
                    if (step < 3) {
                      Z(step + 1);
                      return;
                    }
                    try {
                      const starts = localDateTimeFromParts(date, slot);
                      if (!starts) {
                        ping("Choose a valid appointment date and time.");
                        return;
                      }
                      if (patientSession?.access_token) {
                        if (!selectedPatientRecordId) {
                          ping("Link your clinic record before booking from your patient account.");
                          return;
                        }
                        await dentalApi.patientRequestAppointment(
                          patientSession.access_token,
                          selectedPatientRecordId,
                          {
                            starts_at: starts.toISOString(),
                            treatment_type: service,
                          },
                        );
                      } else {
                        if (
                          patientName.trim().length < 2 ||
                          patientPhone.trim().length < 7
                        ) {
                          ping("Please enter your name and mobile number.");
                          return;
                        }
                        await dentalApi.publicAppointment({
                          name: patientName.trim(),
                          phone: patientPhone.trim(),
                          starts_at: starts.toISOString(),
                          treatment_type: service,
                        });
                      }
                      G(true);
                    } catch (e) {
                      ping("Booking request failed: " + e.message);
                    }
                  }}
                >
                  {step === 3 ? "Send appointment request" : "Continue"}{" "}
                  <ChevronRight />
                </button>
              </div>
            </>
          )}
        </div>
      </>
    );
  if (page === "appointments")
    return (
      <>
        <Title
          eyebrow="YOUR SCHEDULE"
          title="Appointments"
          desc="All your upcoming and previous clinic visits."
          action="Book appointment"
          M={() => P("booking")}
        />
        <Panel title="Upcoming visits">
          {patientAppointments.length ? (
            patientAppointments.map((a) => (
              <div className="visit">
                <b>
                  {new Date(a.starts_at).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                  })}
                </b>
                <div>
                  <strong>{a.treatment_type}</strong>
                  <p>
                    {new Date(a.starts_at).toLocaleString("en-IN")} · Dr.
                    Pranali
                  </p>
                </div>
                <em>{a.status}</em>
              </div>
            ))
          ) : (
            <div className="empty-state">
              No appointments are linked to this patient account yet.
            </div>
          )}
        </Panel>
      </>
    );
  if (page === "messages")
    return <PatientCommunication mode="patient" session={patientSession} patientId={selectedPatientRecordId} />;
  if (page === "settings")
    return <AccountSettings user={patientSession?.user} activeWorkspace={selectedPatientLink} onSignOut={onSignOut} />;
  if (page === "journey")
    return (
      <>
        <Title
          eyebrow="YOUR DENTAL CARE"
          title="Treatment journey"
          desc="Your clinic-shared treatment plans and recorded dental chart."
        />
        <PatientCareManagement page="journey" session={patientSession} patientId={selectedPatientRecordId} patientChart={patientChart} />
      </>
    );
  if (page === "records" || page === "invoices")
    return (
      <>
        <Title
          eyebrow={page === "records" ? "YOUR HEALTH FILE" : "PAYMENTS"}
          title={page === "records" ? "Records & prescriptions" : "Invoices & payments"}
          desc={page === "records" ? "Your clinic-shared documents, organised in one place." : "Invoices and receipts shared by your clinic."}
        />
        <PatientCareManagement page={page} session={patientSession} patientId={selectedPatientRecordId} patientChart={patientChart} />
      </>
    );
  return (
    <>
      <div className="patienthero">
        <div>
          <div className="eyebrow">YOUR SMILE, YOUR CARE</div>
          <h1>
            Welcome to Oralyn <span>☀</span>
          </h1>
          <p>Your dental care, appointments and clinic updates in one place.</p>
          {selectedPatientLink && <div className="patient-linked-clinic">Linked clinic: <b>{selectedPatientLink.clinic_name}</b> · {selectedPatientLink.patient_name}</div>}
          <button className="primary" onClick={() => P("booking")}>
            <Plus />
            Book an appointment
          </button>
          <button className="outline" onClick={() => P("journey")}>
            View my dental chart <ChevronRight />
          </button>
        </div>
        <div className="heroart">
          <img src="/oralyn-app-icon-approved.webp" alt="Oralyn official app mark" />
          <b>
            Small steps.
            <br />
            Healthier smiles.
          </b>
          <small>Your care journey, all in one place.</small>
        </div>
      </div>
      <div className="sectiontitle">
        <div>
          <h2>Your next visit</h2>
          <p>Stay on top of your dental care.</p>
        </div>
        <button className="link" onClick={() => P("appointments")}>
          All appointments ›
        </button>
      </div>
      <Panel
        title={patientAppointments[0] ? "Your next visit" : "Your next visit"}
        sub={
          patientAppointments[0]
            ? new Date(patientAppointments[0].starts_at).toLocaleString("en-IN")
            : "Your confirmed clinic appointments will appear here."
        }
      >
        <span className="confirmed">
          {patientAppointments[0]
            ? patientAppointments[0].treatment_type +
              " · " +
              patientAppointments[0].status
            : "No appointment linked yet"}
        </span>
      </Panel>
      {!selectedPatientLink && (
        <Panel
          title="Link your clinic record"
          sub="Enter the one-time invite code shared by your clinic."
        >
          <div className="field">
            <input
              value={patientInviteCode}
              onChange={(e) => setPatientInviteCode(e.target.value)}
              placeholder="Clinic invite code"
            />
          </div>
          <button
            className="primary"
            onClick={async () => {
              try {
                await onLinkPatient(patientInviteCode);
                setPatientInviteCode("");
                ping("Your clinic record is now linked.");
              } catch (e) {
                ping(e.message);
              }
            }}
          >
            Link patient record
          </button>
        </Panel>
      )}
      <div className="sectiontitle">
        <div>
          <h2>Your care at a glance</h2>
          <p>Everything you need, right where you need it.</p>
        </div>
      </div>
      <div className="shortcuts">
        {[
          [HeartPulse, "Dental chart", "View your clinic-recorded chart", "journey"],
          [
            FileHeart,
            "Records & prescriptions",
            "View documents shared by your clinic",
            "records",
          ],
          [
            Receipt,
            "Invoices & payments",
            "View invoices and receipts shared by your clinic",
            "invoices",
          ],
        ].map(([Icon, x, y, p]) => (
          <button onClick={() => P(p)}>
            <Icon />
            <b>{x}</b>
            <small>{y}</small>
            <ChevronRight />
          </button>
        ))}
      </div>
    </>
  );
}
const currentPath = window.location.pathname;
const normalizedPath = currentPath.replace(/\/+$/, "") || "/";
const publicPatientPaths = new Set(["/patient/home", "/patient/booking"]);
const isAssistantRoute = /^\/assistant(?:\/|$)/.test(currentPath);
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
createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    {isAssistantRoute ? (
      <AssistantApp />
    ) : redirectPatientRoute ? (
      <main className="redirect-screen" role="status">Opening the public clinic page…</main>
    ) : (
      <App />
    )}
  </ErrorBoundary>,
);
