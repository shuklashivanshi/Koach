/** Calendar day in IST as YYYY-MM-DD. */
export const istDay = (d: Date) =>
  new Date(d.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);

/** Local "HH:MM" in IST. */
export const istClock = (d: Date) =>
  new Date(d.getTime() + 5.5 * 3_600_000).toISOString().slice(11, 16);
