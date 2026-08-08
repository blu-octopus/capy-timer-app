import { useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CapyMascot, skinForCompanionId } from '@/components/capy/CapyMascot';
import { Coin } from '@/components/capy/Coin';
import { CoinWallet } from '@/components/capy/CoinWallet';
import { BackIcon } from '@/components/capy/icons/BackIcon';
import { NextIcon } from '@/components/capy/icons/NextIcon';
import { Button } from '@/components/ui/Button';
import { ColorPicker, swatchColor, type SwatchValue } from '@/components/ui/ColorPicker';
import { Field } from '@/components/ui/Field';
import { IconButton } from '@/components/ui/IconButton';
import { Modal } from '@/components/ui/Modal';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Text } from '@/components/ui/Text';
import { Toggle } from '@/components/ui/Toggle';
import { createCategory } from '@/src/db/categories';
import { useAppStore } from '@/src/store';
import { totalPlanMinutes } from '@/src/store/types';
import { colors } from '@/src/theme/tokens';

const FOCUS_OPTIONS = [5, 10, 15, 20, 25, 30, 45, 60];
const BREAK_OPTIONS = [0, 5, 10, 15, 20, 30];
const LOOP_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

type PickerKind = 'focus' | 'break' | 'loops' | null;

export default function SessionSetupScreen() {
  const router = useRouter();

  const plan = useAppStore((s) => s.plan);
  const updatePlan = useAppStore((s) => s.updatePlan);
  const coins = useAppStore((s) => s.wallet.coins);
  const companions = useAppStore((s) => s.companions);
  const categories = useAppStore((s) => s.categories);
  const unlockCompanion = useAppStore((s) => s.unlockCompanion);
  const startRun = useAppStore((s) => s.startRun);

  const initialIndex = Math.max(0, companions.findIndex((c) => c.id === plan.companionId));
  const [index, setIndex] = useState(initialIndex === -1 ? 0 : initialIndex);
  const [slideWidth, setSlideWidth] = useState(0);
  const carouselRef = useRef<FlatList>(null);

  const [picker, setPicker] = useState<PickerKind>(null);
  const [categoryModal, setCategoryModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState<SwatchValue>('green');

  const current = companions[index] ?? companions[0]!;
  const totalMinutes = useMemo(() => totalPlanMinutes(plan), [plan]);

  const selectIndex = (next: number, scroll = false) => {
    if (next < 0 || next >= companions.length) return;
    setIndex(next);
    // Only adopt an unlocked buddy; locked ones stay a preview.
    const companion = companions[next];
    if (companion?.unlocked) updatePlan({ companionId: companion.id });
    if (scroll) carouselRef.current?.scrollToIndex({ index: next, animated: true });
  };

  const onUnlock = () => {
    if (coins < current.priceCoins) {
      Alert.alert(
        'Not enough coins',
        `${current.name} costs ${current.priceCoins.toLocaleString('en-US')} coins. You have ${coins.toLocaleString('en-US')}.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Get coins', onPress: () => router.push('/iap') },
        ],
      );
      return;
    }

    Alert.alert('Unlock buddy?', `Spend ${current.priceCoins.toLocaleString('en-US')} coins on ${current.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unlock',
        onPress: () => {
          if (unlockCompanion(current.id)) updatePlan({ companionId: current.id });
        },
      },
    ]);
  };

  const onCreateCategory = async () => {
    await createCategory(newName, newColor);
    setNewName('');
    setNewColor('green');
    setCategoryModal(false);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <IconButton icon={BackIcon} size={22} accessibilityLabel="Back" onPress={router.back} />
        <CoinWallet amount={coins} onPress={() => router.push('/iap')} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="caption">
          {index + 1}/{companions.length}
        </Text>

        {/* Swipeable via FlatList paging; arrows stay as an affordance and
            for accessibility, driving the same scrollToIndex. Orthogonal-axis
            nesting (horizontal list in a vertical scroll view) is the
            standard, well-supported case — no custom gesture handling needed. */}
        <View style={styles.carousel}>
          <IconButton
            icon={BackIcon}
            size={20}
            accessibilityLabel="Previous buddy"
            disabled={index === 0}
            onPress={() => selectIndex(index - 1, true)}
          />

          <View style={styles.slideViewport} onLayout={(e) => setSlideWidth(e.nativeEvent.layout.width)}>
            {slideWidth > 0 && (
              <FlatList
                ref={carouselRef}
                data={companions}
                keyExtractor={(c) => c.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={index}
                getItemLayout={(_, i) => ({ length: slideWidth, offset: slideWidth * i, index: i })}
                onMomentumScrollEnd={(e) => {
                  const next = Math.round(e.nativeEvent.contentOffset.x / slideWidth);
                  selectIndex(next);
                }}
                renderItem={({ item }) => (
                  <View style={[styles.slide, { width: slideWidth }]}>
                    <CapyMascot
                      size={170}
                      mood="idle"
                      skin={skinForCompanionId(item.id)}
                      locked={!item.unlocked}
                    />
                    <Text variant="h1" style={styles.companionName}>
                      {item.name}
                    </Text>
                  </View>
                )}
              />
            )}
          </View>

          <IconButton
            icon={NextIcon}
            size={20}
            accessibilityLabel="Next buddy"
            disabled={index === companions.length - 1}
            onPress={() => selectIndex(index + 1, true)}
          />
        </View>

        {!current.unlocked && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Unlock ${current.name} for ${current.priceCoins} coins`}
            onPress={onUnlock}
            style={styles.unlockRow}
          >
            <Text variant="h1" style={styles.unlockText}>
              unlock for
            </Text>
            <Coin size={20} />
            <Text variant="h1" style={styles.unlockText}>
              {current.priceCoins.toLocaleString('en-US')}
            </Text>
          </Pressable>
        )}

        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Text variant="h2">Session Details</Text>

          <DetailRow
            label="Focus Duration"
            value={`${plan.focusMin} min`}
            onPress={() => setPicker('focus')}
          />
          <DetailRow
            label="Break Duration"
            value={`${plan.breakMin} min`}
            onPress={() => setPicker('break')}
          />
          <DetailRow
            label="Session"
            value={`${plan.loops} loops`}
            onPress={() => setPicker('loops')}
          />

          <View style={styles.row}>
            <Text variant="body">Prep</Text>
            <Toggle
              value={plan.prepEnabled}
              onValueChange={(prepEnabled) => updatePlan({ prepEnabled })}
              accessibilityLabel="5 minute prep session"
            />
          </View>

          <View style={styles.row}>
            <Text variant="body">Total Time</Text>
            <Text variant="body">
              {Math.floor(totalMinutes / 60)} hr {String(totalMinutes % 60).padStart(2, '0')} min
            </Text>
          </View>

          <SegmentedTabs
            options={[
              { value: 'up', label: 'Count Up' },
              { value: 'down', label: 'Count Down' },
            ]}
            value={plan.countDirection}
            onChange={(countDirection) => updatePlan({ countDirection })}
          />

          <Text variant="h2">Category</Text>
          <View style={styles.categoryGrid}>
            {categories.map((category) => {
              const selected = category.id === plan.categoryId;
              return (
                <Pressable
                  key={category.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() =>
                    updatePlan({ categoryId: selected ? undefined : category.id })
                  }
                  style={[styles.categoryChip, selected && styles.categoryChipSelected]}
                >
                  <View
                    style={[styles.categoryDot, { backgroundColor: swatchColor(category.color) }]}
                  />
                  <Text variant="body">{category.name}</Text>
                </Pressable>
              );
            })}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add new category"
              onPress={() => setCategoryModal(true)}
              style={[styles.categoryChip, styles.addChip]}
            >
              <Text variant="body">add new +</Text>
            </Pressable>
          </View>

          <View style={styles.startRow}>
            <Button
              label="Start Session"
              variant="outlined"
              onPress={() => {
                startRun();
                router.back();
              }}
            />
          </View>
        </View>
      </ScrollView>

      <ValuePicker
        kind={picker}
        plan={plan}
        onClose={() => setPicker(null)}
        onSelect={(updates) => {
          updatePlan(updates);
          setPicker(null);
        }}
      />

      <Modal
        visible={categoryModal}
        onDismiss={() => setCategoryModal(false)}
        onDone={onCreateCategory}
        doneDisabled={!newName.trim()}
      >
        <View style={styles.modalSection}>
          <Text variant="body">Color</Text>
          <ColorPicker value={newColor} onChange={setNewColor} />
        </View>
        <Field label="Name" value={newName} onChangeText={setNewName} placeholder="study" />
      </Modal>
    </SafeAreaView>
  );
}

function DetailRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}`}
      onPress={onPress}
      style={styles.row}
    >
      <Text variant="body">{label}</Text>
      <Text variant="body" style={styles.rowValue}>
        {value}
      </Text>
    </Pressable>
  );
}

function ValuePicker({
  kind,
  plan,
  onClose,
  onSelect,
}: {
  kind: PickerKind;
  plan: { focusMin: number; breakMin: number; loops: number };
  onClose: () => void;
  onSelect: (updates: { focusMin?: number; breakMin?: number; loops?: number }) => void;
}) {
  if (!kind) return null;

  const config = {
    focus: { title: 'Focus Duration', options: FOCUS_OPTIONS, unit: 'min', current: plan.focusMin },
    break: { title: 'Break Duration', options: BREAK_OPTIONS, unit: 'min', current: plan.breakMin },
    loops: { title: 'Session', options: LOOP_OPTIONS, unit: 'loops', current: plan.loops },
  }[kind];

  return (
    <Modal visible title={config.title} onDismiss={onClose}>
      <View style={styles.optionGrid}>
        {config.options.map((option) => {
          const selected = option === config.current;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() =>
                onSelect(
                  kind === 'focus'
                    ? { focusMin: option }
                    : kind === 'break'
                      ? { breakMin: option }
                      : { loops: option },
                )
              }
              style={[styles.option, selected && styles.optionSelected]}
            >
              <Text variant="body">
                {option} {config.unit}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  content: {
    alignItems: 'center',
    paddingBottom: 40,
    gap: 8,
  },
  carousel: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  slideViewport: {
    flex: 1,
  },
  slide: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  companionName: {
    fontSize: 20,
  },
  unlockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  unlockText: {
    fontSize: 18,
  },
  sheet: {
    width: '100%',
    marginTop: 12,
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: colors.brown,
    backgroundColor: colors.white,
    gap: 16,
  },
  grabber: {
    alignSelf: 'center',
    width: 64,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderDefault,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
  },
  rowValue: {
    color: colors.textSecondary,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    minWidth: '47%',
  },
  categoryChipSelected: {
    borderColor: colors.brown,
    backgroundColor: colors.buttonPrimary,
  },
  addChip: {
    justifyContent: 'center',
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  startRow: {
    alignItems: 'center',
    marginTop: 8,
  },
  modalSection: {
    gap: 8,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  optionSelected: {
    borderColor: colors.brown,
    backgroundColor: colors.buttonPrimary,
  },
});
