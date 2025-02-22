import { useState, useCallback } from 'react';
import config from '@/config';

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

export function usePersonaAvatar() {
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateAvatar = useCallback(async (personaName: string, backstory: string) => {
        // Check cache first
        if (AVATAR_CACHE.has(personaName)) {
            return AVATAR_CACHE.get(personaName);
        }

        setIsGenerating(true);
        setError(null);

        try {
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

            // Cache the result
            AVATAR_CACHE.set(personaName, imageBase64);

            return imageBase64;
        } catch (err: any) {
            console.error('Error generating avatar:', err);
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