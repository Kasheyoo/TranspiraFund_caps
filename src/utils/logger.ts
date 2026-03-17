/** Safe logger — only outputs in development builds. Prevents stack trace leaks in production. */
export const logger = {
  error: (...args: unknown[]) => {
    if (__DEV__) console.error(...args);
  },
  warn: (...args: unknown[]) => {
    if (__DEV__) console.warn(...args);
  },
  log: (...args: unknown[]) => {
    if (__DEV__) console.log(...args);
  },
};
