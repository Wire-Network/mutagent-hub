
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
        console.log('Starting avatar generation process for:', personaName);
        console.log('Backstory:', backstory);

        // Check memory cache first
        if (AVATAR_CACHE.has(personaName)) {
            console.log('Found avatar in memory cache for:', personaName);
            return AVATAR_CACHE.get(personaName);
        }

        try {
            // Try to fetch existing avatar from IPFS first
            if (AVATAR_CID_CACHE.has(personaName)) {
                const cid = AVATAR_CID_CACHE.get(personaName)!;
                console.log('Found CID in cache, attempting to fetch from IPFS:', cid);
                try {
                    const existingAvatar = await pinataService.getContent(cid);
                    if (existingAvatar?.imageData) {
                        console.log('Successfully retrieved avatar from IPFS with CID:', cid);
                        AVATAR_CACHE.set(personaName, existingAvatar.imageData);
                        return existingAvatar.imageData;
                    }
                } catch (error) {
                    console.log('Failed to fetch existing avatar from IPFS:', error);
                    console.log('Proceeding with new avatar generation...');
                }
            } else {
                console.log('No existing CID found for:', personaName);
            }

            setIsGenerating(true);
            setError(null);

            // Create a prompt based on the persona's backstory
            const prompt = `Create a high-quality profile avatar for a character named ${personaName}. ${backstory}. The image should be a portrait style, focusing on the character's face and upper body, with a professional and polished look.`;
            console.log('Generated prompt:', prompt);

            const options: GenerateAvatarOptions = {
                model: "fluently-xl",
                prompt,
                height: 512,
                width: 512,
                steps: 30,
                cfg_scale: 7.5,
                style_preset: "3D Model"
            };

            console.log('Making API request to Venice.ai with options:', options);
            console.log('Using API key:', config.venice.apiKey ? 'Present' : 'Missing');
            
            console.log('Venice API endpoint:', config.venice.endpoint || 'https://api.venice.ai/api/v1/image/generate');

            const response = await fetch('https://api.venice.ai/api/v1/image/generate', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.venice.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(options)
            });

            console.log('Venice API response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Venice API error response:', errorText);
                throw new Error(`Failed to generate avatar: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Venice API response data:', {
                success: !!data.images,
                imageCount: data.images?.length
            });

            const imageBase64 = data.images[0];
            if (!imageBase64) {
                throw new Error('No image data received from Venice API');
            }

            // Store in IPFS
            const avatarData = {
                imageData: imageBase64,
                metadata: {
                    version: 1,
                    personaName,
                    timestamp: new Date().toISOString()
                } as AvatarMetadata
            };

            console.log('Uploading avatar to IPFS...');
            // Upload to IPFS and get CID
            const cid = await pinataService.uploadJSON(avatarData);
            console.log('Successfully stored avatar in IPFS with CID:', cid);

            // Cache both the CID and the image data
            AVATAR_CID_CACHE.set(personaName, cid);
            AVATAR_CACHE.set(personaName, imageBase64);
            console.log('Updated both CID and image cache for:', personaName);

            return imageBase64;
        } catch (err: any) {
            const errorMessage = err.message || 'Failed to generate avatar';
            console.error('Error in avatar generation process:', {
                error: err,
                message: errorMessage,
                personaName,
                timestamp: new Date().toISOString()
            });
            setError(errorMessage);
            return null;
        } finally {
            setIsGenerating(false);
            console.log('Avatar generation process completed for:', personaName);
        }
    }, []);

    return {
        generateAvatar,
        isGenerating,
        error
    };
}
