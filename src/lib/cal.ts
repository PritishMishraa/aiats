const CAL_API_BASE = "https://api.cal.com/v2";
const CAL_API_VERSION = "2024-09-04";
const COMPANY_CALENDAR = {
  username: "pritish",
  eventTypeSlug: "30min",
  calendarUrl: "https://cal.com/pritish/30min",
  timeZone: "Asia/Kolkata",
} as const;

type CalEventType = {
  id: number;
  title: string;
  lengthInMinutes: number;
};

type CalBooking = {
  uid: string;
  start: string;
  end: string;
  meetingUrl?: string | null;
  hosts?: Array<{ name?: string; username?: string }>;
};

function headers() {
  const apiKey = process.env.CAL_API_KEY;
  if (!apiKey) throw new Error("Cal.com is not configured");
  return {
    Authorization: `Bearer ${apiKey}`,
    "cal-api-version": CAL_API_VERSION,
  };
}

async function cal<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${CAL_API_BASE}${path}`, {
    ...init,
    headers: { ...headers(), "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const payload = (await response.json()) as { data?: T; error?: { message?: string } | string };
  if (!response.ok || !payload.data) {
    const message = typeof payload.error === "string" ? payload.error : payload.error?.message;
    throw new Error(message || "Cal.com request failed");
  }
  return payload.data;
}

function nextDayInCompanyTimeZone() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: COMPANY_CALENDAR.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(new Date())
    .reduce<Record<string, string>>((result, part) => ({ ...result, [part.type]: part.value }), {});
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

async function companyInterviewEventType() {
  const eventTypes = await cal<CalEventType[]>(
    `/event-types?username=${COMPANY_CALENDAR.username}`,
    { headers: { "cal-api-version": "2024-06-14" } },
  );
  const eventType = eventTypes.find(
    (item) => item.lengthInMinutes === 30 && item.title === "30 Min Meeting",
  );
  if (!eventType) throw new Error("The company 30-minute Cal.com event type was not found");
  return eventType;
}

export async function scheduleCompanyInterview(candidate: { id: string; name: string; email: string; jobTitle: string; techLeadEmail: string }) {
  const eventType = await companyInterviewEventType();
  const day = nextDayInCompanyTimeZone();
  const slots = await cal<Record<string, Array<{ start: string }>>>(
    `/slots?eventTypeId=${eventType.id}&start=${day}&end=${day}&timeZone=${COMPANY_CALENDAR.timeZone}&duration=30`,
  );
  const slot = Object.values(slots).flat()[0];
  if (!slot) throw new Error("No 30-minute interview slots are available tomorrow");

  const booking = await cal<CalBooking>("/bookings", {
    method: "POST",
    headers: { "cal-api-version": "2024-08-13" },
    body: JSON.stringify({
      start: new Date(slot.start).toISOString(),
      eventTypeId: eventType.id,
      attendee: { name: candidate.name, email: candidate.email, timeZone: COMPANY_CALENDAR.timeZone },
      guests: [candidate.techLeadEmail],
      metadata: {
        source: "hireflow",
        applicationId: candidate.id,
        interviewTitle: `Interview — ${candidate.name} · ${candidate.jobTitle}`,
      },
    }),
  });

  return {
    booking,
    calendarUrl: COMPANY_CALENDAR.calendarUrl,
    calendarName: "Company interview calendar",
  };
}

export const companyCalendar = COMPANY_CALENDAR;
