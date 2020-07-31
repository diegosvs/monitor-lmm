export default function getFeedId(providers) {
  return providers.slice()
    .sort((p1, p2) => {
      const f1 = p1.feedId;
      const f2 = p2.feedId;

      if (f1 < f2) {
        return -1;
      } else if (f1 > f2) {
        return 1;
      }
      return 0;
    })
    .map(provider => provider.feedId)
    .join('|');
}