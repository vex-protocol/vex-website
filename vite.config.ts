import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");
    const apiPort = env.CLA_API_PORT?.trim() || "8787";
    return {
        server: {
            proxy: {
                "/api": {
                    target: `http://127.0.0.1:${apiPort}`,
                    // Keep Host as localhost:5173 so the OAuth API can infer the public origin
                    // when SITE_ORIGIN is unset; changeOrigin:true breaks that (Host becomes :8787).
                    changeOrigin: false,
                },
            },
        },
    };
});
