import { useTranslation } from 'react-i18next'
import { useEditorStore } from '../store/useEditorStore'
import { spanSource, spansNext } from '../utils/span'
import { ConfirmDialog } from './ConfirmDialog'

interface Props {
  slideId: string
  onClose: () => void
}

// Slide removal confirm. A slide sharing a spanning device with its neighbour offers to
// delete just this one (the partner becomes a normal slide) or both.
export function SlideDeleteDialog({ slideId, onClose }: Props) {
  const { t } = useTranslation()
  const { slides, removeSlide } = useEditorStore()
  const idx = slides.findIndex((s) => s.id === slideId)
  if (idx < 0) return null

  const partnerIdx = spansNext(slides, idx) ? idx + 1 : spanSource(slides, idx) ? idx - 1 : -1
  const removeOnly = () => { removeSlide(slideId); onClose() }

  if (partnerIdx < 0) {
    return <ConfirmDialog message={t('strip.confirm_remove')} onConfirm={removeOnly} onCancel={onClose} />
  }

  const partnerId = slides[partnerIdx].id
  // A project keeps at least one slide, so "both" only exists when something else remains
  const canRemoveBoth = slides.length > 2
  const onlyLabel = t('strip.remove_only', { n: idx + 1 })

  return (
    <ConfirmDialog
      message={t(canRemoveBoth ? 'strip.confirm_remove_pair' : 'strip.confirm_remove_pair_only', { n: idx + 1, m: partnerIdx + 1 })}
      secondaryLabel={canRemoveBoth ? onlyLabel : undefined}
      onSecondary={removeOnly}
      confirmLabel={canRemoveBoth ? t('strip.remove_both') : onlyLabel}
      onConfirm={() => {
        removeSlide(slideId)
        if (canRemoveBoth) removeSlide(partnerId)
        onClose()
      }}
      onCancel={onClose}
    />
  )
}
