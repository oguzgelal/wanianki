import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text, Switch } from 'react-native';
import { CheckBox } from 'react-native-web';
import { ListItem, Icon } from 'react-native-elements';
import device, {isWeb} from 'src/utils/device';
import useColorScheme from 'src/hooks/useColorScheme';;
import theme from 'src/common/theme';
import RNPickerSelect from 'react-native-picker-select';

const ListItemComponent = props => {
  const colorScheme = useColorScheme();
  return (
    <ListItem
      {...props}
      onPress={() => {
        if (typeof props?.onPress === 'function') props?.onPress();
        if (typeof props?.switch?.onValueChange === 'function') props?.switch?.onValueChange();
      }}
    >
      {props.leftIcon && <View style={[styles.icon, colorScheme === 'light' ? null : styles.icon_dark]}>{props.leftIcon}</View>}
      <ListItem.Content style={colorScheme === 'light' ? null : styles.container_dark}>
        <ListItem.Title style={colorScheme === 'light' ? styles.title : styles.title_dark}>{props.title}</ListItem.Title>
        {props.subtitle && (
          <Text style={[styles.subtitle, colorScheme === 'light' ? null : styles.subtitle_dark]}>{props.subtitle}</Text>
        )}
      </ListItem.Content>
      {props.rightIcon && <View style={[styles.icon, colorScheme === 'light' ? null : styles.icon_dark]}>{props.rightIcon}</View>}
      {!isWeb() && props.switch && <Switch {...props.switch} />}
      {isWeb() && props.switch && <View><Text>{props?.switch?.value ? "On" : "Off"}</Text></View>}
      {props.picker && <RNPickerSelect style={pickerStyles} {...props.picker} />}
    </ListItem>
  )
};

ListItemComponent.propTypes = {
};

const styles = StyleSheet.create({
  icon: device({
    web: { width: 32 },
    mobile: { width: 20 }
  }),
  icon_dark:device({
    web: { color: theme.palette_dark.white, },
    mobile: { color: theme.palette_dark.white, }
  }),
  title: {
    fontSize: 17,
  },
  title_dark: {
    fontSize: 17,
    color: theme.palette_dark.white,
  },
  container_dark: {
    backgroundColor: theme.palette_dark.gray,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
    color: 'rgba(0, 0, 0, .3)',
  },
  subtitle_dark: {
    color: theme.palette_dark.lightGray,
  }
})

const pickerStyles = StyleSheet.create({
  inputWeb: {
    borderWidth: 0,
    textAlign: 'right',
    fontSize: 14,
  },
})

export default ListItemComponent;
