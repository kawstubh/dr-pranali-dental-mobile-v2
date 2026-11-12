import React, { useEffect, useState } from "react";
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
  X,
} from "lucide-react";
import "./styles.css";
import { dentalApi } from "./api.js";
import { supabase } from "./supabase.js";
import ErrorBoundary from "./ErrorBoundary.jsx";
import { normaliseList, normaliseUser, localDateISO, localDateTimeFromParts, formatTime, isSameLocalDay } from "./data.js";
function App() {
  const [role, R] = useState(
      location.pathname.startsWith("/patient") ? "patient" : "doctor",
    ),
    [page, P] = useState(
      location.pathname.split("/").filter(Boolean)[1] ||
        (location.pathname.startsWith("/patient") ? "home" : "dashboard"),
    ),
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
    [patientName, setPatientName] = useState(""),
    [patientPhone, setPatientPhone] = useState(""),
    [patientSession, setPatientSession] = useState(null),
    [patientBoot, setPatientBoot] = useState(true),
    [patientError, setPatientError] = useState(""),
    [patientAppointments, setPatientAppointments] = useState([]),
    [patientChart, setPatientChart] = useState([]),
    [patientInviteCode, setPatientInviteCode] = useState("");
  useEffect(() => {
    let live = true;
    if (!token) {
      setUser(null);
      setPatients([]);
      setAppointments([]);
      setWorkspaces([]);
      setWorkspaceError("");
      setDataError("");
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
        const results = await Promise.allSettled([
          dentalApi.patients(token),
          dentalApi.appointments(token),
          dentalApi.workspaces(token),
        ]);
        if (!live) return;
        const [patientResult, appointmentResult, workspaceResult] = results;
        setPatients(patientResult.status === "fulfilled" ? normaliseList(patientResult.value, ["patients"]) : []);
        setAppointments(appointmentResult.status === "fulfilled" ? normaliseList(appointmentResult.value, ["appointments"]) : []);
        setWorkspaces(workspaceResult.status === "fulfilled" ? normaliseList(workspaceResult.value, ["workspaces"]) : []);
        setWorkspaceError(workspaceResult.status === "rejected" ? "Your authorised workspace list could not be refreshed." : "");
        setDataError(results.some((result) => result.status === "rejected")
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
    if (!supabase) {
      setPatientBoot(false);
      setPatientError("Patient sign-in is not configured.");
      return;
    }
    let live = true;
    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!live) return;
        if (error) setPatientError(error.message);
        setPatientSession(data?.session || null);
      })
      .catch((error) => {
        if (live) setPatientError(error?.message || "Unable to verify the patient session.");
      })
      .finally(() => {
        if (live) setPatientBoot(false);
      });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (live) {
        setPatientSession(session);
        setPatientBoot(false);
      }
    });
    return () => {
      live = false;
      subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (role !== "patient" || !patientSession) return;
    let live = true;
    Promise.all([
      dentalApi.patientAppointments(patientSession.access_token),
      dentalApi.patientChart(patientSession.access_token),
    ])
      .then(([a, c]) => {
        if (!live) return;
        setPatientAppointments(normaliseList(a, ["appointments"]));
        setPatientChart(normaliseList(c, ["chart", "entries", "records"]));
        setPatientError("");
      })
      .catch((e) => {
        if (live) setPatientError(e.message);
      });
    return () => {
      live = false;
    };
  }, [role, patientSession]);
  const patientAccess = async ({ mode, email, password, inviteCode }) => {
    if (!supabase) throw new Error("Patient sign-in is not configured.");
    const result =
      mode === "signup"
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });
    if (result.error) throw result.error;
    if (result.data.session && inviteCode.trim())
      await dentalApi.patientLink(
        result.data.session.access_token,
        inviteCode.trim(),
      );
    if (!result.data.session && mode === "signup")
      setPatientError(
        "Check your email to confirm your patient account, then sign in.",
      );
  };
  const patientSignOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setPatientAppointments([]);
    setPatientChart([]);
    setPatientError("");
    P("home");
  };
  const linkPatient = async (code) => {
    if (!patientSession) throw new Error("Sign in first.");
    await dentalApi.patientLink(patientSession.access_token, code.trim());
    const [a, c] = await Promise.all([
      dentalApi.patientAppointments(patientSession.access_token),
      dentalApi.patientChart(patientSession.access_token),
    ]);
    setPatientAppointments(normaliseList(a, ["appointments"]));
    setPatientChart(normaliseList(c, ["chart", "entries", "records"]));
    setPatientError("");
  };
  const refreshDoctorData = async () => {
    if (!token) return;
    const results = await Promise.allSettled([
      dentalApi.patients(token),
      dentalApi.appointments(token),
      dentalApi.workspaces(token),
    ]);
    const [patientResult, appointmentResult, workspaceResult] = results;
    setPatients(patientResult.status === "fulfilled" ? normaliseList(patientResult.value, ["patients"]) : []);
    setAppointments(appointmentResult.status === "fulfilled" ? normaliseList(appointmentResult.value, ["appointments"]) : []);
    setWorkspaces(workspaceResult.status === "fulfilled" ? normaliseList(workspaceResult.value, ["workspaces"]) : []);
    setWorkspaceError(workspaceResult.status === "rejected" ? "Your authorised workspace list could not be refreshed." : "");
    setDataError(results.some((result) => result.status === "rejected")
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
      localStorage.setItem("oralyn_doctor_token", accessToken);
      setToken(accessToken);
      setUser(sessionUser);
      setWorkspaces(normaliseList(session, ["workspaces"]));
      setWorkspaceError("");
      setDataError("");
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
    R("doctor");
    P("dashboard");
  };
  if (
    role === "patient" &&
    page !== "booking" &&
    (!patientSession || patientBoot)
  )
    return (
      <PatientAccessScreen
        loading={patientBoot}
        error={patientError}
        onAccess={patientAccess}
        onBooking={() => P("booking")}
        onDoctor={() => {
          R("doctor");
          P("dashboard");
        }}
      />
    );
  if (role === "doctor" && (!user || booting))
    return (
      <LoginScreen
        loading={booting}
        error={authError}
        onPatient={() => {
          R("patient");
          P("home");
          setAuthError("");
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
        ["appointments", "Appointments", CalendarDays],
      ],
    ],
    [
      "Practice",
      [
        ["treatments", "Treatment plans", HeartPulse],
        ["billing", "Billing & invoices", Wallet],
        ["reports", "Reports & analytics", BarChart3],
      ],
    ],
    [
      "Administration",
      [["workspaces", "Workspaces", Building2]],
    ],
  ];
  const patientNav = [
    [
      "My care",
      [
        ["home", "Home", LayoutDashboard],
        ["appointments", "Appointments", CalendarDays],
        ["journey", "Treatment journey", Activity],
        ["records", "Records & prescriptions", FileHeart],
        ["invoices", "Invoices & payments", Receipt],
      ],
    ],
  ];
  const nav = role === "doctor" ? doctorNav : patientNav;
  return (
    <div className="shell">
      <aside className={mobile ? "sidebar open" : "sidebar"}>
        <div className="brand"><img src="/oralyn-logo-approved.webp" alt="Oralyn official wordmark" /><button className="close" onClick={() => B(false)}>
            <X />
          </button>
        </div>
        <div className="workspace">
          {role === "doctor" ? (activeWorkspace?.name || "CLINIC WORKSPACE").toUpperCase() : "PATIENT PORTAL"}
        </div>
        {nav.map(([group, items]) => (
          <section className="navgroup">
            <label>{group}</label>
            {items.map(([id, name, Icon]) => (
              <button
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
          <button
            className="nav"
            onClick={() => ping("Settings are part of the connected account.")}
          >
            <Settings size={18} />
            Settings
          </button>
          <div className="user">
            <span>{role === "doctor" ? "DP" : "G"}</span>
            <div>
              <b>
                {role === "doctor"
                  ? "Dr. Pranali"
                  : patientSession?.user?.email || "Patient guest"}
              </b>
              <small>
                {role === "doctor"
                  ? "Clinic administrator"
                  : patientSession
                    ? "Verified patient"
                    : "Guest access"}
              </small>
            </div>
            <MoreHorizontal />
          </div>
        </div>
      </aside>
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
                {workspaces.map((workspace) => <option key={workspace.id || workspace.clinic_id} value={workspace.id || workspace.clinic_id}>{workspace.name} | {workspace.role}</option>)}
              </select>
            ) : <span className={activeWorkspace ? "workspace-chip" : "workspace-chip missing"}>{activeWorkspace?.name || "No active workspace"}</span>)}
            <button
              className="bell"
              onClick={() => ping("You’re all caught up.")}
            >
              <Bell />
              <i />
            </button>
            <span className="userpic">{role === "doctor" ? "DP" : "G"}</span>
            <select
              value={role}
              onChange={(e) => {
                R(e.target.value);
                P(e.target.value === "doctor" ? "dashboard" : "home");
              }}
            >
              <option value="doctor">Doctor</option>
              <option value="patient">Patient</option>
            </select>
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
              token={token}
              user={user}
              refresh={refreshDoctorData}
              workspaces={workspaces}
              activeWorkspace={activeWorkspace}
              workspaceError={workspaceError}
              onSwitchWorkspace={switchWorkspace}
              onRefreshWorkspaces={refreshDoctorData}
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
              patientAppointments={patientAppointments}
              patientChart={patientChart}
              patientInviteCode={patientInviteCode}
              setPatientInviteCode={setPatientInviteCode}
              onLinkPatient={linkPatient}
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
function LoginScreen({ loading, error, onLogin, onPatient }) {
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
function PatientAccessScreen({
  loading,
  error,
  onAccess,
  onBooking,
  onDoctor,
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [mode, setMode] = useState("signin");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <div className="authscreen">
      <div className="authcard">
        <div className="authbrand"><img src="/oralyn-logo-approved.webp" alt="Oralyn official wordmark" /></div>
        <div className="eyebrow">PATIENT PORTAL</div>
        <h1>
          {mode === "signin" ? "Welcome back" : "Create your patient account"}
        </h1>
        <p>Sign in securely to view your clinic appointments and care information.</p>
        {(error || message) && (
          <div className="autherror">{error || message}</div>
        )}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMessage("");
            try {
              await onAccess({ mode, email, password, inviteCode });
            } catch (err) {
              setMessage(err.message);
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
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label>
            Clinic invite code{" "}
            <small>(optional if your account is already linked)</small>
            <input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Enter code from your clinic"
            />
          </label>
          <button className="primary wide" disabled={busy || loading}>
            {busy || loading
              ? "Connecting securely…"
              : mode === "signin"
                ? "Sign in to patient portal"
                : "Create patient account"}
          </button>
        </form>
        <button
          className="patientlink"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin"
            ? "New here? Create an account"
            : "Already registered? Sign in"}
        </button>
        <button className="patientlink" onClick={onBooking}>
          Book an appointment without signing in
        </button>
        <button className="patientlink" onClick={onDoctor}>
          Clinic staff sign in
        </button>
        <small className="authfoot">
          Patient data is visible only after your clinic account is linked.
        </small>
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
  token,
  user,
  refresh,
  workspaces,
  activeWorkspace,
  workspaceError,
  onSwitchWorkspace,
  onRefreshWorkspaces,
}) {
  const [selectedPatientId, setSelectedPatientId] = useState("");
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
                setAiResult(JSON.stringify(r.result || r, null, 2));
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
          {aiResult && <pre className="airesult">{aiResult}</pre>}
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
                    <td>
                      <button className="link" onClick={() => { setSelectedPatientId(String(p[2])); P("clinical"); }}>
                        Open ›
                      </button>
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
          desc="Keep the day moving with a clear view of the clinic schedule."
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
          <span className="muted">All scheduled visits</span>
        </div>
        <div className="schedule">
          {appts.length ? appts.map((a) => (
            <div className="schedrow">
              <time>{a[0]}</time>
              <div className={"schedcard " + a[4]}>
                <div>
                  <b>{a[1]}</b>
                  <p>{a[2]}</p>
                </div>
                <span>{a[3]}</span>
              </div>
            </div>
          )) : <div className="empty-state">No appointments are available for this clinic account yet.</div>}
        </div>
      </>
    );
  if (page === "treatments")
    return (
      <>
        <Title
          eyebrow="PRACTICE MANAGEMENT"
          title="Treatment plans"
          desc="Clinician-authored care plans and progress."
        />
        <Panel title="Treatment plans">
          <div className="empty-state">
            The current staging API does not yet expose persistent
            treatment-plan records. No sample treatment plans are shown.
          </div>
          <button className="outline" onClick={() => P("clinical")}>
            Open clinical workspace
          </button>
        </Panel>
      </>
    );
  if (page === "notes")
    return (
      <>
        <Title eyebrow="CLINICAL DOCUMENTATION" title="Clinical notes" desc="Verified notes attached to the selected patient record." />
        <Panel title="Clinical notes"><div className="empty-state">The current staging API does not yet expose persistent clinical-note records. No sample notes are shown.</div></Panel>
      </>
    );
  if (page === "files")
    return (
      <>
        <Title eyebrow="PATIENT DOCUMENTS" title="Clinical files" desc="Private radiographs and documents for the selected patient." />
        <Panel title="Private documents"><div className="empty-state">Secure private document storage is not yet connected. No local or public file links are shown.</div></Panel>
      </>
    );
  if (page === "billing")
    return (
      <>
        <Title
          eyebrow="PRACTICE MANAGEMENT"
          title="Billing & invoices"
          desc="Patient invoices, receipts and payment status."
        />
        <Panel title="Patient invoices">
          <div className="empty-state">
            The current staging API does not yet expose patient invoice and
            receipt records. No financial totals are fabricated.
          </div>
        </Panel>
      </>
    );
  if (page === "reports")
    return (
      <>
        <Title
          eyebrow="PRACTICE MANAGEMENT"
          title="Reports & analytics"
          desc="Live clinic activity from connected records."
        />
        <div className="metricgrid three">
          <Metric
            Icon={Users}
            label="Patients loaded"
            value={patients.length}
            detail="Live clinic directory"
          />
          <Metric
            Icon={CalendarDays}
            label="Appointments loaded"
            value={appointments.length}
            detail="Live clinic schedule"
          />
          <Metric
            Icon={Wallet}
            label="Financial reports"
            value="—"
            detail="Invoice API pending"
          />
        </div>
        <Panel title="Reporting status">
          <div className="empty-state">
            Analytics will populate when treatment-plan and invoice services are
            available.
          </div>
        </Panel>
      </>
    );
  return (
    <>
      <div className="welcome">
        <div>
          <div className="eyebrow">{todayLabel}</div>
          <h1>
            {greeting}, Dr. Pranali <span>✦</span>
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
          value="—"
          detail="Treatment-plan API pending"
        />
        <Metric
          Icon={Users}
          label="Pending requests"
          value={appointments.filter((a) => a.status === "requested").length}
          detail="Awaiting clinic confirmation"
        />
        <Metric
          Icon={Wallet}
          label="Today's collection"
          value="—"
          detail="Invoice API pending"
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
        <Panel title="Practice snapshot" sub="Monthly performance">
          <div className="empty-state">Live financial reporting is not yet available from the staging API. No collection chart or totals are fabricated.</div>
          <div className="listrow">
            Patients in clinic <b>{patients.length}</b>
          </div>
          <div className="listrow">
            Appointments loaded <b>{appointments.length}</b>
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
        <Panel title="Cross-workspace membership" sub="Assign an existing doctor to another workspace in this same organisation.">
          {canManage ? <form className="workspace-form" onSubmit={assignMembership}>
            <label>Doctor ID<input value={doctorId} onChange={(event) => setDoctorId(event.target.value)} required maxLength={64} placeholder="Paste the doctor ID" /></label>
            <label>Destination workspace<select value={targetWorkspace} onChange={(event) => setTargetWorkspace(event.target.value)} disabled={!targets.length}><option value="">Select workspace</option>{targets.map((item) => <option key={item.id || item.clinic_id} value={item.id || item.clinic_id}>{item.name}</option>)}</select></label>
            <label>Membership role<select value={membershipRole} onChange={(event) => setMembershipRole(event.target.value)}><option value="doctor">Doctor</option><option value="dentist">Dentist</option><option value="admin">Administrator</option>{role === "owner" && <option value="owner">Owner</option>}</select></label>
            <button className="primary" disabled={busy || !targets.length}>Assign membership</button>
            {!targets.length && <small className="form-note">Create another workspace before assigning cross-workspace membership.</small>}
          </form> : <div className="empty-state">Cross-workspace membership is restricted to an owner or administrator.</div>}
        </Panel>
      </div>
      <Panel title="Doctor account provisioning" sub="Doctor accounts are created in the owner/admin Doctor app flow. Use the returned doctor ID in the membership form above to grant access to another workspace." />
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
  patientAppointments,
  patientChart,
  patientInviteCode,
  setPatientInviteCode,
  onLinkPatient,
}) {
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
                      if (
                        patientName.trim().length < 2 ||
                        patientPhone.trim().length < 7
                      ) {
                        ping("Please enter your name and mobile number.");
                        return;
                      }
                      const starts = localDateTimeFromParts(date, slot);
                      if (!starts) {
                        ping("Choose a valid appointment date and time.");
                        return;
                      }
                      await dentalApi.publicAppointment({
                        name: patientName.trim(),
                        phone: patientPhone.trim(),
                        starts_at: starts.toISOString(),
                        treatment_type: service,
                      });
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
  if (page === "journey")
    return (
      <>
        <Title
          eyebrow="YOUR DENTAL CARE"
          title="Treatment journey"
          desc="Your clinic-recorded dental chart. Treatment plans are not yet connected in this staging build."
        />
        <div className="journey">
          <Panel title="Recorded dental chart">
            {patientChart.length ? (
              patientChart.map((t) => (
                <div className="listrow">
                  Tooth {t.tooth_fdi}
                  <b>{t.status}</b>
                </div>
              ))
            ) : (
              <div className="empty-state">
                No chart entries have been shared with this patient account yet.
              </div>
            )}
          </Panel>
        </div>
      </>
    );
  if (page === "records" || page === "invoices")
    return (
      <>
        <Title
          eyebrow={page === "records" ? "YOUR HEALTH FILE" : "PAYMENTS"}
          title={
            page === "records"
              ? "Records & prescriptions"
              : "Invoices & payments"
          }
          desc={
            page === "records"
              ? "Your clinic-shared documents, organised in one place."
              : "Keep track of clinic payments and receipts."
          }
        />
        <Panel
          title={page === "records" ? "Available documents" : "Recent invoices"}
        >
          {(page === "records" ? [] : []).length === 0 ? (
            <div className="empty-state">
              Private document storage and invoice/receipt APIs are not connected in this staging build. No patient files, balances, totals or payment statuses are fabricated.
            </div>
          ) : (
            (page === "records" ? [] : []).map((x) => (
              <div className="listrow">
                {x}
                <button
                  className="link"
                  onClick={() =>
                    ping(
                      "No patient documents are available from the current API.",
                    )
                  }
                >
                  View / download
                </button>
              </div>
            ))
          )}
        </Panel>
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
      {!patientAppointments.length && !patientChart.length && (
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
            "Secure documents not yet connected",
            "records",
          ],
          [
            Receipt,
            "Invoices & payments",
            "Billing service not yet connected",
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
createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
