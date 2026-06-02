import { useTranslation } from 'react-i18next'

interface Props {
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ message, onConfirm, onCancel }: Props) {
  const { t } = useTranslation()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative surface border border-subtle rounded-xl shadow-2xl p-6 w-80 flex flex-col gap-4">
        <p className="text-sm text-gray-900 dark:text-white">{message}</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-subtle text-muted hover:text-foreground transition-colors"
          >
            {t('confirm.cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors"
          >
            {t('confirm.remove')}
          </button>
        </div>
      </div>
    </div>
  )
}
