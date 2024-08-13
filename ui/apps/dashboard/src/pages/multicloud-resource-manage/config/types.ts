import { ConfigKind } from '@/services/base.ts';

export interface FilterState {
  kind: ConfigKind;
  selectedWorkspace: string;
  searchText: string;
}

export interface EditorState {
  show: boolean;
  mode: 'create' | 'edit' | 'read';
  content: string;
}
