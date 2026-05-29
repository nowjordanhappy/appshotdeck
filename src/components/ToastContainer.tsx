import { X, AlertCircle, CheckCircle, Info } from 'lucide-react'
import { useToastStore } from '../store/useToastStore'

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()
  if (!toasts.length) return null

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg pointer-events-auto w-80 text-sm text-white ${
            toast.type === 'error'   ? 'bg-red-500' :
            toast.type === 'success' ? 'bg-emerald-500' :
                                       'bg-gray-800'
          }`}
        >
          {toast.type === 'error'   && <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
          {toast.type === 'success' && <CheckCircle  className="w-4 h-4 flex-shrink-0 mt-0.5" />}
          {toast.type === 'info'    && <Info         className="w-4 h-4 flex-shrink-0 mt-0.5" />}
          <span className="flex-1 leading-snug">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity mt-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
