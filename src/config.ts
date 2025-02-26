// Type definitions for environment variables
interface ImportMetaEnv {
  VITE_WIRE_ENDPOINT: string;
  VITE_PINATA_JWT: string;
  VITE_PERSONA_WASM: string;
  VITE_PERSONA_ABI: string;
  VITE_PINATA_GATEWAY: string;
  VITE_VENICE_API_KEY: string;
  VITE_VENICE_API_ENDPOINT: string;
  VITE_WIRE_TESTNET_ENDPOINT: string;
  VITE_WIRE_TESTNET_SYSIO_PRIVATE_KEY: string;
  VITE_WIRE_TESTNET_NODEDADDY_PRIVATE_KEY: string;
  VITE_WIRE_TESTNET_ALLPERSONAS_PRIVATE_KEY: string;
}

const config = {
    wire: {
    endpoint: import.meta.env.VITE_WIRE_TESTNET_ENDPOINT,
    sysioPrivateKey: import.meta.env.VITE_WIRE_TESTNET_SYSIO_PRIVATE_KEY,
    nodedaddyPrivateKey: import.meta.env.VITE_WIRE_TESTNET_NODEDADDY_PRIVATE_KEY,
    allpersonasPrivateKey: import.meta.env.VITE_WIRE_TESTNET_ALLPERSONAS_PRIVATE_KEY,
    },
    persona: {
    wasm: import.meta.env.VITE_PERSONA_WASM,
    abi: import.meta.env.VITE_PERSONA_ABI,
  },
  pinata: {
    jwt: import.meta.env.VITE_PINATA_JWT,
    gateway: import.meta.env.VITE_PINATA_GATEWAY,
    },
    venice: {
        apiKey: import.meta.env.VITE_VENICE_API_KEY,
        endpoint: import.meta.env.VITE_VENICE_API_ENDPOINT
    }
} as const;

// Validate required environment variables
const requiredEnvVars = [
  'VITE_WIRE_ENDPOINT',
  'VITE_WIRE_TESTNET_SYSIO_PRIVATE_KEY',
  'VITE_WIRE_TESTNET_NODEDADDY_PRIVATE_KEY',
  'VITE_PINATA_JWT',
  'VITE_PERSONA_WASM',
  'VITE_PERSONA_ABI'
] as const;

for (const envVar of requiredEnvVars) {
  if (!import.meta.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
  }
}

export default config;
