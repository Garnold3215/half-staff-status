const fs = require("fs");

async function fetchEvents(scope) {
  const url = `https://flag-status.p.rapidapi.com/events/${scope}`;
  const res = await fetch(url, {
    headers: {
      "x-rapidapi-host": "flag-status.p.rapidapi.com",
      "x-rapidapi-key": process.env.RAPIDAPI_KEY
    }
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`[${scope}] HTTP ${res.status} ${res.statusText} ${text}`.trim());
  }

  return res.json();
}

function summarize(events) {
  if (Array.isArray(events) && events.length > 0) {
    const e = events[0];
    return {
      status: "HALF STAFF",
      reason: e.title || e.reason || e.description || null,
      start: e.start || e.startDate || null,
      end: e.end || e.endDate || null
    };
  }
  return {
    status: "FULL STAFF",
    reason: null,
    start: null,
    end: null
  };
}

async function fetchFirstWorking(scopes) {
  const errors = [];
  for (const s of scopes) {
    try {
      return { scopeUsed: s, events: await fetchEvents(s), error: null };
    } catch (e) {
      errors.push(String(e.message || e));
    }
  }
  return { scopeUsed: null, events: [], error: errors.join(" | ") };
}

(async () => {
  if (!process.env.RAPIDAPI_KEY) {
    throw new Error("Missing RAPIDAPI_KEY secret");
  }

  // US: try common codes in order. Keep working even if all fail.
  const usResult = await fetchFirstWorking(["US", "USA"]);

  // FL should always work if state codes work
  let flEvents = [];
  let flError = null;
  try {
    flEvents = await fetchEvents("FL");
  } catch (e) {
    flError = String(e.message || e);
    flEvents = [];
  }

  const output = {
    updated: new Date().toISOString(),
    us: { ...summarize(usResult.events), _scopeUsed: usResult.scopeUsed, _error: usResult.error },
    florida: { ...summarize(flEvents), _error: flError }
  };

  fs.writeFileSync("status.json", JSON.stringify(output, null, 2));
  console.log("Updated status.json");
})();
