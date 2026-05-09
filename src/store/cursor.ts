import { getLocalCursorSize } from '@/utils/cursor'
import { atom } from 'jotai'

export const cursorSizeAtom = atom(getLocalCursorSize())
