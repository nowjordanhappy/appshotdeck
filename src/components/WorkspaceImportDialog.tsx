import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  conflictNames: string[]
  total: number
  onConfirm: (replace: boolean) => void
  onCancel: () => void
}

export function WorkspaceImportDialog({ conflictNames, total, onConfirm, onCancel }: Props) {
  const { t } = useTranslation()
  const [replace, setReplace] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative surface border border-subtle rounded-xl shadow-xl w-80 p-5 flex flex-col gap-4">
        <h2 className="font-semibold text-base">{t('workspace.import_title')}</h2>

        <p className="text-sm text-muted">
          {t('workspace.found_projects', { count: total })}
        </p>

        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">{t('workspace.conflicts_label')}</p>
          <ul className="space-y-1.5">
            {conflictNames.map((name) => (
              <li key={name} className="flex items-center gap-2 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                <span className="truncate">{name}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-2 pt-1">
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="radio"
                name="ws-conflict"
                checked={!replace}
                onChange={() => setReplace(false)}
                className="accent-indigo-500"
              />
              {t('workspace.skip')}
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="radio"
                name="ws-conflict"
                checked={replace}
                onChange={() => setReplace(true)}
                className="accent-indigo-500"
              />
              {t('workspace.replace')}
            </label>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm btn-ghost rounded-lg">
            {t('workspace.cancel')}
          </button>
          <button
            onClick={() => onConfirm(replace)}
            className="px-4 py-2 text-sm bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors"
          >
            {t('workspace.import')}
          </button>
        </div>
      </div>
    </div>
  )
}
