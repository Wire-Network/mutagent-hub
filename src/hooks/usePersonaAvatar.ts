
import { useState, useCallback } from 'react';
import config from '@/config';
import { PinataService } from '@/services/pinata-service';

// Cache in memory during session
const AVATAR_CACHE = new Map<string, string>();
const AVATAR_CID_CACHE = new Map<string, string>();

interface GenerateAvatarOptions {
    model: string;
    prompt: string;
    height: number;
    width: number;
    steps: number;
    cfg_scale: number;
    style_preset: string;
}

interface AvatarMetadata {
    version: number;
    personaName: string;
    timestamp: string;
}

export function usePersonaAvatar() {
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const pinataService = PinataService.getInstance();

    const generateAvatar = useCallback(async (personaName: string, backstory: string) => {
        // Check memory cache first
        if (AVATAR_CACHE.has(personaName)) {
            return AVATAR_CACHE.get(personaName);
        }

        try {
            // Try to fetch existing avatar from IPFS first
            if (AVATAR_CID_CACHE.has(personaName)) {
                const cid = AVATAR_CID_CACHE.get(personaName)!;
                try {
                    const existingAvatar = await pinataService.getContent(cid);
                    if (existingAvatar?.imageData) {
                        console.log('Found existing avatar in IPFS with CID:', cid);
                        AVATAR_CACHE.set(personaName, existingAvatar.imageData);
                        return existingAvatar.imageData;
                    }
                } catch (error) {
                    console.log('Failed to fetch existing avatar, generating new one...');
                }
            }

            setIsGenerating(true);
            setError(null);

            // Create a prompt based on the persona's backstory
            const prompt = `Create a high-quality profile avatar for a character named ${personaName}. ${backstory}. The image should be a portrait style, focusing on the character's face and upper body, with a professional and polished look.`;

            const options: GenerateAvatarOptions = {
                model: "fluently-xl",
                prompt,
                height: 512,
                width: 512,
                steps: 30,
                cfg_scale: 7.5,
                style_preset: "3D Model"
            };

            const response = await fetch('https://api.venice.ai/api/v1/image/generate', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.venice.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(options)
            });

            if (!response.ok) {
                throw new Error(`Failed to generate avatar: ${response.statusText}`);
            }

            const data = await response.json();
            const imageBase64 = data.images[0];

            // Store in IPFS
            const avatarData = {
                imageData: imageBase64,
                metadata: {
                    version: 1,
                    personaName,
                    timestamp: new Date().toISOString()
                } as AvatarMetadata
            };

            // Upload to IPFS and get CID
            const cid = await pinataService.uploadJSON(avatarData);
            console.log('Stored new avatar in IPFS with CID:', cid);

            // Cache both the CID and the image data
            AVATAR_CID_CACHE.set(personaName, cid);
            AVATAR_CACHE.set(personaName, imageBase64);

            return imageBase64;
        } catch (err: any) {
            console.error('Error generating/storing avatar:', err);
            setError(err.message || 'Failed to generate avatar');
            return null;
        } finally {
            setIsGenerating(false);
        }
    }, []);

    return {
        generateAvatar,
        isGenerating,
        error
    };
}
