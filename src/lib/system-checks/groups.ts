import type { CheckId } from './types'

export type CheckCategoryId = 'device' | 'network' | 'security' | 'software'

export type CheckCategory = {
  id: CheckCategoryId
  label: string
  description: string
  checks: CheckId[]
}

export const CHECK_CATEGORIES: CheckCategory[] = [
  {
    id: 'device',
    label: 'Device',
    description: 'Hardware, display, and media',
    checks: [
      'webcam',
      'microphone',
      'screen_resolution',
      'ram',
      'cpu',
      'battery',
      'multiple_monitors',
      'browser_version',
    ],
  },
  {
    id: 'network',
    label: 'Network',
    description: 'Connectivity and VPN',
    checks: ['internet_speed', 'vpn'],
  },
  {
    id: 'security',
    label: 'Security',
    description: 'Environment integrity',
    checks: ['virtual_machine', 'clipboard'],
  },
  {
    id: 'software',
    label: 'Software',
    description: 'Blocked apps and recording tools',
    checks: [
      'screen_recording',
      'running_applications',
      'remote_desktop',
      'obs',
      'teamviewer',
      'anydesk',
    ],
  },
]

export function getCategoryForCheck(checkId: CheckId): CheckCategoryId {
  return CHECK_CATEGORIES.find((category) => category.checks.includes(checkId))?.id ?? 'device'
}
