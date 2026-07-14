import { forwardRef } from 'react'
import { STATIC_FACE_GUIDE } from '@/lib/vision/face-overlay'

type MediaConfirmationProps = {
  mediaReady: boolean
  audioLevel: number
  onContinue: () => void
}

const MicBars = ({ level }: { level: number }) => {
  const bars = Array.from({ length: 16 }, (_, index) => {
    const threshold = ((index + 1) / 16) * 100
    const active = level >= threshold - 4
    const height = 18 + ((index % 4) + 1) * 7
    return (
      <span
        key={index}
        className={`w-1 rounded-sm transition-all duration-100 ${
          active ? 'bg-[#df2428]' : 'bg-gray-200'
        }`}
        style={{ height }}
      />
    )
  })

  return <div className="flex h-12 items-end justify-center gap-1">{bars}</div>
}

const MediaConfirmation = forwardRef<HTMLVideoElement, MediaConfirmationProps>(
  function MediaConfirmation({ mediaReady, audioLevel, onContinue }, ref) {
    const micLive = mediaReady && audioLevel > 8

    return (
      <div className="flex h-full min-h-[calc(100vh-11rem)] flex-1 overflow-hidden border border-gray-200 bg-white shadow-sm">
        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.65fr)_320px]">
          <div className="relative min-h-[280px] bg-[#111318] lg:min-h-0">
            <video
              ref={ref}
              autoPlay
              muted
              playsInline
              className="absolute inset-0 h-full w-full object-cover"
            />

            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.5)_100%)]" />

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className="rounded-[48%] border-2 border-dashed border-white/70"
                style={{
                  width: `${STATIC_FACE_GUIDE.widthPct}%`,
                  height: `${STATIC_FACE_GUIDE.heightPct}%`,
                  maxWidth: 320,
                  maxHeight: 420,
                  transform: `translateY(-4%)`,
                }}
              />
            </div>

            <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded bg-black/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
              <span
                className={`h-1.5 w-1.5 rounded-full ${mediaReady ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}
              />
              {mediaReady ? 'Camera live' : 'Requesting camera'}
            </div>

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-4 pb-4 pt-10">
              <p className="text-center text-xs font-medium text-white/90">
                Fit your full face inside the oval · chin to forehead
              </p>
            </div>
          </div>

          <div className="flex flex-col border-t border-gray-200 lg:border-l lg:border-t-0">
            <div className="border-b border-gray-100 px-5 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">
                Device check
              </p>
              <h2 className="mt-1 text-lg font-bold text-gray-900">Camera & microphone</h2>
            </div>

            <div className="flex flex-1 flex-col gap-3 px-5 py-4">
              <div className="rounded border border-gray-200 bg-[#fafbfc] p-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Microphone</p>
                    <p className="text-xs text-gray-500">
                      {micLive ? 'Signal detected' : mediaReady ? 'Speak to test' : 'Waiting'}
                    </p>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-gray-800">{audioLevel}%</span>
                </div>
                <div className="mt-3">
                  <MicBars level={audioLevel} />
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-[#df2428] transition-all duration-100"
                    style={{ width: `${audioLevel}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded border border-gray-200 px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                    Camera
                  </p>
                  <p
                    className={`mt-1 text-sm font-bold ${mediaReady ? 'text-emerald-700' : 'text-amber-700'}`}
                  >
                    {mediaReady ? 'Ready' : 'Waiting'}
                  </p>
                </div>
                <div className="rounded border border-gray-200 px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Mic</p>
                  <p
                    className={`mt-1 text-sm font-bold ${micLive ? 'text-emerald-700' : 'text-gray-700'}`}
                  >
                    {micLive ? 'Live' : 'Silent'}
                  </p>
                </div>
              </div>

              <p className="text-xs leading-relaxed text-gray-500">
                One face in frame. Speak once and confirm the red meter moves before continuing.
              </p>
            </div>

            <div className="mt-auto border-t border-gray-100 p-4">
              <button
                type="button"
                disabled={!mediaReady}
                onClick={onContinue}
                className="w-full rounded bg-[#df2428] px-4 py-3 text-sm font-bold uppercase tracking-wide text-white enabled:hover:bg-[#c51f23] disabled:opacity-40"
              >
                Continue to calibration
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  },
)

export default MediaConfirmation
