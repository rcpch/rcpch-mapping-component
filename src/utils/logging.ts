// Internal logger — never logs raw patient data by default.
// Patient-level properties are intentionally excluded from all log output.

let _debugMode = false;

export function setDebugMode(enabled: boolean): void {
  _debugMode = enabled;
}

export const logger = {
  debug(message: string, ...args: unknown[]): void {
    if (_debugMode) {
      // eslint-disable-next-line no-console
      console.debug(`[rcpch-imd-map] ${message}`, ...args);
    }
  },
  info(message: string, ...args: unknown[]): void {
    // eslint-disable-next-line no-console
    console.info(`[rcpch-imd-map] ${message}`, ...args);
  },
  warn(message: string, ...args: unknown[]): void {
    // eslint-disable-next-line no-console
    console.warn(`[rcpch-imd-map] ${message}`, ...args);
  },
  error(message: string, ...args: unknown[]): void {
    // eslint-disable-next-line no-console
    console.error(`[rcpch-imd-map] ${message}`, ...args);
  },
};
