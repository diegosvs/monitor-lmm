import moment from 'moment';

export function momentize(post) {
  if (!moment.isMoment(post.created_time)) {
    return {
      ...post,
      created_time: moment(post.created_time)
    };
  }
  return post;
}

export function demomentize(post) {
  if (moment.isMoment(post.created_time)) {
    return {
      ...post,
      created_time: post.created_time.valueOf()
    };
  }
  return post;
}
