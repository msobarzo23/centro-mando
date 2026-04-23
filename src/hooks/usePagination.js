import { useState, useEffect } from "react";

export function usePagination(items, pageSize = 10) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => { setPage(0); }, [items.length]);

  const pageItems = items.slice(page * pageSize, (page + 1) * pageSize);
  return { page, setPage, totalPages, pageItems };
}
