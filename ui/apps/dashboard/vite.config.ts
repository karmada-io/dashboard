import {defineConfig, loadEnv} from 'vite'
import react from '@vitejs/plugin-react'
import svgr from "vite-plugin-svgr";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({mode}) => {
    const env = loadEnv(mode, process.cwd(), '')
    return {
        base: process.env.NODE_ENV === 'development' ? '' : '/static',
        plugins: [
            react(),
            svgr()
        ],
        resolve: {
            alias: [
                {find: "@", replacement: path.resolve(__dirname, "src")},
            ],
        },
        server: {
            proxy: {
                "^/api/v1.*": {
                    target: 'http://localhost:8000',
                    changeOrigin: true,
                    headers: {
                        // cookie: env.VITE_COOKIES,
                        // Authorization: `Bearer ${env.VITE_TOKEN}`
                    },
                },
            }
        }
    }
})
