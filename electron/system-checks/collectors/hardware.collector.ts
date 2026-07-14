import type { CheckDefinition, CheckResult } from '../types'
import { MIN_BATTERY_PERCENT, MIN_CPU_CORES, MIN_RAM_GB } from '../constants'
import type { SystemSnapshot } from '../snapshot'
import { createResult } from '../utils'

export function collectRam(definition: CheckDefinition, snapshot: SystemSnapshot): CheckResult {
  const startedAt = Date.now()
  const totalGb = snapshot.mem.total / 1024 ** 3

  if (totalGb >= MIN_RAM_GB) {
    return createResult(
      definition,
      'passed',
      `${totalGb.toFixed(1)} GB available (minimum ${MIN_RAM_GB} GB)`,
      startedAt,
      { totalGb: Number(totalGb.toFixed(2)), minGb: MIN_RAM_GB },
    )
  }

  return createResult(
    definition,
    'failed',
    `Insufficient RAM: ${totalGb.toFixed(1)} GB (minimum ${MIN_RAM_GB} GB required)`,
    startedAt,
    { totalGb: Number(totalGb.toFixed(2)), minGb: MIN_RAM_GB },
  )
}

export function collectCpu(definition: CheckDefinition, snapshot: SystemSnapshot): CheckResult {
  const startedAt = Date.now()
  const cores = snapshot.cpu.cores

  if (cores >= MIN_CPU_CORES) {
    return createResult(
      definition,
      'passed',
      `${cores} cores detected (minimum ${MIN_CPU_CORES})`,
      startedAt,
      { cores, model: snapshot.cpu.brand, minCores: MIN_CPU_CORES },
    )
  }

  return createResult(
    definition,
    'failed',
    `Insufficient CPU cores: ${cores} (minimum ${MIN_CPU_CORES} required)`,
    startedAt,
    { cores, model: snapshot.cpu.brand, minCores: MIN_CPU_CORES },
  )
}

export function collectBattery(definition: CheckDefinition, snapshot: SystemSnapshot): CheckResult {
  const startedAt = Date.now()
  const { hasBattery, isCharging, percent } = snapshot.battery

  if (!hasBattery) {
    return createResult(definition, 'passed', 'Desktop power source detected', startedAt, {
      hasBattery: false,
    })
  }

  if (isCharging) {
    return createResult(definition, 'passed', `Battery charging at ${percent}%`, startedAt, {
      hasBattery: true,
      isCharging,
      percent,
    })
  }

  if (percent >= MIN_BATTERY_PERCENT) {
    return createResult(
      definition,
      'passed',
      `Battery at ${percent}% (minimum ${MIN_BATTERY_PERCENT}% on battery)`,
      startedAt,
      { hasBattery: true, isCharging, percent, minPercent: MIN_BATTERY_PERCENT },
    )
  }

  return createResult(
    definition,
    'warning',
    `Low battery: ${percent}% — connect charger before starting the exam`,
    startedAt,
    { hasBattery: true, isCharging, percent, minPercent: MIN_BATTERY_PERCENT },
  )
}
