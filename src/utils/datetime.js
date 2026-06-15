import { appConfig } from "../config.js";

/**
 * Returns the current datetime as a SQLite-compatible string (YYYY-MM-DD HH:MM:SS)
 * in the configured local timezone instead of UTC.
 */
export function localDatetime() {
    return new Date().toLocaleString("sv-SE", { timeZone: appConfig.timezone });
}
