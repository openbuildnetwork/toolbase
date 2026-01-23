export type ContentType = 'text' | 'code' | 'log';
export type MaskingStyle = 'partial' | 'full' | 'hash';

export interface UserHints {
  keys: string[];
  literalTexts: string[];
  regexPatterns: string[];
}

export interface RedactRequest {
  content: string;
  contentType: ContentType;
  customConfiguration: {
    style: MaskingStyle;
    userHints: UserHints;
  };
}

export interface RedactResponse {
  maskedContent: string;
  summary: {
    totalMasked: number;
    byType: Record<string, number>;
  };
  entities: {
    type: string;
    start: number;
    end: number;
  }[];
}
