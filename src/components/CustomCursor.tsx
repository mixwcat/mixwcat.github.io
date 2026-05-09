import { cursorSizeAtom } from '@/store/cursor'
import { useAtomValue } from 'jotai'
import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

type HoverState = 'choose' | 'vertical' | 'normal'
type CursorState = HoverState | 'loading'

export interface CursorSet {
  normal: string
  choose: string
  loading: string
  vertical: string
}

interface Props {
  cursors: CursorSet
  hotspot?: { x: number; y: number }
  stiffness?: number
  /** 启用弹簧平滑，默认 false（零延迟） */
  smooth?: boolean
}

const TEXT_INPUT_TYPES = new Set([
  'text',
  'password',
  'email',
  'number',
  'search',
  'url',
  'tel',
  'date',
  'datetime-local',
  'month',
  'time',
  'week',
])

function getHoverState(el: HTMLElement): HoverState {
  let node: HTMLElement | null = el
  while (node && node !== document.body) {
    const tag = node.tagName.toLowerCase()
    const style = window.getComputedStyle(node)
    const dataCursor = node.getAttribute('data-cursor')

    if (dataCursor === 'choose') return 'choose'
    if (dataCursor === 'vertical') return 'vertical'
    if (dataCursor === 'normal') return 'normal'

    const isClickable =
      tag === 'a' ||
      tag === 'button' ||
      (tag === 'input' &&
        ['submit', 'button', 'reset'].includes(
          (node as HTMLInputElement).type,
        )) ||
      node.getAttribute('role') === 'button' ||
      style.cursor === 'pointer'

    if (isClickable) return 'choose'

    const inputType =
      tag === 'input' ? (node as HTMLInputElement).type : ''
    const isText =
      tag === 'textarea' ||
      (tag === 'input' && TEXT_INPUT_TYPES.has(inputType)) ||
      node.getAttribute('contenteditable') === 'true' ||
      style.cursor === 'text'

    if (isText) return 'vertical'

    node = node.parentElement
  }
  return 'normal'
}

export function CustomCursor({
  cursors,
  hotspot = { x: 0, y: 0 },
  stiffness = 500,
  smooth = false,
}: Props) {
  const size = useAtomValue(cursorSizeAtom)
  const isMobile =
    typeof window !== 'undefined' &&
    !window.matchMedia('(hover: hover)').matches

  if (isMobile) return null

  const [hoverState, setHoverState] = useState<HoverState>('normal')
  const [isLoading, setIsLoading] = useState(false)
  const hoverRef = useRef<HoverState>('normal')

  const cursorX = useMotionValue(-100)
  const cursorY = useMotionValue(-100)
  const springX = smooth ? useSpring(cursorX, { stiffness, damping: 20 }) : cursorX
  const springY = smooth ? useSpring(cursorY, { stiffness, damping: 20 }) : cursorY

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      cursorX.set(e.clientX)
      cursorY.set(e.clientY)

      const next = getHoverState(e.target as HTMLElement)
      if (next !== hoverRef.current) {
        hoverRef.current = next
        setHoverState(next)
      }
    }

    const checkLoading = () => {
      setIsLoading(document.readyState !== 'complete')
    }

    // swup 页面过渡监听
    const onSwupStart = () => setIsLoading(true)
    const onSwupEnd = () => setIsLoading(false)

    window.addEventListener('mousemove', onMove)
    document.addEventListener('readystatechange', checkLoading)
    window.addEventListener('load', () => setIsLoading(false))

    document.addEventListener('swup:visit:start', onSwupStart)
    document.addEventListener('swup:visit:end', onSwupEnd)
    document.addEventListener('swup:content:replace', onSwupEnd)

    checkLoading()

    return () => {
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('readystatechange', checkLoading)
      document.removeEventListener('swup:visit:start', onSwupStart)
      document.removeEventListener('swup:visit:end', onSwupEnd)
      document.removeEventListener('swup:content:replace', onSwupEnd)
    }
  }, [cursorX, cursorY])

  const currentState: CursorState = isLoading ? 'loading' : hoverState
  const src = cursors[currentState]
  const offsetX = -size * hotspot.x
  const offsetY = -size * hotspot.y

  return (
    <motion.div
      className="fixed top-0 left-0 pointer-events-none z-[9999]"
      style={{ x: springX, y: springY }}
    >
      <img
        key={currentState}
        src={src}
        alt=""
        width={size}
        height={size}
        style={{ transform: `translate(${offsetX}px, ${offsetY}px)` }}
        draggable={false}
      />
    </motion.div>
  )
}
