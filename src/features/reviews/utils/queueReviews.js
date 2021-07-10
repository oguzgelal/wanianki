import _ from 'lodash';
import randomId from 'src/utils/randomId';

import pickReviewAndType from 'src/features/reviews/utils/pickReviewAndType';
import adjustQueue from 'src/features/reviews/utils/adjustQueue';

// pick multiple reviews from the list, respecting the
// removed items from the list from the previous loop
const queueReviews = (reviews, reviewTypesHistory, queue, subjects) => {
  let _reviews = reviews;
  let _reviewTypesHistory = reviewTypesHistory;

  // avoid recursion to avoid exceeding maximum call stack size
  while (_reviews.length > 0) {

    // pick a review at random
    const [
      review,
      reviewType,
      newReviews,
      newReviewTypeHistory,
    ] = pickReviewAndType(_reviews, _reviewTypesHistory);

    // find the review's subject
    const subject = subjects.find(subject => subject.id === _.get(review, 'data.subject_id'));
    const subjectLevel = _.get(subject, "data.level");

    // add current pick to the queue
    queue.push({
      id: randomId(),
      review,
      reviewType,
      subjectLevel,
    });

    _reviews = newReviews;
    _reviewTypesHistory = newReviewTypeHistory;

  }

  return queue;
}

export default (reviews, subjects) => {
  const queued = queueReviews(reviews, {}, [], subjects);
  return adjustQueue(queued);
};
