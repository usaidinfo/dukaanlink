"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, MessageCircleMore } from "lucide-react";
import { LanguageToggle, useI18n } from "./i18n-provider";
import { supabase } from "../lib/supabaseClient";

export default function LandingScreen() {
  const { t } = useI18n();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/dashboard");
    });
  }, [router]);

  return (
    <div className="mobile-shell">
      <div className="landing-topbar">
        <div className="brand-mark">
          <span>Dukaan</span>
          <span className="accent">Link</span>
        </div>
        <LanguageToggle />
      </div>

      <main className="landing-main">
        <div className="landing-hero-card">
          <img
            src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&q=80"
            alt="Local business catalog preview"
          />
          <div className="landing-order-pill">
            <div className="landing-order-icon">
              <MessageCircleMore size={18} strokeWidth={2.1} />
            </div>
            <div className="landing-order-copy">
              <p>{t("landing.badgeTitle")}</p>
              <span>{t("landing.badgeItem")}</span>
            </div>
            <CheckCircle2 size={18} className="success-icon" strokeWidth={2.2} />
          </div>
        </div>

        <div className="landing-copy">
          <h1>{t("landing.title")}</h1>
          <p>{t("landing.subtitle")}</p>
        </div>

        <Link href="/signup" className="primary-cta">
          {t("landing.cta")}
        </Link>
        <p className="muted" style={{ textAlign: "center", marginTop: "0.9rem" }}>
          {t("login.hasAccount")}{" "}
          <Link href="/signin" style={{ color: "var(--primary)", fontWeight: 700, textDecoration: "underline" }}>
            {t("login.switchToLogin")}
          </Link>
        </p>
      </main>
    </div>
  );
}
