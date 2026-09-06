import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  commandsApi,
  livreurApi,
  commandClientsApi,
  commercialsApi,
  advancedBonLivraisonsApi,
  agencesApi,
  depotsApi,
  preparateursApi,
  updateCommandStatus,
  citiesApi,
} from "../api/commands.api";
import { openPdfPreview } from "../../../../shared/utils/pdfPreviewStore";

/* =========================================================
   QUERY KEYS (CENTRALIZED)
========================================================= */
export const commandKeys = {
  all: ["commands"],
  list: (filters) => ["commands", filters],
  one: (id) => ["command", id],
  details: (id) => ["command-details", id],
};

export const livreurKeys = { all: ["livreurs"] };
export const commandClientKeys = {
  all: (k, s, limit) => ["command-clients", k, s, limit],
};
export const agenciesKeys = { all: ["agencies"] };
export const commercialsKeys = { all: ["commercials"] };
export const advBlKeys = { all: ["advanced-bon-livraisons"] };
export const workflowCountsKey = ["advanced-bon-livraisons", "workflow-counts"];
export const workflowCountsKeys = {
  all: ["advanced-bon-livraisons", "workflow-counts"],
  filtered: (filters) => ["advanced-bon-livraisons", "workflow-counts", filters],
};
export const blsByStatusKeys = {
  list: (filters) => ["bls-by-status", filters],
};
export const commercialStatsKeys = {
  all: ["commercial-stats"],
  filtered: (filters) => ["commercial-stats", filters],
};
export const topCommercialsKeys = {
  all: ["top-commercials"],
  filtered: (filters) => ["top-commercials", filters],
};
export const advBlPickerKeys = {
  products: (depotId, search, priceField, page) => [
    "adv-bl-picker-products",
    depotId,
    search,
    priceField,
    page,
  ],
  packs: (page) => ["adv-bl-picker-packs", page],
};

export const advBlLivreurKeys = {
  list: (type, page) => ["adv-bl-livreurs", type, page],
};

/* =========================================================
   COMMANDS
========================================================= */
export const useCommands = (filters = {}) => {
  const {
    pageIndex = 0,
    pageSize = 10,
    search = "",
    livreurId,
    commercialId,
    agenceId,
    commandStatus,
  } = filters;

  const queryFilters = {
    pageIndex,
    pageSize,
    search,
    livreurId,
    commercialId,
    agenceId,
    commandStatus,
  };

  return useQuery({
    queryKey: commandKeys.list(queryFilters),
    queryFn: () =>
      commandsApi.getAll({
        page: pageIndex + 1,
        limit: pageSize,
        search,
        livreurId,
        commercialId,
        agenceId,
        commandStatus,
      }),
    keepPreviousData: true,
  });
};

export const useCommandById = (id, options = {}) =>
  useQuery({
    queryKey: commandKeys.one(id),
    queryFn: () => commandsApi.getById(id),
    enabled: !!id,
    ...options,
  });

export const useCreateCommand = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: commandsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commandKeys.all });
      qc.invalidateQueries({ queryKey: workflowCountsKey });
    },
  });
};

export const useUpdateCommand = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => commandsApi.update(id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: commandKeys.all });
      qc.invalidateQueries({ queryKey: commandKeys.one(id) });
      qc.invalidateQueries({ queryKey: commandKeys.details(id) });
      qc.invalidateQueries({ queryKey: ["my-caisse"] });
      qc.invalidateQueries({ queryKey: ["dashboard-wallets"] });
    },
  });
};

export const useDeleteCommand = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: commandsApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commandKeys.all });
      qc.invalidateQueries({ queryKey: workflowCountsKey });
    },
  });
};

/* =========================================================
   STATUS
========================================================= */
export const useUpdateCommandStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ commandId, targetStatus }) =>
      updateCommandStatus(commandId, targetStatus),
    onSuccess: (_, { commandId }) => {
      qc.invalidateQueries({ queryKey: commandKeys.all });
      qc.invalidateQueries({ queryKey: commandKeys.one(commandId) });
      qc.invalidateQueries({ queryKey: commandKeys.details(commandId) });
      qc.invalidateQueries({ queryKey: workflowCountsKey });
      qc.invalidateQueries({ queryKey: ["planning-livraison"] });
      qc.invalidateQueries({ queryKey: ["my-caisse"] });
      qc.invalidateQueries({ queryKey: ["dashboard-wallets"] });
    },
  });
};

/* =========================================================
   REPORT / RESUME
========================================================= */

// POST /advanced-bon-livraisons/:id/report  → { reason, nextDeliveryDate }
export const useReportCommand = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason, nextDeliveryDate }) =>
      commandsApi.report(id, { reason, nextDeliveryDate }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: commandKeys.all });
      qc.invalidateQueries({ queryKey: commandKeys.one(id) });
      qc.invalidateQueries({ queryKey: commandKeys.details(id) });
    },
  });
};

// POST /advanced-bon-livraisons/:id/resume
export const useResumeCommand = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => commandsApi.resume(id),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: commandKeys.all });
      qc.invalidateQueries({ queryKey: commandKeys.one(id) });
      qc.invalidateQueries({ queryKey: commandKeys.details(id) });
    },
  });
};

/* =========================================================
   PRINT
========================================================= */
export const usePrintCommand = () =>
  useMutation({
    mutationFn: ({ id, view = false }) => commandsApi.printPDF(id, view),
    onSuccess: (blob, { id }) => {
      openPdfPreview({
        blob,
        filename: `command-${id}.pdf`,
        title: "Aperçu — Commande",
      });
    },
  });

/* =========================================================
   LIVREURS / CLIENTS / AGENCIES
========================================================= */
export const useSimpleLivreurs = () =>
  useQuery({
    queryKey: livreurKeys.all,
    queryFn: () => livreurApi.getAll({ limit: 1000 }),
  });

export const useCommercials = () =>
  useQuery({
    queryKey: commercialsKeys.all,
    queryFn: () => commercialsApi.getAll({ limit: 1000 }),
  });

export const useCommandClients = ({
  keyword = "",
  societeId,
  limit = 100,
  enabled = true,
} = {}) =>
  useQuery({
    queryKey: commandClientKeys.all(keyword, societeId, limit),
    queryFn: () => commandClientsApi.getAll({ keyword, societeId, limit }),
    enabled,
  });

/* =========================================================
   ADVANCED BL
========================================================= */
export const useCreateAdvancedBonLivraison = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: advancedBonLivraisonsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: advBlKeys.all });
      qc.invalidateQueries({ queryKey: commandKeys.all });
      qc.invalidateQueries({ queryKey: workflowCountsKey });
      qc.invalidateQueries({ queryKey: commercialStatsKeys.all });
      qc.invalidateQueries({ queryKey: topCommercialsKeys.all });
      qc.invalidateQueries({ queryKey: ["command-clients"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["my-caisse"] });
      qc.invalidateQueries({ queryKey: ["dashboard-wallets"] });
    },
  });
};

export const useAgences = ({ page = 1, limit = 500 } = {}) =>
  useQuery({
    queryKey: ["agences", page, limit],
    queryFn: () => agencesApi.getAll({ page, limit }),
  });

export const useAdvDepots = ({ limit = 100 } = {}) =>
  useQuery({
    queryKey: ["adv-depots", limit],
    queryFn: () => depotsApi.getAll({ limit }),
  });

export const usePickerProducts = ({
  depotId,
  priceField,
  search,
  page = 1,
  limit = 50,
  enabled = true,
} = {}) =>
  useQuery({
    queryKey: advBlPickerKeys.products(depotId, search, priceField, page),
    queryFn: () =>
      advancedBonLivraisonsApi.getPicker({
        products: true,
        depotId,
        search,
        priceField,
        page,
        limit,
      }),
    enabled: enabled && !!depotId,
    keepPreviousData: true,
    staleTime: 30_000,
  });

export const usePickerPacks = ({ page = 1, limit = 50, enabled = true } = {}) =>
  useQuery({
    queryKey: advBlPickerKeys.packs(page),
    queryFn: () =>
      advancedBonLivraisonsApi.getPicker({ pack: true, page, limit }),
    enabled,
    keepPreviousData: true,
    staleTime: 60_000,
  });

export const useCheckPacksStockAvailability = () =>
  useMutation({
    mutationFn: ({ depotId, packIds }) =>
      advancedBonLivraisonsApi.checkPacksStockAvailability({
        depotId,
        packIds,
      }),
  });

export const usePreparateurs = ({ page = 1, limit = 50, societeId } = {}) =>
  useQuery({
    queryKey: ["preparateurs", page, limit, societeId],
    queryFn: () => preparateursApi.getAll({ page, limit, societeId }),
    enabled: !!societeId,
    placeholderData: undefined, // 🔥 important
  });
export const useLivreurs = ({
  type = "intern",
  page = 1,
  limit = 50,
  societeId,
} = {}) =>
  useQuery({
    queryKey: ["livreurs", type, page, limit, societeId], // flat key, always includes societeId
    queryFn: () =>
      advancedBonLivraisonsApi.getLivreurs({ type, page, limit, societeId }),
    enabled: !!societeId,
    placeholderData: undefined,
  });

export const useCities = () =>
  useQuery({
    queryKey: ["cities"],
    queryFn: citiesApi.getAll,
    staleTime: 1000 * 60 * 60,
    retry: 2,
  });
  
export const useSuspendCommand = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => commandsApi.suspend(id),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: commandKeys.all });
      qc.invalidateQueries({ queryKey: commandKeys.one(id) });
      qc.invalidateQueries({ queryKey: commandKeys.details(id) });
    },
  });
};

// new hook:
export const useCommandDetails = (id, options = {}) =>
  useQuery({
    queryKey: commandKeys.details(id),
    queryFn: () => commandsApi.getDetails(id),
    enabled: !!id,
    ...options,
  });

export const useWorkflowCounts = (filters = {}) => {
  const { dateFrom, dateTo } = filters;
  return useQuery({
    queryKey: workflowCountsKeys.filtered({ dateFrom, dateTo }),
    queryFn: () => commandsApi.getWorkflowCounts({ dateFrom, dateTo }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
};
export const useBLsByStatus = (filters = {}) => {
  const { status, livreurId, page = 1, limit = 20 } = filters;
  return useQuery({
    queryKey: blsByStatusKeys.list(filters),
    queryFn: () =>
      commandsApi.getBLsByStatus({ status, livreurId, page, limit }),
    enabled: !!status,
  });
};

export const useCommercialStats = (filters = {}) => {
  const { dateFrom, dateTo, commercialId } = filters;
  return useQuery({
    queryKey: commercialStatsKeys.filtered({ dateFrom, dateTo, commercialId }),
    queryFn: () =>
      commandsApi.getCommercialStats({ dateFrom, dateTo, commercialId }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
};

export const useTopCommercials = (filters = {}) => {
  const { dateFrom, dateTo, limit = 5 } = filters;
  return useQuery({
    queryKey: topCommercialsKeys.filtered({ dateFrom, dateTo, limit }),
    queryFn: () =>
      commandsApi.getTopCommercials({ dateFrom, dateTo, limit }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
};
