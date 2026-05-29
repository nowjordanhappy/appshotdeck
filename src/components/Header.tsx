import { useRef, useCallback, useState, useEffect } from 'react'
import { Download, Layers, Save, FolderOpen, Globe, Sun, Moon, ChevronDown, Plus, Check, Pencil, Trash2, HelpCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useEditorStore } from '../store/useEditorStore'
import { useThemeStore } from '../store/useThemeStore'
import { exportAll, type ExportEntry } from '../utils/export'
import { saveProject, loadProject } from '../utils/project'
import { saveWorkspace, loadWorkspace, type LoadedWorkspaceProject } from '../utils/workspace'
import { saveScreenshot, deleteProjectScreenshots } from '../utils/db'
import { ConfirmDialog } from './ConfirmDialog'
import { WorkspaceImportDialog } from './WorkspaceImportDialog'
import { HelpPanel } from './HelpPanel'
import { useToastStore } from '../store/useToastStore'
import type { ProjectMeta } from '../types'

async function doImportWorkspace(
  loadedProjects: LoadedWorkspaceProject[],
  replace: boolean,
): Promise<void> {
  const { projects, activeProjectId } = useEditorStore.getState()
  const existingIds = new Set(projects.map((p) => p.id))

  const toImport = replace
    ? loadedProjects
    : loadedProjects.filter((lp) => !existingIds.has(lp.meta.id))

  if (!toImport.length) return

  if (replace) {
    const idsToReplace = toImport.filter((lp) => existingIds.has(lp.meta.id)).map((lp) => lp.meta.id)
    await Promise.all(idsToReplace.map(deleteProjectScreenshots))
  }

  await Promise.all(
    toImport.flatMap(({ meta, screenshots }) =>
      screenshots.map(({ slideId, dataUrl }) =>
        saveScreenshot(`${meta.id}/${slideId}`, dataUrl)
      )
    )
  )

  const importedIds = new Set(toImport.map((lp) => lp.meta.id))
  const importedMetas = new Map(toImport.map((lp) => [lp.meta.id, lp.meta]))

  const updatedProjects: ProjectMeta[] = [
    ...projects.map((p) => importedMetas.get(p.id) ?? p),
    ...toImport.filter((lp) => !existingIds.has(lp.meta.id)).map((lp) => lp.meta),
  ]

  if (replace && importedIds.has(activeProjectId)) {
    const replaced = toImport.find((lp) => lp.meta.id === activeProjectId)!
    const screenshotMap = new Map(replaced.screenshots.map((s) => [s.slideId, s.dataUrl]))
    const newSlides = replaced.meta.slides.map((config) => ({
      ...config,
      screenshotDataUrl: screenshotMap.get(config.id) ?? null,
    }))
    useEditorStore.setState({
      projects: updatedProjects,
      slides: newSlides,
      activeSlideId: replaced.meta.activeSlideId || newSlides[0]?.id || '',
    })
  } else {
    useEditorStore.setState({ projects: updatedProjects })
  }
}

interface Props {
  canvasRefs: React.MutableRefObject<Map<string, HTMLDivElement>>
}

const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
]

const PROJECT_COLORS = ['#6366F1', '#14B8A6', '#F59E0B', '#EF4444', '#8B5CF6', '#10B981', '#F97316', '#3B82F6']

function projectColor(id: string): string {
  const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return PROJECT_COLORS[hash % PROJECT_COLORS.length]
}

export function Header({ canvasRefs }: Props) {
  const { t, i18n } = useTranslation()
  const { slides, activeSlideId, projects, activeProjectId, switchProject, createProject, renameProject, deleteProject } = useEditorStore()
  const { isDark, toggle: toggleTheme } = useThemeStore()
  const exporting = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const workspaceInputRef = useRef<HTMLInputElement>(null)

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [loadOpen, setLoadOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [pendingDeleteProject, setPendingDeleteProject] = useState<string | null>(null)
  const [pendingWorkspace, setPendingWorkspace] = useState<LoadedWorkspaceProject[] | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const saveDropdownRef = useRef<HTMLDivElement>(null)
  const loadDropdownRef = useRef<HTMLDivElement>(null)

  const activeProject = projects.find((p) => p.id === activeProjectId)
  const projectName = activeProject?.name ?? 'Project'

  // Close dropdowns on outside click
  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  useEffect(() => {
    if (!saveOpen && !loadOpen) return
    const handler = (e: MouseEvent) => {
      if (saveOpen && saveDropdownRef.current && !saveDropdownRef.current.contains(e.target as Node)) setSaveOpen(false)
      if (loadOpen && loadDropdownRef.current && !loadDropdownRef.current.contains(e.target as Node)) setLoadOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [saveOpen, loadOpen])

  const handleExportAll = useCallback(async () => {
    if (exporting.current) return
    exporting.current = true
    try {
      const entries = slides
        .map((sl, idx) => {
          const el = canvasRefs.current.get(sl.id)
          if (!el) return null
          return { el, format: sl.format, name: `slide-${idx + 1}` } satisfies ExportEntry
        })
        .filter(Boolean) as ExportEntry[]
      await exportAll(entries, projectName)
    } finally {
      exporting.current = false
    }
  }, [slides, canvasRefs, projectName])

  const handleSave = useCallback(async () => {
    await saveProject(slides, projectName)
  }, [slides, projectName])

  const handleSaveAll = useCallback(async () => {
    const { projects, activeProjectId, slides: activeSlides, activeSlideId } = useEditorStore.getState()
    await saveWorkspace(projects, activeProjectId, activeSlides, activeSlideId)
  }, [])

  const handleLoadAll = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const loaded = await loadWorkspace(file)
      if (!loaded.length) return
      const existingIds = new Set(useEditorStore.getState().projects.map((p) => p.id))
      const hasConflicts = loaded.some((lp) => existingIds.has(lp.meta.id))
      if (hasConflicts) {
        setPendingWorkspace(loaded)
      } else {
        await doImportWorkspace(loaded, false)
      }
    } catch (err) {
      useToastStore.getState().addToast(
        `Could not load workspace: ${err instanceof Error ? err.message : String(err)}`, 'error'
      )
    }
  }, [])

  const handleWorkspaceConfirm = useCallback(async (replace: boolean) => {
    if (!pendingWorkspace) return
    try {
      await doImportWorkspace(pendingWorkspace, replace)
    } catch (err) {
      useToastStore.getState().addToast(
        `Import failed: ${err instanceof Error ? err.message : String(err)}`, 'error'
      )
    }
    setPendingWorkspace(null)
  }, [pendingWorkspace])

  const handleLoad = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const { slides: loaded } = await loadProject(file)
      const { activeProjectId } = useEditorStore.getState()
      await deleteProjectScreenshots(activeProjectId)
      await Promise.all(
        loaded.map((sl) =>
          sl.screenshotDataUrl
            ? saveScreenshot(`${activeProjectId}/${sl.id}`, sl.screenshotDataUrl)
            : Promise.resolve()
        )
      )
      useEditorStore.setState({
        slides: loaded,
        activeSlideId: loaded[0]?.id ?? activeSlideId,
      })
    } catch (err) {
      useToastStore.getState().addToast(
        `Could not load project: ${err instanceof Error ? err.message : String(err)}`, 'error'
      )
    }
    e.target.value = ''
  }, [activeSlideId])

  const handleRenameCommit = useCallback(() => {
    const trimmed = renameValue.trim()
    if (trimmed) renameProject(activeProjectId, trimmed)
    setRenaming(false)
  }, [renameValue, activeProjectId, renameProject])

  const handleCreateProject = useCallback(() => {
    const name = `Project ${projects.length + 1}`
    createProject(name)
    setDropdownOpen(false)
  }, [projects.length, createProject])

  return (
    <header className="h-14 flex-shrink-0 flex items-center justify-between px-5 surface border-b border-subtle">
      <div className="flex items-center gap-2">
        <Layers className="w-5 h-5 text-indigo-400" />
        <span className="font-semibold tracking-tight">AppShotDeck</span>

        {/* Project switcher */}
        <div className="relative ml-2" ref={dropdownRef}>
          <div className="flex items-center gap-1">
            {renaming ? (
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={handleRenameCommit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameCommit()
                  if (e.key === 'Escape') setRenaming(false)
                }}
                className="text-sm bg-transparent border-b border-indigo-400 outline-none w-32 text-gray-900 dark:text-white"
              />
            ) : (
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-black/5 dark:bg-white/8 hover:bg-black/8 dark:hover:bg-white/12 transition-colors"
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: projectColor(activeProjectId) }}
                />
                <span className="text-sm font-medium max-w-[140px] truncate text-gray-900 dark:text-white">
                  {projectName}
                </span>
                <ChevronDown className="w-3 h-3 text-muted flex-shrink-0" />
              </button>
            )}
          </div>

          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-56 surface border border-subtle rounded-lg shadow-lg z-50 py-1">
              {projects.map((p) => (
                <div key={p.id} className="flex items-center group">
                  <button
                    onClick={() => { switchProject(p.id); setDropdownOpen(false) }}
                    className="flex-1 text-left px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 min-w-0"
                  >
                    <span className="relative flex-shrink-0 w-3 h-3 flex items-center justify-center">
                      <span
                        className="w-2.5 h-2.5 rounded-full block"
                        style={{ backgroundColor: projectColor(p.id) }}
                      />
                      {p.id === activeProjectId && (
                        <Check className="w-2.5 h-2.5 text-white absolute" style={{ filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }} />
                      )}
                    </span>
                    <span className={`truncate ${p.id === activeProjectId ? 'text-indigo-500 dark:text-indigo-400 font-medium' : ''}`}>
                      {p.name}
                    </span>
                  </button>
                  <div className="flex items-center gap-0.5 pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setRenameValue(p.name); setRenaming(true); setDropdownOpen(false); switchProject(p.id) }}
                      className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-muted"
                      title="Rename"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    {projects.length > 1 && (
                      <button
                        onClick={() => { setPendingDeleteProject(p.id); setDropdownOpen(false) }}
                        className="p-1 rounded hover:bg-red-500/10 text-muted hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div className="border-t border-subtle mx-2 my-1" />
              <button
                onClick={handleCreateProject}
                className="w-full text-left px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 text-muted"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('projects.new')}
              </button>
            </div>
          )}
        </div>

        <span className="text-muted text-xs ml-1 hidden sm:block">{t('header.tagline')}</span>
      </div>

      <div className="flex items-center gap-2">
        {/* Language switcher */}
        <div className="flex items-center gap-1 mr-1">
          <Globe className="w-3.5 h-3.5 text-muted" />
          {LANGS.map((lang) => (
            <button
              key={lang.code}
              onClick={() => i18n.changeLanguage(lang.code)}
              className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
                (i18n.resolvedLanguage ?? 'en') === lang.code
                  ? 'text-indigo-500 dark:text-indigo-400 font-semibold'
                  : 'text-muted hover:text-dim'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 btn-ghost"
          title={isDark ? t('header.light_mode') : t('header.dark_mode')}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Help */}
        <button
          onClick={() => setHelpOpen(true)}
          className="p-2 btn-ghost"
          title={t('help.title')}
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-black/10 dark:bg-white/15" />

        {/* Save dropdown */}
        <div className="relative" ref={saveDropdownRef}>
          <button
            onClick={() => { setSaveOpen(!saveOpen); setLoadOpen(false) }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm btn-ghost"
          >
            <Save className="w-4 h-4" />
            {t('header.save')}
            <ChevronDown className="w-3 h-3 text-muted" />
          </button>
          {saveOpen && (
            <div className="absolute top-full right-0 mt-1 w-48 surface border border-subtle rounded-lg shadow-lg z-50 py-1">
              <button
                onClick={() => { handleSave(); setSaveOpen(false) }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5"
              >
                {t('header.save_project')}
              </button>
              <div className="border-t border-subtle mx-2 my-0.5" />
              <button
                onClick={() => { handleSaveAll(); setSaveOpen(false) }}
                className="w-full text-left px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5"
              >
                <div className="text-sm">{t('header.save_all')}</div>
                <div className="text-xs text-muted mt-0.5">{t('header.save_all_desc')}</div>
              </button>
            </div>
          )}
        </div>

        {/* Load dropdown */}
        <div className="relative" ref={loadDropdownRef}>
          <button
            onClick={() => { setLoadOpen(!loadOpen); setSaveOpen(false) }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm btn-ghost"
          >
            <FolderOpen className="w-4 h-4" />
            {t('header.load')}
            <ChevronDown className="w-3 h-3 text-muted" />
          </button>
          {loadOpen && (
            <div className="absolute top-full right-0 mt-1 w-52 surface border border-subtle rounded-lg shadow-lg z-50 py-1">
              <button
                onClick={() => { fileInputRef.current?.click(); setLoadOpen(false) }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5"
              >
                {t('header.load_project')}
              </button>
              <div className="border-t border-subtle mx-2 my-0.5" />
              <button
                onClick={() => { workspaceInputRef.current?.click(); setLoadOpen(false) }}
                className="w-full text-left px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5"
              >
                <div className="text-sm">{t('header.load_all')}</div>
                <div className="text-xs text-muted mt-0.5">{t('header.load_all_desc')}</div>
              </button>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept=".zip" className="hidden" onChange={handleLoad} />
          <input ref={workspaceInputRef} type="file" accept=".zip" className="hidden" onChange={handleLoadAll} />
        </div>

        <div className="w-px h-6 bg-black/10 dark:bg-white/15" />

        <button
          onClick={handleExportAll}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          {t('header.export_all')}
        </button>
      </div>

      {pendingDeleteProject && (
        <ConfirmDialog
          message={`Delete "${projects.find(p => p.id === pendingDeleteProject)?.name}"? This can't be undone.`}
          onConfirm={() => { deleteProject(pendingDeleteProject); setPendingDeleteProject(null) }}
          onCancel={() => setPendingDeleteProject(null)}
        />
      )}

      {helpOpen && <HelpPanel onClose={() => setHelpOpen(false)} />}

      {pendingWorkspace && (
        <WorkspaceImportDialog
          total={pendingWorkspace.length}
          conflictNames={pendingWorkspace
            .filter((lp) => projects.some((p) => p.id === lp.meta.id))
            .map((lp) => lp.meta.name)}
          onConfirm={handleWorkspaceConfirm}
          onCancel={() => setPendingWorkspace(null)}
        />
      )}
    </header>
  )
}
