const fs = require("fs");

async function fetchEvents(scope) {
  const res = await fetch(`https://flag-status.p.rapidapi.com/events/${scope}`, {
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
      reason: e.title || e.reason || e.description || e.name || null
    };
  }
  return {
    status: "FULL STAFF",
    reason: null
  };
}

(async () => {
  if (!process.env.RAPIDAPI_KEY) {
    throw new Error("Missing RAPIDAPI_KEY secret");
  }

  const [usEvents, flEvents] = await Promise.all([
    fetchEvents("US"),
    fetchEvents("FL")
  ]);

  const output = {
    updated: new Date().toISOString(),
    us: summarize(usEvents),
    florida: summarize(flEvents)
  };

  fs.writeFileSync("status.json", JSON.stringify(output, null, 2));
  console.log("Updated status.json");
})();
