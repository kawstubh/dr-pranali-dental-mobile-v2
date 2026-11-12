import React, { useEffect, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  CircleUserRound,
  ClipboardList,
  LogOut,
  Plus,
  RefreshCw,
  ShieldCheck,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { resolveApiBase } from "./api.js";
import "./assistant.css";

const API_CONFIG = resolveApiBase(import.meta.env);
const TOKEN_KEY = "oralyn_assistant_token";

async function assistantRequest(path, { token, method = "GET", body } = {}) {
  if (!import.meta.env.DEV && API_CONFIG.error) {
    throw new Error("The clinic API is not configured for this portal deployment.");
  }
  let response;
  try {
    response = await fetch(API_CONFIG.base + path, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new Error("The clinic service could not be reached. Check the connection or staging CORS configuration.");
  }
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const detail = data?.detail;
    const error = new Error(
      (typeof detail === "string" ? detail : detail?.message || detail?.code) ||
      (response.status === 429 ? "Too many sign-in attempts. Please wait and try again." : "The request could not be completed.")
    );
    error.status = response.status;
    error.code = detail?.code;
    throw error;
  }
  return data;
}

function clinicToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type)?.value || "";
  return get("year") + "-" + get("month") + "-" + get("day");
}

function appointmentInstant(date, time) {
  const value = new Date(date + "T" + time + ":00+05:30");
  if (Number.isNaN(value.getTime())) throw new Error("Choose a valid appointment date and time.");
  if (value <= new Date()) throw new Error("Choose a future appointment time in Asia/Kolkata.");
  return value.toISOString();
}

function money(paise) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(paise || 0) / 100);
}

function dateLabel(value) {
  if (!value) return "Not set";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? String(value)
    : new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      }).format(parsed);
}

function ErrorMessage({ children }) {
  return children ? <div className="assistant-alert assistant-alert-error" role="alert">{children}</div> : null;
}

function Notice({ children }) {
  return children ? <div className="assistant-alert assistant-alert-success" role="status">{children}</div> : null;
}

export default function AssistantApp() {
  // The Assistant is a separate role surface, but it must share the same
  // root-scoped Oralyn PWA shell as Doctor and public patient pages.
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return undefined;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => registration.update().catch(() => {}))
      .catch((error) => console.warn("[Oralyn PWA] Assistant service worker registration failed.", error));
    return undefined;
  }, []);
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || "");
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState("appointments");
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [billing, setBilling] = useState(null);
  const [patientForm, setPatientForm] = useState({ name: "", phone: "" });
  const [appointmentForm, setAppointmentForm] = useState({
    patient_id: "",
    date: clinicToday(),
    time: "10:00",
    treatment_type: "Dental check-up",
  });
  const [loginBusy, setLoginBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [booting, setBooting] = useState(Boolean(token));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadData = async (accessToken) => {
    const [patientResult, appointmentResult] = await Promise.all([
      assistantRequest("/v1/dental/assistant/patients", { token: accessToken }),
      assistantRequest("/v1/dental/assistant/appointments", { token: accessToken }),
    ]);
    const nextPatients = Array.isArray(patientResult?.patients) ? patientResult.patients : [];
    const nextAppointments = Array.isArray(appointmentResult?.appointments) ? appointmentResult.appointments : [];
    setPatients(nextPatients);
    setAppointments(nextAppointments);
    setAppointmentForm((current) => ({
      ...current,
      patient_id: current.patient_id || nextPatients[0]?.id || "",
    }));
  };

  useEffect(() => {
    if (!token) {
      setUser(null);
      setBooting(false);
      return undefined;
    }
    let live = true;
    setBooting(true);
    setError("");
    (async () => {
      try {
        const me = await assistantRequest("/v1/dental/auth/assistant/me", { token });
        if (!live) return;
        setUser(me?.user || null);
        await loadData(token);
      } catch (cause) {
        if (!live) return;
        if (cause?.status === 401) {
          sessionStorage.removeItem(TOKEN_KEY);
          setToken("");
          setUser(null);
        }
        setError(cause?.message || "Assistant session could not be verified.");
      } finally {
        if (live) setBooting(false);
      }
    })();
    return () => { live = false; };
  }, [token]);

  useEffect(() => {
    if (!notice) return undefined;
    const handle = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(handle);
  }, [notice]);

  const signIn = async (event) => {
    event.preventDefault();
    setLoginBusy(true);
    setError("");
    try {
      const result = await assistantRequest("/v1/dental/auth/assistant/login", {
        method: "POST",
        body: { email: email.trim(), password },
      });
      if (!result?.access_token || result?.user?.role !== "assistant") {
        throw new Error("The server did not return a valid Clinic Assistant session.");
      }
      sessionStorage.setItem(TOKEN_KEY, result.access_token);
      setPassword("");
      setToken(result.access_token);
      setUser(result.user);
    } catch (cause) {
      setError(cause?.message || "Assistant sign-in failed.");
    } finally {
      setLoginBusy(false);
    }
  };

  const signOut = async () => {
    try {
      if (token) await assistantRequest("/v1/dental/auth/assistant/logout", { token, method: "POST" });
    } catch {}
    sessionStorage.removeItem(TOKEN_KEY);
    setToken("");
    setUser(null);
    setPatients([]);
    setAppointments([]);
    setBilling(null);
    setSelectedPatient("");
    setError("");
    setNotice("");
  };

  const refresh = async () => {
    if (!token) return;
    setBusy(true);
    setError("");
    try {
      await loadData(token);
      setNotice("Reception data refreshed.");
    } catch (cause) {
      if (cause?.status === 401) await signOut();
      setError(cause?.message || "Could not refresh reception data.");
    } finally {
      setBusy(false);
    }
  };

  const addPatient = async (event) => {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    setError("");
    try {
      const patient = await assistantRequest("/v1/dental/assistant/patients", {
        token,
        method: "POST",
        body: { name: patientForm.name.trim(), phone: patientForm.phone.trim() },
      });
      setPatients((current) => [patient, ...current]);
      setPatientForm({ name: "", phone: "" });
      setAppointmentForm((current) => ({ ...current, patient_id: current.patient_id || patient.id }));
      setNotice("Patient contact details added.");
    } catch (cause) {
      setError(cause?.message || "Patient intake could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const addAppointment = async (event) => {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    setError("");
    try {
      const starts_at = appointmentInstant(appointmentForm.date, appointmentForm.time);
      const appointment = await assistantRequest("/v1/dental/assistant/appointments", {
        token,
        method: "POST",
        body: {
          patient_id: appointmentForm.patient_id,
          starts_at,
          treatment_type: appointmentForm.treatment_type,
        },
      });
      setAppointments((current) => [...current, appointment].sort((a, b) => String(a.starts_at).localeCompare(String(b.starts_at))));
      setNotice("Appointment request added to the clinic queue.");
    } catch (cause) {
      setError(cause?.message || "Appointment request could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const changeAppointment = async (appointment, action) => {
    if (!token) return;
    setBusy(true);
    setError("");
    try {
      const next = await assistantRequest(
        "/v1/dental/assistant/appointments/" + encodeURIComponent(appointment.id) + "/" + action,
        { token, method: "POST" }
      );
      setAppointments((current) => current.map((item) => item.id === next.id ? next : item));
      setNotice(action === "confirm" ? "Appointment confirmed." : "Appointment cancelled.");
    } catch (cause) {
      setError(cause?.message || "Appointment status could not be changed.");
    } finally {
      setBusy(false);
    }
  };

  const loadBilling = async (patientId) => {
    setSelectedPatient(patientId);
    setBilling(null);
    setError("");
    if (!patientId || !token) return;
    setBusy(true);
    try {
      const result = await assistantRequest(
        "/v1/dental/assistant/patients/" + encodeURIComponent(patientId) + "/billing",
        { token }
      );
      setBilling(result);
    } catch (cause) {
      setError(cause?.message || "Billing summary could not be loaded.");
    } finally {
      setBusy(false);
    }
  };

  if (booting) {
    return <main className="assistant-shell"><div className="assistant-loading"><img src="/oralyn-logo-approved.webp" alt="Oralyn" /><p>Verifying your Clinic Assistant session…</p></div></main>;
  }

  if (!token || !user) {
    return (
      <main className="assistant-shell assistant-auth-shell">
        <section className="assistant-auth-card">
          <img className="assistant-logo" src="/oralyn-logo-approved.webp" alt="Oralyn official wordmark" />
          <div className="assistant-eyebrow">RECEPTION ACCESS</div>
          <h1>Clinic Assistant</h1>
          <p className="assistant-intro">Sign in to manage patient contact intake and appointment coordination. Clinical records and clinical intelligence remain restricted to Doctors.</p>
          <ErrorMessage>{error}</ErrorMessage>
          <form onSubmit={signIn}>
            <label>Email address<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            <button className="assistant-primary" type="submit" disabled={loginBusy}>{loginBusy ? "Signing in…" : "Sign in securely"}</button>
          </form>
          <div className="assistant-auth-foot"><ShieldCheck size={16} /> Separate staff role · Server-verified clinic access</div>
          <a className="assistant-back" href="/">Back to Doctor sign in</a>
        </section>
      </main>
    );
  }

  const selected = patients.find((patient) => patient.id === selectedPatient);

  return (
    <main className="assistant-shell">
      <header className="assistant-topbar">
        <div className="assistant-brand"><img src="/oralyn-logo-approved.webp" alt="Oralyn" /><span>RECEPTION WORKSPACE</span></div>
        <div className="assistant-user"><div><b>{user.email}</b><small>Clinic Assistant · {user.clinic_id}</small></div><button className="assistant-icon-button" onClick={signOut} aria-label="Sign out"><LogOut size={18} /></button></div>
      </header>
      <div className="assistant-content">
        <div className="assistant-heading">
          <div><div className="assistant-eyebrow">CLINIC OPERATIONS</div><h1>Reception workspace</h1><p>Patient contact intake, appointment queue and billing summaries.</p></div>
          <button className="assistant-secondary" onClick={refresh} disabled={busy}><RefreshCw size={16} /> Refresh</button>
        </div>
        <ErrorMessage>{error}</ErrorMessage>
        <Notice>{notice}</Notice>
        <nav className="assistant-tabs" aria-label="Reception sections">
          <button className={tab === "appointments" ? "active" : ""} onClick={() => setTab("appointments")}><CalendarDays size={17} /> Appointments</button>
          <button className={tab === "patients" ? "active" : ""} onClick={() => setTab("patients")}><Users size={17} /> Patients</button>
          <button className={tab === "billing" ? "active" : ""} onClick={() => setTab("billing")}><Wallet size={17} /> Billing</button>
        </nav>

        {tab === "appointments" && (
          <section className="assistant-grid">
            <div className="assistant-panel">
              <div className="assistant-panel-heading"><div><h2>Appointment queue</h2><p>{appointments.length} appointment{appointments.length === 1 ? "" : "s"} in this clinic</p></div><CalendarDays size={20} /></div>
              {appointments.length ? <div className="assistant-list">{appointments.map((appointment) => (
                <article className="assistant-appointment" key={appointment.id}>
                  <div className="assistant-appointment-main"><b>{appointment.patient_name || "Patient"}</b><span>{appointment.patient_phone}</span><small>{dateLabel(appointment.starts_at)} · {appointment.treatment_type}</small></div>
                  <div className="assistant-appointment-actions"><span className={"assistant-status status-" + String(appointment.status).replace(/[^a-z_]/g, "")}>{String(appointment.status).replaceAll("_", " ")}</span>
                    {appointment.status !== "confirmed" && !["cancelled", "completed", "no_show"].includes(appointment.status) && <button onClick={() => changeAppointment(appointment, "confirm")} disabled={busy}><CheckCircle2 size={15} /> Confirm</button>}
                    {!["cancelled", "completed", "no_show"].includes(appointment.status) && <button className="assistant-danger-button" onClick={() => changeAppointment(appointment, "cancel")} disabled={busy}><XCircle size={15} /> Cancel</button>}
                  </div>
                </article>
              ))}</div> : <div className="assistant-empty"><ClipboardList size={24} /><b>No appointments yet</b><span>New requests will appear here.</span></div>}
            </div>
            <div className="assistant-panel">
              <div className="assistant-panel-heading"><div><h2>Schedule a visit</h2><p>Reception can request and confirm appointments.</p></div><Plus size={20} /></div>
              <form className="assistant-form" onSubmit={addAppointment}>
                <label>Patient<select required value={appointmentForm.patient_id} onChange={(event) => setAppointmentForm((current) => ({ ...current, patient_id: event.target.value }))}><option value="">Choose a patient</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name} · {patient.phone}</option>)}</select></label>
                <div className="assistant-form-row"><label>Preferred date<input type="date" required min={clinicToday()} value={appointmentForm.date} onChange={(event) => setAppointmentForm((current) => ({ ...current, date: event.target.value }))} /></label><label>Time<select required value={appointmentForm.time} onChange={(event) => setAppointmentForm((current) => ({ ...current, time: event.target.value }))}>{["10:00","11:00","12:00","13:00","17:00","18:00","19:00","20:00"].map((time) => <option key={time}>{time}</option>)}</select></label></div>
                <label>Visit type<select value={appointmentForm.treatment_type} onChange={(event) => setAppointmentForm((current) => ({ ...current, treatment_type: event.target.value }))}>{["Dental check-up","Cleaning & polishing","Tooth pain consultation","Root canal treatment","Braces & aligners","Dental implants","Other dental concern"].map((item) => <option key={item}>{item}</option>)}</select></label>
                <button className="assistant-primary" type="submit" disabled={busy || !patients.length}>{busy ? "Saving…" : "Add appointment request"}</button>
                {!patients.length && <small>Add a patient contact before scheduling.</small>}
              </form>
            </div>
          </section>
        )}

        {tab === "patients" && (
          <section className="assistant-grid">
            <div className="assistant-panel">
              <div className="assistant-panel-heading"><div><h2>Patient contacts</h2><p>{patients.length} contact{patients.length === 1 ? "" : "s"} in this clinic</p></div><Users size={20} /></div>
              {patients.length ? <div className="assistant-list">{patients.map((patient) => <article className="assistant-patient" key={patient.id}><span className="assistant-avatar"><CircleUserRound size={19} /></span><div><b>{patient.name}</b><small>{patient.phone}</small></div></article>)}</div> : <div className="assistant-empty"><Users size={24} /><b>No patient contacts</b><span>Add a contact to start reception intake.</span></div>}
            </div>
            <div className="assistant-panel">
              <div className="assistant-panel-heading"><div><h2>New patient intake</h2><p>Only contact details are collected here.</p></div><Plus size={20} /></div>
              <form className="assistant-form" onSubmit={addPatient}>
                <label>Full name<input required maxLength={200} value={patientForm.name} onChange={(event) => setPatientForm((current) => ({ ...current, name: event.target.value }))} /></label>
                <label>Mobile number<input type="tel" required minLength={7} maxLength={40} value={patientForm.phone} onChange={(event) => setPatientForm((current) => ({ ...current, phone: event.target.value }))} /></label>
                <button className="assistant-primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save contact"}</button>
              </form>
            </div>
          </section>
        )}

        {tab === "billing" && (
          <section className="assistant-panel">
            <div className="assistant-panel-heading"><div><h2>Billing lookup</h2><p>Read-only invoice totals and receipt summaries. No payment or invoice changes can be made here.</p></div><Wallet size={20} /></div>
            <label className="assistant-billing-select">Choose patient<select value={selectedPatient} onChange={(event) => loadBilling(event.target.value)}><option value="">Select a patient</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name} · {patient.phone}</option>)}</select></label>
            {selected && billing && (billing.invoices || []).length ? <div className="assistant-billing-list">{billing.invoices.map((invoice) => <article className="assistant-invoice" key={invoice.id}><div className="assistant-invoice-head"><div><b>{invoice.invoice_number}</b><small>{invoice.status} · Due {invoice.due_date || "not set"}</small></div><strong>{money(invoice.total_paise)}</strong></div><div className="assistant-invoice-totals"><span>Paid <b>{money(invoice.paid_paise)}</b></span><span>Balance <b>{money(invoice.balance_paise)}</b></span></div>{(invoice.receipts || []).map((receipt) => <small className="assistant-receipt" key={receipt.receipt_number}>{receipt.receipt_number} · {receipt.method} · {money(receipt.amount_paise)} · {dateLabel(receipt.paid_at)}</small>)}</article>)}</div> : selected && billing ? <div className="assistant-empty"><Wallet size={24} /><b>No invoices found</b><span>There are no billing records for this patient.</span></div> : <div className="assistant-empty"><Wallet size={24} /><b>Select a patient</b><span>Billing summaries are limited to this clinic.</span></div>}
          </section>
        )}
        <footer className="assistant-security-note"><ShieldCheck size={17} /><span>Clinical notes, history, odontograms, treatment plans, prescriptions, private documents and Doctor-only intelligence are not available to this role.</span></footer>
      </div>
    </main>
  );
}


export function AssistantManagement({ token, user }) {
  const allowed = ["owner", "admin"].includes(String(user?.role || "").toLowerCase());
  const [assistants, setAssistants] = useState([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadAssistants = async () => {
    const result = await assistantRequest("/v1/dental/auth/assistants", { token });
    setAssistants(Array.isArray(result?.assistants) ? result.assistants : []);
  };

  useEffect(() => {
    if (!allowed || !token) return undefined;
    let live = true;
    setBusy(true);
    assistantRequest("/v1/dental/auth/assistants", { token })
      .then((result) => {
        if (live) setAssistants(Array.isArray(result?.assistants) ? result.assistants : []);
      })
      .catch((cause) => {
        if (live) setError(cause?.message || "Assistant directory could not be loaded.");
      })
      .finally(() => {
        if (live) setBusy(false);
      });
    return () => { live = false; };
  }, [allowed, token]);

  if (!allowed) return null;

  const createAssistant = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await assistantRequest("/v1/dental/auth/assistants", {
        token,
        method: "POST",
        body: { email: email.trim(), password },
      });
      setEmail("");
      setPassword("");
      await loadAssistants();
      setNotice("Separate Clinic Assistant account created. Share the initial password securely with the staff member.");
    } catch (cause) {
      setError(cause?.message || "Assistant account could not be created.");
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async (assistant) => {
    if (!window.confirm("Deactivate " + assistant.email + " and revoke active sessions?")) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await assistantRequest(
        "/v1/dental/auth/assistants/" + encodeURIComponent(assistant.id) + "/deactivate",
        { token, method: "POST" }
      );
      await loadAssistants();
      setNotice("Assistant access deactivated and sessions revoked.");
    } catch (cause) {
      setError(cause?.message || "Assistant access could not be deactivated.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="assistant-panel assistant-management-panel">
      <div className="assistant-panel-heading">
        <div><h2>Clinic assistants</h2><p>Create and revoke separate reception accounts for this clinic. Assistant access never inherits Doctor permissions.</p></div>
        <Users size={20} />
      </div>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {notice && <Notice>{notice}</Notice>}
      <form className="assistant-management-form" onSubmit={createAssistant}>
        <label>Assistant email<input type="email" required pattern="[^@\s]+@[^@\s]+\.[^@\s]+" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Initial password<input type="password" required minLength={12} maxLength={256} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /><small>At least 12 characters. The password is not displayed again after account creation.</small></label>
        <button className="assistant-primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Create Clinic Assistant"}</button>
      </form>
      <div className="assistant-management-list">
        {assistants.length ? assistants.map((assistant) => (
          <article key={assistant.id} className="assistant-management-row">
            <div><b>{assistant.email}</b><small>{assistant.active ? "Active · Assistant role" : "Inactive · Assistant role"}</small></div>
            {assistant.active && <button type="button" className="assistant-danger-button" onClick={() => deactivate(assistant)} disabled={busy}>Deactivate</button>}
          </article>
        )) : <div className="assistant-empty"><Users size={22} /><b>No Clinic Assistants</b><span>Create a separate reception account when the clinic is ready.</span></div>}
      </div>
      <div className="assistant-security-note"><ShieldCheck size={17} /><span>Assistant access is limited to contact intake, appointment coordination and read-only billing summaries. Clinical notes, AI, prescriptions, private documents and owner settings remain Doctor-only.</span></div>
    </section>
  );
}
