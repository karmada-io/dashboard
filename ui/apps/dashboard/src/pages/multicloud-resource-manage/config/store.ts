/*
Copyright 2024 The Karmada Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

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
