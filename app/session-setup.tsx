import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { ColorPicker, swatchColor, type SwatchValue } from '@/components/ui/ColorPicker';
import { Field } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { OptionWheel } from '@/components/ui/OptionWheel';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Text } from '@/components/ui/Text';
import { Toggle } from '@/components/ui/Toggle';
import { createCategory } from '@/src/db/categories';
import { tapFeedback } from '@/src/feedback';
import { useAppStore } from '@/src/store';
import { PREP_MS, totalPlanMinutes } from '@/src/store/types';
import { formatDuration } from '@/src/theme/formatDuration';
import { colors } from '@/src/theme/tokens';

const FOCUS_OPTIONS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 75, 90];
const BREAK_OPTIONS = [0, 5, 10, 15, 20, 25, 30];
const LOOP_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const PREP_MINUTES = Math.round(PREP_MS / 60_000);

function numberOptions(values: readonly number[]) {
  return values.map((value) => ({ value, label: String(value) }));
}

export default function SessionSetupScreen() {
  const router = useRouter();

  const plan = useAppStore((s) => s.plan);
  const updatePlan = useAppStore((s) => s.updatePlan);
  const categories = useAppStore((s) => s.categories);
  const startRun = useAppStore((s) => s.startRun);

  const [categoryModal, setCategoryModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState<SwatchValue>('green');

  const totalMinutes = useMemo(() => totalPlanMinutes(plan), [plan]);

  const onCreateCategory = async () => {
    await createCategory(newName, newColor);
    setNewName('');
    setNewColor('green');
    setCategoryModal(false);
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        // The wheels pan vertically inside this list; letting both claim the
        // same drag makes the sheet lurch while you're setting a duration.
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="h2">Session Details</Text>

        {/* All three durations visible and settable at once, rather than three
            rows each opening its own picker on top of this sheet. */}
        <View style={styles.wheels}>
          <WheelColumn
            label="Focus"
            unit="min"
            options={numberOptions(FOCUS_OPTIONS)}
            value={plan.focusMin}
            onChange={(focusMin) => updatePlan({ focusMin })}
          />
          <WheelColumn
            label="Break"
            unit="min"
            options={numberOptions(BREAK_OPTIONS)}
            value={plan.breakMin}
            onChange={(breakMin) => updatePlan({ breakMin })}
          />
          <WheelColumn
            label="Loops"
            unit={plan.loops === 1 ? 'round' : 'rounds'}
            options={numberOptions(LOOP_OPTIONS)}
            value={plan.loops}
            onChange={(loops) => updatePlan({ loops })}
          />
        </View>

        <View style={styles.row}>
          <View style={styles.rowLabel}>
            <Text variant="body">Prep time</Text>
            <Text variant="caption" style={styles.hint}>
              {PREP_MINUTES} quiet minutes before the first focus
            </Text>
          </View>
          <Toggle
            value={plan.prepEnabled}
            onValueChange={(prepEnabled) => updatePlan({ prepEnabled })}
            accessibilityLabel={`${PREP_MINUTES} minute prep session`}
          />
        </View>

        <View style={styles.row}>
          <Text variant="body">Total time</Text>
          <Text variant="body">{formatDuration(totalMinutes)}</Text>
        </View>

        <SegmentedTabs
          options={[
            { value: 'up', label: 'Count Up' },
            { value: 'down', label: 'Count Down' },
          ]}
          value={plan.countDirection}
          onChange={(countDirection) => updatePlan({ countDirection })}
        />

        <Text variant="h2" style={styles.sectionHeading}>
          Category
        </Text>
        <View style={styles.categoryGrid}>
          {categories.map((category) => {
            const selected = category.id === plan.categoryId;
            return (
              <Pressable
                key={category.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  tapFeedback();
                  updatePlan({ categoryId: selected ? undefined : category.id });
                }}
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
            onPress={() => {
              tapFeedback();
              setCategoryModal(true);
            }}
            style={[styles.categoryChip, styles.addChip]}
          >
            <Text variant="body">add new +</Text>
          </Pressable>
        </View>

        <View style={styles.startRow}>
          <Button
            label="Start Session"
            variant="outlined"
            feedback="success"
            onPress={() => {
              startRun();
              router.back();
            }}
          />
        </View>
      </ScrollView>

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
    </View>
  );
}

function WheelColumn({
  label,
  unit,
  options,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  options: readonly { value: number; label: string }[];
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.wheelColumn}>
      <Text variant="caption">{label}</Text>
      <OptionWheel
        options={options}
        value={value}
        onChange={onChange}
        accessibilityLabel={`${label} duration`}
      />
      <Text variant="caption" style={styles.hint}>
        {unit}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 16,
  },
  wheels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  wheelColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
    gap: 12,
  },
  rowLabel: {
    flexShrink: 1,
    gap: 2,
  },
  hint: {
    color: colors.textSecondary,
  },
  sectionHeading: {
    marginTop: 4,
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
  },
  categoryChipSelected: {
    borderColor: colors.brown,
    backgroundColor: colors.buttonPrimary,
  },
  addChip: {
    borderStyle: 'dashed',
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  startRow: {
    alignItems: 'center',
    marginTop: 8,
  },
  modalSection: {
    gap: 8,
  },
});
