export default function Logo({ size = 'md' }) {
  const sizes = { sm: 'text-xl', md: 'text-2xl', lg: 'text-4xl' };
  return (
    <div className={`font-extrabold tracking-tight ${sizes[size]}`}>
      <span className="text-brand-600">Te</span>{' '}
      <span className="text-gray-900">Quero</span>
      <span className="text-brand-500">.</span>
    </div>
  );
}