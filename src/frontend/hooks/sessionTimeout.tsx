import { useEffect, useRef, useState, useCallback } from "react";
import { formatMMSS } from "../components/utils";

const TOTAL_MS = 10 * 60 *  1000;
const POPUP_AT_MS = 5 * 60 * 1000;
const TICK_MS = 1000;

type UseSessionCountdownOptions = {
  enabled?: boolean;
  onTimeout: () => void;
  onPopup: () => void;
};

export function useSessionCountdown({
  enabled = true,
  onTimeout,
  onPopup,
}: UseSessionCountdownOptions) {
  const [remainingMs, setRemainingMs] = useState(TOTAL_MS);

  const remainingRef = useRef(TOTAL_MS);
  const popupShownRef = useRef(false);

  // Keep latest callbacks without restarting effects
  const onTimeoutRef = useRef(onTimeout);
  const onPopupRef = useRef(onPopup);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
    onPopupRef.current = onPopup;
  }, [onTimeout, onPopup]);

  // Reset countdown
  const reset = useCallback(() => {
    remainingRef.current = TOTAL_MS;
    popupShownRef.current = false;
    setRemainingMs(TOTAL_MS);
  }, []);

  // Main countdown timer
  useEffect(() => {
    if (!enabled) return;

    reset();

    const interval = setInterval(() => {
      remainingRef.current -= TICK_MS;

      const next = Math.max(remainingRef.current, 0);
      setRemainingMs(next);

      // Show popup once at 5s remaining
      if (!popupShownRef.current && next <= POPUP_AT_MS) {
        popupShownRef.current = true;
        onPopupRef.current();
      }

      // Timeout
      if (next === 0) {
        onTimeoutRef.current();
      }
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [enabled, reset]);

  // Auto-reset on user activity (but NOT after popup is shown)
  useEffect(() => {
    if (!enabled) return;

    const handleActivity = () => {
      // Ignore background activity when popup is visible
      if (popupShownRef.current) return;
      reset();
    };

    const events = ["click", "keydown", "mousemove"];
    events.forEach(evt =>
      window.addEventListener(evt, handleActivity)
    );

    return () => {
      events.forEach(evt =>
        window.removeEventListener(evt, handleActivity)
      );
    };
  }, [enabled, reset]);

  return {
    remainingMs,
    remainingSeconds: formatMMSS(remainingMs),
    reset,
  };
}
