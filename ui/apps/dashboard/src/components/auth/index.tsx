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

import {
  createContext,
  useContext,
  ReactNode,
  useMemo,
  useState,
  useCallback,
} from 'react';
import { Me } from '@/services/auth.ts';
import { karmadaClient } from '@/services';
import { useQuery } from '@tanstack/react-query';

const AuthContext = createContext<{
  authenticated: boolean;
  token: string;
  setToken: (v: string) => void;
}>({
  authenticated: false,
  token: '',
  setToken: () => {},
});

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken_] = useState(localStorage.getItem('token'));
  const setToken = useCallback((newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken_(newToken);
  }, []);
  const { data, isLoading } = useQuery({
    queryKey: ['Me', token],
    queryFn: async () => {
      if (token) {
        karmadaClient.defaults.headers.common[
          'Authorization'
        ] = `Bearer ${token}`;
        // localStorage.setItem("token", token);
        const ret = await Me();
        return ret.data;
      } else {
        // delete karmadaClient.defaults.headers.common["Authorization"];
        // localStorage.removeItem("token");
        return {
          authenticated: false,
        };
      }
    },
  });
  const ctxValue = useMemo(() => {
    if (data && token) {
      return {
        authenticated: !!data.authenticated,
        token,
        setToken,
      };
    } else {
      return {
        authenticated: false,
        token: '',
        setToken,
      };
    }
  }, [data, token, setToken]);
  return (
    <AuthContext.Provider value={ctxValue}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};

export default AuthProvider;
