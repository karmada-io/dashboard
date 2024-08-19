import { create } from 'zustand';
import { ConfigKind } from '@/services/base.ts';
import { FilterState, EditorState } from './types.ts';

type State = {
  filter: FilterState;
  editor: EditorState;
};

type Actions = {
  setFilter: (k: Partial<FilterState>) => void;
  viewConfig: (config: string) => void;
  editConfig: (config: string) => void;
  hideEditor: () => void;
  createConfig: () => void;
};

export type Store = State & Actions;

export const useStore = create<Store>((set) => ({
  filter: {
    kind: ConfigKind.ConfigMap,
    selectedWorkspace: '',
    searchText: '',
  },
  editor: {
    show: false,
    mode: 'create',
    content: '',
  },
  setFilter: (k: Partial<FilterState>) => {
    set((state) => {
      const f = state.filter;
      return {
        filter: {
          ...f,
          ...k,
        },
      };
    });
  },
  viewConfig: (config: string) => {
    set({
      editor: {
        show: true,
        mode: 'read',
        content: config,
      },
    });
  },
  editConfig: (config: string) => {
    set({
      editor: {
        show: true,
        mode: 'edit',
        content: config,
      },
    });
  },
  hideEditor: () => {
    set({
      editor: {
        show: false,
        mode: 'edit',
        content: '',
      },
    });
  },
  createConfig: () => {
    set({
      editor: {
        show: true,
        mode: 'create',
        content: '',
      },
    });
  },
}));
