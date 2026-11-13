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
  return data && Object.prototype.hasOwnProperty.call(data, "result") ? data.result : data;
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

function appointmentParts(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { date: clinicToday(), time: "" };
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(parsed);
  const timeParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(parsed);
  const get = (parts, type) => parts.find((part) => part.type === type)?.value || "";
  return {
    date: [get(dateParts, "year"), get(dateParts, "month"), get(dateParts, "day")].join("-"),
    time: [get(timeParts, "hour"), get(timeParts, "minute")].join(":"),
  };
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

function newIdempotencyKey() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  if (!window.crypto?.getRandomValues) throw new Error("Secure payment request keys are unavailable in this browser.");
  const bytes = new Uint8Array(24);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
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
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState("appointments");
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [billing, setBilling] = useState([]);
  const [receiptDrafts, setReceiptDrafts] = useState({});
  const [rescheduleDrafts, setRescheduleDrafts] = useState({});
  const [patientForm, setPatientForm] = useState({ name: "", phone: "" });
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
    const nextPatients = Array.isArray(patientResult) ? patientResult : [];
    const nextAppointments = Array.isArray(appointmentResult) ? appointmentResult : [];
    return { patients: nextPatients, appointments: nextAppointments };
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
        const me = await assistantRequest("/v1/dental/assistant/me", { token });
        if (!live) return;
        setUser(me?.user || null);
        const loaded = await loadData(token);
        if (!live) return;
        setPatients(loaded.patients);
        setAppointments(loaded.appointments);
      } catch (cause) {
        if (!live) return;
        if (cause?.status === 401) {
          setToken("");
          setUser(null);
          setPatients([]);
          setAppointments([]);
          setBilling([]);
          setReceiptDrafts({});
          setRescheduleDrafts({});
        }
        setError(cause?.message || "Assistant session could not be verified.");
      } finally {
        if (live) setBooting(false);
      }
    })();
    return () => { live = false; };
  }, [token]);

  useEffect(() => {
    if (!token || tab !== "billing") return undefined;
    let live = true;
    setBusy(true);
    setError("");
    loadBilling(token)
      .then((rows) => {
        if (live) setBilling(rows);
      })
      .catch((cause) => {
        if (!live) return;
        if (cause?.status === 401) {
          setToken("");
          setUser(null);
          setPatients([]);
          setAppointments([]);
          setBilling([]);
          setReceiptDrafts({});
          setRescheduleDrafts({});
        }
        setError(cause?.message || "Billing summaries could not be loaded.");
      })
      .finally(() => {
        if (live) setBusy(false);
      });
    return () => { live = false; };
  }, [token, tab]);

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
      const result = await assistantRequest("/v1/dental/assistant/auth/login", {
        method: "POST",
        body: { email: email.trim(), password },
      });
      if (!result?.access_token || result?.user?.role !== "assistant") {
        throw new Error("The server did not return a valid Clinic Assistant session.");
      }
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
      if (token) await assistantRequest("/v1/dental/assistant/auth/logout", { token, method: "POST" });
    } catch {}
    setToken("");
    setUser(null);
    setPatients([]);
    setAppointments([]);
    setBilling([]);
    setReceiptDrafts({});
    setRescheduleDrafts({});
    setError("");
    setNotice("");
  };

  const refresh = async () => {
    if (!token) return;
    setBusy(true);
    setError("");
    try {
      const loaded = await loadData(token);
      setPatients(loaded.patients);
      setAppointments(loaded.appointments);
      if (tab === "billing") setBilling(await loadBilling(token));
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
      setNotice("Patient contact details added.");
    } catch (cause) {
      setError(cause?.message || "Patient intake could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const changeAppointment = async (appointment, action, startsAt = null) => {
    if (!token || busy) return;
    setBusy(true);
    setError("");
    const body = action === "reschedule"
      ? { status: "rescheduled", starts_at: startsAt }
      : { status: action === "confirm" ? "confirmed" : "cancelled" };
    try {
      const next = await assistantRequest(
        "/v1/dental/assistant/appointments/" + encodeURIComponent(appointment.id),
        { token, method: "PATCH", body }
      );
      setAppointments((current) => current.map((item) => item.id === appointment.id ? { ...item, ...next } : item));
      setRescheduleDrafts((current) => {
        const updated = { ...current };
        delete updated[appointment.id];
        return updated;
      });
      setNotice(
        action === "confirm"
          ? "Appointment confirmed."
          : action === "cancel"
            ? "Appointment cancelled."
            : "Appointment rescheduled to " + dateLabel(next?.starts_at || startsAt) + "."
      );
    } catch (cause) {
      setError(cause?.message || "Appointment status could not be changed.");
    } finally {
      setBusy(false);
    }
  };

  const openReschedule = (appointment) => {
    setRescheduleDrafts((current) => ({
      ...current,
      [appointment.id]: { open: true, ...appointmentParts(appointment.starts_at) },
    }));
    setError("");
  };

  const saveReschedule = (event, appointment) => {
    event.preventDefault();
    const draft = rescheduleDrafts[appointment.id];
    if (!draft || busy) return;
    try {
      const startsAt = appointmentInstant(draft.date, draft.time);
      void changeAppointment(appointment, "reschedule", startsAt);
    } catch (cause) {
      setError(cause?.message || "Choose a valid future appointment time.");
    }
  };

  const loadBilling = async (accessToken = token) => {
    const result = await assistantRequest("/v1/dental/assistant/billing/invoices", { token: accessToken });
    return Array.isArray(result) ? result : [];
  };

  const startReceiptDraft = (invoice) => {
    try {
      setReceiptDrafts((current) => ({
        ...current,
        [invoice.id]: { open: true, amount: "", method: "cash", reference: "", idempotencyKey: newIdempotencyKey() },
      }));
      setError("");
    } catch (cause) {
      setError(cause?.message || "A secure payment request key could not be created.");
    }
  };

  const recordPayment = async (event, invoice) => {
    event.preventDefault();
    const draft = receiptDrafts[invoice.id];
    if (!draft || !token) return;
    const amountPaise = Math.round(Number(draft.amount) * 100);
    if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
      setError("Enter a valid amount already received.");
      return;
    }
    if (amountPaise > Number(invoice.balance_paise || 0)) {
      setError("The amount cannot exceed the outstanding invoice balance.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const receipt = await assistantRequest(
        "/v1/dental/assistant/billing/invoices/" + encodeURIComponent(invoice.id) + "/receipts",
        {
          token,
          method: "POST",
          body: {
            amount_paise: amountPaise,
            method: draft.method,
            reference: draft.reference.trim(),
            idempotency_key: draft.idempotencyKey,
          },
        }
      );
      const nextPaid = Number(invoice.paid_paise || 0) + amountPaise;
      const nextBalance = Math.max(0, Number(invoice.total_paise || 0) - nextPaid);
      setBilling((current) => current.map((item) => item.id === invoice.id
        ? { ...item, paid_paise: nextPaid, balance_paise: nextBalance, status: nextBalance === 0 ? "paid" : "partially_paid" }
        : item
      ));
      setReceiptDrafts((current) => {
        const next = { ...current };
        delete next[invoice.id];
        return next;
      });
      setNotice("Payment recorded. Receipt " + (receipt?.receipt_number || "saved") + ". This does not charge the patient.");
    } catch (cause) {
      // Keep the same idempotency key after a network error so a retry cannot
      // record the same already-received payment twice.
      setError(cause?.message || "The received payment could not be recorded.");
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
          <section className="assistant-panel">
            <div className="assistant-panel-heading"><div><h2>Appointment queue</h2><p>{appointments.length} active appointment{appointments.length === 1 ? "" : "s"} in this clinic. New public requests appear here for reception confirmation.</p></div><CalendarDays size={20} /></div>
            {appointments.length ? <div className="assistant-list">{appointments.map((appointment) => (
              <article className="assistant-appointment" key={appointment.id}>
                <div className="assistant-appointment-main"><b>{appointment.patient_name || "Patient"}</b><span>{appointment.patient_phone}</span><small>{dateLabel(appointment.starts_at)} · Appointment</small></div>
                <div className="assistant-appointment-actions">
                  <span className={"assistant-status status-" + String(appointment.status).replace(/[^a-z_]/g, "")}>{String(appointment.status).replaceAll("_", " ")}</span>
                  {appointment.status !== "confirmed" && !["cancelled", "completed", "no_show"].includes(appointment.status) && <button type="button" onClick={() => changeAppointment(appointment, "confirm")} disabled={busy}><CheckCircle2 size={15} /> Confirm</button>}
                  {!["cancelled", "completed", "no_show"].includes(appointment.status) && <button type="button" onClick={() => openReschedule(appointment)} disabled={busy}><CalendarDays size={15} /> Reschedule</button>}
                  {!["cancelled", "completed", "no_show"].includes(appointment.status) && <button type="button" className="assistant-danger-button" onClick={() => changeAppointment(appointment, "cancel")} disabled={busy}><XCircle size={15} /> Cancel</button>}
                </div>
                {rescheduleDrafts[appointment.id]?.open && (
                  <form className="assistant-reschedule-form" onSubmit={(event) => saveReschedule(event, appointment)}>
                    <div className="assistant-form-row">
                      <label>New date (India Standard Time)
                        <input
                          type="date"
                          min={clinicToday()}
                          required
                          value={rescheduleDrafts[appointment.id].date}
                          onChange={(event) => setRescheduleDrafts((current) => ({
                            ...current,
                            [appointment.id]: { ...current[appointment.id], date: event.target.value },
                          }))}
                        />
                      </label>
                      <label>New time (India Standard Time)
                        <input
                          type="time"
                          required
                          value={rescheduleDrafts[appointment.id].time}
                          onChange={(event) => setRescheduleDrafts((current) => ({
                            ...current,
                            [appointment.id]: { ...current[appointment.id], time: event.target.value },
                          }))}
                        />
                      </label>
                    </div>
                    <small>Only future times are accepted. The clinic stores appointment times with the Asia/Kolkata timezone.</small>
                    <div className="assistant-reschedule-actions">
                      <button className="assistant-primary" type="submit" disabled={busy}>Save new time</button>
                      <button className="assistant-secondary" type="button" disabled={busy} onClick={() => setRescheduleDrafts((current) => {
                        const updated = { ...current };
                        delete updated[appointment.id];
                        return updated;
                      })}>Keep current time</button>
                    </div>
                  </form>
                )}
              </article>
            ))}</div> : <div className="assistant-empty"><ClipboardList size={24} /><b>No appointments yet</b><span>New public requests will appear here after submission.</span></div>}
          </section>
        )}

        {tab === "patients" && (
          <section className="assistant-grid">
            <div className="assistant-panel">
              <div className="assistant-panel-heading"><div><h2>Patient contacts</h2><p>{patients.length} contact{patients.length === 1 ? "" : "s"} in this clinic</p></div><Users size={20} /></div>
              {patients.length ? <div className="assistant-list">{patients.map((patient) => <article className="assistant-patient" key={patient.phone || patient.name}><span className="assistant-avatar"><CircleUserRound size={19} /></span><div><b>{patient.name}</b><small>{patient.phone}</small></div></article>)}</div> : <div className="assistant-empty"><Users size={24} /><b>No patient contacts</b><span>Add a contact to start reception intake.</span></div>}
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
            <div className="assistant-panel-heading"><div><h2>Billing administration</h2><p>Review issued invoice balances and record payments already received. This does not charge a patient or create, issue or alter invoices.</p></div><Wallet size={20} /></div>
            {Array.isArray(billing) && billing.length ? <div className="assistant-billing-list">{billing.map((invoice) => {
              const draft = receiptDrafts[invoice.id];
              return (
                <article className="assistant-invoice" key={invoice.id}>
                  <div className="assistant-invoice-head"><div><b>{invoice.invoice_number}</b><small>{invoice.patient_name} · {invoice.status} · Due {invoice.due_date || "not set"}</small></div><strong>{money(invoice.total_paise)}</strong></div>
                  <div className="assistant-invoice-totals"><span>Paid <b>{money(invoice.paid_paise)}</b></span><span>Balance <b>{money(invoice.balance_paise)}</b></span></div>
                  {Number(invoice.balance_paise || 0) > 0 && ["issued", "partially_paid", "overdue"].includes(invoice.status) && (
                    draft?.open ? (
                      <form className="assistant-receipt-form" onSubmit={(event) => recordPayment(event, invoice)}>
                        <label>Amount received (₹)<input type="number" min="0.01" max={(Number(invoice.balance_paise) / 100).toFixed(2)} step="0.01" required value={draft.amount} onChange={(event) => setReceiptDrafts((current) => ({ ...current, [invoice.id]: { ...draft, amount: event.target.value } }))} /></label>
                        <label>Payment method<select value={draft.method} onChange={(event) => setReceiptDrafts((current) => ({ ...current, [invoice.id]: { ...draft, method: event.target.value } }))}><option value="cash">Cash</option><option value="upi">UPI</option><option value="bank_transfer">Bank transfer</option><option value="other">Other</option></select></label>
                        <label>Reference (optional)<input maxLength={128} value={draft.reference} onChange={(event) => setReceiptDrafts((current) => ({ ...current, [invoice.id]: { ...draft, reference: event.target.value } }))} /></label>
                        <div className="assistant-receipt-actions"><button className="assistant-primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Record received payment"}</button><button className="assistant-secondary" type="button" onClick={() => setReceiptDrafts((current) => { const next = { ...current }; delete next[invoice.id]; return next; })} disabled={busy}>Cancel</button></div>
                        <small>Only record money the clinic has already received. The secure request key makes retries idempotent.</small>
                      </form>
                    ) : <button className="assistant-secondary assistant-record-payment" onClick={() => startReceiptDraft(invoice)} disabled={busy}>Record payment received</button>
                  )}
                </article>
              );
            })}</div> : <div className="assistant-empty"><Wallet size={24} /><b>No issued invoices</b><span>Issued invoice balances for this clinic will appear here.</span></div>}
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
    const result = await assistantRequest("/v1/dental/clinic-assistants", { token });
    setAssistants(Array.isArray(result) ? result : []);
  };

  useEffect(() => {
    if (!allowed || !token) return undefined;
    let live = true;
    setBusy(true);
    assistantRequest("/v1/dental/clinic-assistants", { token })
      .then((result) => {
        if (live) setAssistants(Array.isArray(result) ? result : []);
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
      await assistantRequest("/v1/dental/clinic-assistants", {
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
        "/v1/dental/clinic-assistants/" + encodeURIComponent(assistant.id),
        { token, method: "PATCH", body: { active: false } }
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
      <div className="assistant-security-note"><ShieldCheck size={17} /><span>Assistant access is limited to contact intake, appointment coordination and recording payments already received. Clinical notes, AI, prescriptions, private documents and owner settings remain Doctor-only.</span></div>
    </section>
  );
}
