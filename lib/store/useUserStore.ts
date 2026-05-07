import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface UserState {
  userGpa: number | null;
  homeCity: string;
  isFirstVisit: boolean;
  language: 'de' | 'en';
  setUserGpa: (value: number | null) => void;
  setHomeCity: (value: string) => void;
  setIsFirstVisit: (value: boolean) => void;
  setLanguage: (value: 'de' | 'en') => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      userGpa: null,
      homeCity: '',
      isFirstVisit: true,
      language: 'de',
      setUserGpa: (userGpa) => set({ userGpa, isFirstVisit: false }),
      setHomeCity: (homeCity) => set({ homeCity, isFirstVisit: false }),
      setIsFirstVisit: (isFirstVisit) => set({ isFirstVisit }),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'msc-user-profile',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        userGpa: state.userGpa,
        homeCity: state.homeCity,
        isFirstVisit: state.isFirstVisit,
        language: state.language,
      }),
    }
  )
);
