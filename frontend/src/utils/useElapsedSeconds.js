import { useEffect, useState } from "react";

// Counts whole seconds elapsed while `active` is true, resetting to 0 each
// time it flips back on. Used to give async flows an honest latency readout
// (and a cold-start hint) instead of an indefinite spinner.
export default function useElapsedSeconds(active) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!active) {
      setSeconds(0);
      return undefined;
    }
    const start = Date.now();
    setSeconds(0);
    const id = setInterval(() => {
      setSeconds(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [active]);

  return seconds;
}
