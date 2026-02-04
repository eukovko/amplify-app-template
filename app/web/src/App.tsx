import { useState } from 'react'
import { useCounter, sendPushNotification } from 'app-shared'
import './App.css'

function App() {
  const { count, increment, decrement, loading, error } = useCounter()
  const [pushText, setPushText] = useState('')
  const [pushLoading, setPushLoading] = useState(false)
  const [pushError, setPushError] = useState<string | null>(null)
  const [pushResult, setPushResult] = useState<string | null>(null)
  const [pushDetails, setPushDetails] = useState<Record<string, unknown> | null>(null)

  const handlePush = async () => {
    setPushError(null)
    setPushResult(null)
    setPushDetails(null)
    setPushLoading(true)
    try {
      const result = await sendPushNotification(pushText)
      console.log('[web] sendPush result', result)
      if (result.success) {
        setPushText('')
        setPushResult('Sent')
      } else {
        setPushResult(result.message)
        if (result.details) setPushDetails(result.details)
        console.warn('[web] sendPush failed', result.message, result.details)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setPushError(msg)
      console.error('[web] sendPush error', e)
    } finally {
      setPushLoading(false)
    }
  }

  return (
    <div className="app">
      <h1>Hello from web</h1>
      {error && <p className="counter-error">{error}</p>}
      <div className="counter">
        <button
          type="button"
          className="counter-btn"
          onClick={decrement}
          disabled={loading}
        >
          −
        </button>
        <span className="counter-value">{loading ? '…' : count}</span>
        <button
          type="button"
          className="counter-btn"
          onClick={increment}
          disabled={loading}
        >
          +
        </button>
      </div>
      <div className="push">
        <input
          type="text"
          className="push-input"
          value={pushText}
          onChange={(e) => setPushText(e.target.value)}
          placeholder="Message to push"
          aria-label="Message to push"
        />
        <button
          type="button"
          className="counter-btn"
          onClick={handlePush}
          disabled={pushLoading}
        >
          {pushLoading ? '…' : 'Push'}
        </button>
        {pushError && <p className="counter-error">{pushError}</p>}
        {pushResult && (
          <p className={pushResult === 'Sent' ? 'push-success' : 'counter-error'}>
            {pushResult}
          </p>
        )}
        {pushDetails && Object.keys(pushDetails).length > 0 && (
          <pre className="push-details">{JSON.stringify(pushDetails, null, 2)}</pre>
        )}
      </div>
    </div>
  )
}

export default App
