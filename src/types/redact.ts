export type ContentType = 'text' | 'code' | 'log';
export type MaskingStyle = 'partial' | 'full' | 'hash';

export interface UserHints {
  keys: string[];
  literalTexts: string[];
  regexPatterns: string[];
}

export interface LogOptions {
  maskPaths: boolean;
  maskUUIDs: boolean;
  maskNumericIds: boolean;
}

export interface RedactRequest {
  content: string;
  contentType: ContentType;
  masking: {
    style: MaskingStyle;
    userHints: UserHints;
    logOptions: LogOptions;
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
