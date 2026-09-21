"use client";

import { useState } from "react";
import {
  Bolt,
  ChevronDown,
  Clock,
  MapPin,
  MessageCircle,
  Store,
  Verified,
} from "lucide-react";
import {
  DAY_KEYS,
  hasAnyOpeningHours,
  normalizeOpeningHours,
} from "../opening-hours-fields";
import { useI18n } from "../i18n-provider";

export default function ShopHero({ business, businessCopy, coverSrc }) {
  const { t } = useI18n();
  const [hoursOpen, setHoursOpen] = useState(false);
  const openingHours = normalizeOpeningHours(business.opening_hours).days;
  const showHours = hasAnyOpeningHours(business.opening_hours);

  return (
    <section className="shop-hero">
      <div className="shop-cover">
        {coverSrc ? <img src={coverSrc} alt="" /> : <div className="shop-cover-fallback" />}
        <div className="shop-cover-fade" />
        <div className="shop-verified-pill">
          <Verified size={13} strokeWidth={2.3} />
          <span>{t("shop.verified")}</span>
        </div>
      </div>

      <div className="shop-identity">
        <div className="shop-identity-top">
          <div className="shop-avatar">
            {business.logo_url ? (
              <img src={business.logo_url} alt="" />
            ) : (
              <Store size={30} strokeWidth={2} />
            )}
          </div>
        </div>

        <h2>{business.name}</h2>
        <p className="shop-meta-line">
          {business.category ? <span>{business.category}</span> : null}
          {business.category && (business.city || business.address) ? (
            <span className="dot">•</span>
          ) : null}
          {(business.city || business.address) && (
            <span className="shop-location">
              <MapPin size={14} strokeWidth={2.2} />
              {business.city || business.address}
            </span>
          )}
        </p>

        {business.description ? <p className="shop-bio">{business.description}</p> : null}

        {showHours && (
          <div className="shop-hours">
            <button
              type="button"
              className="shop-hours-toggle"
              onClick={() => setHoursOpen((v) => !v)}
              aria-expanded={hoursOpen}
            >
              <span>
                <Clock size={16} strokeWidth={2.2} />
                {hoursOpen ? t("shop.hoursHide") : t("shop.hoursToggle")}
              </span>
              <ChevronDown size={18} strokeWidth={2.2} className={hoursOpen ? "open" : ""} />
            </button>
            {hoursOpen && (
              <ul className="shop-hours-list">
                {DAY_KEYS.map((day) => {
                  const row = openingHours[day];
                  return (
                    <li key={day}>
                      <span>{t(`shop.day.${day}`)}</span>
                      <strong>
                        {row.closed ? t("shop.closed") : `${row.open} – ${row.close}`}
                      </strong>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        <div className="shop-trust-row">
          <span className="shop-trust-pill wa">
            <MessageCircle size={14} strokeWidth={2.2} />
            {businessCopy.directLabel}
          </span>
          <span className="shop-trust-pill teal">
            <Bolt size={14} strokeWidth={2.2} />
            {t("common.noApp")}
          </span>
        </div>
      </div>
    </section>
  );
}
