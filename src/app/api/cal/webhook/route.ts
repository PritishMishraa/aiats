import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { applications, interviews } from "@/db/schema";

export async function POST(request: Request) {
  const body = await request.text();
  const secret = process.env.CAL_WEBHOOK_SECRET;
  const signature = request.headers.get("x-cal-signature-256");
  if (secret) {
    const expected = createHmac("sha256", secret).update(body).digest("hex");
    if (!signature || signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return new Response("Invalid signature", { status: 401 });
  }
  const payload = JSON.parse(body), trigger = payload.triggerEvent ?? payload.type, data = payload.payload ?? payload.data ?? payload;
  const email = data.attendees?.[0]?.email ?? data.attendee?.email;
  if (!email) return Response.json({ ok: true, ignored: true });
  const [application] = await getDb().select().from(applications).where(eq(applications.candidateEmail, email)).limit(1);
  if (!application) return Response.json({ ok: true, ignored: true });
  if (/BOOKING_CREATED|BOOKING_RESCHEDULED/i.test(trigger ?? "")) {
    await getDb().update(interviews).set({ bookingUid: data.uid ?? data.bookingUid, startAt: data.startTime ? new Date(data.startTime) : data.start ? new Date(data.start) : null, endAt: data.endTime ? new Date(data.endTime) : data.end ? new Date(data.end) : null, meetingUrl: data.metadata?.videoCallUrl ?? data.location, status: "scheduled" }).where(eq(interviews.applicationId, application.id));
    await getDb().update(applications).set({ status: "interview_scheduled" }).where(eq(applications.id, application.id));
  } else if (/BOOKING_CANCELLED/i.test(trigger ?? "")) {
    await getDb().update(interviews).set({ status: "cancelled" }).where(eq(interviews.applicationId, application.id));
    await getDb().update(applications).set({ status: "interview_invited" }).where(eq(applications.id, application.id));
  }
  return Response.json({ ok: true });
}
