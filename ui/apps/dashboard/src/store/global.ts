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

import { create, StateCreator } from 'zustand';
import { devtools } from "zustand/middleware";

type GlobalState = {
    karmadaTerminalOpen: boolean;
    toggleKarmadaTerminal: () => void;
    setKarmadaTerminalOpen: (isOpen: boolean) => void;
};

const createGlobalSlice: StateCreator<
    GlobalState,
    [['zustand/devtools', never]],
    [],
    GlobalState
> = (set) => ({
    karmadaTerminalOpen: false,
    toggleKarmadaTerminal: () =>
        set((state) => ({karmadaTerminalOpen: !state.karmadaTerminalOpen}), undefined, 'global/toggleKarmadaTerminal'),
    setKarmadaTerminalOpen: (isOpen) =>
        set({karmadaTerminalOpen: isOpen}, undefined, 'global/setKarmadaTerminalOpen')
})

export const useGlobalStore =
    process.env.NODE_ENV === 'development' ?
        create<GlobalState>()(devtools(createGlobalSlice)) :
        create<GlobalState>(createGlobalSlice)
