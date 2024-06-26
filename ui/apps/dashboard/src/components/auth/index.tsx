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
