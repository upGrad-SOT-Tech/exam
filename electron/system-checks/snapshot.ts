import si from 'systeminformation'

export type SystemSnapshot = {
  mem: Awaited<ReturnType<typeof si.mem>>
  cpu: Awaited<ReturnType<typeof si.cpu>>
  battery: Awaited<ReturnType<typeof si.battery>>
  system: Awaited<ReturnType<typeof si.system>>
  processes: Awaited<ReturnType<typeof si.processes>>
  networkInterfaces: Awaited<ReturnType<typeof si.networkInterfaces>>
  graphics: Awaited<ReturnType<typeof si.graphics>>
}

export async function loadSystemSnapshot(): Promise<SystemSnapshot> {
  const [mem, cpu, battery, system, processes, networkInterfaces, graphics] = await Promise.all([
    si.mem(),
    si.cpu(),
    si.battery(),
    si.system(),
    si.processes(),
    si.networkInterfaces(),
    si.graphics(),
  ])

  return { mem, cpu, battery, system, processes, networkInterfaces, graphics }
}
