export const CRM_STATUSES = ["requested", "confirmed", "scheduled", "completed", "cancelled", "rescheduled", "no_show"];

export function buildPatientCrmRows(appointments = [], patients = []) {
  const patientById = new Map(patients.map((patient) => [String(patient.id), patient]));
  return appointments
    .filter((appointment) => appointment && appointment.id != null)
    .map((appointment) => {
      const patient = patientById.get(String(appointment.patient_id));
      return {
        id: String(appointment.id),
        appointmentId: appointment.id,
        patientId: appointment.patient_id,
        patientName: appointment.patient_name || patient?.name || "Patient",
        phone: patient?.phone || appointment.patient_phone || "Not recorded",
        startsAt: appointment.starts_at || null,
        visitType: appointment.treatment_type || "Dental visit",
        status: CRM_STATUSES.includes(String(appointment.status || "").toLowerCase())
          ? String(appointment.status).toLowerCase()
          : "requested",
      };
    })
    .sort((a, b) => {
      const left = new Date(a.startsAt || 0).getTime();
      const right = new Date(b.startsAt || 0).getTime();
      return (Number.isFinite(right) ? right : 0) - (Number.isFinite(left) ? left : 0);
    });
}

export function getPatientCrmSummary(rows = []) {
  return {
    total: rows.length,
    awaiting: rows.filter((row) => row.status === "requested").length,
    booked: rows.filter((row) => ["confirmed", "scheduled", "rescheduled"].includes(row.status)).length,
    completed: rows.filter((row) => row.status === "completed").length,
    noShows: rows.filter((row) => row.status === "no_show").length,
  };
}
