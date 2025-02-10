
const requireEnvVar = (name: string): string => {
    const value = import.meta.env[name];
    if (!value) {
        throw new Error(`Missing environment variable: ${name}`);
    }
    return value;
};

export const config = {
    wire: {
        endpoint: import.meta.env.VITE_WIRE_ENDPOINT || 'http://192.168.50.17:8888',
        contract: import.meta.env.VITE_WIRE_CONTRACT || 'immutablenpc',
        // Demo key - in production, this should be managed through a wallet
        demoPrivateKey: import.meta.env.VITE_WIRE_DEMO_PRIVATE_KEY,
    },
    ipfs: {
        endpoint: import.meta.env.IPFS_ENDPOINT || 'http://localhost:5001/api/v0',
    }
} as const;

export default config;
