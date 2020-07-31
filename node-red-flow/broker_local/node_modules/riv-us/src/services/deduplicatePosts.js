const DEDUPLICATION_TIME_WINDOW = 3000; // 3 seconds

export default function deduplicatePosts(posts) {
  // TODO: make me smarter
  const duplicateIds = findDuplicates(groupPostsByTimeWindow(posts));
  return posts.filter(p => !duplicateIds.has(p.id));
}

function groupPostsByTimeWindow(posts) {
  const postsByTimeWindow = {};

  posts.forEach(post => {
    const window = Math.floor(post.created_time.valueOf() / DEDUPLICATION_TIME_WINDOW);
    postsByTimeWindow[window] = postsByTimeWindow[window] || [];
    postsByTimeWindow[window].push(post);
  });

  return postsByTimeWindow;
}

function findDuplicates(postsByTimeWindow) {
  const duplicateIds = new Set();

  Object.keys(postsByTimeWindow).forEach(window => {
    const posts = postsByTimeWindow[window];
    if (posts.length > 0) {
      posts
        .sort((p1, p2) => providerPriority(p1.source.name) - providerPriority(p2.source.name))
        .slice(1)
        .forEach(p => duplicateIds.add(p.id));
    }
  });

  return duplicateIds;
}

function providerPriority(providerName){
  switch (providerName) {
    case 'instagram':
      return 100;
    case 'medium':
      return 50;
    case 'facebook':
      return 5;
    case 'twitter':
      return 1;
    default:
      return 0;
  }
}
