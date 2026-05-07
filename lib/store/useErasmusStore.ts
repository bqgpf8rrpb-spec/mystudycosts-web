import { create } from 'zustand';
import type { PartnerUniversity } from '@/data/erasmus-types';

interface ErasmusState {
  hasBAfoeg: boolean;
  selectedUniversity: string;
  selectedProgram: string;
  selectedPartner: PartnerUniversity | null;
  setHasBAfoeg: (hasBAfoeg: boolean) => void;
  setSelectedUniversity: (university: string) => void;
  setSelectedProgram: (program: string) => void;
  setSelectedPartner: (partner: PartnerUniversity | null) => void;
  setSelection: (selection: {
    university: string;
    program: string;
    partner: PartnerUniversity | null;
    hasBAfoeg: boolean;
  }) => void;
  clearSelection: () => void;
}

export const useErasmusStore = create<ErasmusState>((set) => ({
  hasBAfoeg: false,
  selectedUniversity: '',
  selectedProgram: '',
  selectedPartner: null,
  setHasBAfoeg: (hasBAfoeg) => set({ hasBAfoeg }),
  setSelectedUniversity: (selectedUniversity) =>
    set({ selectedUniversity, selectedProgram: '', selectedPartner: null }),
  setSelectedProgram: (selectedProgram) =>
    set({ selectedProgram, selectedPartner: null }),
  setSelectedPartner: (selectedPartner) => set({ selectedPartner }),
  setSelection: (selection) =>
    set({
      selectedUniversity: selection.university,
      selectedProgram: selection.program,
      selectedPartner: selection.partner,
      hasBAfoeg: selection.hasBAfoeg,
    }),
  clearSelection: () =>
    set({
      selectedUniversity: '',
      selectedProgram: '',
      selectedPartner: null,
      hasBAfoeg: false,
    }),
}));
