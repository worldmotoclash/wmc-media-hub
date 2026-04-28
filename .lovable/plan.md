## Remove Racer Telemetry demo link from /reports

In `src/pages/reports/ReportsArchive.tsx` (lines 110–115), remove the `<Link to="/racer-performance">Demo · Racer Telemetry →</Link>` element from the page header. The header will then contain only the title and description.

If the `Link` import from `react-router-dom` is no longer used elsewhere in the file, remove it as well to keep the file clean.

No routes or other pages are affected — `/racer-performance` remains accessible directly, just no longer linked from the reports archive.