import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Reordering a vertical list by dragging, without a library.
 *
 * Pointer Events rather than the HTML5 drag-and-drop API: that API never fires on touch, and this
 * dashboard is used from a phone more than from a desk. The gesture starts on a handle and
 * nowhere else, so a finger laid anywhere on a row still scrolls the page — a whole-row drag
 * would have to fight the scroll for every gesture and lose one of them.
 *
 * Nothing in the list moves while the pointer is down. The dragged row follows the finger and a
 * line marks where it would land; the array is spliced once, on release. Reordering live would
 * mean the ground moving under the measurement that decides where to reorder to.
 *
 * The handle is a real button, so the same move is available from the keyboard with the arrow
 * keys — dragging is unreachable without a pointer, and the dashboard should not be either.
 */
export function useDragOrder({ ids, onCommit, disabled = false }) {
  const [dragId, setDragId] = useState(null)
  // Where the dragged row would land, as an index into the list with itself taken out.
  const [dropIndex, setDropIndex] = useState(null)

  const rowsRef = useRef(new Map())
  const stateRef = useRef(null)
  const idsRef = useRef(ids)
  idsRef.current = ids
  const onCommitRef = useRef(onCommit)
  onCommitRef.current = onCommit

  const registerRow = useCallback((id, element) => {
    if (element) rowsRef.current.set(id, element)
    else rowsRef.current.delete(id)
  }, [])

  /** Rows are measured every frame rather than once, so scrolling mid-drag cannot stale them. */
  const measure = useCallback((exceptId) => {
    const rows = []
    for (const id of idsRef.current) {
      if (id === exceptId) continue
      const element = rowsRef.current.get(id)
      if (!element) continue
      const rect = element.getBoundingClientRect()
      rows.push({ id, middle: rect.top + rect.height / 2 })
    }
    return rows
  }, [])

  const finish = useCallback((commit) => {
    const state = stateRef.current
    stateRef.current = null
    if (!state) return

    cancelAnimationFrame(state.frame)
    const element = rowsRef.current.get(state.id)
    if (element) {
      element.style.transform = ''
      element.style.transition = ''
    }

    setDragId(null)
    setDropIndex(null)

    if (!commit) return
    const rest = idsRef.current.filter((id) => id !== state.id)
    rest.splice(state.dropIndex, 0, state.id)
    if (rest.some((id, index) => id !== idsRef.current[index])) onCommitRef.current(rest)
  }, [])

  /**
   * Keeps the row under the finger by measuring the slot it would occupy untransformed, so a
   * page or panel that scrolls mid-drag corrects itself on the next frame instead of drifting.
   */
  const update = useCallback(() => {
    const state = stateRef.current
    if (!state) return

    const element = rowsRef.current.get(state.id)
    if (element) {
      const slotTop = element.getBoundingClientRect().top - state.offset
      state.offset += (state.pointerY - state.grab) - slotTop
      element.style.transform = `translateY(${state.offset}px)`
    }

    const rows = measure(state.id)
    let index = rows.findIndex((row) => state.pointerY < row.middle)
    if (index === -1) index = rows.length
    if (index !== state.dropIndex) {
      state.dropIndex = index
      setDropIndex(index)
    }
  }, [measure])

  /**
   * A list taller than its container cannot be dragged across without this: the finger reaches
   * the edge and the rest of the list is simply unreachable.
   */
  const autoScroll = useCallback(() => {
    const state = stateRef.current
    if (!state) return
    state.frame = requestAnimationFrame(autoScroll)

    const EDGE = 56
    const SPEED = 12
    const scroller = state.scroller
    const bounds = scroller === window
      ? { top: 0, bottom: window.innerHeight }
      : scroller.getBoundingClientRect()

    let delta = 0
    if (state.pointerY < bounds.top + EDGE) delta = -SPEED
    else if (state.pointerY > bounds.bottom - EDGE) delta = SPEED

    if (delta) {
      if (scroller === window) window.scrollBy(0, delta)
      else scroller.scrollTop += delta
    }
    update()
  }, [update])

  /** The nearest ancestor that actually scrolls, so a list inside a dialog scrolls the list. */
  const findScroller = (element) => {
    for (let node = element?.parentElement; node; node = node.parentElement) {
      const overflow = getComputedStyle(node).overflowY
      if ((overflow === 'auto' || overflow === 'scroll') && node.scrollHeight > node.clientHeight) {
        return node
      }
    }
    return window
  }

  const onPointerDown = useCallback((event, id) => {
    if (disabled || event.button > 0) return
    const element = rowsRef.current.get(id)
    if (!element) return

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)

    const rect = element.getBoundingClientRect()
    stateRef.current = {
      id,
      pointerId: event.pointerId,
      pointerY: event.clientY,
      // Where in the row it was picked up, so it does not jump to centre itself on the finger.
      grab: event.clientY - rect.top,
      offset: 0,
      dropIndex: idsRef.current.indexOf(id),
      scroller: findScroller(element),
      frame: 0,
    }
    // Transitions belong to the settling, not the dragging; leaving one on lags the finger.
    element.style.transition = 'none'

    setDragId(id)
    setDropIndex(stateRef.current.dropIndex)
    stateRef.current.frame = requestAnimationFrame(autoScroll)
  }, [disabled, autoScroll])

  const onPointerMove = useCallback((event) => {
    const state = stateRef.current
    if (!state || event.pointerId !== state.pointerId) return
    state.pointerY = event.clientY
    update()
  }, [update])

  const onPointerUp = useCallback((event) => {
    const state = stateRef.current
    if (!state || event.pointerId !== state.pointerId) return
    finish(true)
  }, [finish])

  const onPointerCancel = useCallback(() => finish(false), [finish])

  const onKeyDown = useCallback((event, id) => {
    if (disabled) return
    const step = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0
    if (!step) return

    const from = idsRef.current.indexOf(id)
    const to = from + step
    if (from < 0 || to < 0 || to >= idsRef.current.length) return

    event.preventDefault()
    const next = [...idsRef.current]
    next.splice(to, 0, ...next.splice(from, 1))
    onCommitRef.current(next)
    // The button moves with its row; keep the focus on it so the next press continues the move.
    requestAnimationFrame(() => {
      rowsRef.current.get(id)?.querySelector('[data-drag-handle]')?.focus()
    })
  }, [disabled])

  // A drag left running when the list unmounts would keep a frame loop alive against dead nodes.
  useEffect(() => () => finish(false), [finish])

  const handleProps = useCallback((id) => ({
    'data-drag-handle': '',
    onPointerDown: (event) => onPointerDown(event, id),
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onKeyDown: (event) => onKeyDown(event, id),
  }), [onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onKeyDown])

  /**
   * Which row to draw the landing line against, and on which side. Returns null while the row
   * would land back where it started — a line either side of the row you are holding says
   * nothing and flickers as you cross your own midpoint.
   */
  const dropMarker = useCallback((id) => {
    if (dragId === null || dropIndex === null) return null
    const rest = ids.filter((item) => item !== dragId)
    if (dropIndex === ids.indexOf(dragId)) return null
    if (rest[dropIndex] === id) return 'before'
    if (dropIndex === rest.length && rest[rest.length - 1] === id) return 'after'
    return null
  }, [dragId, dropIndex, ids])

  return { dragId, registerRow, handleProps, dropMarker }
}
