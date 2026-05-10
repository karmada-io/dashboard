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

import { createWithEqualityFn } from 'zustand/traditional';
import { shallow } from 'zustand/shallow';
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

const initialFilter: FilterState = {
  kind: ConfigKind.ConfigMap,
  selectedWorkspace: '',
  searchText: '',
};

const initialEditor: EditorState = {
  show: false,
  mode: 'create',
  content: '',
};

const isEditorEqual = (a: EditorState, b: EditorState) =>
  a.show === b.show && a.mode === b.mode && a.content === b.content;

export const useStore = createWithEqualityFn<Store>()((set) => ({
  filter: initialFilter,
  editor: initialEditor,
  setFilter: (k: Partial<FilterState>) => {
    set((state) => {
      const nextFilter = {
        ...state.filter,
        ...k,
      };

      if (
        nextFilter.kind === state.filter.kind &&
        nextFilter.selectedWorkspace === state.filter.selectedWorkspace &&
        nextFilter.searchText === state.filter.searchText
      ) {
        return state;
      }

      return {
        filter: nextFilter,
      };
    });
  },
  viewConfig: (config: string) => {
    set((state) => {
      const nextEditor: EditorState = {
        show: true,
        mode: 'read',
        content: config,
      };

      if (isEditorEqual(state.editor, nextEditor)) {
        return state;
      }

      return {
        editor: nextEditor,
      };
    });
  },
  editConfig: (config: string) => {
    set((state) => {
      const nextEditor: EditorState = {
        show: true,
        mode: 'edit',
        content: config,
      };

      if (isEditorEqual(state.editor, nextEditor)) {
        return state;
      }

      return {
        editor: nextEditor,
      };
    });
  },
  hideEditor: () => {
    set((state) => {
      const nextEditor: EditorState = {
        show: false,
        // Hidden state does not carry user intent; reset to default create mode.
        mode: 'create',
        content: '',
      };

      if (isEditorEqual(state.editor, nextEditor)) {
        return state;
      }

      return {
        editor: nextEditor,
      };
    });
  },
  createConfig: () => {
    set((state) => {
      const nextEditor: EditorState = {
        show: true,
        mode: 'create',
        content: '',
      };

      if (isEditorEqual(state.editor, nextEditor)) {
        return state;
      }

      return {
        editor: nextEditor,
      };
    });
  },
}), shallow);
