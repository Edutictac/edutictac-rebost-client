export declare const SELECTION_FORMAT: 'rebost-selection';
export declare const SELECTION_VERSION: 1;
export declare function newRequestId(): string;
export declare function pickerUrl(o: {base?: string; type?: string; request: string; lang?: string}): string;
export type Selection = {cancel: true} | {id: string; family: false} | {id: string; family: true; familyRevision: number};
export declare function parseSelection(e: MessageEvent, o: {source: unknown; request: string; origin?: string}): Selection | null;
