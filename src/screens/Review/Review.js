import React, { useState, useEffect, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import {
  Alert,
  StyleSheet,
  View,
  Text,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { useStoreActions, useStoreState } from 'easy-peasy';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import { useActionSheet } from '@expo/react-native-action-sheet';
import device from 'src/utils/device';
import theme from 'src/common/theme';
import Page from 'src/components/Page/Page';
import Bar from 'src/components/Bar/Bar';
import Card from 'src/components/Card/Card';
import Deck from 'src/components/Deck/Deck';
import Overlay from 'src/components/Overlay/Overlay';
import SrsStages from 'src/components/Toast/SrsStages';
// import Toast, { TYPES } from 'src/components/Toast/Toast';
import Message from 'src/screens/Message/Message';
import useLoadReviews from 'src/features/reviews/useLoadReviews';
import useReviewSession from 'src/features/reviews/useReviewSession';
import useScrollLock from 'src/hooks/useScrollLock';
import useLeaveWarning from 'src/hooks/useLeaveWarning';
import useNetworkListener from 'src/hooks/useNetworkListener';
import Button from 'src/components/Button/Button';
import extractSubject from 'src/utils/extractSubject';

const Review = ({ demo = false, stopDemo } = {}) => {
  const { showActionSheetWithOptions } = useActionSheet();
  const [ srsStages, setSrsStages ] = useState({});
  // const isInternetReachable = useNetworkListener();
  
  const logout = useStoreActions(actions => actions.session.logout);
  const addToSubmissionQueue = useStoreActions(actions => actions.reviews.addToSubmissionQueue);
  const submissionQueue = useStoreState(state => state.reviews.submissionQueue);
  const submissionErrors = useStoreState(state => state.reviews.submissionErrors);

  useScrollLock();
  useLeaveWarning();

  console.log('submissionQueue', submissionQueue);
  console.log('submissionErrors', submissionErrors);

  const {
    loadReviews,
    loadingReviews,
    reviews,
    subjects,
  } = useLoadReviews(demo);

  const {
    queue,
    submitAnswer,
    subjectsDict,
    totalCards,
    totalReviews,
    stats,
  } = useReviewSession(
    reviews,
    subjects,
  );
  
  const isQueueClear = !loadingReviews && queue.length === 0;
  
  return (
    <>

    {/** display srs stages toasts */}
    <SrsStages stages={srsStages} />

    {loadingReviews && (
      <Overlay>
        <Message loading />
      </Overlay>
    )}

    <Page
      style={[
        styles.page,
        isQueueClear && styles.pageNoReviews
      ]}
    >
      <View style={styles.deckWrapper}>

        {/* render deck */}
        {queue.length > 0 && (
          <Deck
            style={styles.deck}
            cards={queue}
            dismissCard={direction => {
              submitAnswer(
                // right direction means correct answer
                direction === 'right',
                // callback for when the submit answer causes
                // the review to be completed
                res => {

                const {
                  review,
                  incorrectMeanings,
                  incorrectReadings,
                } = res;

                // review was correct when there are
                // no incorrect readings or meanings
                const isCorrect = (
                  !incorrectMeanings &&
                  !incorrectReadings
                );
                
                // increase srs stage if the answer was correct
                if (isCorrect) {
                  const currentStage = _.get(review, 'data.srs_stage');
                  setSrsStages({ current: currentStage, next: currentStage + 1 })
                }

                // do not submit to wanikani on demo mode
                if (demo) return;

                // submit review
                addToSubmissionQueue({
                  subjectId: _.get(review, 'data.subject_id'),
                  reviewId: review.id,
                  incorrectMeanings,
                  incorrectReadings,
                });

              });
            }}
            renderCard={(item, props) => {
              
              // empty cards
              if (!item) return <Card empty />

              const { id, review, reviewType } = item;
              const subjectId = _.get(review, 'data.subject_id');
              const subject = _.get(subjectsDict, subjectId);
              const subjectType = _.get(subject, 'object');
              const {
                question,
                questionComponent,
                answer,
              } = extractSubject(subject, reviewType);

              return (
                <Card
                  key={id}
                  deckProps={props}
                  subjectType={subjectType}
                  reviewType={reviewType}
                  reviewQuestion={question}
                  reviewQuestionComponent={questionComponent}
                  reviewAnswer={answer}
                />
              )
            }}
          />
        )}

        {/* no reviews notice */}
        {isQueueClear && (
          <View style={styles.noReviewsContainer}>
            <AntDesign name="smileo" size={32} color={theme.palette.white} />
            <Text style={styles.noReviewsText}>Review queue clear!</Text>
          </View>
        )}
          
        {/* stats */}
        {totalReviews > 0 && (
          <TouchableWithoutFeedback
            onPress={() => {
              showActionSheetWithOptions({
                options: [
                  'Cancel',
                  'Refresh',
                  'Logout',
                ],
                destructiveButtonIndex: 2,
              }, buttonIndex => {
                if (buttonIndex === 1) {
                  if (device('web')) {
                    if (confirm('Half completed reviews will be lost. Are you sure ?')) {
                      loadReviews()
                    }
                  }
                  else {
                    Alert.alert('Are you sure ?', 'Half completed reviews will be lost', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'OK', onPress: () => loadReviews() },
                  ])
                  }
                }
                if (buttonIndex === 2) {
                  if (demo) stopDemo();
                  else logout();
                }
              })
            }}
          >
            <View style={[ styles.box, styles.bars ]}>
              
              {/* review bar */}
              <View style={styles.barWrapper}>
                <Text style={[ styles.barText, styles.barTextLabel, styles.barTextOpac, { marginRight: 8 } ]}>Reviews</Text>
                <Bar
                  style={styles.bar}
                  values={[ _.get(stats, 'reviews.incorrectPercent', 0), _.get(stats, 'reviews.correctPercent', 0) ]}
                  colors={[ theme.palette.red, theme.palette.green ]}
                />
                <Text style={[ styles.barText, { marginLeft: 8 } ]}>{_.get(stats, 'reviews.completed')}</Text>
                {_.get(stats, 'reviews.unfinished') > 0 && (
                  <Text style={[ styles.barText, styles.barTextOpac, { fontSize: 8, marginTop: -12 } ]}>{_.get(stats, 'reviews.unfinished')}</Text>
                )}
                <Text style={[ styles.barText, styles.barTextOpac, { marginLeft: 4, marginRight: 4 } ]}>of</Text>
                <Text style={[ styles.barText ]}>{totalReviews}</Text>
              </View>

              {/* card bar */}
              <View style={[ styles.barWrapper, { marginTop: 4 } ]}>
                <Text style={[ styles.barText, styles.barTextLabel, styles.barTextOpac, { marginRight: 8 } ]}>Cards</Text>
                <Bar
                  style={styles.bar}
                  values={[ _.get(stats, 'cards.incorrectPercent', 0), _.get(stats, 'cards.correctPercent', 0) ]}
                  colors={[ theme.palette.red, theme.palette.green ]}
                />
                <Text style={[ styles.barText, { marginLeft: 8 } ]}>{_.get(stats, 'cards.completed')}</Text>
                <Text style={[ styles.barText, styles.barTextOpac, { marginLeft: 4, marginRight: 4 } ]}>of</Text>
                <Text style={[ styles.barText ]}>{totalCards}</Text>
              </View>
              
            </View>
          </TouchableWithoutFeedback>
        )}

        {/* controls */}
        {isQueueClear && (
          <>
            <Button
              text="Refresh"
              style={{ marginTop: 12 }}
              iconLeft={<Ionicons name="md-refresh" size={24} color={theme.color.black} />}
              onPress={() => loadReviews()}
            />
            <Button
              text="Logout"
              style={{ marginTop: 8, backgroundColor: 'transparent' }}
              textStyle={{ color: theme.palette.white }}
              onPress={() => {
                if (demo) stopDemo()
                else logout();
              }}
            />
          </>
        )}
      </View>
    </Page>
  </>
)};

Review.propTypes = {
  demo: PropTypes.bool,
  stopDemo: PropTypes.func,
};

const styles = StyleSheet.create({
  page: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.bg.body,
    overflow: 'hidden',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageNoReviews: {
    backgroundColor: theme.palette.green,
  },
  pageCover: device({
    web: { backgroundColor: 'rgba(0, 0, 0, .9)' },
    mobile: { backgroundColor: 'rgba(0, 0, 0, .8)' },
  }),
  noReviewsContainer: {
    textAlign: 'center',
    marginBottom: 12,
    alignItems: 'center',
  },
  noReviewsText: {
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 12,
    color: theme.palette.white,
  },
  deckWrapper: {
    flex: 8,
    flexGrow: 1,
    maxWidth: 420,
    width: '100%',
    height: '100%',
    paddingBottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deck: {
    width: '100%',
    height: '100%',
    maxHeight: 620,
    zIndex: 9,
  },
  box: {
    width: '100%',
    backgroundColor: theme.palette.white,
    padding: theme.padding.card,
    borderRadius: theme.radius.card,
  },
  bars: device({
    base: {
      flexShrink: 0,
      marginTop: 12,
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    web: {
      userSelect: 'none',
    }
  }),
  barWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  bar: {
    flexGrow: 1,
    flexShrink: 1,
    backgroundColor: 'rgba(0, 0, 0, .1)',
  },
  barText: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
    color: theme.palette.black,
  },
  barTextLabel: {
    width: 45,
  },
  barTextOpac: {
    opacity: 0.3,
  },
})

export default Review;