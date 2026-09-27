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
import {
  cartLineKey,
  formatItemNameWithVariant,
  isItemPurchasable,
  parseCartLineKey,
} from "../../../lib/item-variants";
import { summarizeCartGst } from "../../../lib/gst";

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
  const [cartExpanded, setCartExpanded] = useState(false);

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
  const requireCustomerWhatsapp = Boolean(business.require_customer_whatsapp);
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
      const variantText = (item.item_variants || [])
        .map((row) => String(row.label || "").toLowerCase())
        .join(" ");
      return (
        name.includes(query) ||
        description.includes(query) ||
        category.includes(query) ||
        variantText.includes(query)
      );
    });
  }, [items, query]);

  const available = useMemo(() => filteredItems.filter((i) => isItemPurchasable(i)), [filteredItems]);
  const unavailable = useMemo(() => filteredItems.filter((i) => !isItemPurchasable(i)), [filteredItems]);

  const coverSrc =
    business.cover_url ||
    business.logo_url ||
    items.find((item) => item.photo_url)?.photo_url ||
    "";

  function setQty(item, qty, variant = null) {
    const key = cartLineKey(item.id, variant?.id);
    setCart((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[key];
      else next[key] = qty;
      return next;
    });
  }

  const cartItems = Object.entries(cart)
    .map(([key, qty]) => {
      const { itemId, variantId } = parseCartLineKey(key);
      const item = items.find((row) => row.id === itemId);
      if (!item) return null;
      const variant = variantId
        ? (item.item_variants || []).find((row) => row.id === variantId)
        : null;
      return {
        id: key,
        menu_item_id: item.id,
        variant_id: variant?.id || null,
        name: formatItemNameWithVariant(item.name, variant),
        price: Number(variant ? variant.price : item.price),
        qty,
        gst_mode: item.gst_mode,
        gst_rate: item.gst_rate,
      };
    })
    .filter(Boolean);
  const breakdown = summarizeCartGst(cartItems);
  const total = breakdown.hasGst
    ? breakdown.total
    : cartItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const cartCount = cartItems.reduce((sum, i) => sum + i.qty, 0);

  function focusCustomerWhatsapp() {
    const field = document.getElementById("customer-whatsapp");
    if (!field) return;
    field.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => field.focus(), 280);
  }

  function getCustomerWhatsappError() {
    const trimmed = customerWhatsapp.trim();
    if (!trimmed) {
      return requireCustomerWhatsapp ? t("shop.customerWhatsappInvalid") : "";
    }
    return isValidIndianWhatsApp(customerWhatsapp) ? "" : t("shop.customerWhatsappInvalid");
  }

  function onWhatsAppClick() {
    if (ordering || cartCount === 0) return;
    const whatsappError = getCustomerWhatsappError();
    if (whatsappError) {
      setCheckoutError(whatsappError);
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
    const whatsappError = getCustomerWhatsappError();
    if (whatsappError) {
      setCheckoutError(whatsappError);
      setConfirmOpen(false);
      focusCustomerWhatsapp();
      return;
    }
    setOrdering(true);
    setCheckoutError("");
    try {
      const { error: insertError } = await supabase.from("orders").insert({
        business_id: business.id,
        items: cartItems.map(({ name, price, qty, menu_item_id, variant_id }) => ({
          name,
          price,
          qty,
          menu_item_id,
          variant_id,
        })),
        total,
        customer_note: note || null,
        customer_whatsapp: isValidIndianWhatsApp(customerWhatsapp)
          ? toWhatsAppDigits(customerWhatsapp)
          : null,
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
      setCartExpanded(false);
      setNote("");
      setCustomerName("");
      setCustomerWhatsapp("");
      setConfirmOpen(false);
    } finally {
      setOrdering(false);
    }
  }

  return (
    <div
      className={`mobile-shell shop-shell ${cartCount > 0 ? "has-cart" : ""} ${
        breakdown.hasGst ? "has-cart-breakdown" : ""
      } ${cartExpanded && breakdown.hasGst ? "has-cart-open" : ""}`}
    >
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
              requireCustomerWhatsapp={requireCustomerWhatsapp}
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
          breakdown={breakdown}
          ordering={ordering}
          ctaLabel={businessCopy.customerCta}
          onPlaceOrder={onWhatsAppClick}
          onExpandedChange={setCartExpanded}
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
