import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface Props {
  onClose: () => void
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
const mod = isMac ? '⌘' : 'Ctrl'

export function HelpPanel({ onClose }: Props) {
  const { t } = useTranslation()

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-72 surface border-l border-subtle shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-subtle flex-shrink-0">
          <span className="font-semibold text-sm">{t('help.title')}</span>
          <button onClick={onClose} className="p-1 btn-ghost rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 text-sm">

          {/* Getting started */}
          <section className="space-y-2">
            <p className="text-xs text-muted uppercase tracking-wider">{t('help.start_title')}</p>
            <ol className="space-y-1.5 list-decimal list-inside text-dim leading-snug">
              <li>{t('help.start_1')}</li>
              <li>{t('help.start_2')}</li>
              <li>{t('help.start_3')}</li>
              <li>{t('help.start_4')}</li>
            </ol>
          </section>

          <div className="border-t border-subtle" />

          {/* Keyboard shortcuts */}
          <section className="space-y-2">
            <p className="text-xs text-muted uppercase tracking-wider">{t('help.shortcuts_title')}</p>
            <div className="space-y-2">
              {[
                { keys: ['←', '→'], label: t('help.shortcut_nav') },
                { keys: [`${mod}+D`],  label: t('help.shortcut_dup') },
                { keys: ['⌫'],         label: t('help.shortcut_del') },
              ].map(({ keys, label }) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <span className="text-dim leading-snug">{label}</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {keys.map((k) => (
                      <kbd key={k} className="px-1.5 py-0.5 text-xs bg-black/10 dark:bg-white/10 rounded font-mono border border-black/10 dark:border-white/15">
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="border-t border-subtle" />

          {/* Callouts */}
          <section className="space-y-2">
            <p className="text-xs text-muted uppercase tracking-wider">{t('help.callout_title')}</p>
            <ol className="space-y-1.5 list-decimal list-inside text-dim leading-snug">
              <li>{t('help.callout_1')}</li>
              <li>{t('help.callout_2')}</li>
              <li>{t('help.callout_3')}</li>
              <li>{t('help.callout_4')}</li>
            </ol>
          </section>

          <div className="border-t border-subtle" />

          {/* Translations */}
          <section className="space-y-2">
            <p className="text-xs text-muted uppercase tracking-wider">{t('help.translate_title')}</p>
            <ol className="space-y-1.5 list-decimal list-inside text-dim leading-snug">
              <li>{t('help.translate_1')}</li>
              <li>{t('help.translate_2')}</li>
              <li>{t('help.translate_3')}</li>
              <li>{t('help.translate_4')}</li>
              <li>{t('help.translate_5')}</li>
            </ol>
          </section>

          <div className="border-t border-subtle" />

          {/* Pro tips */}
          <section className="space-y-2">
            <p className="text-xs text-muted uppercase tracking-wider">{t('help.tips_title')}</p>
            <ul className="space-y-2.5">
              {[
                t('help.tip_apply'),
                t('help.tip_save_all'),
                t('help.tip_tilt'),
                t('help.tip_slides'),
              ].map((tip) => (
                <li key={tip} className="flex gap-2 text-dim leading-snug">
                  <span className="text-indigo-400 flex-shrink-0 mt-0.5">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  )
}
