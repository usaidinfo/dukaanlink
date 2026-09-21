"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AppSkeleton } from "../../components/skeleton-screen";
import { supabase } from "../../lib/supabaseClient";
import { LanguageToggle, useI18n } from "../../components/i18n-provider";
import { getBusinessCopy } from "../../lib/business-config";
import OrderAlerts from "../../components/dashboard/order-alerts";
import { Boxes, LogOut, QrCode, ReceiptText, Store } from "lucide-react";

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);
  const [category, setCategory] = useState("");
  const [newOrders, setNewOrders] = useState(0);
  const { locale, t } = useI18n();
  const businessCopy = getBusinessCopy(category, locale);

  const handleBadgeChange = useCallback((count) => {
    setNewOrders(count);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.replace("/signin");
        return;
      }

      const { data: business } = await supabase
        .from("businesses")
        .select("id, category")
        .eq("owner_id", data.session.user.id)
        .maybeSingle();

      if (business?.category) setCategory(business.category);
      if (business?.id) {
        const { count } = await supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("business_id", business.id)
          .not("status", "in", "(done,cancelled)");
        setNewOrders(count || 0);
      }
      setChecked(true);
    });

    function onBusinessUpdated(event) {
      if (typeof event.detail?.category === "string") {
        setCategory(event.detail.category);
      }
    }

    window.addEventListener("dukaanlink-business-updated", onBusinessUpdated);
    return () => window.removeEventListener("dukaanlink-business-updated", onBusinessUpdated);
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/signin");
  }

  if (!checked) {
    return (
      <div className="mobile-shell">
        <div className="page">
          <AppSkeleton variant="dashboard" />
        </div>
      </div>
    );
  }

  const nav = [
    { href: "/dashboard/orders", label: businessCopy.orderListTitle, icon: ReceiptText, badge: newOrders },
    { href: "/dashboard/menu", label: businessCopy.collectionName, icon: Boxes },
    { href: "/dashboard", label: t("nav.qr"), icon: QrCode },
  ];

  const title =
    pathname?.includes("/menu")
      ? businessCopy.collectionHeader
      : pathname?.includes("/orders")
        ? businessCopy.orderListTitle
        : t("dashboard.pageTitle");

  return (
    <div className="mobile-shell">
      <header className="top-appbar">
        <div className="top-appbar-left">
          <div className="brand-tile">
            <Store size={18} strokeWidth={2.2} />
          </div>
          <div className="top-appbar-title">
            <span>{t("common.appName")}</span>
            <h1>{title}</h1>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
          <LanguageToggle />
          <button type="button" className="icon-button" onClick={handleLogout} aria-label={t("common.logOut")}>
            <LogOut size={20} strokeWidth={2.2} />
          </button>
        </div>
      </header>

      <OrderAlerts onBadgeChange={handleBadgeChange} />

      {children}

      <nav className="bottom-tabbar">
        {nav.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname?.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={`bottom-tab ${active ? "active" : ""}`}>
              <span className={`bottom-tab-icon ${active && item.href === "/dashboard" ? "pill" : ""}`}>
                <Icon size={22} strokeWidth={2.2} />
                {item.badge > 0 && <i className="tab-badge">{item.badge}</i>}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
