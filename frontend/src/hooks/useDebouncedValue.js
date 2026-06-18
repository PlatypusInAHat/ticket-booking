import { useEffect, useState } from 'react';

const useDebouncedValue = (value, delayMs = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [delayMs, value]);

  return debouncedValue;
};

export default useDebouncedValue;
