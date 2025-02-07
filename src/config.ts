const requireEnvVar = (name: string): string => {
    const value = import.meta.env[name];
    if (!value) {
        throw new Error(`Missing environment variable: ${name}`);
    }
    return value;
};

export const config = {
    wire: {
        endpoint: requireEnvVar('VITE_WIRE_ENDPOINT'),
        contract: requireEnvVar('VITE_WIRE_CONTRACT'),
        // Demo key - in production, this should be managed through a wallet
        demoPrivateKey: requireEnvVar('VITE_WIRE_DEMO_PRIVATE_KEY')
    },
    ipfs: {
        endpoint: requireEnvVar('VITE_IPFS_ENDPOINT')
    }
} as const;

export default config; 