
import { useState, useCallback } from 'react';
import config from '@/config';
import { PinataService } from '@/services/pinata-service';

// Cache in memory during session
const AVATAR_CACHE = new Map<string, string>();

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
            const avatarName = `avatar-${personaName}`;
            try {
                console.log('Attempting to fetch existing avatar:', avatarName);
                const existingAvatar = await pinataService.getContent(avatarName);
                if (existingAvatar?.imageData) {
                    console.log('Found existing avatar in IPFS:', avatarName);
                    AVATAR_CACHE.set(personaName, existingAvatar.imageData);
                    return existingAvatar.imageData;
                }
            } catch (error) {
                console.log('No existing avatar found in IPFS, generating new one...');
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

            // Store in IPFS with metadata
            const avatarData = {
                imageData: imageBase64,
                metadata: {
                    version: 1,
                    personaName,
                    timestamp: new Date().toISOString()
                } as AvatarMetadata
            };

            // Upload to IPFS with the avatar name
            await pinataService.uploadJSON(avatarData, avatarName);
            console.log('Stored new avatar in IPFS:', avatarName);

            // Cache in memory
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
