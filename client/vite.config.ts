import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default (mode: string) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };

  return defineConfig({
    plugins: [
      nodePolyfills({
        globals: {
          Buffer: true, // can also be 'build', 'dev', or false
          global: true,
          process: true,
        },
      }),
      react(),
    ],
    server: {
      port: process.env.VITE_PORT ? parseInt(process.env.VITE_PORT) : 3001,
      proxy: {
        "/api": process.env.VITE_API_URL || "http://localhost:3000/",
      },
    },
    build: {
      outDir: "./build",
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@utils": path.resolve(__dirname, "./src/utils"),
        "@components": path.resolve(__dirname, "./src/components"),
        "@context": path.resolve(__dirname, "./src/context"),
        "@pages": path.resolve(__dirname, "./src/pages"),
        "simple-peer": "simple-peer/simplepeer.min.js",
      },
    },
  });
};
