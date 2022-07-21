import { useRouter } from 'next/router'

export default function Post() {
  const router = useRouter();
  return (
    <div>
      <div>Catchall Dynamic Routing : /routing/dynamic/catchall/[...args]</div>
      <div>Query: {JSON.stringify(router.query)}</div>
    </div>
  );
}
