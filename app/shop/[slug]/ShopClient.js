"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getBusinessCopy } from "../../../lib/business-config";
import { buildWhatsAppOrderLink, isValidIndianWhatsApp, toWhatsAppDigits } from "../../../lib/whatsapp";
import { supabase } from "../../../lib/supabaseClient";
import { useI18n } from "../../../components/i18n-provider";
import ShopHeader from "../../../components/shop/shop-header";
import ShopHero from "../../../components/shop/shop-hero";
import ShopCatalog from "../../../components/shop/shop-catalog";
import ShopCheckoutExtras from "../../../components/shop/shop-checkout-extras";
import ShopCartBar from "../../../components/shop/shop-cart-bar";
import ShopOrderConfirm from "../../../components/shop/shop-order-confirm";
import { getShopOpenStatus } from "../../../components/opening-hours-fields";

export default function ShopClient({ business, items }) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [cart, setCart] = useState({});
  const [note, setNote] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerWhatsapp, setCustomerWhatsapp] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [ordering, setOrdering] = useState(false);
  const [search, setSearch] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const businessCopy = getBusinessCopy(business.category, locale);
  const openStatus = useMemo(() => {
    const status = getShopOpenStatus(
      business.opening_hours,
      new Date(),
      business.closed_today_date
    );
    if (!status.known) return status;
    let label = t("shop.closedNow");
    if (status.closedToday) label = t("shop.closedToday");
    else if (status.isOpen) label = businessCopy.customerState || t("shop.openNow");
    return { ...status, label };
  }, [
    business.opening_hours,
    business.closed_today_date,
    businessCopy.customerState,
    t,
  ]);
  const paymentMode = business.payment_mode || "both";
  const canShowPrepaid =
    Boolean(business.payment_qr_url || business.upi_id) && paymentMode !== "cash";
  const confirmMode = paymentMode === "prepaid" ? "prepaid" : "both";

  const query = search.trim().toLowerCase();
  const filteredItems = useMemo(() => {
    if (!query) return items;
    return items.filter((item) => {
      const name = String(item.name || "").toLowerCase();
      const description = String(item.description || "").toLowerCase();
      const category = String(item.category || "").toLowerCase();
      return name.includes(query) || description.includes(query) || category.includes(query);
    });
  }, [items, query]);

  const available = useMemo(() => filteredItems.filter((i) => i.in_stock), [filteredItems]);
  const unavailable = useMemo(() => filteredItems.filter((i) => !i.in_stock), [filteredItems]);

  const coverSrc =
    business.cover_url ||
    business.logo_url ||
    items.find((item) => item.photo_url)?.photo_url ||
    "";

  function setQty(item, qty) {
    setCart((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[item.id];
      else next[item.id] = qty;
      return next;
    });
  }

  const cartItems = Object.entries(cart).map(([id, qty]) => {
    const item = items.find((i) => i.id === id);
    return { id, name: item.name, price: Number(item.price), qty };
  });
  const total = cartItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const cartCount = cartItems.reduce((sum, i) => sum + i.qty, 0);

  function focusCustomerWhatsapp() {
    const field = document.getElementById("customer-whatsapp");
    if (!field) return;
    field.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => field.focus(), 280);
  }

  function onWhatsAppClick() {
    if (ordering || cartCount === 0) return;
    if (!isValidIndianWhatsApp(customerWhatsapp)) {
      setCheckoutError(t("shop.customerWhatsappInvalid"));
      focusCustomerWhatsapp();
      return;
    }
    setCheckoutError("");
    if (!canShowPrepaid) {
      placeOrder(false);
      return;
    }
    setConfirmOpen(true);
  }

  async function placeOrder(payEarly) {
    if (ordering || cartCount === 0) return;
    if (!isValidIndianWhatsApp(customerWhatsapp)) {
      setCheckoutError(t("shop.customerWhatsappInvalid"));
      setConfirmOpen(false);
      focusCustomerWhatsapp();
      return;
    }
    setOrdering(true);
    setCheckoutError("");
    try {
      const { error: insertError } = await supabase.from("orders").insert({
        business_id: business.id,
        items: cartItems.map(({ name, price, qty }) => ({ name, price, qty })),
        total,
        customer_note: note || null,
        customer_whatsapp: toWhatsAppDigits(customerWhatsapp),
        customer_name: customerName.trim() || null,
      });
      if (insertError) {
        setCheckoutError(
          /customer_whatsapp|customer_name|column/i.test(insertError.message)
            ? t("shop.schemaMissingWhatsapp")
            : insertError.message
        );
        focusCustomerWhatsapp();
        return;
      }
      const link = buildWhatsAppOrderLink(
        business.whatsapp_number,
        cartItems,
        total,
        note,
        locale,
        business.name,
        businessCopy.messageType,
        Boolean(payEarly),
        customerName.trim()
      );
      window.open(link, "_blank");
      setCart({});
      setNote("");
      setCustomerName("");
      setCustomerWhatsapp("");
      setConfirmOpen(false);
    } finally {
      setOrdering(false);
    }
  }

  return (
    <div className={`mobile-shell shop-shell ${cartCount > 0 ? "has-cart" : ""}`}>
      <ShopHeader
        businessName={business.name}
        openStatus={openStatus}
        onBack={() => router.back()}
      />

      <main className="shop-main">
        <ShopHero business={business} businessCopy={businessCopy} coverSrc={coverSrc} />

        <ShopCatalog
          businessCopy={businessCopy}
          items={items}
          filteredItems={filteredItems}
          available={available}
          unavailable={unavailable}
          search={search}
          setSearch={setSearch}
          cart={cart}
          setQty={setQty}
        />

        {cartCount > 0 && (
          <>
            <ShopCheckoutExtras
              businessCopy={businessCopy}
              note={note}
              setNote={setNote}
              customerName={customerName}
              setCustomerName={setCustomerName}
              customerWhatsapp={customerWhatsapp}
              setCustomerWhatsapp={(value) => {
                setCustomerWhatsapp(value);
                if (checkoutError) setCheckoutError("");
              }}
              whatsappError={checkoutError}
            />
          </>
        )}

        <div className="shop-powered">
          {t("shop.poweredBy")} <strong>DukaanLink</strong>
          <p>{t("shop.poweredNote")}</p>
        </div>
      </main>

      {cartCount > 0 && (
        <ShopCartBar
          cartCount={cartCount}
          total={total}
          ordering={ordering}
          ctaLabel={businessCopy.customerCta}
          onPlaceOrder={onWhatsAppClick}
        />
      )}

      <ShopOrderConfirm
        open={confirmOpen}
        onClose={() => !ordering && setConfirmOpen(false)}
        mode={confirmMode}
        paymentQrUrl={business.payment_qr_url}
        upiId={business.upi_id}
        businessName={business.name}
        total={total}
        cartCount={cartCount}
        ordering={ordering}
        onConfirm={placeOrder}
      />
    </div>
  );
}
