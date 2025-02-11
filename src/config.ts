
const requireEnvVar = (name: string): string => {
    const value = import.meta.env[name];
    if (!value) {
        throw new Error(`Missing environment variable: ${name}`);
    }
    return value;
};

export const config = {
    wire: {
        endpoint:'https://0509-172-109-209-165.ngrok-free.app',
        contract:'immutablenpc',
        // Demo key - in production, this should be managed through a wallet
        demoPrivateKey:'5J2NeCJ19LiTMrFSUfMX7bCd7CfZ3aEst1TD8ntdppVEwt1Vkwz'
    },
} as const;

export default config;
