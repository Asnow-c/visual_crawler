import { defineConfig } from "vite";
export default defineConfig({
    server: {
        proxy: {
            "/api": {
                target: "http://127.0.0.1:3000",
                changeOrigin: true,
            },
            "/auth": {
                target: "http://127.0.0.1:3000",
                changeOrigin: true,
            },
        },
    },
    resolve: {
        alias: {
            "@": "/src/",
        },
    },
    build: {
        copyPublicDir: true,
        outDir: "../back-end/public",
    },
});
