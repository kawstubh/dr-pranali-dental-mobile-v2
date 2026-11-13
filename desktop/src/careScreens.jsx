import React, { useEffect, useState } from "react";
import {
  FileText,
  Receipt,
  HeartPulse,
  Upload,
  Download,
  ShieldCheck,
  RefreshCw,
  Plus,
  LockKeyhole,
  AlertCircle,
  MessageCircle,
  Send,
} from "lucide-react";
import { dentalApi } from "./api.js";
import { normaliseList } from "./data.js";

const PRIVATE_DOCUMENTS_READY =
  import.meta.env.VITE_PRIVATE_DOCUMENT_STORAGE_READY === "true" &&
  import.meta.env.VITE_DOCUMENT_MALWARE_SCANNING_READY === "true";

const inr = (paise) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format((Number(paise) || 0) / 100);

const dateLabel = (value) => {
  const date = new Date(value || "");
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "Date not recorded";
};

const idempotencyKey = (prefix) =>
  `${prefix}-${globalThis.crypto?.randomUUID?.() || Date.now() + "-" + Math.random().toString(36).slice(2)}`;

function StateMessage({ children, error = false }) {
  return (
    <div className={error ? "care-state care-error" : "care-state"} role={error ? "alert" : "status"}>
      {error ? <AlertCircle size={18} /> : <LockKeyhole size={18} />}
      <span>{children}</span>
    </div>
  );
}

function CareHeader({ eyebrow, title, description, action }) {
  return (
    <div className="care-header">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

function downloadInNewTab(url) {
  const popup = window.open("about:blank", "_blank");
  if (popup) {
    popup.opener = null;
    popup.location.href = url;
  }
  return Boolean(popup);
}

export function DoctorCareManagement({ page, token, activePatient, ping }) {
  const [plans, setPlans] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadedScope, setLoadedScope] = useState("");
  const [busy, setBusy] = useState(false);
  const [planTitle, setPlanTitle] = useState("");
  const [planSummary, setPlanSummary] = useState("");
  const [planItem, setPlanItem] = useState("");
  const [invoiceDescription, setInvoiceDescription] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [taxPercent, setTaxPercent] = useState("0");
  const [receiptDraft, setReceiptDraft] = useState({});
  const [uploadFile, setUploadFile] = useState(null);
  const scopeKey = `${token || ""}:${page}:${activePatient?.id || ""}:${refreshKey}`;

  useEffect(() => {
    let live = true;
    if (!activePatient?.id || !token) {
      setPlans([]);
      setInvoices([]);
      setDocuments([]);
      setLoading(false);
      setError("");
      setLoadedScope(scopeKey);
      return () => { live = false; };
    }
    setLoading(true);
    setLoadedScope("");
    setPlans([]);
    setInvoices([]);
    setDocuments([]);
    setError("");
    const load = async () => {
      try {
        if (page === "treatments") {
          const response = await dentalApi.doctorTreatmentPlans(token, activePatient.id);
          if (live) setPlans(normaliseList(response));
        } else if (page === "billing") {
          const response = await dentalApi.doctorInvoices(token, activePatient.id);
          if (live) setInvoices(normaliseList(response));
        } else if (page === "files") {
          const response = await dentalApi.doctorDocuments(token, activePatient.id);
          if (live) setDocuments(normaliseList(response));
        }
      } catch (err) {
        if (live) setError(err.message || "The clinic service could not load this section.");
      } finally {
        if (live) {
          setLoading(false);
          setLoadedScope(scopeKey);
        }
      }
    };
    load();
    return () => { live = false; };
  }, [page, token, activePatient?.id, refreshKey, scopeKey]);

  const refresh = () => setRefreshKey((value) => value + 1);

  if (!activePatient) {
    return (
      <>
        <CareHeader eyebrow="PATIENT CARE" title={page === "treatments" ? "Treatment plans" : page === "billing" ? "Billing & invoices" : "Private documents"} description="Choose a clinic patient before opening their protected records." />
        <StateMessage>Select a patient from the clinical workspace or patient directory. No sample clinical or financial records are displayed.</StateMessage>
      </>
    );
  }

  if (loading || loadedScope !== scopeKey) {
    return <StateMessage>Loading this patient's protected clinic records…</StateMessage>;
  }

  const patientLabel = activePatient.name || activePatient.id;

  if (page === "treatments") {
    const createPlan = async (event) => {
      event.preventDefault();
      if (planTitle.trim().length < 2 || planItem.trim().length < 1) {
        ping("Add a plan title and at least one treatment item.");
        return;
      }
      setBusy(true);
      try {
        await dentalApi.createTreatmentPlan(token, activePatient.id, {
          title: planTitle.trim(),
          summary: planSummary.trim(),
          items: [{ description: planItem.trim() }],
        });
        setPlanTitle("");
        setPlanSummary("");
        setPlanItem("");
        refresh();
        ping("Draft treatment plan saved privately.");
      } catch (err) {
        setError(err.message);
      } finally {
        setBusy(false);
      }
    };
    return (
      <>
        <CareHeader eyebrow="CLINICAL CARE" title="Treatment plans" description={`Clinician-authored care plans for ${patientLabel}. Treatment plans remain private to the Doctor workspace; patient sharing is not enabled.`} action={<button className="outline" onClick={refresh}><RefreshCw size={16} /> Refresh</button>} />
        {error && <StateMessage error>{error}</StateMessage>}
        {loading ? <StateMessage>Loading treatment plans from the clinic record…</StateMessage> : (
          <div className="care-grid">
            <section className="panel care-panel">
              <div className="care-panel-heading"><HeartPulse /><div><h2>Plans for this patient</h2><p>{plans.length} persistent plan{plans.length === 1 ? "" : "s"}</p></div></div>
              {plans.length ? plans.map((plan) => (
                <article className="care-record" key={plan.id}>
                  <div className="care-record-top"><div><b>{plan.title}</b><small>{plan.status.replaceAll("_", " ")} · Version {plan.version}</small></div><span className="care-pill private">{plan.patient_visible ? "Legacy share flag disabled" : "Clinic only"}</span></div>
                  {plan.summary && <p>{plan.summary}</p>}
                  <ul>{(plan.items || []).map((item) => <li key={item.id}>{item.description}{item.tooth_fdi ? ` · Tooth ${item.tooth_fdi}` : ""}</li>)}</ul>
                  {plan.patient_visible && <small className="care-hint">No patient access is available; this legacy visibility flag is ignored.</small>}
                </article>
              )) : <StateMessage>No treatment plans have been created for this patient.</StateMessage>}
            </section>
            <section className="panel care-panel">
              <div className="care-panel-heading"><Plus /><div><h2>Create a treatment plan</h2><p>New plans are private drafts.</p></div></div>
              <form className="care-form" onSubmit={createPlan}>
                <label>Plan title<input value={planTitle} onChange={(e) => setPlanTitle(e.target.value)} required maxLength={160} placeholder="e.g. Initial restorative care" /></label>
                <label>Clinical summary<textarea value={planSummary} onChange={(e) => setPlanSummary(e.target.value)} maxLength={2000} rows={3} placeholder="A concise clinician-authored summary" /></label>
                <label>First treatment item<input value={planItem} onChange={(e) => setPlanItem(e.target.value)} required maxLength={500} placeholder="e.g. Clinical examination" /></label>
                <button className="primary" disabled={busy}><Plus size={16} /> Save private draft</button>
              </form>
            </section>
          </div>
        )}
      </>
    );
  }

  if (page === "billing") {
    const createInvoice = async (event) => {
      event.preventDefault();
      const rupees = Number(invoiceAmount);
      const tax = Number(taxPercent);
      if (!invoiceDescription.trim() || !Number.isFinite(rupees) || rupees <= 0 || !Number.isFinite(tax) || tax < 0 || tax > 28) {
        ping("Enter a valid invoice description, amount and tax rate.");
        return;
      }
      setBusy(true);
      try {
        await dentalApi.createInvoice(token, activePatient.id, {
          idempotency_key: idempotencyKey("oralyn-invoice"),
          discount_paise: 0,
          patient_note: "",
          items: [{
            description: invoiceDescription.trim(),
            quantity_milli: 1000,
            unit_price_paise: Math.round(rupees * 100),
            tax_rate_bps: Math.round(tax * 100),
          }],
        });
        setInvoiceDescription("");
        setInvoiceAmount("");
        setTaxPercent("0");
        refresh();
        ping("Invoice draft created. Issue it when ready to share.");
      } catch (err) {
        setError(err.message);
      } finally {
        setBusy(false);
      }
    };
    const issueInvoice = async (invoice) => {
      setBusy(true);
      try {
        await dentalApi.issueInvoice(token, invoice.id, {});
        refresh();
        ping("Invoice issued. It remains in the Doctor workspace.");
      } catch (err) {
        setError(err.message);
      } finally {
        setBusy(false);
      }
    };
    const recordReceipt = async (invoice) => {
      const draft = receiptDraft[invoice.id] || {};
      const amount = Number(draft.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        ping("Enter the amount received before recording a receipt.");
        return;
      }
      setBusy(true);
      try {
        await dentalApi.recordInvoiceReceipt(token, invoice.id, {
          amount_paise: Math.round(amount * 100),
          method: draft.method || "upi",
          reference: draft.reference || "",
          idempotency_key: idempotencyKey("oralyn-receipt"),
        });
        setReceiptDraft((current) => ({ ...current, [invoice.id]: { method: draft.method || "upi" } }));
        refresh();
        ping("Receipt recorded against the issued invoice.");
      } catch (err) {
        setError(err.message);
      } finally {
        setBusy(false);
      }
    };
    return (
      <>
        <CareHeader eyebrow="PRACTICE FINANCE" title="Billing & invoices" description={`Persistent INR billing for ${patientLabel}. Totals are calculated by the clinic API, never by the browser.`} action={<button className="outline" onClick={refresh}><RefreshCw size={16} /> Refresh</button>} />
        {error && <StateMessage error>{error}</StateMessage>}
        {loading ? <StateMessage>Loading invoices and receipts…</StateMessage> : (
          <div className="care-grid">
            <section className="panel care-panel">
              <div className="care-panel-heading"><Receipt /><div><h2>Patient invoices</h2><p>{invoices.length} persistent invoice{invoices.length === 1 ? "" : "s"}</p></div></div>
              {invoices.length ? invoices.map((invoice) => (
                <article className="care-record" key={invoice.id}>
                  <div className="care-record-top"><div><b>{invoice.invoice_number}</b><small>{invoice.status.replaceAll("_", " ")} · {dateLabel(invoice.created_at)}</small></div><strong>{inr(invoice.total_paise)}</strong></div>
                  <div className="care-finance-row"><span>Paid {inr(invoice.paid_paise)}</span><span>Balance {inr(invoice.balance_paise)}</span></div>
                  <ul>{(invoice.items || []).map((item) => <li key={item.id}>{item.description} · {inr(item.total_paise)}</li>)}</ul>
                  {invoice.status === "draft" && <button className="primary" disabled={busy} onClick={() => issueInvoice(invoice)}>Issue invoice</button>}
                  {["issued", "partially_paid", "overdue"].includes(invoice.status) && (
                    <div className="care-receipt-form">
                      <label>Amount received (₹)<input type="number" min="0.01" step="0.01" value={receiptDraft[invoice.id]?.amount || ""} onChange={(e) => setReceiptDraft((current) => ({ ...current, [invoice.id]: { ...current[invoice.id], amount: e.target.value } }))} /></label>
                      <label>Method<select value={receiptDraft[invoice.id]?.method || "upi"} onChange={(e) => setReceiptDraft((current) => ({ ...current, [invoice.id]: { ...current[invoice.id], method: e.target.value } }))}><option value="upi">UPI</option><option value="cash">Cash</option><option value="bank_transfer">Bank transfer</option><option value="razorpay">Razorpay reference</option><option value="other">Other</option></select></label>
                      <label>Reference (optional)<input value={receiptDraft[invoice.id]?.reference || ""} onChange={(e) => setReceiptDraft((current) => ({ ...current, [invoice.id]: { ...current[invoice.id], reference: e.target.value } }))} maxLength={128} /></label>
                      <button className="outline" disabled={busy} onClick={() => recordReceipt(invoice)}>Record receipt</button>
                    </div>
                  )}
                  {(invoice.receipts || []).map((receipt) => <small className="care-hint" key={receipt.id}>{receipt.receipt_number} · {inr(receipt.amount_paise)} · {receipt.method}</small>)}
                </article>
              )) : <StateMessage>No invoices have been created for this patient.</StateMessage>}
            </section>
            <section className="panel care-panel">
              <div className="care-panel-heading"><Plus /><div><h2>Create an invoice</h2><p>Amounts are submitted in INR and calculated in integer paise by the server.</p></div></div>
              <form className="care-form" onSubmit={createInvoice}>
                <label>Line item<input value={invoiceDescription} onChange={(e) => setInvoiceDescription(e.target.value)} required maxLength={300} placeholder="e.g. Professional cleaning" /></label>
                <label>Amount (₹)<input type="number" min="0.01" step="0.01" value={invoiceAmount} onChange={(e) => setInvoiceAmount(e.target.value)} required /></label>
                <label>Tax rate (%)<input type="number" min="0" max="28" step="0.01" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} /></label>
                <button className="primary" disabled={busy}><Plus size={16} /> Create draft invoice</button>
              </form>
              <p className="care-hint">Issuing an invoice keeps it in the Doctor workspace. It does not share patient records or initiate a payment. Receipts record payments already received.</p>
            </section>
          </div>
        )}
      </>
    );
  }

  const uploadDocument = async (event) => {
    event.preventDefault();
    if (!PRIVATE_DOCUMENTS_READY) {
      setError("Private document uploads and sharing are disabled until secure storage and malware scanning are configured and verified.");
      return;
    }
    if (!uploadFile) {
      ping("Choose a PDF or image document first.");
      return;
    }
    const accepted = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!accepted.includes(uploadFile.type) || uploadFile.size <= 0 || uploadFile.size > 10 * 1024 * 1024) {
      ping("Choose a PDF, JPEG, PNG or WebP file up to 10 MB.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const bytes = await uploadFile.arrayBuffer();
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      const checksum = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
      const intent = await dentalApi.createDocumentUploadIntent(token, activePatient.id, {
        file_name: uploadFile.name,
        content_type: uploadFile.type,
        size_bytes: uploadFile.size,
        checksum_sha256: checksum,
      });
      const result = intent?.result || intent;
      const uploaded = await fetch(result.upload_url, {
        method: "PUT",
        headers: result.required_headers,
        body: uploadFile,
      });
      if (!uploaded.ok) throw new Error("Private storage rejected the upload. Check the staging bucket CORS policy and signed headers.");
      await dentalApi.completeDocumentUpload(token, result.document.id);
      setUploadFile(null);
      refresh();
      ping("Document verified and stored privately.");
    } catch (err) {
      setError(err.message || "Private document upload failed.");
    } finally {
      setBusy(false);
    }
  };
  const reviewDocument = async (document) => {
    if (!PRIVATE_DOCUMENTS_READY) return;
    setBusy(true);
    setError("");
    try {
      await dentalApi.reviewDocument(token, document.id);
      refresh();
      ping("Document reviewed. It remains private to the Doctor workspace.");
    } catch (err) {
      setError(err.message || "Document review could not be recorded.");
    } finally {
      setBusy(false);
    }
  };
  const downloadDocument = async (document) => {
    if (!PRIVATE_DOCUMENTS_READY) return;
    const popup = window.open("about:blank", "_blank");
    try {
      const response = await dentalApi.doctorDocumentDownloadIntent(token, document.id);
      const url = response?.result?.download_url || response?.result?.url;
      if (!url) throw new Error("The storage service did not return a download link.");
      if (popup) {
        popup.opener = null;
        popup.location.href = url;
      } else {
        throw new Error("Your browser blocked the document tab. Allow pop-ups and try again.");
      }
    } catch (err) {
      if (popup) popup.close();
      setError(err.message);
    }
  };
  return (
    <>
      <CareHeader eyebrow="SECURE CLINICAL FILES" title="Private documents" description={PRIVATE_DOCUMENTS_READY ? `Verified, tenant-scoped files for ${patientLabel}. Documents remain private to the Doctor workspace; patient sharing is deferred until scoped, expiring links are implemented.` : `Secure storage and fail-closed malware scanning are not enabled for ${patientLabel}. Upload, download and review actions are disabled. Patient-specific sharing is separately deferred.`} action={<button className="outline" onClick={refresh}><RefreshCw size={16} /> Refresh</button>} />
      {error && <StateMessage error>{error}</StateMessage>}
      <div className="care-grid">
        <section className="panel care-panel">
          <div className="care-panel-heading"><FileText /><div><h2>Documents for this patient</h2><p>{documents.length} document{documents.length === 1 ? "" : "s"}</p></div></div>
          {loading ? <StateMessage>Loading private document metadata…</StateMessage> : documents.length ? documents.map((document) => (
            <article className="care-record" key={document.id}>
              <div className="care-record-top"><div><b>{document.file_name}</b><small>{document.content_type} · {Math.ceil(document.size_bytes / 1024)} KB · {dateLabel(document.created_at)}</small></div><span className="care-pill private">{document.patient_visible ? "Legacy share flag disabled" : document.reviewed_at ? "Reviewed · clinic only" : document.status === "available" ? "Review required" : document.status.replaceAll("_", " ")}</span></div>
              <div className="care-actions">
                {PRIVATE_DOCUMENTS_READY && document.status === "available" && <button className="outline" onClick={() => downloadDocument(document)}><Download size={15} /> Download</button>}
                {PRIVATE_DOCUMENTS_READY && document.status === "available" && !document.reviewed_at && <button className="outline" disabled={busy} onClick={() => reviewDocument(document)}><ShieldCheck size={15} /> Mark as reviewed</button>}
              </div>
            </article>
          )) : <StateMessage>No documents have been uploaded for this patient.</StateMessage>}
        </section>
        <section className="panel care-panel">
          <div className="care-panel-heading"><Upload /><div><h2>{PRIVATE_DOCUMENTS_READY ? "Upload a document" : "Document storage disabled"}</h2><p>{PRIVATE_DOCUMENTS_READY ? "PDF, JPEG, PNG or WebP · Maximum 10 MB" : "Uploads and sharing are unavailable in this environment"}</p></div></div>
          {PRIVATE_DOCUMENTS_READY ? (
            <>
              <form className="care-form" onSubmit={uploadDocument}>
                <label>Choose file<input type="file" accept=".pdf,image/jpeg,image/png,image/webp" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} /></label>
                {uploadFile && <small className="care-hint">{uploadFile.name} · {Math.ceil(uploadFile.size / 1024)} KB</small>}
                <button className="primary" disabled={busy || !uploadFile}><Upload size={16} /> Upload securely</button>
              </form>
              <StateMessage>Uploads remain private after verification. A doctor must explicitly review the file before the separate patient-sharing action becomes available.</StateMessage>
            </>
          ) : (
            <StateMessage>Uploads, downloads and review are disabled until secure private storage and fail-closed malware scanning are configured and verified. Patient-specific sharing is separately deferred until scoped, expiring links are implemented.</StateMessage>
          )}
        </section>
      </div>
    </>
  );
}

export function DoctorClinicalNotes({ token, activePatient }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadedScope, setLoadedScope] = useState("");
  const scopeKey = `${token || ""}:${activePatient?.id || ""}:${refreshKey}`;
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [drafts, setDrafts] = useState({});

  useEffect(() => {
    let live = true;
    if (!token || !activePatient?.id) {
      setNotes([]);
      setDrafts({});
      setLoading(false);
      setError("");
      setLoadedScope(scopeKey);
      return () => { live = false; };
    }
    setLoading(true);
    setLoadedScope("");
    setNotes([]);
    setDrafts({});
    setError("");
    dentalApi.doctorClinicalNotes(token, activePatient.id)
      .then((response) => { if (live) setNotes(normaliseList(response)); })
      .catch((err) => { if (live) setError(err.message || "Clinical notes could not be loaded."); })
      .finally(() => {
        if (live) {
          setLoading(false);
          setLoadedScope(scopeKey);
        }
      });
    return () => { live = false; };
  }, [token, activePatient?.id, refreshKey, scopeKey]);

  if (!activePatient?.id) {
    return (
      <>
        <CareHeader eyebrow="CLINICAL DOCUMENTATION" title="Clinical notes" description="Create and maintain clinician-authored notes for a selected patient." />
        <StateMessage>Select a patient from the clinical workspace before opening their notes.</StateMessage>
      </>
    );
  }

  if (loading || loadedScope !== scopeKey) {
    return <StateMessage>Loading clinical notes for this patient…</StateMessage>;
  }

  const createNote = async (event) => {
    event.preventDefault();
    if (title.trim().length < 2 || !content.trim()) {
      setError("Add a note title and clinical content before saving.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await dentalApi.createClinicalNote(token, activePatient.id, {
        title: title.trim(),
        content: content.trim(),
      });
      setTitle("");
      setContent("");
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setError(err.message || "Clinical note could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const saveNote = async (note) => {
    const draft = drafts[note.id] || {};
    if (!String(draft.title ?? note.title).trim() || !String(draft.content ?? note.content).trim()) {
      setError("A clinical note needs both a title and content.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await dentalApi.updateClinicalNote(token, note.id, {
        title: String(draft.title ?? note.title).trim(),
        content: String(draft.content ?? note.content).trim(),
        expected_version: note.version,
      });
      setDrafts((current) => { const next = { ...current }; delete next[note.id]; return next; });
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setError(err.message || "Clinical note could not be updated.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <CareHeader eyebrow="CLINICAL DOCUMENTATION" title="Clinical notes" description={`Private clinician-authored notes for ${activePatient.name || activePatient.id}. Patient sharing is not enabled; notes remain inside the Doctor workspace.`} action={<button className="outline" onClick={() => setRefreshKey((value) => value + 1)}><RefreshCw size={16} /> Refresh</button>} />
      {error && <StateMessage error>{error}</StateMessage>}
      <div className="care-grid">
        <section className="panel care-panel">
          <div className="care-panel-heading"><FileText /><div><h2>Clinical record</h2><p>{notes.length} persistent note{notes.length === 1 ? "" : "s"}</p></div></div>
          {loading ? <StateMessage>Loading clinical notes…</StateMessage> : notes.length ? notes.map((note) => {
            const draft = drafts[note.id] || {};
            const titleValue = draft.title ?? note.title;
            const contentValue = draft.content ?? note.content;
            const changed = titleValue !== note.title || contentValue !== note.content;
            return (
              <article className="care-record" key={note.id}>
                <div className="care-record-top">
                  <div><b>{note.title}</b><small>Version {note.version} · Updated {dateLabel(note.updated_at)}</small></div>
                  <span className="care-pill private">{note.patient_visible ? "Legacy share flag disabled" : "Clinic only"}</span>
                </div>
                <label className="care-note-field">Title<input value={titleValue} maxLength={160} onChange={(event) => setDrafts((current) => ({ ...current, [note.id]: { ...current[note.id], title: event.target.value } }))} /></label>
                <label className="care-note-field">Clinical note<textarea rows={4} maxLength={10000} value={contentValue} onChange={(event) => setDrafts((current) => ({ ...current, [note.id]: { ...current[note.id], content: event.target.value } }))} /></label>
                <div className="care-actions">
                  {changed && <button className="outline" disabled={busy} onClick={() => saveNote(note)}>Save changes</button>}
                </div>
              </article>
            );
          }) : !loading && <StateMessage>No clinical notes have been recorded for this patient.</StateMessage>}
        </section>
        <section className="panel care-panel">
          <div className="care-panel-heading"><Plus /><div><h2>New clinical note</h2><p>New notes are private to the clinic by default.</p></div></div>
          <form className="care-form" onSubmit={createNote}>
            <label>Note title<input value={title} onChange={(event) => setTitle(event.target.value)} required minLength={2} maxLength={160} placeholder="e.g. Examination findings" /></label>
            <label>Clinical content<textarea value={content} onChange={(event) => setContent(event.target.value)} required maxLength={10000} rows={7} placeholder="Enter clinician-authored findings and observations." /></label>
            <button className="primary" disabled={busy}><Plus size={16} /> Save private note</button>
          </form>
          <StateMessage>Clinical notes are not generated by AI. Patient access is not enabled; notes remain private to the Doctor workspace.</StateMessage>
        </section>
      </div>
    </>
  );
}

export function PatientCommunication({ token, activePatient }) {
  const authToken = token;
  const recordId = activePatient?.id;
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadedScope, setLoadedScope] = useState("");
  const scopeKey = `${authToken || ""}:${recordId || ""}:${refreshKey}`;

  useEffect(() => {
    let live = true;
    if (!authToken || !recordId) {
      setMessages([]);
      setDraft("");
      setLoading(false);
      setError("");
      setLoadedScope(scopeKey);
      return () => { live = false; };
    }
    setLoading(true);
    setLoadedScope("");
    setMessages([]);
    setDraft("");
    setError("");
    dentalApi.doctorMessages(authToken, recordId).then((response) => {
      if (live) setMessages(normaliseList(response));
    }).catch((err) => {
      if (live) setError(err.message || "Clinic communication could not be loaded.");
    }).finally(() => {
      if (live) {
        setLoading(false);
        setLoadedScope(scopeKey);
      }
    });
    return () => { live = false; };
  }, [authToken, recordId, refreshKey, scopeKey]);

  const send = async (event) => {
    event.preventDefault();
    if (!draft.trim()) {
      setError("Write a message before sending.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await dentalApi.sendDoctorMessage(authToken, recordId, { body: draft.trim() });
      setDraft("");
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setError(err.message || "Your message could not be sent.");
    } finally {
      setBusy(false);
    }
  };

  if (!recordId || !authToken) {
    return (
      <>
        <CareHeader eyebrow="CLINIC COMMUNICATION" title="Patient messages" description="A private conversation inside the authenticated Doctor workspace." />
        <StateMessage>Select a patient from the clinic directory to open their conversation.</StateMessage>
      </>
    );
  }

  return (
    <>
      <CareHeader eyebrow="CLINIC COMMUNICATION" title="Patient messages" description={`Secure conversation with ${activePatient?.name || "the selected patient"}.`} action={<button className="outline" onClick={() => setRefreshKey((value) => value + 1)}><RefreshCw size={16} /> Refresh</button>} />
      {error && <StateMessage error>{error}</StateMessage>}
      <section className="panel communication-panel">
        <div className="care-panel-heading"><MessageCircle /><div><h2>Clinic conversation</h2><p>Plain-text messages. Documents use the separate private-file workflow.</p></div></div>
        <div className="message-list" aria-live="polite">
          {loading || loadedScope !== scopeKey ? <StateMessage>Loading messages…</StateMessage> : messages.length ? messages.map((message) => {
            const own = message.sender_type === "doctor";
            return (
              <div className={own ? "message-row own" : "message-row"} key={message.id}>
                <article className="message-bubble">
                  <div className="message-meta"><b>{message.sender_type === "doctor" ? "Clinic team" : "Patient"}</b><time>{dateLabel(message.created_at)}</time></div>
                  <p>{message.body}</p>
                </article>
              </div>
            );
          }) : <StateMessage>No messages have been exchanged for this clinic record yet.</StateMessage>}
        </div>
        <form className="message-form" onSubmit={send}>
          <label className="sr-only" htmlFor="oralyn-message-draft">Write a message</label>
          <textarea id="oralyn-message-draft" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={4000} rows={3} placeholder="Write a message to the patient…" />
          <button className="primary" disabled={busy || loading || loadedScope !== scopeKey || !draft.trim()}><Send size={16} /> {busy ? "Sending…" : "Send message"}</button>
        </form>
      </section>
    </>
  );
}
