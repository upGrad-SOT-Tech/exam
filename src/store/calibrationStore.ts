import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CalibrationProfile } from '@/lib/vision/types'
import { uploadJson } from '@/lib/video-proctoring/supabase-storage'

type CalibrationState = {
  profile: CalibrationProfile | null
  setProfile: (profile: CalibrationProfile) => void
  clearProfile: () => void
  persistRemote: (attemptId: string) => Promise<void>
}

function profileForLocalStorage(profile: CalibrationProfile | null): CalibrationProfile | null {
  if (!profile) return null
  return {
    ...profile,
    captures: profile.captures.map((capture) => ({
      ...capture,
      samples: capture.samples.map((sample) => ({
        ...sample,
        landmarks: [],
      })),
    })),
  }
}

export const useCalibrationStore = create<CalibrationState>()(
  persist(
    (set, get) => ({
      profile: null,
      setProfile: (profile) => set({ profile }),
      clearProfile: () => set({ profile: null }),
      persistRemote: async (attemptId) => {
        const profile = get().profile
        if (!profile) return
        await uploadJson(attemptId, `attempts/${attemptId}/calibration/profile.json`, profile)
      },
    }),
    {
      name: 'exam-app-calibration',
      partialize: (state) => ({ profile: profileForLocalStorage(state.profile) }),
    },
  ),
)
