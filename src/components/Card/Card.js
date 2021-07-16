import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {StyleSheet, TouchableWithoutFeedback, View} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import theme from 'src/common/theme';
import device from 'src/utils/device';
import { TERMINOLOGY } from 'src/common/constants';
import useColorScheme from 'src/hooks/useColorScheme';

import CardCover from 'src/components/Card/CardCover';
import CardHeader from 'src/components/Card/CardHeader';
import Question from 'src/components/Card/Question';
import LongPressButton from 'src/components/Button/LongPressButton';
import Touchable from "react-native-web/dist/exports/Touchable";
import * as Haptics from "expo-haptics";

const DirectionLeftIcon = () => (
  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
    <AntDesign name="caretleft" size={10} color={theme.color.incorrect} />
    <AntDesign name="frowno" size={18} color={theme.color.incorrect} />
  </View>
);

const DirectionRightIcon = () => (
  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
    <AntDesign name="smileo" size={18} color={theme.color.correct} />
    <AntDesign name="caretright" size={10} color={theme.color.correct} />
  </View>
);

const Card = ({
  empty,
  deckProps = {},
  reviewType,
  subjectType,
  reviewQuestion,
  reviewQuestionComponent,
  reviewAnswer,
  meaningMnemonic,
  readingMnemonic,
  quickMode
}) => {

  const {
    reveal,
    revealed,
    toggleMnemonic,
    mnemonicToggled,
    isFirstCard,
    getClearInterpolation,
  } = deckProps;

  const colorScheme = useColorScheme();
  // empty card
  if (empty) {
    return <View style={[styles.wrapper, colorScheme === 'light' ? null : styles.wrapper_dark]}/>;
  }

  const onCardPressed = () =>{
    if (revealed) {
      toggleMnemonic()
    } else if (quickMode) { // Reveal answer on press only if quick mode is on
      // Medium haptic feedback feels the best
      if (device('mobile')) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
      }
      reveal()
    }
  }

  return (
    <View style={[styles.wrapper, colorScheme === 'light' ? null : styles.wrapper_dark]}>
      {/* red / green cover */}
      {isFirstCard && (
        <CardCover
          getClearInterpolation={getClearInterpolation}
        />
      )}

      {/* card contents */}
      <View style={styles.container}>
          {/* top header */}
          <CardHeader
            leftIcon={revealed ? <DirectionLeftIcon /> : null}
            rightIcon={revealed ? <DirectionRightIcon /> : null}
            centerText={revealed
              ? (device('web') ? 'Arrow Keys' : 'Swipe')
              : (TERMINOLOGY[subjectType] || '')
            }
          />
          <TouchableWithoutFeedback onPress={onCardPressed}>
            <View style={{height: "100%", flexGrow: 1, outline: 'none'}}>
              {/* question and question statement */}
              <Question
                  revealed={revealed}
                  mnemonicToggled={mnemonicToggled}
                  answer={reviewAnswer}
                  question={reviewQuestion}
                  questionComponent={reviewQuestionComponent}
                  reviewType={reviewType}
                  subjectType={subjectType}
                  meaningMnemonic={meaningMnemonic}
                  readingMnemonic={readingMnemonic}
              />

              {/* reveal button */}
              <View style={{height: 52}}>
                {!revealed && !quickMode && (
                    <LongPressButton
                        text="Reveal"
                        flashText={`Press and Hold${device('web') ? ' / Spacebar' : ''}`}
                        onComplete={reveal}
                    />
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
      </View>

    </View>
  );
};

Card.propTypes = {
  empty: PropTypes.bool,
  deckProps: PropTypes.object,
  subjectType: PropTypes.string,
  reviewType: PropTypes.string,
  reviewQuestion: PropTypes.string,
  reviewQuestionComponent: PropTypes.any,
  reviewAnswer: PropTypes.string,
  meaningMnemonic: PropTypes.string,
  readingMnemonic: PropTypes.string,
  quickMode: PropTypes.bool,
};

const styles = StyleSheet.create({
  wrapper: device({
    base: {
      flex: 1,
      position: 'relative',
      backgroundColor: theme.bg.card,
      borderRadius: theme.radius.card,
    },
    web: {
      userSelect: 'none',
    },
  }),
  wrapper_dark: device({
    base: {
      backgroundColor: theme.bg_dark.card,
    }
  }),
  container: {
    flexGrow: 1,
    padding: theme.padding.card,
  }
})

export default Card;