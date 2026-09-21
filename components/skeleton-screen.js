"use client";

import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

function Theme({ children }) {
  return (
    <SkeletonTheme baseColor="#e8eef8" highlightColor="#f7f9fd" borderRadius={12}>
      {children}
    </SkeletonTheme>
  );
}

export function AppSkeleton({ variant = "dashboard" }) {
  if (variant === "menu") {
    return (
      <Theme>
        <div className="skel-page">
          <div className="skel-row between">
            <Skeleton width={140} height={28} />
            <Skeleton width={72} height={28} borderRadius={999} />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div className="skel-card skel-menu-row" key={i}>
              <Skeleton width={72} height={72} borderRadius={12} />
              <div className="skel-grow">
                <Skeleton width="70%" height={18} />
                <Skeleton width="45%" height={14} style={{ marginTop: 8 }} />
                <Skeleton width={56} height={16} style={{ marginTop: 10 }} />
              </div>
              <Skeleton width={48} height={36} borderRadius={999} />
            </div>
          ))}
          <Skeleton height={52} borderRadius={14} style={{ marginTop: 8 }} />
        </div>
      </Theme>
    );
  }

  if (variant === "orders") {
    return (
      <Theme>
        <div className="skel-page">
          <div className="skel-card skel-pad">
            <div className="skel-row between">
              <Skeleton width={120} height={26} />
              <Skeleton width={64} height={24} borderRadius={999} />
            </div>
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div className="skel-card skel-pad" key={i}>
              <div className="skel-row between">
                <Skeleton width={90} height={22} borderRadius={999} />
                <Skeleton width={70} height={14} />
              </div>
              <Skeleton count={2} style={{ marginTop: 12 }} />
              <div className="skel-row between" style={{ marginTop: 14 }}>
                <Skeleton width={88} height={18} />
                <Skeleton width={110} height={40} borderRadius={12} />
              </div>
            </div>
          ))}
        </div>
      </Theme>
    );
  }

  if (variant === "shop") {
    return (
      <Theme>
        <div className="skel-page skel-shop">
          <Skeleton height={176} borderRadius={0} />
          <div className="skel-shop-identity">
            <Skeleton width={72} height={72} borderRadius={16} />
            <Skeleton width="65%" height={26} style={{ marginTop: 14 }} />
            <Skeleton width="40%" height={14} style={{ marginTop: 8 }} />
            <Skeleton count={2} style={{ marginTop: 12 }} />
            <div className="skel-row" style={{ marginTop: 14, gap: 8 }}>
              <Skeleton width={130} height={28} borderRadius={8} />
              <Skeleton width={120} height={28} borderRadius={8} />
            </div>
          </div>
          <div className="skel-shop-list">
            {Array.from({ length: 3 }).map((_, i) => (
              <div className="skel-card skel-menu-row" key={i}>
                <Skeleton width={84} height={84} borderRadius={12} />
                <div className="skel-grow">
                  <Skeleton width="75%" height={18} />
                  <Skeleton width="90%" height={12} style={{ marginTop: 8 }} />
                  <Skeleton width={48} height={18} style={{ marginTop: 10 }} />
                </div>
                <Skeleton width={64} height={36} borderRadius={12} />
              </div>
            ))}
          </div>
        </div>
      </Theme>
    );
  }

  // dashboard / QR home
  return (
    <Theme>
      <div className="skel-page">
        <div className="skel-center">
          <Skeleton width={170} height={26} borderRadius={999} />
          <Skeleton width={200} height={30} style={{ marginTop: 12 }} />
          <Skeleton width={180} height={14} style={{ marginTop: 8 }} />
        </div>
        <div className="skel-card skel-pad skel-center">
          <div className="skel-row between" style={{ width: "100%" }}>
            <Skeleton width={130} height={18} />
            <Skeleton width={70} height={18} />
          </div>
          <Skeleton width={192} height={192} borderRadius={12} style={{ marginTop: 16 }} />
          <Skeleton width={180} height={20} style={{ marginTop: 14 }} />
          <Skeleton width={220} height={14} style={{ marginTop: 8 }} />
        </div>
        <div className="skel-card skel-pad">
          <Skeleton width={140} height={12} />
          <div className="skel-row" style={{ marginTop: 10, gap: 8 }}>
            <Skeleton className="skel-grow" height={44} />
            <Skeleton width={84} height={44} borderRadius={8} />
          </div>
        </div>
        <Skeleton height={68} borderRadius={12} />
        <Skeleton height={68} borderRadius={12} style={{ marginTop: 10 }} />
      </div>
    </Theme>
  );
}
