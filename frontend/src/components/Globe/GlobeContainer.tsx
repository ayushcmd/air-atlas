import { Suspense, Component, useState, useEffect, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { GlobeScene } from './GlobeScene'
import { useViewStore } from '@/store/viewStore'

/**
 * Detects whether WebGL 1.0 or WebGL 2.0 is supported by the current browser environment.
 */
function isWebGLAvailable(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const canvas = document.createElement('canvas')
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')
    return Boolean(gl)
  } catch {
    return false
  }
}

/**
 * Fallback display shown when WebGL is unsupported or context fails.
 */
function WebGLFallback({
  reason,
  onRetry,
}: {
  reason?: string
  onRetry?: () => void
}) {
  const setMode = useViewStore((s) => s.setMode)

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center p-6 bg-[#0a0a1a] text-center"
      data-testid="webgl-fallback"
    >
      <div className="w-16 h-16 rounded-2xl bg-surface-alt/90 border border-border flex items-center justify-center mb-4 text-accent shadow-lg shadow-accent/5">
        <span className="text-2xl" role="img" aria-label="globe">
          🌍
        </span>
      </div>

      <h3 className="text-lg font-semibold text-text-primary mb-2">
        3D Globe Hardware Acceleration Unavailable
      </h3>

      <p className="max-w-md text-xs text-text-secondary leading-relaxed mb-6">
        {reason ||
          'WebGL hardware acceleration is unavailable, disabled, or encountered a GPU context limitation in your current browser session.'}
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setMode('map')}
          className="px-4 py-2 rounded-lg text-xs font-semibold bg-accent text-surface hover:bg-accent-hover transition-colors shadow-sm"
        >
          Switch to 2D Map View
        </button>

        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 rounded-lg text-xs font-medium border border-border bg-surface-alt text-text-primary hover:bg-surface-hover transition-colors"
          >
            Retry 3D Globe
          </button>
        )}
      </div>
    </div>
  )
}

interface ErrorBoundaryProps {
  children: ReactNode
  onReset?: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
  errorMessage: string
}

class WebGLErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, errorMessage: '' }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'Failed to initialize WebGL graphics.',
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn('[AIR ATLAS] WebGL Error caught by boundary:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      return (
        <WebGLFallback
          reason={this.state.errorMessage}
          onRetry={this.handleReset}
        />
      )
    }
    return this.props.children
  }
}

/**
 * Top-level wrapper that mounts the R3F Canvas and
 * provides hardware capability detection and an ErrorBoundary
 * to prevent WebGL/GPU crashes.
 */
export function GlobeContainer() {
  const [webGLSupported, setWebGLSupported] = useState<boolean>(true)
  const [retryKey, setRetryKey] = useState<number>(0)

  useEffect(() => {
    setWebGLSupported(isWebGLAvailable())
  }, [retryKey])

  if (!webGLSupported) {
    return (
      <WebGLFallback
        reason="Your browser or device does not currently support WebGL hardware acceleration."
        onRetry={() => {
          setRetryKey((k) => k + 1)
        }}
      />
    )
  }

  return (
    <div className="w-full h-full" data-testid="globe-container">
      <WebGLErrorBoundary onReset={() => setRetryKey((k) => k + 1)}>
        <Canvas
          key={retryKey}
          camera={{ position: [0, 0, 2.8], fov: 45, near: 0.1, far: 100 }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          dpr={[1, 2]}
          style={{ background: '#0a0a1a' }}
          onCreated={({ gl }) => {
            const canvas = gl.domElement
            const handleContextLost = (event: Event) => {
              event.preventDefault()
              console.warn('[AIR ATLAS] WebGL context lost.')
              setWebGLSupported(false)
            }
            canvas.addEventListener('webglcontextlost', handleContextLost, false)
          }}
        >
          <Suspense fallback={null}>
            <GlobeScene />
          </Suspense>
        </Canvas>
      </WebGLErrorBoundary>
    </div>
  )
}
