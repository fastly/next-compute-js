function Blog({ posts }) {
  if(posts == null) {
    return null;
  }
  return (
    <ul>
      {posts.map((post, i) => (
        <li key={i}>{post.title}</li>
      ))}
    </ul>
  )
}

// This function gets called at build time
export async function getServerSideProps() {
  await Promise.resolve();

  const posts = [
    { title: 'foo' },
    { title: 'bar' },
  ];

  return {
    props: {
      posts,
    },
  }
}

export default Blog
