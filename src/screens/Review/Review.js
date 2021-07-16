import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { StyleSheet, View, Text } from 'react-native';
import { useStoreActions, useStoreState } from 'easy-peasy';
import { SimpleLineIcons, AntDesign, Ionicons } from '@expo/vector-icons';
import device from 'src/utils/device';
import theme from 'src/common/theme';
import Page from 'src/components/Page/Page';
import Bar from 'src/components/Bar/Bar';
import Card from 'src/components/Card/Card';
import Deck from 'src/components/Deck/Deck';
import Overlay from 'src/components/Overlay/Overlay';
import SrsStages from 'src/components/Toast/SrsStages';
import useColorScheme from 'src/hooks/useColorScheme';
// import Toast, { TYPES } from 'src/components/Toast/Toast';
import Message from 'src/screens/Message/Message';
import useLoadReviews from 'src/features/reviews/useLoadReviews';
import useReviewSession from 'src/features/reviews/useReviewSession';
import useScrollLock from 'src/hooks/useScrollLock';
import useLeaveWarning from 'src/hooks/useLeaveWarning';
import Button from 'src/components/Button/Button';
import extractSubject from 'src/utils/extractSubject';
import ReviewTopBar from 'src/screens/Review/ReviewTopBar';
import ReviewMenu from 'src/screens/Review/ReviewMenu';
import SubjectDetailsModal from 'src/screens/SubjectDetails/SubjectDetailsModal';
import { SKIP_MODE, QUICK_MODE } from 'src/common/constants';

const Review = ({ demo = false, stopDemo } = {}) => {
  const [ srsStages, setSrsStages ] = useState({});
  const [ menuOpen, setMenuOpen ] = useState(false);

  // only ask unfinished reviews
  const [ wrapUpMode, setWrapUpMode ] = useState(false);

  const logout = useStoreActions(actions => actions.session.logout);
  const submitReview = useStoreActions(actions => actions.reviews.submitReview);
  const retrySubmission = useStoreActions(actions => actions.reviews.retrySubmission);
  const ignoreSubmissionErrors = useStoreActions(actions => actions.reviews.ignoreSubmissionErrors);
  const submissionQueue = useStoreState(state => state.reviews.submissionQueue);
  const submissionErrors = useStoreState(state => state.reviews.submissionErrors);
  const userSettings = useStoreState(state => state.session.userSettings);

  // Allow answering without revealing
  const skipMode = _.get(userSettings, SKIP_MODE);
  
  // Tap anywhere on the card to reveal
  const quickMode = _.get(userSettings, QUICK_MODE);
  
  const colorScheme = useColorScheme();
  const iconcolor = colorScheme === 'light' ? "black":"white";

  useScrollLock();
  useLeaveWarning();

  // load reviews
  const {
    loadReviews,
    loadingReviews,
    reviews,
    subjects,
  } = useLoadReviews(demo);

  // manage review session
  const {
    queue,
    submitAnswer,
    subjectsDict,
    totalCards,
    totalReviews,
    stats,
    unfinishedReviews,
  } = useReviewSession(
    reviews,
    subjects,
  );

  // TODO: refactor
  const queueFiltered = useMemo(() => (
    // wrap up mode filter
    queue.filter(i => wrapUpMode
      ? !_.isNil(_.get(unfinishedReviews, i.review.id))
      : true
    )
  ), [
    queue,
    wrapUpMode,
  ])

  // are all queue items asked
  const isQueueClear = !loadingReviews && queueFiltered.length === 0;

  return (
    <>

    {/** subject details modal 
      <SubjectDetailsModal
        visible={true}
        close={() => {}}
      />
    */}

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
        colorScheme === 'light' ? null: styles.page_dark,
        isQueueClear && (colorScheme === 'light' && isQueueClear ? styles.pageNoReviews : styles.pageNoReviews_dark)
      ]}
    >

      <View style={styles.deckWrapper}>

        {/** top bar */}
        <ReviewTopBar
          demo={demo}
          logout={logout}
          stopDemo={stopDemo}
          submissionQueue={submissionQueue}
          submissionErrors={submissionErrors}
          ignoreSubmissionErrors={ignoreSubmissionErrors}
          retrySubmission={retrySubmission}
          isQueueClear={isQueueClear}
          setMenuOpen={setMenuOpen}
        />

        {/** menu */}
        <ReviewMenu
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
          demo={demo}
          logout={logout}
          stopDemo={stopDemo}
          loadReviews={loadReviews}
          wrapUpMode={wrapUpMode}
          setWrapUpMode={setWrapUpMode}
        />

        {/* render deck */}
        {queueFiltered.length > 0 && (
          <Deck
            style={styles.deck}
            cards={queueFiltered}
            allowSkipping={skipMode}
            dismissCard={direction => {
              submitAnswer(
                // item that was submitted: the top item
                // of the processed queue list
                queueFiltered[0],
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

                  // submit review
                  submitReview({
                    demo,
                    subjectId: _.get(review, 'data.subject_id'),
                    reviewId: review.id,
                    incorrectMeanings,
                    incorrectReadings,
                  });
                }
              );
            }}
            renderCard={(item, props) => {

              // empty cards
              if (!item) return <Card empty />

              const { id, review, reviewType } = item;
              const subjectId = _.get(review, 'data.subject_id');
              const subject = _.get(subjectsDict, subjectId);
              const subjectType = _.get(subject, 'object');
              const meaningMnemonic = _.get(subject, 'data.meaning_mnemonic');
              const readingMnemonic = _.get(subject, 'data.reading_mnemonic');
              const {
                question,
                questionComponent,
                answer,
              } = extractSubject(subject, reviewType);

              return (
                <Card
                  key={`${id}_${reviewType}`}
                  deckProps={props}
                  subjectType={subjectType}
                  reviewType={reviewType}
                  reviewQuestion={question}
                  reviewQuestionComponent={questionComponent}
                  reviewAnswer={answer}
                  meaningMnemonic={meaningMnemonic}
                  readingMnemonic={readingMnemonic}
                  quickMode={quickMode}
                />
              )
            }}
          />
        )}

        {/* no reviews notice */}
        {isQueueClear && (
          <View style={styles.noReviewsContainer}>
            <AntDesign name="smileo" size={32} color={theme.palette.white} />
            {!wrapUpMode && <Text style={styles.noReviewsText}>Review queue clear!</Text>}
            {wrapUpMode && <Text style={styles.noReviewsText}>Wrap-up queue clear!</Text>}
            {wrapUpMode && (
              <Text style={styles.noReviewsDesc}>
                You can now end your review session
              </Text>
            )}

          </View>
        )}

        {/* stats */}
        {totalReviews > 0 && (
          <View style={[ styles.box, colorScheme === "light" ? null :styles.box_dark, styles.bars ]}>

            {/* review bar */}
            <View style={styles.barWrapper}>
              <Text style={[ styles.barText, colorScheme === "light" ? null : styles.barTextDark, styles.barTextLabel, { marginRight: 8 } ]}>Reviews</Text>
              <Bar
                style={[styles.bar, colorScheme === "light" ? null : styles.bar_dark]}
                values={[ _.get(stats, 'reviews.incorrectPercent', 0), _.get(stats, 'reviews.correctPercent', 0) ]}
                colors={colorScheme === "light" ? [ theme.palette.red, theme.palette.green] : [ theme.palette_dark.red, theme.palette_dark.green]}
              />
              <Text style={[ styles.barText, colorScheme === "light" ? null : styles.barTextDark, { marginLeft: 8 } ]}>{_.get(stats, 'reviews.completed')}</Text>
              {_.get(stats, 'reviews.unfinished') > 0 && (
              <Text style={[ styles.barText, colorScheme === "light" ? null : styles.barTextDark, styles.barTextOpac, { fontSize: 8, marginTop: -12 } ]}>{_.get(stats, 'reviews.unfinished')}</Text>
              )}
              <Text style={[ styles.barText, colorScheme === "light" ? null : styles.barTextDark, styles.barTextOpac, { marginLeft: 4, marginRight: 4 } ]}>of</Text>
              <Text style={[ styles.barText, colorScheme === "light" ? null : styles.barTextDark ]}>{totalReviews}</Text>
            </View>

            {/* card bar */}
            <View style={[ styles.barWrapper, { marginTop: 4 } ]}>
              <Text style={[ styles.barText, colorScheme === "light" ? null : styles.barTextDark, styles.barTextLabel, { marginRight: 8 } ]}>Cards</Text>
              <Bar
                style={[styles.bar,colorScheme === "light" ? null : styles.bar_dark]}
                values={[ _.get(stats, 'cards.incorrectPercent', 0), _.get(stats, 'cards.correctPercent', 0) ]}
                colors={colorScheme === "light" ? [ theme.palette.red, theme.palette.green] : [ theme.palette_dark.red, theme.palette_dark.green]}
              />
              <Text style={[ styles.barText, colorScheme === "light" ? null : styles.barTextDark, { marginLeft: 8 } ]}>{_.get(stats, 'cards.completed')}</Text>
              <Text style={[ styles.barText, colorScheme === "light" ? null : styles.barTextDark, styles.barTextOpac, { marginLeft: 4, marginRight: 4 } ]}>of</Text>
              <Text style={[ styles.barText, colorScheme === "light" ? null : styles.barTextDark ]}>{totalCards}</Text>
            </View>

          </View>
        )}

        {/* controls */}
        {isQueueClear && (
          <>
            <View style={{ height: 6 }} />
            {wrapUpMode && (
              <Button
                text="Disable Wrap-up Mode"
                style={{ marginTop: 8 }}
                iconLeft={<SimpleLineIcons name="clock" size={18} color={iconcolor} />}
                onPress={() => setWrapUpMode(false)}
              />
            )}
            {!wrapUpMode && (
              <Button
                text="Refresh"
                style={{ marginTop: 8 }}
                iconLeft={<SimpleLineIcons name="refresh" size={18} color={iconcolor} />}
                onPress={() => loadReviews()}
              />
            )}
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
  page_dark: {
    backgroundColor: theme.bg_dark.body,
  },
  pageNoReviews: {
    backgroundColor: theme.palette.green,
  },
  pageNoReviews_dark: {
    backgroundColor: theme.palette_dark.green,
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
  noReviewsDesc: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 6,
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
  box_dark : {
    backgroundColor: theme.palette_dark.gray,
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
  bar_dark : {
    backgroundColor: theme.palette_dark.mediumGray
  },
  barText: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
    color: theme.palette.black,
  },
  barTextDark: {
    color: theme.palette.lightGray,
  },
  barTextLabel: {
    width: 45,
  },
  barTextOpac: {
    opacity: 0.3,
  }
})

export default Review;