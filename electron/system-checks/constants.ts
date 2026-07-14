import type { CheckDefinition } from './types'

export const CHECK_DEFINITIONS: CheckDefinition[] = [
  { id: 'webcam', label: 'Webcam available', severity: 'block', timeoutMs: 12_000 },
  { id: 'microphone', label: 'Mic available', severity: 'block', timeoutMs: 12_000 },
  { id: 'internet_speed', label: 'Internet speed', severity: 'block', timeoutMs: 15_000 },
  { id: 'screen_resolution', label: 'Screen resolution', severity: 'block', timeoutMs: 3_000 },
  { id: 'ram', label: 'RAM', severity: 'block', timeoutMs: 5_000 },
  { id: 'cpu', label: 'CPU', severity: 'block', timeoutMs: 5_000 },
  { id: 'battery', label: 'Battery', severity: 'warn', timeoutMs: 5_000 },
  { id: 'vpn', label: 'VPN detection', severity: 'block', timeoutMs: 8_000 },
  { id: 'virtual_machine', label: 'Virtual machine detection', severity: 'block', timeoutMs: 8_000 },
  { id: 'multiple_monitors', label: 'Multiple monitors', severity: 'block', timeoutMs: 3_000 },
  { id: 'screen_recording', label: 'Screen recording software', severity: 'block', timeoutMs: 10_000 },
  { id: 'running_applications', label: 'Running applications', severity: 'warn', timeoutMs: 10_000 },
  { id: 'remote_desktop', label: 'Remote desktop', severity: 'block', timeoutMs: 10_000 },
  { id: 'obs', label: 'OBS', severity: 'block', timeoutMs: 8_000 },
  { id: 'teamviewer', label: 'TeamViewer', severity: 'block', timeoutMs: 8_000 },
  { id: 'anydesk', label: 'AnyDesk', severity: 'block', timeoutMs: 8_000 },
  { id: 'clipboard', label: 'Clipboard state', severity: 'warn', timeoutMs: 2_000 },
  { id: 'browser_version', label: 'Browser version', severity: 'block', timeoutMs: 2_000 },
]

export const MIN_RAM_GB = 4
export const MIN_CPU_CORES = 2
export const MIN_SCREEN_WIDTH = 1280
export const MIN_SCREEN_HEIGHT = 720
export const MIN_DOWNLOAD_MBPS = 1.5
export const MIN_BATTERY_PERCENT = 20

export const VPN_INTERFACE_HINTS = [
  'tun',
  'tap',
  'ppp',
  'vpn',
  'wireguard',
  'nordlynx',
  'proton',
  'mullvad',
  'utun',
  'wg',
]

export const REMOTE_DESKTOP_PROCESSES = [
  'teamviewer',
  'anydesk',
  'rustdesk',
  'parsec',
  'vnc',
  'vncviewer',
  'splashtop',
  'logmein',
  'msrdc',
  'mstsc',
  'chrome remote',
  'remotedesktop',
  'sunlogin',
]

export const SCREEN_RECORDING_PROCESSES = [
  'obs',
  'obs64',
  'obs studio',
  'streamlabs',
  'camtasia',
  'snagit',
  'screenflow',
  'quicktime player',
  'loom',
  'screencapture',
  'screencaptureui',
  'screenshot',
  'replaykit',
  'xboxgamebar',
  'sharex',
  'captura',
  'bandicam',
  'fraps',
  'nvidia shadowplay',
  'geforce experience',
]

export const OBS_PROCESSES = ['obs', 'obs64', 'obs studio', 'streamlabs']
export const TEAMVIEWER_PROCESSES = ['teamviewer', 'teamviewer_service', 'teamviewer_desktop']
export const ANYDESK_PROCESSES = ['anydesk', 'anydesk.exe']

export const SESSION_STORAGE_KEY = 'ugsot.systemChecks'
export const SESSION_TTL_MS = 30 * 60 * 1000
