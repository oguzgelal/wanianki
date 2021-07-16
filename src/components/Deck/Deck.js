import React, { useState, useMemo } from "react";
import PropTypes from "prop-types";
import { StyleSheet, View, Animated } from "react-native";
import _ from 'lodash';

import theme from 'src/common/theme';
import device from 'src/utils/device';

import useScreenSize from "src/hooks/useScreenSize";
import useEventListener from "src/hooks/useEventListener";
import useOffScreen from "src/components/Deck/useOffScreen";
import useDragRange from "src/components/Deck/useDragRange";
import useMovement from "src/components/Deck/useMovement";
import usePanResponder from "src/components/Deck/usePanResponder";

const friction = 5;
const baseZIndex = 1;
const scaleDecreaseRate = 0.1;
const opacityDecreaseRate = 0.3;
const topGapRate = -6;
const leaveScreenDuration = 400;

const getOpacity = (i) => 1 - opacityDecreaseRate * i;
const getScale = (i) => 1 - scaleDecreaseRate * i;
const getTop = (i) => `${topGapRate * i}%`;

const STAGE_SIZE = 5;
const RENDER_SIZE = 2;

const Deck = ({
  style = {},
  cards = [],
  renderCard,
  dismissCard,
  allowSkipping
}) => {
  
  // dynamic window size
  const { windowWidth, windowHeight } = useScreenSize();

  // deck size
  const [revealed, setRevealed] = useState(false);
  const [mnemonicToggled, setMnemonicToggled] = useState(false);
  const [swipeLock, setSwipeLock] = useState(true);
  const [deckWidth, setDeckWidth] = useState(null);
  const [deckHeight, setDeckHeight] = useState(null);

  // control dismiss of the top card
  const useDismiss = direction => {
    setRevealed(false);
    setMnemonicToggled(false);
    setSwipeLock(!allowSkipping);
    dismissCard(direction);
  }

  // control reveal of the top card
  const useReveal = () => {
    setRevealed(true);
    setSwipeLock(false);
  }

  const useMnemonicToggle = () => {
    setMnemonicToggled(!mnemonicToggled);
  }

  // calculate coordinates which cards
  // will end up when they go off screen
  const offscreen = useOffScreen({
    deckWidth,
    deckHeight,
    windowWidth,
    windowHeight
  });

  // how far do you have to drag the cards
  // for them to be dismissed
  const dragRange = useDragRange({
    windowWidth,
    windowHeight,
  });

  // calculate stuff related to movement
  const {
    movement,
    getMovementInterpolation,
    getClearInterpolation,
  } = useMovement({
    dragRange,
    windowWidth,
    windowHeight,
  });

  // set the top card
  const topCard = useMemo(() => cards[0] || {}, [cards]);

  // create and configure pan responder
  const {
    panResponder,
    freezeSwipe,
    triggerSwipeLeft,
    triggerSwipeRight,
  } = usePanResponder({
    dismissCard: useDismiss,
    leaveScreenDuration,
    dragRange,
    friction,
    movement,
    topCard,
    swipeLock,
    offscreen,
  });

  // trigger keyboard shortcuts
  useEventListener({
    el: device('web') ? document : null,
    event: 'keydown',
    handler: e => {
      if (e.code === 'Space' && !revealed) useReveal();
      if (e.code === 'Space' && revealed) useMnemonicToggle();
      if (!allowSkipping && swipeLock) return;
      if (e.key === 'ArrowLeft' || e.code === 'ArrowLeft') triggerSwipeLeft();
      if (e.key === 'ArrowRight' || e.code === 'ArrowRight') triggerSwipeRight();
    }
  }, [
    revealed,
    swipeLock,
    offscreen,
    allowSkipping,
    useReveal,
    triggerSwipeLeft,
    triggerSwipeRight
  ])

  return (
    <View
      style={[styles.wrapper, style]}
      onLayout={(e) => {
        setDeckWidth(e.nativeEvent.layout.width);
        setDeckHeight(e.nativeEvent.layout.height);
      }}
    >
      {cards.slice(0, STAGE_SIZE).map((card, i) => {
        const isEmpty = i >= RENDER_SIZE;
        const isFirstCard = i === 0;
        const [topCurrent, topNext] = [getTop(i), getTop(i - 1)];
        const [opCurrent, opNext] = [getOpacity(i), getOpacity(i - 1)];
        const [scCurrent, scNext] = [getScale(i), getScale(i - 1)];
        const panHandlers = (!allowSkipping && (freezeSwipe || swipeLock)) ? {} : panResponder.panHandlers;

        const dynamicStyles = {
          zIndex: baseZIndex + (cards.length - i),
          top: getMovementInterpolation('x', [topNext, topCurrent, topNext]),
          opacity: getMovementInterpolation('x', [opNext, opCurrent, opNext]),
          transform: [
            { perspective: 1000 },
            { scale: getMovementInterpolation('x', [scNext, scCurrent, scNext]) },
            isFirstCard && { rotate: getMovementInterpolation('x', ["-20deg", "0deg", "20deg"]) },
            isFirstCard && movement.getTranslateTransform(),
          ].filter(Boolean).flat(),
        };

        return (
          <Animated.View
            key={_.get(card, 'id') || `deck-card-${i}`}
            style={[ styles.card, dynamicStyles ]}
            {...panHandlers}
          >
            {isEmpty
              ? renderCard(null)
              : renderCard(card, {
                isFirstCard,
                getClearInterpolation,
                getMovementInterpolation,
                reveal: useReveal,
                revealed: isFirstCard && revealed,
                toggleMnemonic: useMnemonicToggle,
                mnemonicToggled: isFirstCard && mnemonicToggled,
              })}
          </Animated.View>
        );
      })}
    </View>
  );
};

Deck.propTypes = {
  style: PropTypes.object,
  dismissCard: PropTypes.func,
  cards: PropTypes.array,
  renderCard: PropTypes.func,
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  card: {
    position: "absolute",
    width: "100%",
    height: "100%",
    flex: 1,
    borderRadius: theme.radius.card,
    overflow: "hidden",
  },
});

export default Deck;
