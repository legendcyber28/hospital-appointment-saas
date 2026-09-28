// Demo WhatsApp AI: rule-based state machine (Hindi/English/Hinglish).
// NEVER invents doctors, fees or slots - everything comes from the DB via
// the functions below (mirrors the brief's tool-calling rule).
// When AI_API_KEY is set this module can be swapped for an LLM with the
// same tool surface; the state machine stays as the deterministic core.
import { prisma } from "./db";
import { getAvailableSlots, bookAppointment, todayLocal } from "./slots";

type ConvState = {
  step: string;
  departmentId?: string;
  doctorId?: string;
  date?: string;
  slots?: string[];
  doctors?: string[];
  appointmentId?: string;
};

const r = (n: number) => `₹${n}`;
const tomorrow = () => {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function detectIntent(text: string): string {
  const t = text.toLowerCase();
  if (/(human|staff|agent|insaan|bande? se baat|baat karni hai)/.test(t)) return "HANDOFF";
  if (/(cancel|rahd|kaat)/.test(t)) return "CANCEL";
  if (/(reschedule|time change|dobara time)/.test(t)) return "RESCHEDULE";
  if (/(fee|fees|charge|kitna|kitne|cost|price)/.test(t)) return "FEES";
  if (/(address|kaha|kahan|location|pata|direction)/.test(t)) return "ADDRESS";
  if (/(available|availability|slot|kab milega|kab hai)/.test(t)) return "AVAILABILITY";
  if (/(book|appointment|dikhana|chahiye|milna|consult)/.test(t)) return "BOOK";
  if (/(hi|hello|namaste|namaskar|hey|salaam)/.test(t) && t.length < 30) return "GREET";
  return "BOOK"; // default: treat as a booking request
}

async function listDepartments(orgId: string) {
  return prisma.department.findMany({ where: { organizationId: orgId }, orderBy: { name: "asc" } });
}

async function doctorsText(orgId: string, departmentId?: string) {
  const doctors = await prisma.doctor.findMany({
    where: { organizationId: orgId, status: "ACTIVE", ...(departmentId ? { departmentId } : {}) },
    include: { department: true },
    orderBy: { name: "asc" },
  });
  if (doctors.length === 0) return { text: "Is department me abhi koi doctor available nahi hai. Kripya doosra department chunein.", doctors };
  const lines = doctors.map((d, i) => `${i + 1}. Dr. ${d.name} (${d.specialization || d.department?.name || "GP"}) - ${r(d.consultFee)}`);
  return { text: `Available doctors:\n${lines.join("\n")}\n\nDoctor ka number bhejein (jaise: 1)`, doctors };
}

async function slotsText(doctorId: string, date: string) {
  const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
  const slots = await getAvailableSlots(doctorId, date);
  if (!doctor) return { text: "Doctor nahi mila.", slots: [] as string[] };
  if (slots.length === 0) return { text: `Dr. ${doctor.name} ${date} ko available nahi hain. Doosri date try karein (jaise: kal, ${tomorrow()}).`, slots: [] as string[] };
  const show = slots.slice(0, 8);
  return { text: `Dr. ${doctor.name} - ${date} ke available slots:\n${show.join("  ")}\n\nSlot time bhejein (jaise: ${show[0]})`, slots };
}

export async function handlePatientMessage(args: {
  conversationId: string;
  organizationId: string;
  patientPhone: string;
  patientName?: string;
  text: string;
}): Promise<{ replies: string[] }> {
  const { organizationId, patientPhone, text } = args;
  const conv = await prisma.conversation.findUnique({ where: { id: args.conversationId } });
  if (!conv) throw new Error("conversation not found");

  await prisma.conversationMessage.create({ data: { conversationId: conv.id, sender: "PATIENT", body: text } });

  // Human handoff active: AI stays silent.
  if (conv.mode === "HUMAN") return { replies: [] };

  const state: ConvState = (() => { try { return JSON.parse(conv.state); } catch { return { step: "START" }; } })();
  const replies: string[] = [];
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });

  const intent = detectIntent(text);

  if (intent === "HANDOFF") {
    await prisma.conversation.update({ where: { id: conv.id }, data: { mode: "HUMAN", state: JSON.stringify(state) } });
    replies.push("Theek hai, aapko hamari team se jod raha hoon. Staff jald hi reply karega. (Human handoff)");
    await prisma.conversationMessage.create({ data: { conversationId: conv.id, sender: "AI", body: replies[replies.length - 1] } });
    return { replies };
  }

  if (intent === "ADDRESS") {
    replies.push(`${org?.name} ka pata: ${[org?.address, org?.city, org?.state, org?.pincode].filter(Boolean).join(", ") || "address configure nahi hua"}. Phone: ${org?.phone || "-"}`);
  } else if (intent === "FEES") {
    const { text: t } = await doctorsText(organizationId);
    replies.push(`Hamare doctors ki consultation fees:\n${t.split("\n").slice(1, -1).join("\n")}`);
    state.step = "START";
  } else if (intent === "CANCEL" || intent === "RESCHEDULE") {
    const patient = await prisma.patient.findFirst({ where: { organizationId, whatsappNumber: patientPhone } });
    const appt = patient
      ? await prisma.appointment.findFirst({
          where: { patientId: patient.id, status: { in: ["PENDING", "CONFIRMED"] }, date: { gte: todayLocal() } },
          orderBy: [{ date: "asc" }, { startTime: "asc" }],
          include: { doctor: true },
        })
      : null;
    if (!appt) {
      replies.push("Aapki koi upcoming appointment nahi mili.");
      state.step = "START";
    } else if (intent === "CANCEL") {
      await prisma.appointment.update({ where: { id: appt.id }, data: { status: "CANCELLED" } });
      replies.push(`Aapki appointment (Dr. ${appt.doctor.name}, ${appt.date} ${appt.startTime}) cancel kar di gayi hai.`);
      state.step = "START";
    } else {
      state.step = "RESCHEDULE_SLOT";
      state.appointmentId = appt.id;
      const { text: t, slots } = await slotsText(appt.doctorId, tomorrow());
      state.slots = slots;
      state.doctorId = appt.doctorId;
      state.date = tomorrow();
      replies.push(`Aapki current appointment: Dr. ${appt.doctor.name}, ${appt.date} ${appt.startTime}.\nNaya slot chunein:\n${t}`);
    }
  } else if (state.step === "PICK_DEPT" && /^\d+$/.test(text.trim())) {
    const departments2 = await listDepartments(organizationId);
    const idx = parseInt(text.trim(), 10) - 1;
    if (idx < 0 || idx >= departments2.length) {
      replies.push("Sahi number bhejein jo list me diya gaya hai.");
    } else {
      const dept = departments2[idx];
      state.departmentId = dept.id;
      const { text: dt, doctors } = await doctorsText(organizationId, dept.id);
      if (doctors.length) {
        state.doctors = doctors.map((d) => d.id);
        state.step = "PICK_DOCTOR";
      }
      replies.push(`${dept.name} department:`);
      replies.push(dt);
    }
  } else if (state.step === "PICK_DOCTOR" && /^\d+$/.test(text.trim())) {
    const idx = parseInt(text.trim(), 10) - 1;
    const docIds = state.doctors || [];
    if (idx < 0 || idx >= docIds.length) {
      replies.push("Sahi number bhejein jo list me diya gaya hai.");
    } else {
      state.doctorId = docIds[idx];
      state.date = tomorrow();
      const { text: t, slots } = await slotsText(state.doctorId, state.date);
      state.slots = slots;
      state.step = slots.length ? "PICK_SLOT" : "START";
      replies.push(t);
    }
  } else if (state.step === "PICK_SLOT" || state.step === "RESCHEDULE_SLOT") {
    const m = text.trim().match(/^(\d{1,2})[:.]?(\d{2})?\s*(am|pm)?$/i);
    let hhmm: string | null = null;
    if (m) {
      let h = parseInt(m[1], 10);
      const min = m[2] ? parseInt(m[2], 10) : 0;
      if (m[3]) {
        const ap = m[3].toLowerCase();
        if (ap === "pm" && h < 12) h += 12;
        if (ap === "am" && h === 12) h = 0;
      }
      const cand = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
      if ((state.slots || []).includes(cand)) hhmm = cand;
    }
    if (!hhmm) {
      replies.push(`Ye slot available nahi hai. Inme se chunein: ${(state.slots || []).slice(0, 8).join("  ")}`);
    } else if (state.step === "RESCHEDULE_SLOT") {
      const appt = await prisma.appointment.findUnique({ where: { id: state.appointmentId! } });
      if (appt) {
        await prisma.appointment.update({ where: { id: appt.id }, data: { date: state.date!, startTime: hhmm } });
        replies.push(`Done! Aapki appointment ab ${state.date} ko ${hhmm} hai.`);
      }
      state.step = "START";
    } else {
      // finalize booking
      let patient = await prisma.patient.findFirst({ where: { organizationId, whatsappNumber: patientPhone } });
      if (!patient) {
        patient = await prisma.patient.create({
          data: { organizationId, whatsappNumber: patientPhone, name: args.patientName || "WhatsApp Patient" },
        });
      }
      const doctor = await prisma.doctor.findUnique({ where: { id: state.doctorId! } });
      try {
        const appt = await bookAppointment({
          organizationId,
          branchId: doctor?.branchId,
          doctorId: state.doctorId!,
          patientId: patient.id,
          date: state.date!,
          startTime: hhmm,
          source: "WHATSAPP",
        });
        replies.push(
          `Appointment confirmed!\n\nDoctor: Dr. ${doctor?.name}\nDate: ${state.date}\nTime: ${hhmm}\nFees: ${r(doctor?.consultFee ?? 0)}\nBooking ID: ${appt.id.slice(-6).toUpperCase()}\n\n${org?.name}, ${org?.city || ""} pe aayein. Dhanyavaad!`
        );
      } catch {
        replies.push("Maaf kijiye, wo slot abhi book ho gaya. Doosra slot chunein.");
        const { text: t, slots } = await slotsText(state.doctorId!, state.date!);
        state.slots = slots;
        replies.push(t);
      }
      if (state.step === "PICK_SLOT") state.step = "START";
    }
  } else {
    // BOOK / AVAILABILITY / GREET / fallback: find department match, else list departments
    const departments = await listDepartments(organizationId);
    const t = text.toLowerCase();
    const dept = departments.find((d) => t.includes(d.name.toLowerCase()))
      || departments.find((d) => {
        const map: Record<string, string[]> = {
          dermatology: ["skin", "twach", "derma"], dental: ["daant", "daat", "teeth", "tooth", "dent"],
          pediatrics: ["bachch", "child", "baby", "paediatr", "pediatr"], orthopedics: ["haddi", "bone", "joint", "ortho", "ghutn"],
          ent: ["kaan", "ear", "nose", "naak", "gala", "throat"], cardiology: ["dil", "heart", "cardi"],
          gynecology: ["mahila", "women", "pregnan", "gynae"], "general medicine": ["fever", "bukhar", "general", "physician", "sar dard", "sardi", "khansi"],
        };
        return (map[d.name.toLowerCase()] || []).some((k) => t.includes(k));
      });
    if (dept) {
      state.departmentId = dept.id;
      const { text: dt, doctors } = await doctorsText(organizationId, dept.id);
      if (doctors.length) {
        state.doctors = doctors.map((d) => d.id);
        state.step = "PICK_DOCTOR";
      }
      replies.push(`Bilkul! ${dept.name} department:`);
      replies.push(dt);
    } else if (departments.length) {
      state.step = "PICK_DEPT";
      state.doctors = departments.map((d) => d.id);
      replies.push(
        `Namaste! ${org?.name} me aapka swagat hai.\n\nHamare departments:\n${departments.map((d, i) => `${i + 1}. ${d.name}`).join("\n")}\n\nAapko kis department ka doctor chahiye? (jaise: "mujhe skin doctor chahiye")`
      );
    } else {
      replies.push("Namaste! Abhi is hospital me departments configure nahi hue. Staff se baat ke liye 'human' likhein.");
    }
  }

  await prisma.conversation.update({ where: { id: conv.id }, data: { state: JSON.stringify(state) } });
  for (const body of replies) {
    await prisma.conversationMessage.create({ data: { conversationId: conv.id, sender: "AI", body } });
  }
  return { replies };
}
