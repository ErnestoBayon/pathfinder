"use client";

import { useState } from "react";
import GuideModal from "./GuideModal";

export default function GuideButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted transition-colors duration-200 ease-out hover:text-ink"
      >
        Guide
      </button>
      {open && <GuideModal onClose={() => setOpen(false)} />}
    </>
  );
}
