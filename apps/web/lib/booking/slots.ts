// Utilidades puras para generar slots a partir de availability y duración

export type AvailabilityRow = {
  weekday: number;           // 0=domingo ... 6=sábado (en DB usamos 0-6)
  start_time: string;        // "HH:MM"
  end_time: string;          // "HH:MM"
  slot_size_minutes: number; // p.ej. 15
};

export type BookingWindow = {
  start: string;             // "HH:MM"
  end: string;               // "HH:MM"
};

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function toHHMM(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function buildSlotsForDay(
  dayAvail: AvailabilityRow[],
  serviceDuration: number,
  existingBookings: BookingWindow[],
): string[] {
  // Marca ocupación en minutos con ventanas existentes
  const busy: [number, number][] = existingBookings.map(b => [toMinutes(b.start), toMinutes(b.end)]);

  const slots: string[] = [];
  for (const a of dayAvail) {
    const start = toMinutes(a.start_time);
    const end = toMinutes(a.end_time);
    for (let t = start; t + serviceDuration <= end; t += a.slot_size_minutes) {
      const slotEnd = t + serviceDuration;
      // ¿choca con alguna ocupación?
      const overlaps = busy.some(([b0, b1]) => !(slotEnd <= b0 || t >= b1));
      if (!overlaps) slots.push(toHHMM(t));
    }
  }
  // Orden y únicos
  return Array.from(new Set(slots)).sort();
}
