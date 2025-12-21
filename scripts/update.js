const fs = require("fs");

async function fetchEvents(state) {
  const url = `https://flag-status.p.rapidapi.com/events/${state}`;

  const res = await fetch(url, {
    headers: {
      "x-rapidapi-host": "flag-status.p.rapidapi.com",
      "x-rapidapi-key": process.env.RAPIDAPI_KEY
    }
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText}\n${text}`);
  }

  return res.json();
}

function summarize(events) {
  if (Array.isArray(events) && events.length > 0) {
    const e = events[0];
    return {
      status: "HALF STAFF",
      reason: e.title || e.reason || e.description || e.name || "—"
    };
  }
  return { status: "FULL STAFF", reason: null };
}

(async () => {
  if (!process.env.RAPIDAPI_KEY) {
    throw new Error("Missing RAPIDAPI_KEY secret");
  }

  const flEvents = await fetchEvents("FL");

  const out = {
    updated: new Date().toISOString(),
    florida: summarize(flEvents)
  };

  fs.writeFileSync("status.json", JSON.stringify(out, null, 2));
  console.log("Wrote status.json");
})();

