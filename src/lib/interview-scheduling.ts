import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { applications, interviews, jobs, workflowSteps, workspaceSettings } from "@/db/schema";
import { scheduleCompanyInterview } from "@/lib/cal";

export async function scheduleInterview(applicationId: string) {
  const [row] = await getDb()
    .select({ application: applications, job: jobs })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(eq(applications.id, applicationId))
    .limit(1);
  if (!row) throw new Error("Candidate not found");
  const [settings] = await getDb()
    .select({ techLeadEmail: workspaceSettings.techLeadEmail })
    .from(workspaceSettings)
    .where(eq(workspaceSettings.id, "default"))
    .limit(1);
  if (!settings?.techLeadEmail)
    throw new Error("Set the tech lead email in Integrations before scheduling the first meeting.");

  const { booking, calendarUrl } = await scheduleCompanyInterview({
    id: row.application.id,
    name: row.application.candidateName,
    email: row.application.candidateEmail,
    jobTitle: row.job.title,
    techLeadEmail: settings.techLeadEmail,
  });
  const scheduledDescription = `Interview scheduled for ${new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(booking.start))}.`;
  await Promise.all([
    getDb()
      .insert(interviews)
      .values({
        applicationId,
        bookingUid: booking.uid,
        bookingUrl: calendarUrl,
        startAt: new Date(booking.start),
        endAt: new Date(booking.end),
        meetingUrl: booking.meetingUrl ?? null,
        status: "scheduled",
      })
      .onConflictDoUpdate({
        target: interviews.applicationId,
        set: {
          bookingUid: booking.uid,
          bookingUrl: calendarUrl,
          startAt: new Date(booking.start),
          endAt: new Date(booking.end),
          meetingUrl: booking.meetingUrl ?? null,
          status: "scheduled",
        },
      }),
    getDb().update(applications).set({ status: "interview_scheduled" }).where(eq(applications.id, applicationId)),
    getDb()
      .insert(workflowSteps)
      .values({
        applicationId,
        key: "schedule",
        title: "Interview scheduling decision",
        position: 4,
        status: "completed",
        description: scheduledDescription,
        completedAt: new Date(),
        metadata: { bookingUid: booking.uid, calendarUrl },
      })
      .onConflictDoUpdate({
        target: [workflowSteps.applicationId, workflowSteps.key],
        set: {
          title: "Interview scheduling decision",
          status: "completed",
          description: scheduledDescription,
          completedAt: new Date(),
          metadata: { bookingUid: booking.uid, calendarUrl },
          error: null,
        },
      }),
  ]);
  return { start: booking.start, end: booking.end, calendarUrl, meetingUrl: booking.meetingUrl ?? null };
}
