'use client'

import { useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const emptySubscribe = () => () => {}

/** SSR-safe mounted flag (avoids setState-in-effect lint error too) */
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )
}

/**
 * Day / Night studio switch. Renders a placeholder until mounted to avoid
 * hydration mismatch (next-themes resolves the actual theme on the client).
 */
export function ThemeToggle({ className, withLabel = false }: { className?: string; withLabel?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useMounted()

  const dark = mounted && resolvedTheme === 'dark'

  return (
    <TooltipProvider delayDuration={250}>
      <Tooltip>
        <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => setTheme(dark ? 'light' : 'dark')}
          aria-label={dark ? 'Switch to day studio' : 'Switch to night studio'}
          aria-pressed={dark}
          className={cn(
            'group relative inline-flex h-8 items-center justify-center gap-1.5 overflow-hidden rounded-lg border border-stone-300/80 bg-white px-2 text-stone-500 shadow-xs transition-all duration-200 hover:border-stone-400/70 hover:text-charcoal',
            withLabel && 'w-auto px-2.5',
            !withLabel && 'w-8',
            className,
          )}
        >
          {/* sun and moon cross-fade + rotate */}
          <Sun
            className={cn(
              'h-3.5 w-3.5 transition-all duration-300',
              dark ? '-rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100',
            )}
          />
          <Moon
            className={cn(
              'absolute h-3.5 w-3.5 transition-all duration-300',
              dark ? 'rotate-0 scale-100 opacity-100' : 'rotate-90 scale-0 opacity-0',
            )}
          />
          {withLabel && (
            <span className="text-xs font-medium">{mounted ? (dark ? 'Night' : 'Day') : 'Theme'}</span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {dark ? 'Switch to day studio' : 'Switch to night studio'}
      </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
