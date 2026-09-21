"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { LanguageToggle, useI18n } from "./i18n-provider";

export default function AuthForm({ mode = "signin" }) {
  const router = useRouter();
  const { t } = useI18n();
  const isSignup = mode === "signup";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setLoading(false);
      setError(t("login.errNoKeys"));
      return;
    }

    try {
      if (isSignup) {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) {
          setError(signUpError.message);
          setLoading(false);
          return;
        }
        if (!data.session) {
          setInfo(t("login.infoConfirm"));
          setLoading(false);
          return;
        }
        router.push("/dashboard");
        return;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        const msg = signInError.message || "Could not log in.";
        if (/email not confirmed/i.test(msg)) {
          setError(t("login.errConfirm"));
        } else if (/invalid login credentials/i.test(msg)) {
          setError(t("login.errWrong"));
        } else {
          setError(msg);
        }
        setLoading(false);
        return;
      }
      if (!data.session) {
        setError(t("login.errNoSession"));
        setLoading(false);
        return;
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err.message || t("login.errGeneric"));
      setLoading(false);
    }
  }

  return (
    <div className="mobile-shell">
      <div className="landing-topbar">
        <Link href="/" className="brand-mark">
          Dukaan<span className="accent">Link</span>
        </Link>
        <LanguageToggle />
      </div>
      <div className="page form-shell">
        <h1 style={{ marginTop: "1.5rem" }}>
          {isSignup ? t("login.signupTitle") : t("login.loginTitle")}
        </h1>
        <p className="muted" style={{ marginBottom: "1.25rem" }}>
          {isSignup ? t("login.signupText") : t("login.loginText")}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="field-row">
            <label htmlFor="email">{t("login.email")}</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="field-row">
            <label htmlFor="password">{t("login.password")}</label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete={isSignup ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("login.passwordHint")}
            />
          </div>

          {error && <p className="error-text">{error}</p>}
          {info && <p className="info-text">{info}</p>}

          <button className="secondary-cta" type="submit" disabled={loading}>
            {loading ? "Please wait..." : isSignup ? t("login.createAccount") : t("login.logIn")}
          </button>
        </form>

        <p className="muted" style={{ marginTop: "1.2rem", textAlign: "center" }}>
          {isSignup ? t("login.hasAccount") : t("login.newHere")}{" "}
          <Link
            href={isSignup ? "/signin" : "/signup"}
            style={{ color: "var(--primary)", fontWeight: 700, textDecoration: "underline" }}
          >
            {isSignup ? t("login.switchToLogin") : t("login.switchToSignup")}
          </Link>
        </p>
      </div>
    </div>
  );
}
