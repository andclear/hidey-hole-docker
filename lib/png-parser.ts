
import { Buffer } from 'buffer';

export interface CharacterCardV3 {
  spec: 'chara_card_v3';
  spec_version: string;
  data: CharacterCardData;
}

export interface CharacterCardV2 {
  spec: 'chara_card_v2';
  spec_version: string;
  data: CharacterCardData;
}

export interface CharacterCardData {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  creator_notes: string;
  system_prompt: string;
  post_history_instructions: string;
  alternate_greetings: string[];
  character_book?: CharacterBook;
  tags: string[];
  creator: string;
  character_version: string;
  extensions: Record<string, any>;
}

export interface CharacterBook {
  name?: string;
  description?: string;
  scan_depth?: number;
  token_budget?: number;
  recursive_scanning?: boolean;
  extensions: Record<string, any>;
  entries: CharacterBookEntry[];
}

export interface CharacterBookEntry {
  id: number;
  keys: string[];
  secondary_keys?: string[];
  comment?: string;
  content: string;
  constant?: boolean;
  selective?: boolean;
  insertion_order?: number;
  enabled?: boolean;
  position?: 'before_char' | 'after_char';
  use_regex?: boolean;
  extensions?: Record<string, any>;
}

export type CharacterCard = CharacterCardV2 | CharacterCardV3;

export function extractPngTextChunk(arrayBuffer: ArrayBuffer): string | null {
  const dataView = new DataView(arrayBuffer);
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  
  // Check PNG signature
  for (let i = 0; i < 8; i++) {
    if (dataView.getUint8(i) !== signature[i]) {
      throw new Error('Invalid PNG signature');
    }
  }

  let offset = 8;
  const decoder = new TextDecoder('utf-8');

  let ccv3Data: string | null = null;
  let charaData: string | null = null;

  while (offset < arrayBuffer.byteLength) {
    const length = dataView.getUint32(offset);
    const type = decoder.decode(arrayBuffer.slice(offset + 4, offset + 8));
    
    if (type === 'tEXt') {
      const chunkData = new Uint8Array(arrayBuffer.slice(offset + 8, offset + 8 + length));
      // Decode with replacement to avoid fatal errors on binary data in text chunks
      const textDecoder = new TextDecoder('utf-8', { fatal: false });
      const text = textDecoder.decode(chunkData);
      
      const nullSeparatorIndex = text.indexOf('\0');
      if (nullSeparatorIndex !== -1) {
        const keyword = text.substring(0, nullSeparatorIndex);
        const value = text.substring(nullSeparatorIndex + 1);
        
        if (keyword === 'ccv3') {
          ccv3Data = value;
        } else if (keyword === 'chara') {
          charaData = value;
        }
      }
    }

    // Move to next chunk (length + type + data + crc)
    offset += 4 + 4 + length + 4;
  }

  // Prefer V3 data
  return ccv3Data || charaData;
}

export function parseCharacterCard(fileContent: ArrayBuffer, fileType: string): CharacterCard | null {
  try {
    let jsonString = '';

    if (fileType === 'image/png') {
      const textChunk = extractPngTextChunk(fileContent);
      if (!textChunk) {
        console.error('No character data found in PNG');
        return null;
      }
      // Try base64 decode first; if it fails, assume plain JSON string
      try {
        jsonString = Buffer.from(textChunk, 'base64').toString('utf-8');
        // Quick sanity check
        const probe = JSON.parse(jsonString);
        if (!probe) throw new Error('Invalid JSON after base64');
      } catch {
        jsonString = textChunk;
      }
    } else if (fileType === 'application/json') {
      const decoder = new TextDecoder('utf-8');
      jsonString = decoder.decode(fileContent);
    } else {
      throw new Error('Unsupported file type');
    }

    const jsonData = JSON.parse(jsonString);
    
    // Basic validation for V2/V3 format
    if (jsonData.spec === 'chara_card_v2' || jsonData.spec === 'chara_card_v3') {
      return jsonData as CharacterCard;
    }
    
    // Fallback: SillyTavern-style plain data without spec
    // If it looks like CharacterCardData, wrap into V3
    const maybeData = jsonData.data ? jsonData.data : jsonData;
    if (maybeData && typeof maybeData === 'object') {
      const normalized: CharacterCardData = {
        name: maybeData.name ?? 'Untitled',
        description: maybeData.description ?? '',
        personality: maybeData.personality ?? '',
        scenario: maybeData.scenario ?? '',
        first_mes: maybeData.first_mes ?? maybeData.first_message ?? '',
        mes_example: maybeData.mes_example ?? '',
        creator_notes: maybeData.creator_notes ?? '',
        system_prompt: maybeData.system_prompt ?? '',
        post_history_instructions: maybeData.post_history_instructions ?? '',
        alternate_greetings: Array.isArray(maybeData.alternate_greetings) ? maybeData.alternate_greetings : [],
        character_book: maybeData.character_book,
        tags: Array.isArray(maybeData.tags) ? maybeData.tags : [],
        creator: maybeData.creator ?? '',
        character_version: maybeData.character_version ?? '',
        extensions: maybeData.extensions ?? {},
      };
      const wrapped: CharacterCardV3 = {
        spec: 'chara_card_v3',
        spec_version: '1.0',
        data: normalized,
      };
      return wrapped;
    }

    console.warn('Unsupported card spec or structure:', jsonData);
    return null;

  } catch (error) {
    console.error('Failed to parse character card:', error);
    return null;
  }
}
