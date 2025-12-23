const fs = require("fs");

async function fetchStatus(scope) {
  const url = `https://flag-status.p.rapidapi.com/status/${scope}`;

  // simple retry for 429
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, {
      headers: {
        "x-rapidapi-host": "flag-status.p.rapidapi.com",
        "x-rapidapi-key": process.env.RAPIDAPI_KEY
      }
    });

    if (res.ok) return res.json();

    const text = await res.text().catch(() => "");
    if (res.status === 429 && attempt < 3) {
      // backoff: 1s, 2s
      await new Promise(r => setTimeout(r, attempt * 1000));
      continue;
    }

    throw new Error(`[${scope}] HTTP ${res.status} ${res.statusText} ${text}`.trim());
  }
}

function normalize(scope, s) {
  // Be defensive: providers vary field names
  const half =
    s?.halfStaff === true ||
    s?.half_staff === true ||
    String(s?.status || "").toLowerCase().includes("half");

  const start = s?.startDate || s?.start || s?.from || null;
  const end = s?.endDate || s?.end || s?.to || null;

  const reason =
    s?.reason ||
    s?.title ||
    s?.description ||
    s?.proclamation ||
    null;

  return {
    status: half ? "HALF STAFF" : "FULL STAFF",
    reason,
    start,
    end
  };
}

(async () => {
  if (!process.env.RAPIDAPI_KEY) throw new Error("Missing RAPIDAPI_KEY secret");

  let usRaw = null, flRaw = null;
  let usError = null, flError = null;

  try { usRaw = await fetchStatus("US"); } catch (e) { usError = String(e.message || e); }
  try { flRaw = await fetchStatus("FL"); } catch (e) { flError = String(e.message || e); }

  const output = {
    updated: new Date().toISOString(),
    us: usRaw ? { ...normalize("US", usRaw), _error: null } : { status: "UNKNOWN", reason: null, start: null, end: null, _error: usError },
    florida: flRaw ? { ...normalize("FL", flRaw), _error: null } : { status: "UNKNOWN", reason: null, start: null, end: null, _error: flError }
  };

  fs.writeFileSync("status.json", JSON.stringify(output, null, 2));
  console.log("Updated status.json");
})();
