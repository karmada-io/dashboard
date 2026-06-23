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

import { ClusterContext } from "@/hooks";
import { useState } from "react";
import "./App.css";
import Router from "./routes";
import { Helmet, HelmetProvider } from "react-helmet-async";
import { ConfigProvider, App as AntdApp } from "antd";
import { StyleProvider } from "@ant-design/cssinjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AuthProvider from "@/components/auth";
import { getAntdLocale } from "@/utils/i18n.tsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Avoid repeated refetches on window focus/reconnect which can
      // cause duplicate error notifications and unnecessary traffic.
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      // Limit automatic retries; many API errors here are permission-related
      // (e.g. 403) and won't succeed by retrying.
      retry: 1,
    },
  },
});

function App() {
  const [cluster, setCluster] = useState<string>("");
  return (
    <StyleProvider layer>
      <ConfigProvider
        locale={getAntdLocale()}
        theme={{
          components: {
            Layout: {
              siderBg: "#ffffff",
            },
          },
        }}
      >
      <AntdApp>
        <QueryClientProvider client={queryClient}>
          <ClusterContext.Provider value={{
            currentCluster: cluster,
            setCurrentCluster: setCluster,
          }}>
            <AuthProvider>
              <HelmetProvider>
                <Helmet>
                  <title>Karmada Dashboard</title>
                  <link
                    rel="apple-touch-icon"
                    sizes="180x180"
                    href="/apple-touch-icon.png"
                  />

                  <link
                    rel="icon"
                    type="image/png"
                    sizes="16x16"
                    href="/favicon-16x16.png"
                  />

                  <link
                    rel="icon"
                    type="image/png"
                    sizes="32x32"
                    href="/favicon-32x32.png"
                  />

                  <link
                    rel="shortcut icon"
                    type="image/x-icon"
                    href="/favicon.ico"
                  />
                </Helmet>
                <Router />
              </HelmetProvider>
            </AuthProvider>
          </ClusterContext.Provider>
        </QueryClientProvider>
      </AntdApp>
      </ConfigProvider>
    </StyleProvider>
  );
}

export default App;
