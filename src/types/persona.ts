
export interface PersonaInfo {
    persona_name: string;
    initial_state_cid: string;
    avatar_cid?: string;
}

export interface PersonaData {
    id: string;
    name: string;
    description: string;
    backstory: string;
    traits: string[];
    imageUrl: string;
}

export interface RawPersona {
    persona_name: string;
}

export interface PersonaState {
    data: {
        text: string;
        timestamp: string;
        persona: string;
        traits: string[];
        user?: string;
        history?: boolean;
        avatar_cid?: string;
    };
    contentType: string;
}
