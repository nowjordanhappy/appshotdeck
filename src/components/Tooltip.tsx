import { useState } from 'react'
import { Info } from 'lucide-react'

interface Props {
  text: string
  side?: 'top-center' | 'top-start' | 'top-end' | 'bottom-start'
  className?: string
}

export function Tooltip({ text, side = 'top-start', className }: Props) {
  const [visible, setVisible] = useState(false)

  const posClass =
    side === 'top-center'   ? 'bottom-full left-1/2 -translate-x-1/2 mb-2' :
    side === 'top-end'      ? 'bottom-full right-0 mb-2' :
    side === 'bottom-start' ? 'top-full left-0 mt-2' :
    /* top-start */            'bottom-full left-0 mb-2'

  const arrowClass =
    side === 'top-center'   ? 'absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-50' :
    side === 'top-end'      ? 'absolute top-full right-3 border-4 border-transparent border-t-gray-900 dark:border-t-gray-50' :
    side === 'bottom-start' ? 'absolute bottom-full left-3 border-4 border-transparent border-b-gray-900 dark:border-b-gray-50' :
    /* top-start */            'absolute top-full left-3 border-4 border-transparent border-t-gray-900 dark:border-t-gray-50'

  return (
    <span className={`relative inline-flex items-center ml-1 ${className ?? ''}`}>
      <button
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        className="text-muted hover:text-dim transition-colors"
        tabIndex={-1}
        type="button"
      >
        <Info size={13} />
      </button>
      {visible && (
        <span className={`absolute ${posClass} w-48 bg-gray-900 dark:bg-gray-50 text-white dark:text-gray-900 text-xs rounded-lg px-2.5 py-2 shadow-lg pointer-events-none z-50 leading-snug`}>
          {text}
          <span className={arrowClass} />
        </span>
      )}
    </span>
  )
}
