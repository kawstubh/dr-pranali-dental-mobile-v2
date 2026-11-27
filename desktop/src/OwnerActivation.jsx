import React, { useMemo, useState } from "react";
import { CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
import { dentalApi } from "./api.js";
import "./owner-activation.css";

export default function OwnerActivation() {
  const token = useMemo(
    () => new URLSearchParams(window.location.search).get("token") || "",
    [],
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [activated, setActivated] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (!token) {
      setError("This activation link is missing its secure token. Ask Oralyn support for a new link.");
      return;
    }
    if (password.length < 12) {
      setError("Use at least 12 characters for your password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await dentalApi.publicOwnerActivate({ token, password });
      setActivated(true);
      setPassword("");
      setConfirmPassword("");
    } catch (cause) {
      setError(cause?.message || "This activation link could not be used. Ask Oralyn support for a new link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="owner-activation-shell">
      <section className="owner-activation-card" aria-labelledby="owner-activation-title">
        <div className="owner-activation-brand">
          <span className="owner-activation-mark"><ShieldCheck size={22} /></span>
          <span>ORALYN</span>
        </div>
        {activated ? (
          <div className="owner-activation-result" role="status">
            <CheckCircle2 size={42} aria-hidden="true" />
            <h1 id="owner-activation-title">Your clinic account is ready</h1>
            <p>Your owner password has been set. You can now sign in to your Oralyn clinic workspace.</p>
            <a className="owner-activation-submit" href="/">Continue to Oralyn</a>
          </div>
        ) : (
          <>
            <div className="owner-activation-icon"><LockKeyhole size={24} /></div>
            <h1 id="owner-activation-title">Activate your clinic account</h1>
            <p className="owner-activation-intro">
              Set a secure password to finish activating your clinic owner account.
            </p>
            <form onSubmit={submit} className="owner-activation-form">
              <label htmlFor="owner-password">New password</label>
              <input
                id="owner-password"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={256}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <label htmlFor="owner-password-confirm">Confirm password</label>
              <input
                id="owner-password-confirm"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={256}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
              {error && <p className="owner-activation-error" role="alert">{error}</p>}
              <button className="owner-activation-submit" type="submit" disabled={busy || !token}>
                {busy ? "Activating…" : "Activate clinic account"}
              </button>
            </form>
            <p className="owner-activation-footnote">
              This secure link expires after 24 hours and can be used only once. Oralyn will never ask you to share your password.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
