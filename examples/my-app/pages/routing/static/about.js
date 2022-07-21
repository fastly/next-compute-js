import { useRouter } from 'next/router'

export default function About() {
  const router = useRouter();
  return (
    <div>
      <div>Static Routing : /routing/static/about</div>
      <div>Query: {JSON.stringify(router.query)}</div>
    </div>
  );
}
