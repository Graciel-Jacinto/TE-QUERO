export default function Button({
  children, variant = 'primary', size = 'md',
  className = '', loading = false, ...props
}) {
  const base =
    'inline-flex items-center justify-center font-semibold rounded-xl transition disabled:opacity-60 disabled:cursor-not-allowed';
  const variants = {
    primary:  'bg-brand-600 text-white hover:bg-brand-700 shadow-sm',
    outline:  'border-2 border-brand-600 text-brand-700 hover:bg-brand-50',
    ghost:    'text-gray-700 hover:bg-gray-100',
    whatsapp: 'bg-green-500 text-white hover:bg-green-600 shadow-sm',
    danger:   'bg-red-600 text-white hover:bg-red-700',
    google:   'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          A processar...
        </span>
      ) : children}
    </button>
  );
}