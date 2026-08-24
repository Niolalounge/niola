import { Component } from 'react'

const RELOAD_FLAG = 'niola-chunk-reload'

/**
 * Catches a route that fails to render — in practice, a lazy chunk that will not load.
 *
 * Every page is behind React.lazy, and a deploy re-hashes the chunk filenames. A visitor who
 * had the site open before the deploy still holds the old index.html, so clicking through to
 * another page requests a filename that no longer exists. Without this, the rejected import is
 * rethrown during render and React unmounts the whole tree: a blank white page.
 *
 * The recovery is a single reload, which fetches the current index.html and its current chunk
 * names. A sessionStorage flag makes it exactly one attempt, so a genuine bug cannot turn into
 * a reload loop.
 */
export default class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    const isStaleChunk = /dynamically imported module|Importing a module script failed|Failed to fetch/i
      .test(error?.message ?? '')

    let alreadyTried = true
    try {
      alreadyTried = sessionStorage.getItem(RELOAD_FLAG) === '1'
      if (!alreadyTried) sessionStorage.setItem(RELOAD_FLAG, '1')
    } catch {
      // Private browsing can refuse storage; treat that as "already tried" and show the message
      // rather than risk reloading forever.
    }

    if (isStaleChunk && !alreadyTried) {
      window.location.reload()
      return
    }

    console.error('[niola] route failed to render', error)
  }

  componentDidMount() {
    // A clean render means whatever went wrong is behind us.
    try { sessionStorage.removeItem(RELOAD_FLAG) } catch { /* nothing to clear */ }
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <div className="route-error" role="alert">
        <p>تعذّر تحميل هذه الصفحة.</p>
        <button type="button" onClick={() => window.location.reload()}>إعادة المحاولة</button>
      </div>
    )
  }
}
