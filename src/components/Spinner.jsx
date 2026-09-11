export default function Spinner({ full = false }) {
  const s = (
    <div className="h-8 w-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
  );
  if (!full) return s;
  return <div className="min-h-screen flex items-center justify-center">{s}</div>;
}