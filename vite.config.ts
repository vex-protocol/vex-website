import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");
    const apiPort = env.CLA_API_PORT?.trim() || "8787";
    return {
        server: {
            proxy: {
                "/api": {
                    target: `http://127.0.0.1:${apiPort}`,
                    changeOrigin: true,
                },
            },
        },
    };
});
