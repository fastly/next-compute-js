import { useRouter } from 'next/router';

export default function Foo() {
  const router = useRouter();
  return (
    <div>
      <div>Foo!</div>
      <button onClick={() => {
        router.push('/foo2');
      }}>Click</button>

      <button onClick={() => {
        router.push('?counter=10', undefined, { shallow: true })
      }}>Shallow route</button>

      <div>
        Query: {JSON.stringify(router.query)}
      </div>
    </div>
  );
}
