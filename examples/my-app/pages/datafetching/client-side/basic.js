import { useState, useEffect } from 'react';

export default function Basic() {
  const [data, setData] = useState(null)
  const [isLoading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch('https://httpbin.org/json', {
      backend: 'httpbin'
    })
      .then((res) => res.json())
      .then((data) => {
        setData(data)
        setLoading(false)
      })
  }, [])

  if (isLoading) return <p>Loading...</p>
  if (!data) return <p>No data</p>

  return (
    <div>
      <pre>{JSON.stringify(data)}</pre>
    </div>
  )
};
