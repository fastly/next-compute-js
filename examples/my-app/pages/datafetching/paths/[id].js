import { useRouter } from 'next/router'

export default function Post() {
  const router = useRouter();
  return (
    <div>
      <div>Simple Dynamic Routing : /datafetching/paths/[id]</div>
      <div>Query: {JSON.stringify(router.query)}</div>
    </div>
  );
}

// The functions below get called at build time
export async function getStaticProps({params}) {
  await Promise.resolve();

  return {
    props: {
      id: params.id,
    },
  };
}

export async function getStaticPaths() {
  await Promise.resolve();

  const paths = [
    { params: { id: 'foo' } },
    { params: { id: 'bar' } },
  ];

  // We'll pre-render only these paths at build time.
  // { fallback: false } means other routes should 404.
  return {
    paths,
    fallback: false,
  };
}
