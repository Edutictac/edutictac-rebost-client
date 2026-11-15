export declare const SELECTION_FORMAT: 'rebost-selection';
export declare const SELECTION_VERSION: 1;
export declare function newRequestId(): string;
export declare function pickerUrl(o: {base?: string; type?: string; request: string; lang?: string; collection?: string; families?: boolean}): string;
export interface SelectionMessage {format: 'rebost-selection'; version: 1; request: string; id?: string; name?: string; family?: true; familyRevision?: number; cancel?: true}
export declare function selectionMessage(o: {request?: string; id: string; name?: string; family?: {revision: number} | null}): SelectionMessage;
export declare const cancelMessage: (request?: string) => SelectionMessage;
export declare function postToParent(message: SelectionMessage, o?: {parent?: {postMessage: (m: unknown, origin: string) => void}; origin?: string}): void;
export type Selection = {cancel: true} | {id: string; family: false} | {id: string; family: true; familyRevision: number};
export declare function parseSelection(e: MessageEvent, o: {source: unknown; request: string; origin?: string}): Selection | null;
