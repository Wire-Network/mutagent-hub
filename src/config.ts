
const requireEnvVar = (name: string): string => {
    const value = import.meta.env[name];
    if (!value) {
        throw new Error(`Missing environment variable: ${name}`);
    }
    return value;
};

export const config = {
    wire: {
        endpoint: import.meta.env.VITE_WIRE_ENDPOINT || 'https://a027-172-109-209-165.ngrok-free.app',
        contract: import.meta.env.VITE_WIRE_CONTRACT || 'immutablenpc',
        // Demo key - in production, this should be managed through a wallet
        demoPrivateKey: import.meta.env.VITE_WIRE_DEMO_PRIVATE_KEY || '5JQafxYWQGypjHALsNNpcirrAYMWhxsjvU49dVYSJUC3qdZ2jq9'
    },
} as const;

export default config;
