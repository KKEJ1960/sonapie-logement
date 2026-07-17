import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

export function useApi(url, dependencies = []) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const cache = useRef({})

  useEffect(() => {
    if (!url) return

    if (cache.current[url]) {
      setData(cache.current[url])
      setLoading(false)
      return
    }

    const controller = new AbortController()

    const fetchData = async () => {
      try {
        setLoading(true)
        const token = sessionStorage.getItem('token')
        const response = await axios.get(url, {
          signal: controller.signal,
          headers: { Authorization: `Bearer ${token}` },
        })
        cache.current[url] = response.data
        setData(response.data)
      } catch (err) {
        if (err.name !== 'AbortError' && err.name !== 'CanceledError') {
          setError(err.message)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    return () => controller.abort()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies)

  return { data, loading, error }
}
