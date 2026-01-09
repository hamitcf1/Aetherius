
import { GoogleGenAI } from "@google/genai";
import { GameStateUpdate, GeneratedCharacterData } from "../types";

const apiKey = process.env.API_KEY || '';
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

export const generateGameMasterResponse = async (
  playerInput: string,
  context: string
): Promise<GameStateUpdate> => {
  if (!ai) {
    throw new Error("API Key not found.");
  }

  try {
    const model = ai.models;
    const fullPrompt = `
      You are the Game Master (GM) and Scribe for a Skyrim roleplay campaign.
      
      CURRENT GAME STATE CONTEXT:
      ${context}

      PLAYER REQUEST/ACTION:
      ${playerInput}

      YOUR TASK:
      1. Write a narrative response (Story Chapter) describing the outcome of the action or filling in the lore details requested.
      2. Determine if the game state changes (new items found, quests started/completed, stats changed).
      
      OUTPUT FORMAT:
      Return ONLY a JSON object. Do not wrap in markdown code blocks.
      Structure:
      {
        "narrative": { "title": "Short Title", "content": "The story text..." },
        "newQuests": [ { "title": "Quest Name", "description": "...", "location": "..." } ],
        "updateQuests": [ { "title": "Existing Quest Name", "status": "completed" } ],
        "newItems": [ { "name": "Item Name", "type": "weapon/potion/etc", "description": "...", "quantity": 1 } ],
        "statUpdates": { "health": 90 }
      }
      
      If a field is not needed (e.g., no new items), omit it.
      Keep the tone immersive (Tamrielic).
    `;

    const response = await model.generateContent({
      model: 'gemini-3-flash-preview',
      contents: fullPrompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text || "{}";
    try {
        return JSON.parse(text);
    } catch (e) {
        console.error("Failed to parse JSON from AI", text);
        return { narrative: { title: "Error", content: "The Scribe muttered incoherently." } };
    }
  } catch (error) {
    console.error("Gemini API Error:", error);
    return { narrative: { title: "Connection Lost", content: "The connection to Aetherius is severed." } };
  }
};

// Adventure Chat - Text-based RPG responses
export const generateAdventureResponse = async (
  playerInput: string,
  context: string,
  systemPrompt: string
): Promise<GameStateUpdate> => {
  if (!ai) {
    throw new Error("API Key not found.");
  }

  try {
    const fullPrompt = `${systemPrompt}

  CURRENT GAME STATE:
  ${context}

  PLAYER ACTION:
  ${playerInput}

  Remember: Return ONLY valid JSON.
  The "narrative" field MUST be an object: { "title": "...", "content": "..." }.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: fullPrompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text || "{}";
    try {
      const parsed = JSON.parse(text);
      if (!parsed?.narrative) {
        return { narrative: { title: 'Adventure', content: 'The winds carry no response...' } };
      }
      if (typeof parsed.narrative === 'string') {
        return { ...parsed, narrative: { title: 'Adventure', content: parsed.narrative } };
      }
      return parsed;
    } catch (e) {
      console.error("Failed to parse adventure response:", text);
      return { narrative: { title: 'Connection Lost', content: '*The connection to Mundus wavers...* Please try again.' } };
    }
  } catch (error) {
    console.error("Adventure API Error:", error);
    return { narrative: { title: 'A Dragon Break', content: '*A dragon break disrupts the flow of time...* (API Error)' } };
  }
};

export const generateLoreImage = async (prompt: string): Promise<string | null> => {
  if (!ai) return null;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `Skyrim fantasy art style, high quality, concept art: ${prompt}` }]
      },
      config: {
        imageConfig: {
            aspectRatio: "16:9",
        }
      }
    });
    
    // Iterate through parts to find image
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error: any) {
    console.error("Image Generation Error:", error);
    // Handle quota exceeded errors gracefully
    if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED')) {
      console.warn("Image generation quota exceeded. Skipping visualization.");
    }
    return null;
  }
};

export const generateCharacterProfile = async (
    prompt: string, 
    mode: 'random' | 'chat_result' | 'text_import' = 'random'
): Promise<GeneratedCharacterData | null> => {
    if (!ai) return null;

    const baseSchema = `
    {
        "name": "String",
        "race": "String",
        "gender": "String (Male/Female)",
        "archetype": "String",
        "stats": { "health": Number, "magicka": Number, "stamina": Number },
        "skills": [ { "name": "String", "level": Number } ],
        "identity": "String (Core identity/concept)",
        "psychology": "String (Personality traits)",
        "breakingPoint": "String",
        "moralCode": "String",
        "allowedActions": "String (Roleplay rules)",
        "forbiddenActions": "String (Roleplay rules)",
        "fears": "String",
        "weaknesses": "String",
        "talents": "String",
        "magicApproach": "String",
        "factionAllegiance": "String",
        "worldview": "String",
        "daedricPerception": "String",
        "forcedBehavior": "String",
        "longTermEvolution": "String",
        "backstory": "String (Detailed)",
        "startingGold": Number,
        "inventory": [ { "name": "String", "type": "weapon/apparel/potion/ingredient/misc", "description": "String", "quantity": Number } ],
        "quests": [ { "title": "String", "description": "String", "location": "String", "dueDate": "String (Optional)" } ],
        "journalEntries": [ { "title": "String", "content": "String (Initial thoughts)" } ],
        "openingStory": { "title": "String", "content": "String (The beginning of the adventure)" }
    }
    `;

    let instructions = "";

    if (mode === 'random') {
        instructions = `Generate a completely random, detailed, unique, and lore-friendly Skyrim character in JSON format. 
           Include:
           1. Gender (Male or Female).
           2. Stats balanced to ~300 total.
           3. 6 major skills (25-40) and others lower.
           4. Context-appropriate starting inventory (weapons, armor, gold) for their class/background.
           5. 1-2 starting quests reflecting their backstory.
           6. An initial journal entry.
           7. An opening story chapter setting the scene.
           Follow this JSON structure exactly: ${baseSchema}`;
    } else if (mode === 'chat_result') {
        instructions = `Analyze the conversation transcript between Player and Scribe. Extract all character details (Name, Race, Gender, Class, Backstory, etc.). 
           Generate a full JSON profile matching these details. 
           If details are missing, extrapolate them creatively to fit the theme.
           Include:
           1. Gender (Inferred from context if not specified).
           2. Stats balanced to ~300 total.
           3. Skills reflecting the discussion.
           4. Context-appropriate starting inventory and gold.
           5. Starting quests based on the generated backstory.
           6. Initial journal entry.
           7. Opening story chapter.
           Follow this JSON structure exactly: ${baseSchema}`;
    } else if (mode === 'text_import') {
        instructions = `Analyze the provided text which represents a character sheet, description, or paste. 
           Extract all known details (Name, Race, Gender, Class, Stats, Backstory, Inventory, etc.) and map them to the JSON structure.
           For any missing fields (e.g., if the text doesn't specify exact stats numbers or skills), INFER appropriate values based on the character's description and archetype to ensure a complete and playable profile.
           Include:
           1. Gender (Inferred from pronouns or description if not explicit).
           2. Inferred Stats balanced to ~300 total.
           3. Inferred Skills based on the description.
           4. Inferred Inventory if not explicitly listed.
           5. 1-2 quests based on the backstory provided.
           6. An initial journal entry reflecting the text.
           7. An opening story chapter.
           Follow this JSON structure exactly: ${baseSchema}`;
    }

    let contents = instructions;
    if (prompt) {
         if (mode === 'chat_result') {
             contents = `${instructions}\n\n--- TRANSCRIPT START ---\n${prompt}\n--- TRANSCRIPT END ---`;
         } else if (mode === 'text_import') {
             contents = `${instructions}\n\n--- USER TEXT INPUT ---\n${prompt}\n--- INPUT END ---`;
         } else {
             contents = `${instructions}\n\nAdditional Context: ${prompt}`;
         }
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: contents,
            config: { responseMimeType: 'application/json' }
        });
        
        const text = response.text;
        if (!text) return null;
        return JSON.parse(text) as GeneratedCharacterData;
    } catch (e) {
        console.error("Character Gen Error", e);
        return null;
    }
};

export const chatWithScribe = async (history: {role: 'user' | 'model', parts: [{ text: string }]}[], message: string) => {
    if (!ai) throw new Error("No API Key");
    
    const chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        history: history,
        config: {
            systemInstruction: "You are the Character Creation Scribe for a Skyrim RPG app. Your goal is to help the user create a character by asking them questions one by one. \n\nIMPORTANT: You MUST ask for the character's NAME at some point if the user hasn't provided it.\n\nStart by asking about their preferred playstyle or race. Ask 3-4 probing questions about their morality, background, gender, or goals. Keep responses short and immersive. Once you have enough info, or if the user asks to 'finish' or 'generate', output a SPECIAL TOKEN '[[GENERATE_CHARACTER]]' at the end of your message to signal the UI to trigger generation."
        }
    });

    const result = await chat.sendMessage({ message });
    return result.text;
};

export const generateCharacterProfileImage = async (
    characterName: string,
    race: string,
    gender: string,
    archetype: string
): Promise<string | null> => {
  if (!ai) return null;
  try {
    const prompt = `A detailed character portrait of a ${gender.toLowerCase()} ${race.split(' ')[0].toLowerCase()} ${archetype.toLowerCase()} named ${characterName} from Skyrim. Fantasy art style, high quality, heroic pose, detailed armor and features, professional fantasy game character design, no text, plain background.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
            aspectRatio: "1:1",
        }
      }
    });
    
    // Iterate through parts to find image
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error: any) {
    console.error("Profile Image Generation Error:", error);
    // Handle quota exceeded errors gracefully
    if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED')) {
      console.warn("Profile image generation quota exceeded. Skipping image generation.");
    }
    return null;
  }
};
