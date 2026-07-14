import { app } from 'electron'
import path from 'node:path'

export type ProcessRef = {
  name: string
  pid: number
  path?: string
}

export type DetectedApp = {
  pid: number
  processName: string
  displayName: string
  path?: string
  iconDataUrl?: string
}

const iconCache = new Map<string, string | null>()

function resolveIconTarget(execPath?: string): string | null {
  if (!execPath) return null

  if (process.platform === 'darwin') {
    const bundleMatch = execPath.match(/(.+\.app)(?:\/|$)/i)
    if (bundleMatch) return bundleMatch[1]
  }

  if (process.platform === 'win32' && /\.(exe|dll|ico)$/i.test(execPath)) {
    return execPath
  }

  return execPath
}

function getDisplayName(execPath: string | undefined, processName: string): string {
  if (execPath) {
    if (process.platform === 'darwin') {
      const bundleMatch = execPath.match(/\/([^/]+)\.app(?:\/|$)/i)
      if (bundleMatch) return bundleMatch[1]
    }

    const baseName = path.basename(execPath).replace(/\.(exe|app)$/i, '')
    if (baseName && baseName.toLowerCase() !== processName.toLowerCase()) {
      return baseName
    }
  }

  return processName.replace(/\.exe$/i, '')
}

function getDedupeKey(match: ProcessRef, displayName: string): string {
  const iconTarget = resolveIconTarget(match.path)
  if (iconTarget) return iconTarget.toLowerCase()
  return `${displayName}:${match.pid}`.toLowerCase()
}

async function getIconDataUrl(execPath?: string): Promise<string | undefined> {
  const target = resolveIconTarget(execPath)
  if (!target) return undefined

  if (iconCache.has(target)) {
    const cached = iconCache.get(target)
    return cached ?? undefined
  }

  try {
    const icon = await app.getFileIcon(target, { size: 'normal' })
    const dataUrl = icon.isEmpty() ? null : icon.toDataURL()
    iconCache.set(target, dataUrl)
    return dataUrl ?? undefined
  } catch {
    iconCache.set(target, null)
    return undefined
  }
}

export async function resolveDetectedApps(matches: ProcessRef[]): Promise<DetectedApp[]> {
  const seen = new Set<string>()
  const apps: DetectedApp[] = []

  for (const match of matches) {
    const displayName = getDisplayName(match.path, match.name)
    const dedupeKey = getDedupeKey(match, displayName)
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)

    const iconDataUrl = await getIconDataUrl(match.path)
    apps.push({
      pid: match.pid,
      processName: match.name,
      displayName,
      path: match.path,
      iconDataUrl,
    })
  }

  return apps
}
