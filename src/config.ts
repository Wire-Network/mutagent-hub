
const requireEnvVar = (name: string): string => {
    const value = import.meta.env[name];
    if (!value) {
        throw new Error(`Missing environment variable: ${name}`);
    }
    return value;
};

export const config = {
    wire: {
        endpoint: import.meta.env.WIRE_ENDPOINT || 'http://localhost:8888',
        contract: import.meta.env.WIRE_CONTRACT || 'immutablenpc',
        // Demo key - in production, this should be managed through a wallet
        demoPrivateKey: import.meta.env.WIRE_DEMO_PRIVATE_KEY,
    },
    ipfs: {
        endpoint: import.meta.env.IPFS_ENDPOINT || 'http://localhost:5001/api/v0',
    }
} as const;

export default config;
