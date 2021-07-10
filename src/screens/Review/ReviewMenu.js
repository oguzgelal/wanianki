import React from 'react';
import * as WebBrowser from 'expo-web-browser';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { useStoreState, useStoreActions } from 'easy-peasy';
import { StyleSheet, View } from 'react-native';
import useColorScheme from 'src/hooks/useColorScheme';
import { SimpleLineIcons } from '@expo/vector-icons';
import List from 'src/components/List/List';
import Modal, { DURATION_SAFE } from 'src/components/Modal/Modal';
import dialog from 'src/utils/dialog';
import { isWeb } from 'src/utils/device';
import { SKIP_MODE, QUICK_MODE, DARK_MODE, BACK_TO_BACK_MODE, MEANING_FIRST, REVIEW_ORDER, RANDOM_ORDER, LOWEST_LEVEL_FIRST, CURRENT_LEVEL_FIRST, ASCENDING_SRS_STAGE, DESCENDING_SRS_STAGE }
    from 'src/common/constants';

const ReviewMenu = ({
  demo,
  logout,
  stopDemo,
  loadReviews,
  menuOpen,
  setMenuOpen,
  wrapUpMode,
  setWrapUpMode,
}) => {

  const colorScheme = useColorScheme();
  const iconcolor = colorScheme === 'light' ? "black":"white";
  const saveSetting = useStoreActions(actions => actions.session.saveSetting);
  const userSettings = useStoreState(state => state.session.userSettings);
  const skipMode = _.get(userSettings, SKIP_MODE);
  const quickMode = _.get(userSettings, QUICK_MODE);
  const darkMode = _.get(userSettings, DARK_MODE);
  const backToBackMode = _.get(userSettings, BACK_TO_BACK_MODE);
  const meaningFirst = _.get(userSettings, MEANING_FIRST);
  const reviewOrder = _.get(userSettings, REVIEW_ORDER, RANDOM_ORDER);
  
  return (
    <Modal
      visible={menuOpen}
      close={() => setMenuOpen(false)}
    >
      <List
        lists={[
          {
            title: 'Review',
            items: [
              {
                id: 'ses-refresh',
                title: 'Refresh',
                leftIcon: <SimpleLineIcons name="refresh" size={18} color={iconcolor} />,
                onPress: () => {
                  dialog({
                    webTitle: 'Half completed reviews will be lost. Are you sure ?',
                    mobileTitle: 'Are you sure ?',
                    mobileMessage: 'Half completed reviews will be lost',
                    onConfirm: () => {
                      setMenuOpen(false);
                      setTimeout(() => {
                        loadReviews();
                      }, DURATION_SAFE);
                    }
                  });
                },
              },
              {
                id: 'ses-wrap',
                title: 'Wrap-Up Mode',
                subtitle: 'Ask only reviews with unfinished pairs',
                leftIcon: <SimpleLineIcons name="clock" size={18} color={iconcolor} />,
                switch: {
                  value: wrapUpMode,
                  onValueChange: () => {
                    setWrapUpMode(!wrapUpMode);
                    setMenuOpen(false);
                  },
                }
              },
              {
                id: 'ses-quick',
                title: 'Quick Reveal',
                subtitle: 'Reveal by tapping anywhere on the card',
                leftIcon: <SimpleLineIcons name="energy" size={18} color={iconcolor} />,
                switch: {
                  value: quickMode,
                  onValueChange: () => {
                    saveSetting({ key: QUICK_MODE, value: !quickMode });
                  },
                }
              },
              {
                id: 'ses-skip',
                title: 'Answer Without Revealing',
                subtitle: 'Allows you to answer without revealing. Use wisely!',
                leftIcon: <SimpleLineIcons name="control-forward" size={18} color={iconcolor} />,
                switch: {
                  value: skipMode,
                  onValueChange: () => {
                    saveSetting({ key: SKIP_MODE, value: !skipMode });
                  },
                }
              },
              {
                id: 'ses-back-to-back',
                title: 'Back To Back',
                subtitle: 'Reorder cards so reading and meaning are back-to-back',
                leftIcon: <SimpleLineIcons name="layers" size={18} color={iconcolor} />,
                switch: {
                  value: backToBackMode,
                  onValueChange: () => {
                    saveSetting({ key: BACK_TO_BACK_MODE, value: !backToBackMode });
                  },
                }
              },
              {
                id: 'ses-meaning-first',
                title: 'Meaning First',
                subtitle: 'Show meaning first when back-to-back is enabled',
                leftIcon: <SimpleLineIcons name="direction" size={18} color={iconcolor} />,
                switch: {
                  value: meaningFirst,
                  onValueChange: () => {
                    saveSetting({ key: MEANING_FIRST, value: !meaningFirst });
                  },
                }
              },
              {
                id: 'ses-review-order',
                title: 'Review Order',
                leftIcon: <SimpleLineIcons name="shuffle" size={18} color={iconcolor} />,
                picker: {
                  onValueChange: (value) => {
                    saveSetting({ key: REVIEW_ORDER, value: value });
                  },
                  placeholder: {},
                  value: reviewOrder,
                  items:
                    [
                      { value: RANDOM_ORDER, label: "Random Order" },
                      { value: LOWEST_LEVEL_FIRST, label: "Lowest Level First" },
                      { value: CURRENT_LEVEL_FIRST, label: "Current Level First" },
                      { value: ASCENDING_SRS_STAGE, label: "Ascending SRS Stage" },
                      { value: DESCENDING_SRS_STAGE, label: "Descending SRS Stage" },
                    ],
                },
              },
              {
                id: 'ses-dark',
                title: 'Dark Mode',
                subtitle: isWeb() ? null : (darkMode
                  ? 'Disable to use system default'
                  : null
                ),
                leftIcon: <SimpleLineIcons name="bulb" size={18} color={iconcolor} />,
                switch: {
                  value: darkMode,
                  onValueChange: () => {
                    saveSetting({ key: DARK_MODE, value: !darkMode });
                  },
                }
              }
            ],
          },
          {
            title: 'General',
            items: [
              /*
              {
                id: 'gen-settings',
                title: 'Settings',
                leftIcon: <SimpleLineIcons name="settings" size={18} color="black" />,
                onPress: () => {},
                chevron: true,
              },
              */
              {
                id: 'gen-fb',
                title: 'Feedback',
                leftIcon: <SimpleLineIcons name="bubble" size={18} color={iconcolor} />,
                onPress: async () => {
                  await WebBrowser.openBrowserAsync('https://github.com/oguzgelal/juken')
                },
              },
              {
                id: 'gen-bugs',
                title: 'Report Issues',
                leftIcon: <SimpleLineIcons name="ghost" size={18} color={iconcolor} />,
                onPress: async () => {
                  await WebBrowser.openBrowserAsync('https://github.com/oguzgelal/juken')
                },
              },
              {
                id: 'gen-code',
                title: 'Source Code',
                leftIcon: <SimpleLineIcons name="social-github" size={18} color={iconcolor} />,
                onPress: async () => {
                  await WebBrowser.openBrowserAsync('https://github.com/oguzgelal/juken')
                },
              },
              {
                id: 'gen-logout',
                title: 'Log Out',
                leftIcon: <SimpleLineIcons name="logout" size={18} color="red" />,
                onPress: () => {
                  setMenuOpen(false);
                  if (demo) stopDemo();
                  else logout();
                },
              }
            ]
          }
        ]}
      />
      <View style={{ height: 32 }} />
    </Modal>
  )
};

ReviewMenu.propTypes = {
  demo: PropTypes.bool,
  stopDemo: PropTypes.func,
  logout: PropTypes.func,
  loadReviews: PropTypes.func,
  menuOpen: PropTypes.bool,
  setMenuOpen: PropTypes.func,
  // settings
  wrapUpMode: PropTypes.bool,
  setWrapUpMode: PropTypes.func,
  quickMode: PropTypes.bool,
  setQuickMode: PropTypes.func,
  skipMode: PropTypes.bool,
  setSkipMode: PropTypes.func,
  backToBackMode: PropTypes.bool,
  setBackToBackMode: PropTypes.func,
};

const styles = StyleSheet.create({
  wrapper: {}
})

export default ReviewMenu;
