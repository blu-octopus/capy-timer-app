/**
 * ? Category Management Hook
 * 
 * Manages category creation, selection, and persistence.
 * Handles default categories and user-created custom categories.
 */

import { Category } from '@/types/Categories';
import { CATEGORY_COLORS, DEFAULT_CATEGORIES } from '@/constants/Categories';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = '@capy_timer_categories';
const SELECTED_CATEGORY_KEY = '@capy_timer_selected_category';

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('study');
  const [isLoading, setIsLoading] = useState(true);

  // Load categories and selected category on mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Save categories when they change
  useEffect(() => {
    if (!isLoading) {
      saveCategories();
    }
  }, [categories, isLoading]);

  // Save selected category when it changes
  useEffect(() => {
    if (!isLoading) {
      saveSelectedCategory();
    }
  }, [selectedCategoryId, isLoading]);

  // ? STORAGE FUNCTIONS
  const loadCategories = async () => {
    try {
      const [categoriesData, selectedData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(SELECTED_CATEGORY_KEY),
      ]);

      if (categoriesData) {
        const savedCategories = JSON.parse(categoriesData);
        setCategories(savedCategories);
      } else {
        // Initialize with default categories
        const defaultCategories: Category[] = DEFAULT_CATEGORIES.map(cat => ({
          ...cat,
          createdAt: new Date(),
          sessionCount: 0,
        }));
        setCategories(defaultCategories);
      }

      if (selectedData) {
        setSelectedCategoryId(selectedData);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
      // Fallback to default categories
      const defaultCategories: Category[] = DEFAULT_CATEGORIES.map(cat => ({
        ...cat,
        createdAt: new Date(),
        sessionCount: 0,
      }));
      setCategories(defaultCategories);
    } finally {
      setIsLoading(false);
    }
  };

  const saveCategories = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
    } catch (error) {
      console.error('Failed to save categories:', error);
    }
  };

  const saveSelectedCategory = async () => {
    try {
      await AsyncStorage.setItem(SELECTED_CATEGORY_KEY, selectedCategoryId);
    } catch (error) {
      console.error('Failed to save selected category:', error);
    }
  };

  // ? CATEGORY MANAGEMENT
  const createCategory = useCallback((name: string, colorIndex: number = 0): Category => {
    const newCategory: Category = {
      id: `custom_${Date.now()}`,
      name: name.trim().toLowerCase(),
      color: CATEGORY_COLORS[colorIndex % CATEGORY_COLORS.length],
      createdAt: new Date(),
      sessionCount: 0,
    };

    setCategories(prev => [...prev, newCategory]);
    return newCategory;
  }, []);

  const updateCategory = useCallback((categoryId: string, updates: Partial<Category>) => {
    setCategories(prev =>
      prev.map(cat =>
        cat.id === categoryId ? { ...cat, ...updates } : cat
      )
    );
  }, []);

  const deleteCategory = useCallback((categoryId: string) => {
    // Don't delete if it's the only category
    if (categories.length <= 1) {
      return false;
    }

    // Don't delete if it's currently selected
    if (selectedCategoryId === categoryId) {
      return false;
    }

    setCategories(prev => prev.filter(cat => cat.id !== categoryId));
    return true;
  }, [categories.length, selectedCategoryId]);

  const selectCategory = useCallback((categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    if (category) {
      setSelectedCategoryId(categoryId);
      return true;
    }
    return false;
  }, [categories]);

  // ? UTILITY FUNCTIONS
  const getSelectedCategory = useCallback((): Category | undefined => {
    return categories.find(cat => cat.id === selectedCategoryId);
  }, [categories, selectedCategoryId]);

  const getCategoryById = useCallback((id: string): Category | undefined => {
    return categories.find(cat => cat.id === id);
  }, [categories]);

  const incrementSessionCount = useCallback((categoryId: string) => {
    setCategories(prev =>
      prev.map(cat =>
        cat.id === categoryId
          ? { ...cat, sessionCount: cat.sessionCount + 1 }
          : cat
      )
    );
  }, []);

  const getAvailableColors = useCallback((): string[] => {
    const usedColors = categories.map(cat => cat.color);
    return CATEGORY_COLORS.filter(color => !usedColors.includes(color));
  }, [categories]);

  const validateCategoryName = useCallback((name: string): { isValid: boolean; error?: string } => {
    const trimmedName = name.trim().toLowerCase();
    
    if (!trimmedName) {
      return { isValid: false, error: 'Category name cannot be empty' };
    }
    
    if (trimmedName.length > 20) {
      return { isValid: false, error: 'Category name must be 20 characters or less' };
    }
    
    const exists = categories.some(cat => cat.name.toLowerCase() === trimmedName);
    if (exists) {
      return { isValid: false, error: 'Category name already exists' };
    }
    
    return { isValid: true };
  }, [categories]);

  return {
    // State
    categories,
    selectedCategoryId,
    isLoading,
    
    // Actions
    createCategory,
    updateCategory,
    deleteCategory,
    selectCategory,
    incrementSessionCount,
    
    // Getters
    getSelectedCategory,
    getCategoryById,
    getAvailableColors,
    validateCategoryName,
  };
};
