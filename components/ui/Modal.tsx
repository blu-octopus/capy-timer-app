import React from 'react';
import { Modal as RNModal, Pressable, StyleSheet, View } from 'react-native';

import { colors, seeds } from '@/src/theme/tokens';
import { Button } from './Button';
import { Text } from './Text';
import { useMeasuredSize, WobbleBorder } from './WobbleBorder';

export interface ModalProps {
  visible: boolean;
  title?: string;
  children?: React.ReactNode;
  onDismiss: () => void;
  onDone?: () => void;
  doneLabel?: string;
  /** Disable Done while the form is incomplete. */
  doneDisabled?: boolean;
}

export function Modal({
  visible,
  title,
  children,
  onDismiss,
  onDone,
  doneLabel = 'Done',
  doneDisabled,
}: ModalProps) {
  const { size, onLayout } = useMeasuredSize();

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      {/* Tapping the backdrop dismisses; taps inside the card must not. */}
      <Pressable style={styles.backdrop} onPress={onDismiss} accessibilityLabel="Close">
        <Pressable style={styles.popupWrapper} onPress={(e) => e.stopPropagation()}>
          <View style={styles.popup} onLayout={onLayout}>
            <WobbleBorder
              width={size.width}
              height={size.height}
              radius={20}
              seed={seeds.modal}
            />

            {title && <Text variant="body">{title}</Text>}
            {children}

            <View style={styles.actions}>
              <Button label="Cancel" variant="ghost" onPress={onDismiss} />
              {onDone && (
                <Button
                  label={doneLabel}
                  variant="outlined"
                  disabled={doneDisabled}
                  onPress={onDone}
                />
              )}
            </View>
          </View>
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  popupWrapper: {
    width: '100%',
    maxWidth: 343,
  },
  popup: {
    width: '100%',
    padding: 24,
    borderRadius: 20,
    backgroundColor: colors.white,
    gap: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
});
