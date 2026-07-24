export interface ListCacheEntry<T> {
  items: T[];
  page: number;
  totalPages: number;
  searchTerm: string;
  debouncedSearch: string;
  size: number;
}

const cache = new Map<string, ListCacheEntry<unknown>>();

export function getListCache<T>(key: string): ListCacheEntry<T> | undefined {
  return cache.get(key) as ListCacheEntry<T> | undefined;
}

export function setListCache<T>(key: string, entry: ListCacheEntry<T>): void {
  cache.set(key, entry);
}
