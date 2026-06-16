import Link from "next/link";

// Widget de calendario estilo iOS: mes actual, hoy en círculo rojo, días con deadline
// marcados con un punto rojo. Todo el widget enlaza a /calendar. Server component.
// Semana inicia lunes (igual que el calendario principal).
const DIAS = ["L", "M", "X", "J", "V", "S", "D"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function ymd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function MiniCalendar({
  deadlineDates,
  projectId,
}: {
  deadlineDates: string[];
  projectId: string;
}) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const todayStr = ymd(today);
  const deadlineSet = new Set(deadlineDates);

  const monthLabel = today.toLocaleString("es-ES", { month: "long" }).toUpperCase();

  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7; // 0 = lunes
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const total = Math.ceil((lead + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: total }, (_, i) => {
    const d = new Date(year, month, 1 - lead + i);
    return { date: d, str: ymd(d), inMonth: d.getMonth() === month };
  });

  return (
    <Link
      href="/calendar"
      aria-label="Ver en calendario"
      data-project={projectId}
      className="block w-56 cursor-pointer rounded-2xl bg-white p-3 shadow-sm ring-1 ring-gray-100 transition hover:shadow-md"
    >
      <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-red-500">
        {monthLabel}
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7">
        {DIAS.map((d, i) => (
          <div key={i} className="pb-1 text-center text-[10px] font-medium text-gray-400">
            {d}
          </div>
        ))}
      </div>

      {/* Días del mes */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((cell) => {
          const isToday = cell.str === todayStr;
          const hasDeadline = deadlineSet.has(cell.str);
          return (
            <div key={cell.str} className="flex flex-col items-center">
              <span
                className={[
                  "flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
                  isToday
                    ? "bg-red-500 font-semibold text-white"
                    : cell.inMonth
                      ? "text-gray-700"
                      : "text-gray-300",
                ].join(" ")}
              >
                {cell.date.getDate()}
              </span>
              {/* Punto rojo si hay deadline (hoy ya está marcado con el círculo). */}
              <span
                className={[
                  "mx-auto mt-0.5 h-1 w-1 rounded-full",
                  hasDeadline && !isToday ? "bg-red-400" : "bg-transparent",
                ].join(" ")}
              />
            </div>
          );
        })}
      </div>
    </Link>
  );
}
