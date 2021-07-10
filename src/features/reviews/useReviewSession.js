/**
 * Hook that controls a review session
 */

import { useState, useEffect, useMemo } from 'react';
import _ from 'lodash';
import { MEANING, RADICAL } from 'src/common/constants';
import listToDict from 'src/utils/listToDict';
import queueReviews from 'src/features/reviews/utils/queueReviews';

import { BACK_TO_BACK_MODE, MEANING_FIRST, REVIEW_ORDER } from 'src/common/constants';
import { useStoreState } from 'easy-peasy';
import adjustQueue from 'src/features/reviews/utils/adjustQueue';

export default (reviews, subjects) => {

  const [ queue, setQueue ] = useState([]);
  const [ subjectsDict, setSubjectsDict ] = useState({});
  
  // total
  const [ totalReviews, setTotalReviews ] = useState(0);
  const [ totalCards, setTotalCards ] = useState(0);
  
  // review stats
  const [ unfinishedReviews, setUnfinishedReviews ] = useState({});
  const [ completedReviews, setCompletedReviews ] = useState({});
  const [ incorrectReviews, setIncorrectReviews ] = useState({});
  const [ incorrectMeanings, setIncorrectMeanings ] = useState({});
  const [ incorrectReadings, setIncorrectReadings ] = useState({});
  
  // cards stats
  const [ completedCards, setCompletedCards ] = useState({});
  const [ incorrectCards, setIncorrectCards ] = useState({});

  // Sort reading-meaning card pairs back-to-back according to the review order
  const userSettings = useStoreState(state => state.session.userSettings);
  const backToBackMode = _.get(userSettings, BACK_TO_BACK_MODE);
  const meaningFirst = _.get(userSettings, MEANING_FIRST);
  const reviewOrder = _.get(userSettings, REVIEW_ORDER);
  // Re-sort queue when the relevant user settings change
  useEffect(() => {
    setQueue(adjustQueue(queue, backToBackMode, meaningFirst, reviewOrder))
  }, [
    backToBackMode,
    meaningFirst,
    reviewOrder,
  ]);

  // refresh &
  // reviews and subjects loaded
  useEffect(() => {
    if (_.isNil(reviews) || _.isNil(subjects)) return;

    // reset stats
    setUnfinishedReviews({})
    setCompletedReviews({})
    setIncorrectReviews({})
    setIncorrectMeanings({})
    setIncorrectReadings({})
    setCompletedCards({})
    setIncorrectCards({})

    // set reviews and subject data
    setSubjectsDict(listToDict(subjects));
    setTotalReviews(reviews ? reviews.length : 0);
    
    // create queue
    const _queue = queueReviews(reviews, subjects);
    setQueue(adjustQueue(_queue, backToBackMode, meaningFirst, reviewOrder));
    setTotalCards(_queue.length);
    
  }, [
    reviews,
    subjects,
  ]);

  // calculate stats
  const stats = useMemo(() => {
    
    const totalCompletedCards = Object.keys(completedCards).length;
    const totalCompletedReviews = Object.keys(completedReviews).length;
    const totalUnfinishedReview = Object.keys(unfinishedReviews).length;
    let totalCorrectCards = 0;
    let totalIncorrectCards = 0;
    let totalCorrectReviews = 0;
    let totalIncorrectReviews = 0;
    let correctCardsPercent = 0;
    let incorrectCardsPercent = 0;
    let correctReviewsPercent = 0;
    let incorrectReviewsPercent = 0;

    if (totalCompletedCards !== 0) {
      const completed = Object.keys(completedCards);
      totalIncorrectCards = completed.reduce((acc, id) => acc + (incorrectCards[id] ? 1 : 0), 0);
      totalCorrectCards = totalCompletedCards - totalIncorrectCards;
      incorrectCardsPercent = Math.round((totalIncorrectCards / totalCompletedCards) * 100);
      correctCardsPercent = 100 - incorrectCardsPercent;
    }

    if (totalCompletedReviews !== 0) {
      const completed = Object.keys(completedReviews);
      totalIncorrectReviews = completed.reduce((acc, id) => acc + (incorrectReviews[id] ? 1 : 0), 0);
      totalCorrectReviews = totalCompletedReviews - totalIncorrectReviews;
      incorrectReviewsPercent = Math.round((totalIncorrectReviews / totalCompletedReviews) * 100);
      correctReviewsPercent = 100 - incorrectReviewsPercent;
    }

    return {
      cards: {
        completed: totalCompletedCards,
        correct: totalCorrectCards,
        incorrect: totalIncorrectCards,
        correctPercent: correctCardsPercent,
        incorrectPercent: incorrectCardsPercent,
      },
      reviews: {
        unfinished: totalUnfinishedReview,
        completed: totalCompletedReviews,
        correct: totalCorrectReviews,
        incorrect: totalIncorrectReviews,
        correctPercent: correctReviewsPercent,
        incorrectPercent: incorrectReviewsPercent,
      }
    };
  }, [
    completedCards,
    completedReviews,
    unfinishedReviews,
    incorrectCards,
    incorrectReviews,
  ]);

  // submit answer for the top of the queue item
  const submitAnswer = (queueItem, correct, onReviewComplete) => {
    const { id, review, reviewType } = queueItem;
    const reviewId = _.get(review, 'id');
    const subjectId = _.get(review, 'data.subject_id');
    const subject = _.get(subjectsDict, subjectId);
    const subjectType = _.get(subject, 'object');
    let isReviewCompleted = false;
    
    // if answered correctly, record review tmp val
    if (correct) {

      // is this review completed ? radicals has one review type, so they are
      // considered completed automatically. kanjis and vocabs has two
      // review types, so if they were answered once before, they are completed
      if (subjectType === RADICAL) isReviewCompleted = true;
      else isReviewCompleted = !!unfinishedReviews[reviewId];
      
      // record review as (tmp) completed
      const newUnfinishedReviews = { ...unfinishedReviews };
      if (isReviewCompleted) { delete newUnfinishedReviews[reviewId] }
      else { newUnfinishedReviews[reviewId] = true; }
      setUnfinishedReviews(newUnfinishedReviews)

      // a card is surely complete when answered correctly
      const newCompletedCards = Object.assign({}, completedCards, { [id]: true });
      setCompletedCards(newCompletedCards);
    }

    if (!correct) {
      setIncorrectCards(Object.assign({}, incorrectCards, { [id]: true }));
      setIncorrectReviews(Object.assign({}, incorrectReviews, { [reviewId]: true }));
      const setobj = reviewType === MEANING ? incorrectMeanings : incorrectReadings;
      const setfn = reviewType === MEANING ? setIncorrectMeanings : setIncorrectReadings;
      setfn(Object.assign({}, setobj, { [reviewId]: (setobj[reviewId] || 0) + 1 }))
    }

    // set review as completed
    if (isReviewCompleted) {

      if (typeof onReviewComplete === 'function') {
        onReviewComplete({
          review,
          incorrectMeanings: incorrectMeanings[reviewId],
          incorrectReadings: incorrectReadings[reviewId],
        })
      }
      
      setCompletedReviews(Object.assign({}, completedReviews, {
        [reviewId]: true
      }))
    }

    // removing reviewed item from the queue (and requeueing):
    // the queue might be filtered (ie. with wrap up mode) so
    // we can't assume the reviewed item is at zero index. we
    // need to find the reviewed item in the queue

    // find index of the current item
    // useful information for maintaining back-to-back invariant
    const currentIndex = queue.findIndex(i => (
      i.id === id &&
      i.reviewType === reviewType
    ));
    // remove the current item
    const newQueue = queue.slice();
    newQueue.splice(currentIndex, 1);
    
    // if answer was incorrect, put the item back
    // into the queue randomly
    if (!correct) {
      
      // for a good experience, we want to requeue
      // an item at least two levels back. if the
      // current queue is empty (so the requeue index
      // is -1) or if it has less than 2 items, splice
      // statement will put the item to the end of the
      // array, so we don't have to check for overflows
      let requeueIndex = _.random(2, 8);

      // adjust requeue index
      if (backToBackMode) {
        const pairIndex = newQueue.findIndex(item => (
          _.get(item, 'review.id') === reviewId
        ));
        // if paired card is in deck and not at top, put them together
        // else if item would be requeued between a pair, adjust index
        if ((pairIndex !== -1) && (pairIndex !== currentIndex)) {
          requeueIndex = pairIndex;
          requeueIndex += ((reviewType === MEANING) === meaningFirst) ? 0 : 1;
        } else if ((0 < requeueIndex) && (requeueIndex < newQueue.length)) {
          const prevId = _.get(newQueue[requeueIndex-1], 'review.id');
          const nextId = _.get(newQueue[requeueIndex], 'review.id');
          if (prevId === nextId) requeueIndex += 1;
        }
      }

      // put the item back into the queue
      newQueue.splice(requeueIndex, 0, queueItem);
    }

    // set the new queue
    setQueue(newQueue);
  }

  return {
    stats,
    queue,
    submitAnswer,
    subjectsDict,
    totalCards,
    totalReviews,
    completedCards,
    unfinishedReviews,
    completedReviews,
    incorrectCards,
    incorrectReviews,
    incorrectMeanings,
    incorrectReadings,
  }
}
