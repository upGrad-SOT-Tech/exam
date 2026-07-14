import type { CheckDefinition, CheckResult } from '../types'
import type { SystemSnapshot } from '../snapshot'
import { createResult } from '../utils'

const VM_MANUFACTURER_HINTS = [
  'vmware',
  'virtualbox',
  'qemu',
  'kvm',
  'xen',
  'parallels',
  'microsoft corporation',
  'innotek',
  'bochs',
]

const VM_MODEL_HINTS = ['virtual', 'vmware', 'virtualbox', 'qemu', 'kvm', 'hyper-v', 'parallels']

export function collectVirtualMachine(definition: CheckDefinition, snapshot: SystemSnapshot): CheckResult {
  const startedAt = Date.now()
  const { manufacturer, model, virtual } = snapshot.system
  const manufacturerLower = manufacturer.toLowerCase()
  const modelLower = model.toLowerCase()

  const manufacturerMatch = VM_MANUFACTURER_HINTS.some((hint) => manufacturerLower.includes(hint))
  const modelMatch = VM_MODEL_HINTS.some((hint) => modelLower.includes(hint))

  if (virtual || manufacturerMatch || modelMatch) {
    return createResult(
      definition,
      'failed',
      'Virtual machine environment detected — use a physical device for the exam',
      startedAt,
      { manufacturer, model, virtual },
    )
  }

  return createResult(definition, 'passed', 'Physical device detected', startedAt, {
    manufacturer,
    model,
    virtual,
  })
}
