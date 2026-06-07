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
  /** 悬停检测节流间隔（毫秒），默认 50ms */
  hoverThrottle?: number
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

const CLICKABLE_TAGS = new Set(['a', 'button'])
const MAX_TRAVERSAL_DEPTH = 15

// 缓存元素的悬停状态
const hoverStateCache = new WeakMap<HTMLElement, HoverState>()

// 优化的悬停状态检测函数
function getHoverState(el: HTMLElement): HoverState {
  // 先检查缓存
  if (hoverStateCache.has(el)) {
    return hoverStateCache.get(el)!
  }

  let node: HTMLElement | null = el
  let depth = 0

  while (node && node !== document.body && depth < MAX_TRAVERSAL_DEPTH) {
    const tag = node.tagName.toLowerCase()
    const dataCursor = node.getAttribute('data-cursor')

    // 优先检查 data-cursor 属性（最快）
    if (dataCursor === 'choose') {
      hoverStateCache.set(el, 'choose')
      return 'choose'
    }
    if (dataCursor === 'vertical') {
      hoverStateCache.set(el, 'vertical')
      return 'vertical'
    }
    if (dataCursor === 'normal') {
      hoverStateCache.set(el, 'normal')
      return 'normal'
    }

    // 检查可点击元素（快速路径）
    const isClickableTag = CLICKABLE_TAGS.has(tag)
    const isClickableInput =
      tag === 'input' &&
      ['submit', 'button', 'reset'].includes((node as HTMLInputElement).type)
    const isRoleButton = node.getAttribute('role') === 'button'

    if (isClickableTag || isClickableInput || isRoleButton) {
      hoverStateCache.set(el, 'choose')
      return 'choose'
    }

    // 检查文本输入元素
    const inputType = tag === 'input' ? (node as HTMLInputElement).type : ''
    const isTextElement =
      tag === 'textarea' ||
      (tag === 'input' && TEXT_INPUT_TYPES.has(inputType)) ||
      node.getAttribute('contenteditable') === 'true'

    if (isTextElement) {
      hoverStateCache.set(el, 'vertical')
      return 'vertical'
    }

    // 最后才检查 computed style（最慢）
    const inlineStyle = node.style.cursor
    if (inlineStyle === 'pointer') {
      hoverStateCache.set(el, 'choose')
      return 'choose'
    }
    if (inlineStyle === 'text') {
      hoverStateCache.set(el, 'vertical')
      return 'vertical'
    }

    // 只有在必要时才使用 getComputedStyle
    if (!inlineStyle) {
      const computedStyle = window.getComputedStyle(node).cursor
      if (computedStyle === 'pointer') {
        hoverStateCache.set(el, 'choose')
        return 'choose'
      }
      if (computedStyle === 'text') {
        hoverStateCache.set(el, 'vertical')
        return 'vertical'
      }
    }

    node = node.parentElement
    depth++
  }

  hoverStateCache.set(el, 'normal')
  return 'normal'
}

// 定期清理缓存以防止内存泄漏
function clearHoverStateCache() {
  // WeakMap 会自动清理，但我们可以手动创建新实例来强制清理
  // 这个函数留作未来可能需要的扩展点
}

export function CustomCursor({
  cursors,
  hotspot = { x: 0, y: 0 },
  stiffness = 500,
  smooth = false,
  hoverThrottle = 50,
}: Props) {
  const size = useAtomValue(cursorSizeAtom)
  const isMobile =
    typeof window !== 'undefined' &&
    !window.matchMedia('(hover: hover)').matches

  if (isMobile) return null

  const [hoverState, setHoverState] = useState<HoverState>('normal')
  const [isLoading, setIsLoading] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const hoverRef = useRef<HoverState>('normal')
  const lastCheckTimeRef = useRef(0)
  const rafIdRef = useRef<number>()

  const cursorX = useMotionValue(-100)
  const cursorY = useMotionValue(-100)
  const springX = smooth ? useSpring(cursorX, { stiffness, damping: 20 }) : cursorX
  const springY = smooth ? useSpring(cursorY, { stiffness, damping: 20 }) : cursorY

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      // 使用 requestAnimationFrame 优化性能
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
      }

      rafIdRef.current = requestAnimationFrame(() => {
        // 立即更新光标位置（高频更新）
        cursorX.set(e.clientX)
        cursorY.set(e.clientY)

        // 节流悬停状态检测（低频更新）
        const now = Date.now()
        if (now - lastCheckTimeRef.current >= hoverThrottle) {
          lastCheckTimeRef.current = now

          const next = getHoverState(e.target as HTMLElement)
          if (next !== hoverRef.current) {
            hoverRef.current = next
            setHoverState(next)
          }
        }
      })
    }

    const checkLoading = () => {
      setIsLoading(document.readyState !== 'complete')
    }

    // swup 页面过渡监听
    const onSwupStart = () => setIsLoading(true)
    const onSwupEnd = () => setIsLoading(false)

    // 鼠标离开/回到窗口
    const onDocLeave = () => setIsVisible(false)
    const onDocEnter = () => setIsVisible(true)
    // 窗口失去/获得焦点
    const onBlur = () => setIsVisible(false)
    const onFocus = () => setIsVisible(true)

    window.addEventListener('mousemove', onMove)
    document.addEventListener('readystatechange', checkLoading)
    window.addEventListener('load', () => setIsLoading(false))

    document.addEventListener('swup:visit:start', onSwupStart)
    document.addEventListener('swup:visit:end', onSwupEnd)
    document.addEventListener('swup:content:replace', onSwupEnd)

    document.documentElement.addEventListener('mouseleave', onDocLeave)
    document.documentElement.addEventListener('mouseenter', onDocEnter)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)

    checkLoading()

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
      }
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('readystatechange', checkLoading)
      document.removeEventListener('swup:visit:start', onSwupStart)
      document.removeEventListener('swup:visit:end', onSwupEnd)
      document.removeEventListener('swup:content:replace', onSwupEnd)
      document.documentElement.removeEventListener('mouseleave', onDocLeave)
      document.documentElement.removeEventListener('mouseenter', onDocEnter)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
    }
  }, [cursorX, cursorY, hoverThrottle])

  // 预加载光标图片
  useEffect(() => {
    const imagesToPreload = Object.values(cursors)
    imagesToPreload.forEach(src => {
      const img = new Image()
      img.src = src
    })
  }, [cursors])

  const currentState: CursorState = isLoading ? 'loading' : hoverState
  const src = cursors[currentState]
  const offsetX = -size * hotspot.x
  const offsetY = -size * hotspot.y

  return (
    <motion.div
      className="fixed top-0 left-0 pointer-events-none z-[9999]"
      style={{ x: springX, y: springY }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      transition={{ duration: 0.15 }}
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
