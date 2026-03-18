import { X } from 'lucide-react';

const TYPE_STYLE = {
  parked:            'border-emerald-300 bg-emerald-50',
  accepted:          'border-blue-300 bg-blue-50',
  returning:         'border-blue-400 bg-blue-50',
  arrived:           'border-emerald-400 bg-emerald-50',
  done:              'border-gray-300 bg-white',
  recovery_request:  'border-red-400 bg-red-50',
  default:           'border-gray-300 bg-white',
};
const TYPE_ICON = {
  parked:'🅿️', accepted:'🚗', returning:'🚗', arrived:'✅', done:'🎉',
  recovery_request:'🔔', default:'📢',
};

function Toast({ t, onRemove }) {
  const cls  = TYPE_STYLE[t.type] || TYPE_STYLE.default;
  const icon = TYPE_ICON[t.type]  || TYPE_ICON.default;
  return (
    <div className={`flex items-start gap-3 w-80 p-4 rounded-2xl border-2 shadow-xl ${cls} animate-slide-in`}>
      <span className="text-xl shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 leading-tight">{t.title}</p>
        {t.body && <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{t.body}</p>}
      </div>
      <button onClick={() => onRemove(t.id)} className="shrink-0 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function Toasts({ toasts, onRemove }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <Toast t={t} onRemove={onRemove} />
        </div>
      ))}
    </div>
  );
}
