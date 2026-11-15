/** Jauge de niveau de stock : rouge en rupture, orange sous le seuil, vert sinon. */
export function StockBar({ available, min, target }: { available: number; min: number; target: number }) {
  const full = Math.max(target, min * 2, available, 1);
  const width = Math.max(Math.min((Math.max(available, 0) / full) * 100, 100), available > 0 ? 6 : 0);
  const color = available <= 0 ? "#d1362a" : available <= min ? "#cf9a00" : "#12824a";
  return (
    <span className="relative block h-1.5 w-full overflow-hidden rounded-full bg-ink/10" aria-hidden="true">
      <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${width}%`, backgroundColor: color }} />
      {min > 0 && <span className="absolute inset-y-0 w-px bg-ink/50" style={{ left: `${Math.min((min / full) * 100, 100)}%` }} />}
    </span>
  );
}
