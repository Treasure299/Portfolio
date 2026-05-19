const CONFIG = {
  calendarId: "primary",
  ownerEmail: "hellotreasure.work@gmail.com",
  timeZone: "Europe/Warsaw",
  durationMinutes: 30,
  workDays: [1, 2, 3, 4, 5],
  startHour: 10,
  endHour: 17
};

function doGet(e) {
  try {
    const data = e.parameter || {};
    if (data.mode === "availability") {
      const dates = String(data.dates || "")
        .split(",")
        .map((date) => date.trim())
        .filter(Boolean)
        .slice(0, 45);

      const availability = getAvailabilityForDates(dates);

      return publicResponse(e, {
        ok: true,
        availability: availability,
        timeZone: CONFIG.timeZone,
        durationMinutes: CONFIG.durationMinutes
      });
    }

    return publicResponse(e, { ok: true, message: "Treasure booking endpoint is live." });
  } catch (error) {
    return publicResponse(e, { ok: false, error: error.message || String(error) });
  }
}

function doPost(e) {
  try {
    const data = e.parameter || {};
    const validation = validateBooking(data);
    if (!validation.ok) return privateResponse(e, { ok: false, error: validation.error });

    const start = buildDate(data.date, data.time);
    const end = new Date(start.getTime() + CONFIG.durationMinutes * 60 * 1000);

    if (!isSlotAvailable(start, end)) {
      return privateResponse(e, {
        ok: false,
        error: "That time has just been booked. Please choose another slot.",
        code: "slot_unavailable"
      });
    }

    const requestId = Utilities.getUuid();
    const title = "Discovery call with " + data.name;
    const notes = [
      "Project type: " + (data.projectType || "Not specified"),
      "",
      "Client email: " + data.email,
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

    const notification = sendOwnerNotification(data, start, end, created);

    return privateResponse(e, {
      ok: true,
      eventId: created.id,
      meetLink: created.hangoutLink || "",
      ownerNotification: notification
    });
  } catch (error) {
    return privateResponse(e, { ok: false, error: error.message || String(error) });
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

function getAvailabilityForDates(dates) {
  const availability = {};
  const candidates = [];

  dates.forEach((date) => {
    availability[date] = [];

    for (let hour = CONFIG.startHour; hour < CONFIG.endHour; hour += 1) {
      ["00", "30"].forEach((minute) => {
        const time = String(hour).padStart(2, "0") + ":" + minute;
        const start = buildDate(date, time);
        const end = new Date(start.getTime() + CONFIG.durationMinutes * 60 * 1000);

        if (
          !isNaN(start.getTime()) &&
          start.getTime() >= Date.now() + 24 * 60 * 60 * 1000 &&
          CONFIG.workDays.indexOf(start.getDay()) !== -1
        ) {
          candidates.push({ date: date, time: time, start: start, end: end });
        }
      });
    }
  });

  if (!candidates.length) return availability;

  const rangeStart = new Date(Math.min.apply(null, candidates.map((slot) => slot.start.getTime())));
  const rangeEnd = new Date(Math.max.apply(null, candidates.map((slot) => slot.end.getTime())));
  const events = getCalendar().getEvents(rangeStart, rangeEnd);

  candidates.forEach((slot) => {
    if (!hasEventConflict(events, slot.start, slot.end)) {
      availability[slot.date].push(slot.time);
    }
  });

  return availability;
}

function isSlotAvailable(start, end) {
  return !hasEventConflict(getCalendar().getEvents(start, end), start, end);
}

function hasEventConflict(events, start, end) {
  return events.some((event) => event.getStartTime() < end && event.getEndTime() > start);
}

function getCalendar() {
  const calendar = CalendarApp.getCalendarById(CONFIG.calendarId);
  if (!calendar) throw new Error("Calendar could not be found.");
  return calendar;
}

function buildDate(date, time) {
  const parts = date.split("-").map(Number);
  const timeParts = time.split(":").map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2], timeParts[0], timeParts[1], 0, 0);
}

function sendOwnerNotification(data, start, end, event) {
  const meetLink = event.hangoutLink || "Google Meet link will appear on the calendar event.";
  const eventLink = event.htmlLink || "";
  const subject = "New demo booked: " + data.name;
  const plainBody = [
    "A new demo call was booked from your portfolio.",
    "",
    "Name: " + data.name,
    "Email: " + data.email,
    "Project type: " + (data.projectType || "Not specified"),
    "When: " + formatDateTime(start) + " - " + formatDateTime(end),
    "Meet: " + meetLink,
    eventLink ? "Calendar event: " + eventLink : "",
    "",
    "Notes:",
    data.notes || "No notes added."
  ].filter(Boolean).join("\n");

  const htmlBody = [
    "<p>A new demo call was booked from your portfolio.</p>",
    "<p><strong>Name:</strong> " + escapeHtml(data.name) + "<br>",
    "<strong>Email:</strong> " + escapeHtml(data.email) + "<br>",
    "<strong>Project type:</strong> " + escapeHtml(data.projectType || "Not specified") + "<br>",
    "<strong>When:</strong> " + escapeHtml(formatDateTime(start)) + " - " + escapeHtml(formatDateTime(end)) + "<br>",
    "<strong>Meet:</strong> <a href=\"" + escapeHtml(meetLink) + "\">" + escapeHtml(meetLink) + "</a></p>",
    eventLink ? "<p><a href=\"" + escapeHtml(eventLink) + "\">Open calendar event</a></p>" : "",
    "<p><strong>Notes:</strong><br>" + escapeHtml(data.notes || "No notes added.").replace(/\n/g, "<br>") + "</p>"
  ].join("");

  try {
    MailApp.sendEmail({
      to: CONFIG.ownerEmail,
      subject: subject,
      body: plainBody,
      htmlBody: htmlBody,
      replyTo: data.email,
      name: "Treasure Vaultr Booking"
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

function authorizeBookingServices() {
  const calendar = CalendarApp.getCalendarById(CONFIG.calendarId);
  if (!calendar) throw new Error("Calendar could not be found.");

  MailApp.sendEmail({
    to: CONFIG.ownerEmail,
    subject: "Treasure booking notifications are enabled",
    body: "Your portfolio booking form can now send owner notification emails."
  });

  return "Booking calendar and email permissions are ready.";
}

function formatDateTime(date) {
  return Utilities.formatDate(date, CONFIG.timeZone, "EEE, MMM d yyyy, h:mm a");
}

function publicResponse(e, payload) {
  if ((e.parameter || {}).responseMode === "message") {
    return messageResponse(payload);
  }

  const callback = (e.parameter || {}).callback;
  if (callback && /^[a-zA-Z_$][\w$]*(\.[a-zA-Z_$][\w$]*)*$/.test(callback)) {
    return ContentService
      .createTextOutput(callback + "(" + JSON.stringify(payload).replace(/</g, "\\u003c") + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return json(payload);
}

function privateResponse(e, payload) {
  if ((e.parameter || {}).responseMode === "message") {
    return messageResponse(payload);
  }

  return json(payload);
}

function messageResponse(payload) {
  return HtmlService
    .createHtmlOutput(
      "<script>window.parent.postMessage({source:'treasure-booking',payload:" +
      JSON.stringify(payload).replace(/</g, "\\u003c") +
      "},'*');</script>"
    )
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function json(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
