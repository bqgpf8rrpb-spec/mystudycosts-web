import { useState, useEffect, useCallback } from 'react';

export interface WatchlistItem {
  id: string; // Unique identifier: university + program name
  university: string;
  programName: string;
  ncThreshold: number;
  waitingSemesters: number;
  isNCFree: boolean;
  matchType: 'safe' | 'reach' | 'available' | 'unlikely';
  type: 'program' | 'alternative';
  alternativeType?: 'private' | 'studyAbroad' | 'dualStudies' | 'prepCourses';
  savedAt: number; // Timestamp
}

const STORAGE_KEY = 'study_programs_watchlist';

export function useWatchlist() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setItems(Array.isArray(parsed) ? parsed : []);
      }
    } catch (error) {
      console.error('Error loading watchlist:', error);
      setItems([]);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to localStorage whenever items change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch (error) {
        console.error('Error saving watchlist:', error);
      }
    }
  }, [items, isLoaded]);

  // Generate unique ID for a program
  const generateId = useCallback((university: string, programName: string, type: 'program' | 'alternative', alternativeType?: string): string => {
    if (type === 'alternative') {
      // Use stable ID for alternatives (without timestamp) to allow toggling
      return `${university || 'general'}_${alternativeType}`;
    }
    return `${university}_${programName}`;
  }, []);

  // Check if item is saved
  const isSaved = useCallback((id: string): boolean => {
    return items.some(item => item.id === id);
  }, [items]);

  // Add item to watchlist
  const addItem = useCallback((item: Omit<WatchlistItem, 'id' | 'savedAt'>) => {
    const id = generateId(item.university, item.programName, item.type, item.alternativeType);
    
    // Check if already exists
    if (items.some(existing => existing.id === id)) {
      return false; // Already saved
    }

    const newItem: WatchlistItem = {
      ...item,
      id,
      savedAt: Date.now(),
    };

    setItems(prev => [...prev, newItem]);
    return true;
  }, [items, generateId]);

  // Remove item from watchlist
  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  // Toggle item (add if not saved, remove if saved)
  const toggleItem = useCallback((item: Omit<WatchlistItem, 'id' | 'savedAt'>) => {
    const id = generateId(item.university, item.programName, item.type, item.alternativeType);
    
    if (isSaved(id)) {
      removeItem(id);
      return false; // Removed
    } else {
      addItem(item);
      return true; // Added
    }
  }, [isSaved, addItem, removeItem, generateId]);

  // Clear all items
  const clearAll = useCallback(() => {
    setItems([]);
  }, []);

  // Get item by ID
  const getItem = useCallback((id: string): WatchlistItem | undefined => {
    return items.find(item => item.id === id);
  }, [items]);

  return {
    items,
    isLoaded,
    isSaved,
    addItem,
    removeItem,
    toggleItem,
    clearAll,
    getItem,
    count: items.length,
  };
}

