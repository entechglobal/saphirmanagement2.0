import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";

export function keepPreviousData(previousData) {
  return previousData;
}

const serializeKey = (queryKey) => JSON.stringify(queryKey ?? []);

const keysMatch = (cacheKey, filterKey, exact = false) => {
  if (!filterKey) return true;
  const cached = JSON.parse(cacheKey);
  if (exact) return serializeKey(cached) === serializeKey(filterKey);
  if (!Array.isArray(filterKey) || !Array.isArray(cached)) {
    return serializeKey(cached) === serializeKey(filterKey);
  }
  if (filterKey.length > cached.length) return false;
  return filterKey.every(
    (part, i) => JSON.stringify(part) === JSON.stringify(cached[i])
  );
};

const QueryClientContext = createContext(null);

export class QueryClient {
  constructor(options = {}) {
    this.defaultOptions = options.defaultOptions ?? {};
    this.cache = new Map();
    this.gcTimers = new Map();
    this._onFocus = () => this._refetchOnFocus();
    if (typeof window !== "undefined") {
      window.addEventListener("focus", this._onFocus);
      document.addEventListener("visibilitychange", this._onFocus);
    }
  }

  _defaults() {
    return this.defaultOptions.queries ?? {};
  }

  _entry(queryKey) {
    const key = serializeKey(queryKey);
    let entry = this.cache.get(key);
    if (!entry) {
      entry = {
        key,
        queryKey,
        data: undefined,
        error: null,
        status: "pending",
        fetchStatus: "idle",
        updatedAt: 0,
        promise: null,
        queryFn: null,
        observers: new Set(),
        staleTime: this._defaults().staleTime ?? 0,
        retry: this._defaults().retry ?? 0,
        refetchOnWindowFocus: this._defaults().refetchOnWindowFocus !== false,
        gcTime: this._defaults().gcTime ?? 5 * 60 * 1000,
      };
      this.cache.set(key, entry);
    }
    return entry;
  }

  _notify(entry) {
    entry.observers.forEach((fn) => fn());
  }

  _isStale(entry, staleTime = entry.staleTime) {
    if (entry.status !== "success") return true;
    return Date.now() - entry.updatedAt > (staleTime ?? 0);
  }

  subscribe(queryKey, listener) {
    const entry = this._entry(queryKey);
    entry.observers.add(listener);
    const key = entry.key;
    const timer = this.gcTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.gcTimers.delete(key);
    }
    return () => {
      entry.observers.delete(listener);
      if (entry.observers.size === 0) {
        const gcTime = entry.gcTime ?? 5 * 60 * 1000;
        const t = setTimeout(() => {
          if (entry.observers.size === 0) this.cache.delete(key);
          this.gcTimers.delete(key);
        }, gcTime);
        this.gcTimers.set(key, t);
      }
    };
  }

  setQueryFn(queryKey, queryFn, options = {}) {
    const entry = this._entry(queryKey);
    if (typeof queryFn === "function") entry.queryFn = queryFn;
    if (options.staleTime != null) entry.staleTime = options.staleTime;
    if (options.retry != null) entry.retry = options.retry;
    if (options.refetchOnWindowFocus != null) {
      entry.refetchOnWindowFocus = options.refetchOnWindowFocus;
    }
    if (options.gcTime != null) entry.gcTime = options.gcTime;
    entry.queryKey = queryKey;
  }

  async _fetch(entry) {
    if (!entry.queryFn) return entry.data;
    if (entry.promise) return entry.promise;

    entry.fetchStatus = "fetching";
    this._notify(entry);

    const attempts = (entry.retry ?? 0) + 1;
    entry.promise = (async () => {
      let lastError;
      for (let i = 0; i < attempts; i += 1) {
        try {
          const data = await entry.queryFn();
          entry.data = data;
          entry.error = null;
          entry.status = "success";
          entry.updatedAt = Date.now();
          entry.fetchStatus = "idle";
          entry.promise = null;
          this._notify(entry);
          return data;
        } catch (error) {
          lastError = error;
        }
      }
      entry.error = lastError;
      entry.status = "error";
      entry.fetchStatus = "idle";
      entry.promise = null;
      this._notify(entry);
      throw lastError;
    })();

    return entry.promise;
  }

  ensureQuery(queryKey, queryFn, options = {}) {
    this.setQueryFn(queryKey, queryFn, options);
    const entry = this._entry(queryKey);
    const staleTime = options.staleTime ?? entry.staleTime;
    if (entry.fetchStatus === "fetching") return entry.promise;
    if (!this._isStale(entry, staleTime)) return Promise.resolve(entry.data);
    return this._fetch(entry).catch(() => {});
  }

  refetch(queryKey) {
    const entry = this.cache.get(serializeKey(queryKey));
    if (!entry?.queryFn) return Promise.resolve();
    return this._fetch(entry).catch(() => {});
  }

  getResult(queryKey) {
    const entry = this.cache.get(serializeKey(queryKey));
    if (!entry) {
      return {
        data: undefined,
        error: null,
        status: "pending",
        fetchStatus: "idle",
        isPending: true,
        isLoading: false,
        isFetching: false,
        isError: false,
        isSuccess: false,
        isFetched: false,
      };
    }
    const isPending = entry.status === "pending";
    const isFetching = entry.fetchStatus === "fetching";
    return {
      data: entry.data,
      error: entry.error,
      status: entry.status,
      fetchStatus: entry.fetchStatus,
      isPending,
      isLoading: isPending && isFetching,
      isFetching,
      isError: entry.status === "error",
      isSuccess: entry.status === "success",
      isFetched: entry.status === "success" || entry.status === "error",
    };
  }

  _forMatching(filter, fn) {
    const queryKey = filter?.queryKey;
    const exact = filter?.exact === true;
    for (const entry of this.cache.values()) {
      if (keysMatch(entry.key, queryKey, exact)) fn(entry);
    }
  }

  invalidateQueries(filter = {}) {
    const tasks = [];
    this._forMatching(filter, (entry) => {
      entry.updatedAt = 0;
      if (entry.observers.size > 0 && entry.queryFn) {
        tasks.push(this._fetch(entry).catch(() => {}));
      }
    });
    return Promise.all(tasks);
  }

  refetchQueries(filter = {}) {
    const onlyActive = filter.type === "active";
    const tasks = [];
    this._forMatching(filter, (entry) => {
      if (onlyActive && entry.observers.size === 0) return;
      if (entry.queryFn) tasks.push(this._fetch(entry).catch(() => {}));
    });
    return Promise.all(tasks);
  }

  removeQueries(filter = {}) {
    const toDelete = [];
    this._forMatching(filter, (entry) => {
      entry.data = undefined;
      entry.error = null;
      entry.status = "pending";
      entry.updatedAt = 0;
      this._notify(entry);
      toDelete.push(entry.key);
    });
    toDelete.forEach((key) => this.cache.delete(key));
  }

  clear() {
    for (const entry of this.cache.values()) {
      entry.data = undefined;
      entry.error = null;
      entry.status = "pending";
      entry.updatedAt = 0;
      this._notify(entry);
    }
    this.cache.clear();
    this.gcTimers.forEach((t) => clearTimeout(t));
    this.gcTimers.clear();
  }

  setQueryData(queryKey, updater) {
    const entry = this._entry(queryKey);
    entry.data = typeof updater === "function" ? updater(entry.data) : updater;
    entry.error = null;
    entry.status = "success";
    entry.updatedAt = Date.now();
    this._notify(entry);
    return entry.data;
  }

  getQueryData(queryKey) {
    return this.cache.get(serializeKey(queryKey))?.data;
  }

  _refetchOnFocus() {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      return;
    }
    for (const entry of this.cache.values()) {
      if (entry.observers.size === 0) continue;
      if (entry.refetchOnWindowFocus === false) continue;
      if (!entry.queryFn) continue;
      if (this._isStale(entry)) this._fetch(entry).catch(() => {});
    }
  }
}

export function QueryClientProvider({ client, children }) {
  return createElement(QueryClientContext.Provider, { value: client }, children);
}

export function useQueryClient() {
  const client = useContext(QueryClientContext);
  if (!client) {
    throw new Error("useQueryClient must be used within QueryClientProvider");
  }
  return client;
}

export function useQuery(options) {
  const {
    queryKey,
    queryFn,
    enabled = true,
    staleTime,
    gcTime,
    retry,
    refetchInterval,
    refetchOnWindowFocus,
    keepPreviousData: keepPrevOpt,
    placeholderData,
  } = options;

  const client = useQueryClient();
  const defaults = client.defaultOptions.queries ?? {};
  const resolvedStale = staleTime ?? defaults.staleTime;
  const resolvedRetry = retry ?? defaults.retry;
  const resolvedFocus =
    refetchOnWindowFocus ?? defaults.refetchOnWindowFocus ?? true;
  const resolvedGc = gcTime ?? defaults.gcTime;
  const [, bump] = useReducer((n) => n + 1, 0);
  const previousDataRef = useRef(undefined);
  const keyStr = serializeKey(queryKey);

  useEffect(() => client.subscribe(queryKey, bump), [client, keyStr]);

  useEffect(() => {
    client.setQueryFn(queryKey, queryFn, {
      staleTime: resolvedStale,
      retry: resolvedRetry,
      refetchOnWindowFocus: resolvedFocus,
      gcTime: resolvedGc,
    });
  });

  useEffect(() => {
    if (enabled === false) return undefined;
    client.ensureQuery(queryKey, queryFn, {
      staleTime: resolvedStale,
      retry: resolvedRetry,
      refetchOnWindowFocus: resolvedFocus,
      gcTime: resolvedGc,
    });
    return undefined;
  }, [client, keyStr, enabled]);

  useEffect(() => {
    if (!refetchInterval || enabled === false) return undefined;
    const id = setInterval(() => client.refetch(queryKey), refetchInterval);
    return () => clearInterval(id);
  }, [client, keyStr, refetchInterval, enabled]);

  const result = client.getResult(queryKey);
  const keepPrev =
    keepPrevOpt === true ||
    placeholderData === keepPreviousData ||
    typeof placeholderData === "function";

  if (result.data !== undefined) previousDataRef.current = result.data;

  let data = result.data;
  if (data === undefined && keepPrev && previousDataRef.current !== undefined) {
    data = previousDataRef.current;
  } else if (data === undefined && typeof placeholderData === "function") {
    data = placeholderData(previousDataRef.current);
  } else if (data === undefined && placeholderData != null && placeholderData !== keepPreviousData) {
    data = placeholderData;
  }

  const isFetching =
    enabled !== false &&
    (result.isFetching ||
      (result.data === undefined && result.status === "pending"));
  const isPending = enabled !== false && result.data === undefined && data === undefined;
  const isLoading = isPending && isFetching;

  const refetch = useCallback(() => client.refetch(queryKey), [client, keyStr]);

  return {
    ...result,
    data,
    isPending,
    isLoading,
    isFetching,
    isSuccess: data !== undefined && result.status === "success",
    refetch,
  };
}

export function useQueries({ queries }) {
  const client = useQueryClient();
  const [, bump] = useReducer((n) => n + 1, 0);
  const keySig = queries.map((q) => serializeKey(q.queryKey)).join("|");
  const queriesRef = useRef(queries);
  queriesRef.current = queries;

  useEffect(() => {
    const unsubs = queriesRef.current.map((q) => client.subscribe(q.queryKey, bump));
    queriesRef.current.forEach((q) => {
      client.setQueryFn(q.queryKey, q.queryFn, q);
      if (q.enabled !== false) client.ensureQuery(q.queryKey, q.queryFn, q);
    });
    return () => unsubs.forEach((unsub) => unsub());
  }, [client, keySig]);

  return queries.map((q) => {
    const result = client.getResult(q.queryKey);
    if (q.enabled === false) {
      return { ...result, isLoading: false, isFetching: false, isPending: false };
    }
    return result;
  });
}

export function useMutation(options) {
  const {
    mutationFn,
    onSuccess,
    onError,
    onMutate,
    onSettled,
  } = options;

  const fnRef = useRef(mutationFn);
  const cbsRef = useRef({ onSuccess, onError, onMutate, onSettled });
  fnRef.current = mutationFn;
  cbsRef.current = { onSuccess, onError, onMutate, onSettled };

  const [state, setState] = useState({
    status: "idle",
    data: undefined,
    error: null,
  });

  const mutateAsync = useCallback(async (variables, perCall = {}) => {
    setState({ status: "pending", data: undefined, error: null });
    try {
      await cbsRef.current.onMutate?.(variables);
      const data = await fnRef.current(variables);
      setState({ status: "success", data, error: null });
      await cbsRef.current.onSuccess?.(data, variables);
      await perCall.onSuccess?.(data, variables);
      await cbsRef.current.onSettled?.(data, null, variables);
      await perCall.onSettled?.(data, null, variables);
      return data;
    } catch (error) {
      setState({ status: "error", data: undefined, error });
      await cbsRef.current.onError?.(error, variables);
      await perCall.onError?.(error, variables);
      await cbsRef.current.onSettled?.(undefined, error, variables);
      await perCall.onSettled?.(undefined, error, variables);
      throw error;
    }
  }, []);

  const mutate = useCallback((variables, perCall) => {
    mutateAsync(variables, perCall).catch(() => {});
  }, [mutateAsync]);

  const reset = useCallback(() => {
    setState({ status: "idle", data: undefined, error: null });
  }, []);

  const isPending = state.status === "pending";

  return {
    mutate,
    mutateAsync,
    reset,
    data: state.data,
    error: state.error,
    status: state.status,
    isPending,
    isLoading: isPending,
    isError: state.status === "error",
    isSuccess: state.status === "success",
    isIdle: state.status === "idle",
  };
}
