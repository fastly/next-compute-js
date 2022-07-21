import useSWR from 'swr'

const fetcher = (backend) => (args) => fetch(args, { backend }).then((res) => res.json())

export default function Swr() {
  const { data, error } = useSWR('https://httpbin.org/json', fetcher( 'httpbin' ));

  if (error) return <div>Failed to load</div>
  if (!data) return <div>Loading...</div>

  return (
    <div>
      <pre>{JSON.stringify(data)}</pre>
    </div>
  );
}
