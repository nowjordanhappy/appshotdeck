import { useState } from 'react'
import { X, Mail } from 'lucide-react'
import { saveTranslateEmail, getTranslateEmail } from '../utils/translate'

interface Props {
  onRetry: () => void
  onSkip: () => void
}

export function QuotaDialog({ onRetry, onSkip }: Props) {
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
            <p className="font-semibold text-sm">MyMemory daily limit reached</p>
            <p className="text-xs text-muted mt-0.5">
              AppShotDeck uses{' '}
              <a href="https://mymemory.translated.net" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">MyMemory</a>
              {' '}for translations. Their free tier allows 500 words/day. Add your email to double it — no account needed.
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
              placeholder="you@example.com"
              className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-black/30 dark:placeholder-white/30 outline-none"
            />
          </div>
          <p className="text-xs text-dim">
            Stored locally. Only sent to{' '}
            <a href="https://mymemory.translated.net" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
              MyMemory
            </a>
            . 1,000 words/day free.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onSkip}
            className="flex-1 py-2 text-sm btn-ghost rounded-lg border border-subtle"
          >
            Skip
          </button>
          <button
            onClick={handleSave}
            disabled={!email.trim()}
            className="flex-1 py-2 text-sm bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white rounded-lg transition-colors"
          >
            Save & retry
          </button>
        </div>
      </div>
    </div>
  )
}
