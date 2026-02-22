/**
 * TDivider
 * Themed divider line
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../theme/useTheme';

export interface TDividerProps {
  orientation?: 'horizontal' | 'vertical';
  style?: StyleProp<ViewStyle>;
}

export function TDivider({ orientation = 'horizontal', style }: TDividerProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        orientation === 'horizontal' ? styles.horizontal : styles.vertical,
        {
          backgroundColor: theme.colors.divider,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  horizontal: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  vertical: {
    width: StyleSheet.hairlineWidth,
    height: '100%',
  },
});
