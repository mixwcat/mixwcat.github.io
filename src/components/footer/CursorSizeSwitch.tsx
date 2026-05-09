import { cursorSizeAtom } from '@/store/cursor'
import { getNextCursorSize, setLocalCursorSize } from '@/utils/cursor'
import { useAtom } from 'jotai'

export function CursorSizeSwitch() {
  const [size, setSize] = useAtom(cursorSizeAtom)

  const handleClick = () => {
    const next = getNextCursorSize(size)
    setLocalCursorSize(next)
    setSize(next)
  }

  return (
    <button
      className="size-[32px] flex items-center justify-center rounded-full border border-primary transition-colors hover:bg-primary/10"
      type="button"
      aria-label={`当前光标大小 ${size}px，点击切换`}
      title={`光标大小: ${size}px`}
      onClick={handleClick}
    >
      <span className="text-xs font-bold tabular-nums">{size}</span>
    </button>
  )
}
