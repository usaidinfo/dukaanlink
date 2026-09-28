"use client";

import { useEffect, useState } from "react";

export const LIST_PAGE_SIZE = 12;

export function useVisibleWindow(itemCount, resetKey = "", pageSize = LIST_PAGE_SIZE) {
  const [visible, setVisible] = useState(pageSize);

  useEffect(() => {
    setVisible(pageSize);
  }, [resetKey, pageSize]);

  function loadMore() {
    setVisible((count) => Math.min(itemCount, count + pageSize));
  }

  return {
    visibleCount: Math.min(visible, itemCount),
    remaining: Math.max(0, itemCount - visible),
    hasMore: visible < itemCount,
    loadMore,
  };
}
