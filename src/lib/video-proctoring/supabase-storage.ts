import { request } from '@/lib/api'

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const value = String(reader.result || '')
      resolve(value.includes(',') ? value.split(',')[1] : value)
    }
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read upload body'))
    reader.readAsDataURL(blob)
  })
}

export async function uploadBinary(
  attemptId: string,
  path: string,
  body: Blob,
  contentType: string,
): Promise<{ path: string }> {
  const bodyBase64 = await blobToBase64(body)
  return request<{ path: string }>('/api/proctoring/uploads', {
    method: 'POST',
    body: JSON.stringify({
      attemptId,
      path,
      contentType,
      bodyBase64,
    }),
  })
}

export async function uploadJson(
  attemptId: string,
  path: string,
  data: unknown,
): Promise<{ path: string }> {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
  return uploadBinary(attemptId, path, blob, 'application/json')
}
