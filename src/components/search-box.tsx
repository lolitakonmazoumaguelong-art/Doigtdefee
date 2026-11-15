/** Recherche simple : recharge la page avec ?q=... (fonctionne sans JavaScript). */
export function SearchBox({
  q,
  placeholder,
  hidden = {},
}: {
  q: string;
  placeholder: string;
  hidden?: Record<string, string | undefined>;
}) {
  return (
    <form role="search" className="flex gap-2">
      {Object.entries(hidden).map(([name, value]) => (value ? <input key={name} type="hidden" name={name} value={value} /> : null))}
      <label className="sr-only" htmlFor="q">
        {placeholder}
      </label>
      <input id="q" name="q" type="search" defaultValue={q} placeholder={placeholder} className="input" />
      <button className="btn btn-ghost">Search</button>
    </form>
  );
}

export const matchesQuery = (q: string, ...fields: (string | null | undefined)[]) => {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const haystack = fields.filter(Boolean).join(" ").toLowerCase();
  return words.every((w) => haystack.includes(w));
};
