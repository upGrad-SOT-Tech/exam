import type { CheckDefinition, CheckResult } from '../types'
import { MIN_DOWNLOAD_MBPS, VPN_INTERFACE_HINTS } from '../constants'
import type { SystemSnapshot } from '../snapshot'
import { createResult } from '../utils'

type NetworkInterface = {
  iface: string
  ifaceName?: string
  type?: string
  operstate?: string
}

function asInterfaceList(
  networkInterfaces: SystemSnapshot['networkInterfaces'],
): NetworkInterface[] {
  return Array.isArray(networkInterfaces) ? networkInterfaces : [networkInterfaces]
}

const SPEED_TEST_BYTES = 256_000
const SPEED_TEST_URLS = ['https://www.gstatic.com/generate_204', 'https://cloudflare.com/cdn-cgi/trace']
const DOWNLOAD_URLS = [
  `https://speed.cloudflare.com/__down?bytes=${SPEED_TEST_BYTES}`,
]

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal, cache: 'no-store' })
  } finally {
    clearTimeout(timer)
  }
}

export async function collectInternetSpeed(definition: CheckDefinition): Promise<CheckResult> {
  const startedAt = Date.now()

  try {
    const probeStart = performance.now()
    let probe: Response | null = null
    for (const url of SPEED_TEST_URLS) {
      try {
        probe = await fetchWithTimeout(url, { method: 'HEAD' }, 4000)
        if (probe.ok || probe.status === 204 || probe.status === 405) break
      } catch {
        probe = null
      }
    }

    if (!probe) {
      return createResult(definition, 'failed', 'Internet unavailable — connect to a stable network and try again', startedAt)
    }

    if (!probe.ok && probe.status !== 204 && probe.status !== 405) {
      return createResult(definition, 'failed', `Network probe failed (${probe.status})`, startedAt)
    }

    const latencyMs = performance.now() - probeStart

    let mbps = 0
    let bytes = 0
    for (const url of DOWNLOAD_URLS) {
      try {
        const downloadStart = performance.now()
        const download = await fetchWithTimeout(url, { method: 'GET' }, definition.timeoutMs - 1000)
        const buffer = await download.arrayBuffer()
        const downloadMs = Math.max(performance.now() - downloadStart, 1)
        bytes = buffer.byteLength
        if (bytes === 0) continue
        mbps = (buffer.byteLength * 8) / (downloadMs / 1000) / 1_000_000
        break
      } catch {
        mbps = 0
      }
    }

    if (bytes === 0) {
      return createResult(
        definition,
        'failed',
        'Unable to measure download speed — check captive portal, firewall, or unstable network',
        startedAt,
        { latencyMs: Math.round(latencyMs), minMbps: MIN_DOWNLOAD_MBPS },
      )
    }

    if (latencyMs > 3000) {
      return createResult(
        definition,
        'failed',
        `Unstable connection: ${Math.round(latencyMs)}ms latency — use a stable network before starting`,
        startedAt,
        { latencyMs: Math.round(latencyMs), minMbps: MIN_DOWNLOAD_MBPS },
      )
    }

    if (mbps >= MIN_DOWNLOAD_MBPS) {
      return createResult(
        definition,
        'passed',
        `${mbps.toFixed(1)} Mbps download (minimum ${MIN_DOWNLOAD_MBPS} Mbps)`,
        startedAt,
        { mbps: Number(mbps.toFixed(2)), latencyMs: Math.round(latencyMs), minMbps: MIN_DOWNLOAD_MBPS, bytes },
      )
    }

    return createResult(
      definition,
      'failed',
      `Slow connection: ${mbps.toFixed(1)} Mbps (minimum ${MIN_DOWNLOAD_MBPS} Mbps required)`,
      startedAt,
      { mbps: Number(mbps.toFixed(2)), latencyMs: Math.round(latencyMs), minMbps: MIN_DOWNLOAD_MBPS, bytes },
    )
  } catch {
    return createResult(
      definition,
      'failed',
      'Unable to verify internet speed — check your connection and try again',
      startedAt,
    )
  }
}

export function collectVpn(definition: CheckDefinition, snapshot: SystemSnapshot): CheckResult {
  const startedAt = Date.now()
  const active = asInterfaceList(snapshot.networkInterfaces).filter((iface) => iface.operstate === 'up')

  const vpnInterfaces = active.filter((iface) => {
    const name = `${iface.iface} ${iface.ifaceName ?? ''}`.toLowerCase()
    return VPN_INTERFACE_HINTS.some((hint) => name.includes(hint))
  })

  if (vpnInterfaces.length === 0) {
    return createResult(definition, 'passed', 'No VPN interface detected', startedAt, {
      interfaces: active.map((iface) => iface.iface),
    })
  }

  return createResult(
    definition,
    'failed',
    `VPN detected on ${vpnInterfaces.map((iface) => iface.iface).join(', ')} — disable VPN before continuing`,
    startedAt,
    {
      vpnInterfaces: vpnInterfaces.map((iface) => ({
        iface: iface.iface,
        ifaceName: iface.ifaceName,
        type: iface.type,
      })),
    },
  )
}
