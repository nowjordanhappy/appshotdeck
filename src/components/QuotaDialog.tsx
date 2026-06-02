import { useState } from 'react'
import { X, Mail } from 'lucide-react'
import { useTranslation, Trans } from 'react-i18next'
import { saveTranslateEmail, getTranslateEmail } from '../utils/translate'

interface Props {
  onRetry: () => void
  onSkip: () => void
}

export function QuotaDialog({ onRetry, onSkip }: Props) {
  const { t } = useTranslation()
  const [email, setEmail] = useState(getTranslateEmail())

  function handleSave() {
    saveTranslateEmail(email)
    onRetry()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="surface border border-subtle rounded-xl shadow-2xl w-80 p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-sm">{t('quota.title')}</p>
            <p className="text-xs text-muted mt-0.5">
              <Trans
                i18nKey="quota.description"
                components={{ link: <a href="https://mymemory.translated.net" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline" /> }}
              />
            </p>
          </div>
          <button onClick={onSkip} className="p-1 btn-ghost rounded-lg flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 focus-within:border-indigo-400 transition-colors">
            <Mail className="w-3.5 h-3.5 text-muted flex-shrink-0" />
            <input
              autoFocus
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && email.trim() && handleSave()}
              placeholder={t('quota.email_placeholder')}
              className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-black/30 dark:placeholder-white/30 outline-none"
            />
          </div>
          <p className="text-xs text-dim">{t('quota.privacy')}</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onSkip}
            className="flex-1 py-2 text-sm btn-ghost rounded-lg border border-subtle"
          >
            {t('quota.skip')}
          </button>
          <button
            onClick={handleSave}
            disabled={!email.trim()}
            className="flex-1 py-2 text-sm bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white rounded-lg transition-colors"
          >
            {t('quota.save_retry')}
          </button>
        </div>
      </div>
    </div>
  )
}
