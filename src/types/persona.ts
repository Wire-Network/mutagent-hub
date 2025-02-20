export interface PersonaInfo {
    persona_name: string;
    initial_state_cid: string;
}

export interface PersonaData {
    name: string;
    backstory: string;
    traits: string[];
    imageUrl?: string;
}

export interface RawPersona {
    persona_name: string;
    // Add any other fields that come from the blockchain
}