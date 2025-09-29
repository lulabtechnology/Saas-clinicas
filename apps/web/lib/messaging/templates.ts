export function confirmationTemplate(params: {
  clinic: string;
  service: string;
  professional: string;
  whenLocal: string;
  bookingId: string;
  confirmUrl: string;
}) {
  return [
    `✅ *Confirmación de cita*`,
    `Clínica: ${params.clinic}`,
    `Servicio: ${params.service}`,
    `Profesional: ${params.professional}`,
    `Fecha/Hora: ${params.whenLocal}`,
    ``,
    `Detalle: ${params.confirmUrl}`,
    `\nGracias por reservar con nosotros.`
  ].join("\n");
}

export function reminderTemplate(params: {
  clinic: string;
  service: string;
  professional: string;
  whenLocal: string;
  hoursBefore: number;
  confirmUrl: string;
}) {
  return [
    `⏰ *Recordatorio de cita (${params.hoursBefore}h)*`,
    `Clínica: ${params.clinic}`,
    `Servicio: ${params.service}`,
    `Profesional: ${params.professional}`,
    `Fecha/Hora: ${params.whenLocal}`,
    ``,
    `Detalle: ${params.confirmUrl}`,
    `\nSi no puede asistir, responda a este mensaje.`
  ].join("\n");
}
