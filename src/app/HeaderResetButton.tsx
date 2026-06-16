"use client";

import { ORDER_CONTROLLER_STORAGE_KEY } from "@/domain";

export const ORDER_CONTROLLER_RESET_EVENT = "order-controller-reset";

function ResetIcon() {
  return (
    <svg aria-hidden="true" className="header-reset-icon" viewBox="0 0 24 24">
      <path d="M4 7v5h5" />
      <path d="M5.8 15.2A7 7 0 1 0 7 6.1L4 12" />
    </svg>
  );
}

export function HeaderResetButton() {
  function resetController() {
    const shouldReset = window.confirm("Reset all orders and bots?");

    if (!shouldReset) {
      return;
    }

    window.localStorage.removeItem(ORDER_CONTROLLER_STORAGE_KEY);
    window.dispatchEvent(new Event(ORDER_CONTROLLER_RESET_EVENT));
  }

  return (
    <button
      className="header-reset-button"
      type="button"
      onClick={resetController}
    >
      <ResetIcon />
      Reset
    </button>
  );
}
