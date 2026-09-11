import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Quiz app crashed:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="card" style={{ marginTop: 30 }}>
          <h2>Something went wrong</h2>
          <pre
            className="muted"
            style={{ whiteSpace: 'pre-wrap', overflowX: 'auto', background: 'var(--surface-container-lowest)', padding: 12, borderRadius: 8 }}
          >
            {String(this.state.error?.message || this.state.error)}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}