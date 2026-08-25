import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Where a row sits with its own transform taken back off — its place in the list as the list
 * would look with nothing being dragged.
 *
 * getComputedStyle reports a transition’s current value rather than its target, so this stays
 * honest while the rows are still sliding into place.
 */
function untransformed(element) {
  const rect = element.getBoundingClientRect()
  const transform = getComputedStyle(element).transform
  const shift = transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m42

  return { top: rect.top - shift, height: rect.height }
}

// The rows that part are settling, not tracking a finger, so they are the one thing here that
// should be eased rather than pinned.
const PART = 'transform 150ms cubic-bezier(0.22, 1, 0.36, 1)'

/**
 * Reordering a vertical list by dragging, without a library.
 *
 * Pointer Events rather than the HTML5 drag-and-drop API: that API never fires on touch, and this
 * dashboard is used from a phone more than from a desk. The gesture starts on a handle and
 * nowhere else, so a finger laid anywhere on a row still scrolls the page — a whole-row drag
 * would have to fight the scroll for every gesture and lose one of them.
 *
 * The list parts as the row is carried over it: every row the drag has passed slides up or down
 * by one slot, so the gap under the finger is the place the row will take. That is presentation
 * only — the array is still spliced once, on release.
 *
 * What decides where it lands is measured against the list as it would sit untransformed, never
 * against the rows as they have just been moved. Hit-testing the moved rows would put the
 * ground in motion under the measurement that moves it.
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
      const { top, height } = untransformed(element)
      rows.push({ id, element, middle: top + height / 2 })
    }
    return rows
  }, [])

  const finish = useCallback((commit) => {
    const state = stateRef.current
    stateRef.current = null
    if (!state) return

    cancelAnimationFrame(state.frame)
    // Every row, not just the one that was held: the rest are parted around a gap that is about
    // to stop existing. Cleared without a transition, because the list re-renders in its new
    // order in the same tick and animating a row back to a place it is leaving reads as a glitch.
    for (const row of rowsRef.current.values()) {
      row.style.transform = ''
      row.style.transition = ''
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

    // The whole list is read before any of it is written. A getBoundingClientRect after a style
    // change makes the browser lay the list out again to answer it, and interleaving the two
    // costs one full layout per row, every frame.
    const element = rowsRef.current.get(state.id)
    const slotTop = element ? untransformed(element).top : 0
    const rows = measure(state.id)

    let index = rows.findIndex((row) => state.pointerY < row.middle)
    if (index === -1) index = rows.length

    if (element) {
      // slotTop is where the row would sit untouched, so the difference is the whole offset it
      // needs — an assignment. Adding it re-applied the entire displacement on every frame, and
      // since autoScroll runs update() ~60 times a second the row shot off the list with the
      // finger standing still.
      state.offset = (state.pointerY - state.grab) - slotTop
      element.style.transform = `translateY(${state.offset}px)`
    }

    // rows is the list with the held row taken out, which is the same list `index` counts into:
    // everything between where it left and where it would land closes up by exactly the slot it
    // vacated, and the gap that leaves is the answer to "where am I".
    const from = idsRef.current.indexOf(state.id)
    for (const [position, row] of rows.entries()) {
      let shift = 0
      if (position >= from && position < index) shift = -state.slot
      else if (position >= index && position < from) shift = state.slot

      if (state.shifts.get(row.id) === shift) continue
      state.shifts.set(row.id, shift)
      row.element.style.transform = shift ? `translateY(${shift}px)` : ''
    }

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

  /**
   * How far the rest of the list closes up when this row is lifted out of it: the row’s own
   * height plus whatever separates it from its neighbour. Measured rather than assumed — the
   * products table runs its rows flush and the category list spaces them out, and which is which
   * is not this hook’s business.
   */
  const slotHeight = useCallback((id) => {
    const index = idsRef.current.indexOf(id)
    const self = rowsRef.current.get(id)?.getBoundingClientRect()
    if (!self) return 0

    const next = rowsRef.current.get(idsRef.current[index + 1])?.getBoundingClientRect()
    if (next) return next.top - self.top

    const previous = rowsRef.current.get(idsRef.current[index - 1])?.getBoundingClientRect()
    if (previous) return self.height + (self.top - previous.bottom)

    return self.height
  }, [])

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
      slot: slotHeight(id),
      // What each of the other rows has been moved by, so a frame that changes nothing writes
      // nothing — an unchanged transform would still be a style write on every row, every frame.
      shifts: new Map(),
      scroller: findScroller(element),
      frame: 0,
    }

    for (const [rowId, row] of rowsRef.current) {
      // The row under the finger has to be pinned to it; a transition on that one is lag. The
      // rows it displaces are the opposite case — they are settling, and should be seen to.
      row.style.transition = rowId === id ? 'none' : PART
    }

    setDragId(id)
    setDropIndex(stateRef.current.dropIndex)
    stateRef.current.frame = requestAnimationFrame(autoScroll)
  }, [disabled, autoScroll, slotHeight])

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
