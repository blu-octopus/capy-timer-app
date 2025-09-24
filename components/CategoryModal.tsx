/**
 * ? Category Selection Modal
 * 
 * Modal for selecting and managing categories with blur background.
 * Allows creating new categories with color selection.
 */

import { Colors } from '@/constants/Colors';
import { Layout, Spacing } from '@/constants/Spacing';
import { Typography } from '@/constants/Typography';
import { useCategories } from '@/hooks/useCategories';
import { useColorScheme } from '@/hooks/useColorScheme';
import { CATEGORY_COLORS } from '@/constants/Categories';
import { BlurView } from 'expo-blur';
import React, { useState } from 'react';
import {
    Alert,
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface CategoryModalProps {
  visible: boolean;
  onClose: () => void;
  onCategorySelect?: (categoryId: string) => void;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  visible,
  onClose,
  onCategorySelect,
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const {
    categories,
    selectedCategoryId,
    selectCategory,
    createCategory,
    validateCategoryName,
  } = useCategories();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);

  const handleCategorySelect = (categoryId: string) => {
    selectCategory(categoryId);
    onCategorySelect?.(categoryId);
    onClose();
  };

  const handleCreateCategory = () => {
    const validation = validateCategoryName(newCategoryName);
    
    if (!validation.isValid) {
      Alert.alert('Invalid Name', validation.error);
      return;
    }

    const newCategory = createCategory(newCategoryName, selectedColorIndex);
    setNewCategoryName('');
    setSelectedColorIndex(0);
    setShowCreateForm(false);
    
    // Auto-select the new category
    handleCategorySelect(newCategory.id);
  };

  const cancelCreate = () => {
    setNewCategoryName('');
    setSelectedColorIndex(0);
    setShowCreateForm(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Blur Background */}
      <BlurView intensity={20} style={styles.blurContainer}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={onClose}
        >
          {/* Modal Content */}
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              
              {/* Header */}
              <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>
                  Category
                </Text>
              </View>

              {/* Create New Category Form */}
              {showCreateForm && (
                <View style={[styles.createForm, { backgroundColor: colors.background }]}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>
                    Color
                  </Text>
                  
                  {/* Color Selection */}
                  <View style={styles.colorRow}>
                    {CATEGORY_COLORS.map((color, index) => (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.colorCircle,
                          { backgroundColor: color },
                          selectedColorIndex === index && styles.selectedColor,
                        ]}
                        onPress={() => setSelectedColorIndex(index)}
                      />
                    ))}
                  </View>

                  <Text style={[styles.formLabel, { color: colors.text }]}>
                    Name
                  </Text>
                  
                  {/* Name Input */}
                  <TextInput
                    style={[
                      styles.nameInput,
                      { 
                        color: colors.text,
                        borderBottomColor: colors.text + '50',
                      }
                    ]}
                    value={newCategoryName}
                    onChangeText={setNewCategoryName}
                    placeholder="Enter category name"
                    placeholderTextColor={colors.text + '60'}
                    maxLength={20}
                    autoFocus
                  />

                  {/* Form Buttons */}
                  <View style={styles.formButtons}>
                    <TouchableOpacity
                      style={[styles.formButton, styles.cancelButton]}
                      onPress={cancelCreate}
                    >
                      <Text style={[styles.formButtonText, { color: colors.text }]}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.formButton, 
                        styles.doneButton,
                        { backgroundColor: colors.accent }
                      ]}
                      onPress={handleCreateCategory}
                    >
                      <Text style={[styles.formButtonText, { color: colors.surface }]}>
                        Done
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Category List */}
              <ScrollView style={styles.categoryList} showsVerticalScrollIndicator={false}>
                <View style={styles.categoryGrid}>
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryItem,
                        selectedCategoryId === category.id && {
                          backgroundColor: colors.accent + '20',
                        }
                      ]}
                      onPress={() => handleCategorySelect(category.id)}
                    >
                      <View
                        style={[
                          styles.categoryColor,
                          { backgroundColor: category.color }
                        ]}
                      />
                      <Text style={[styles.categoryName, { color: colors.text }]}>
                        {category.name}
                      </Text>
                      {selectedCategoryId === category.id && (
                        <Text style={[styles.checkmark, { color: colors.accent }]}>
                          ?
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                  
                  {/* Add New Category Button */}
                  {!showCreateForm && (
                    <TouchableOpacity
                      style={[styles.addCategoryButton, { borderColor: colors.text + '30' }]}
                      onPress={() => setShowCreateForm(true)}
                    >
                      <Text style={[styles.addCategoryText, { color: colors.text }]}>
                        + Add Category
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,
  },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },

  modalContent: {
    width: screenWidth * 0.85,
    maxHeight: screenHeight * 0.7,
    borderRadius: Layout.borderRadius.large,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },

  header: {
    padding: Spacing.lg,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },

  title: {
    ...Typography.title2,
    fontWeight: '600',
  },

  createForm: {
    padding: Spacing.lg,
    borderRadius: Layout.borderRadius.medium,
    margin: Spacing.md,
  },

  formLabel: {
    ...Typography.callout,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },

  colorRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },

  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },

  selectedColor: {
    borderColor: '#000',
    borderWidth: 3,
  },

  nameInput: {
    ...Typography.body,
    paddingVertical: Spacing.sm,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    marginBottom: Spacing.lg,
  },

  formButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },

  formButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.medium,
    alignItems: 'center',
  },

  cancelButton: {
    backgroundColor: 'transparent',
  },

  doneButton: {
    // backgroundColor set dynamically
  },

  formButtonText: {
    ...Typography.buttonMedium,
  },

  categoryList: {
    maxHeight: 300,
  },

  categoryGrid: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },

  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Layout.borderRadius.medium,
  },

  categoryColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: Spacing.md,
  },

  categoryName: {
    ...Typography.callout,
    flex: 1,
  },

  checkmark: {
    ...Typography.title3,
    fontWeight: '700',
  },

  addCategoryButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Layout.borderRadius.medium,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },

  addCategoryText: {
    ...Typography.callout,
    opacity: 0.7,
  },
});
