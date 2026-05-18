const CONFIG = {
  calendarId: "primary",
  ownerEmail: "hellotreasure.work@gmail.com",
  timeZone: "Europe/Warsaw",
  durationMinutes: 30,
  workDays: [1, 2, 3, 4, 5],
  startHour: 10,
  endHour: 17
};

function doPost(e) {
  try {
    const data = e.parameter || {};
    const validation = validateBooking(data);
    if (!validation.ok) return json({ ok: false, error: validation.error });

    const start = buildDate(data.date, data.time);
    const end = new Date(start.getTime() + CONFIG.durationMinutes * 60 * 1000);
    const requestId = Utilities.getUuid();
    const title = "Discovery call with " + data.name;
    const notes = [
      "Project type: " + (data.projectType || "Not specified"),
      "",
      "Notes:",
      data.notes || "No notes added."
    ].join("\n");

    const event = {
      summary: title,
      description: notes,
      start: {
        dateTime: start.toISOString(),
        timeZone: CONFIG.timeZone
      },
      end: {
        dateTime: end.toISOString(),
        timeZone: CONFIG.timeZone
      },
      attendees: [
        { email: data.email, displayName: data.name },
        { email: CONFIG.ownerEmail, displayName: "Treasure" }
      ],
      conferenceData: {
        createRequest: {
          requestId: requestId,
          conferenceSolutionKey: { type: "hangoutsMeet" }
        }
      },
      guestsCanInviteOthers: false,
      guestsCanModify: false,
      guestsCanSeeOtherGuests: false
    };

    const created = Calendar.Events.insert(event, CONFIG.calendarId, {
      conferenceDataVersion: 1,
      sendUpdates: "all"
    });

    return json({
      ok: true,
      eventId: created.id,
      meetLink: created.hangoutLink || ""
    });
  } catch (error) {
    return json({ ok: false, error: error.message || String(error) });
  }
}

function validateBooking(data) {
  if (!data.name || !data.email || !data.date || !data.time) {
    return { ok: false, error: "Missing required booking details." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return { ok: false, error: "Invalid email address." };
  }

  const start = buildDate(data.date, data.time);
  if (isNaN(start.getTime())) return { ok: false, error: "Invalid date or time." };

  const day = start.getDay();
  const hour = start.getHours();
  const minutes = start.getMinutes();
  if (CONFIG.workDays.indexOf(day) === -1) return { ok: false, error: "Selected day is unavailable." };
  if (hour < CONFIG.startHour || hour >= CONFIG.endHour || (minutes !== 0 && minutes !== 30)) {
    return { ok: false, error: "Selected time is unavailable." };
  }

  if (start.getTime() < Date.now() + 24 * 60 * 60 * 1000) {
    return { ok: false, error: "Please book at least 24 hours ahead." };
  }

  return { ok: true };
}

function buildDate(date, time) {
  const parts = date.split("-").map(Number);
  const timeParts = time.split(":").map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2], timeParts[0], timeParts[1], 0, 0);
}

function json(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
