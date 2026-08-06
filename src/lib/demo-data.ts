export type JobStatus = "Live" | "Draft" | "Review";

export const jobs = [
  { id: "backend-engineer", title: "Senior Backend Engineer", team: "Engineering", location: "Bengaluru · Hybrid", type: "Full-time", status: "Live" as JobStatus, candidates: 24, strong: 5, updated: "12 min ago" },
  { id: "product-designer", title: "Product Designer", team: "Design", location: "Remote · India", type: "Full-time", status: "Live" as JobStatus, candidates: 18, strong: 3, updated: "2 hr ago" },
  { id: "growth-lead", title: "Growth Marketing Lead", team: "Marketing", location: "Mumbai · Hybrid", type: "Full-time", status: "Review" as JobStatus, candidates: 0, strong: 0, updated: "Yesterday" },
  { id: "frontend-intern", title: "Frontend Engineering Intern", team: "Engineering", location: "Remote", type: "Internship", status: "Draft" as JobStatus, candidates: 0, strong: 0, updated: "3 days ago" },
];

export const candidates = [
  { name: "Maya Rao", role: "Senior Backend Engineer", score: 91, fit: "Strong fit", stage: "Interview", initials: "MR", tone: "bg-violet-100 text-violet-700" },
  { name: "Arjun Mehta", role: "Senior Backend Engineer", score: 84, fit: "Strong fit", stage: "Review", initials: "AM", tone: "bg-sky-100 text-sky-700" },
  { name: "Nia Kapoor", role: "Product Designer", score: 72, fit: "Potential fit", stage: "Review", initials: "NK", tone: "bg-amber-100 text-amber-700" },
  { name: "Dev Shah", role: "Senior Backend Engineer", score: 68, fit: "Potential fit", stage: "Applied", initials: "DS", tone: "bg-emerald-100 text-emerald-700" },
];

export const activities = [
  { title: "Maya booked an interview", detail: "Senior Backend Engineer · Aug 8, 11:30 AM", time: "8m", color: "bg-emerald-500" },
  { title: "3 applications evaluated", detail: "Senior Backend Engineer", time: "26m", color: "bg-violet-500" },
  { title: "Job published successfully", detail: "Product Designer · Careers portal", time: "2h", color: "bg-sky-500" },
  { title: "Rubric awaiting approval", detail: "Growth Marketing Lead", time: "1d", color: "bg-amber-500" },
];
