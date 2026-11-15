export type RebostType = 'sprite' | 'background' | 'object' | 'illustration' | 'sound';
export type RebostCollection = 'mine' | 'catalog' | 'scratch';
export interface RebostItem {
  id: string; name: string; names?: Record<string, string>; type: RebostType; collection?: RebostCollection;
  width: number; height: number; bytes: number; revision: number; license?: string; attribution?: string;
  credit?: string; provenance?: Record<string, string>; [k: string]: unknown;
}
export interface RebostPage { items: RebostItem[]; next_cursor: string | null }
export interface RebostCredit { id: string; revision: number; name: string; changes: string; source: string; licenseText: string; [k: string]: unknown }
export declare const ITEM_ID: RegExp;
export declare const LIMITS: Readonly<{image: number; sound: number; source: number; license: number; metadata: number}>;
export declare const IMAGE_TYPES: readonly string[];
export declare const SOUND_TYPES: readonly string[];
export declare const kindOf: (item: {type?: string} | null | undefined) => 'image' | 'sound';
export declare function sniffSound(bytes: Uint8Array): string;
export declare class RebostError extends Error { code: string; status: number; detail: string }
export declare class RebostClient {
  constructor(o?: {endpoint?: string; allowedOrigins?: string[]; fetch?: typeof fetch});
  static itemPath(id: string): string;
  me(): Promise<unknown>; catalogs(): Promise<unknown>;
  item(id: string): Promise<RebostItem>; family(id: string): Promise<unknown>;
  list(q?: {q?: string; type?: string; cursor?: string; collection?: RebostCollection; grouped?: boolean; limit?: number}): Promise<RebostPage>;
  content(id: string, limit?: number): Promise<Blob>; thumbnail(id: string): Promise<Blob>;
  contentUrl(id: string): string; thumbnailUrl(id: string): string;
  add(file: Blob, o: {name: string; type: RebostType; credit?: string; license?: string}): Promise<RebostItem>;
  update(item: RebostItem, o: {name: string; type: RebostType}): Promise<RebostItem>;
  duplicate(item: RebostItem): Promise<RebostItem>; remove(item: RebostItem): Promise<void>;
}
export declare function fetchSelection(c: RebostClient, id: string, o?: {types?: string[]; locale?: string; changes?: string; verifyPng?: boolean}):
  Promise<{item: RebostItem; name: string; blob: Blob; credit: RebostCredit | null}>;

export declare function fetchResource(c: RebostClient, id: string, o?: {kinds?: ('image' | 'sound')[]; types?: string[]; locale?: string; changes?: string; verifyPng?: boolean}):
  Promise<{kind: 'image' | 'sound'; item: RebostItem; name: string; blob: Blob; credit: RebostCredit | null}>;
