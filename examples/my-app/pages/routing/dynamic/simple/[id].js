import { useRouter } from 'next/router'

export default function Post() {
  const router = useRouter();
  return (
    <div>
      <div>Simple Dynamic Routing : /routing/dynamic/simple/[id]</div>
      <div>Query: {JSON.stringify(router.query)}</div>
    </div>
  );
}
