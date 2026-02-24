import { useCallback, useRef, useEffect } from "react";
import { api } from "~/trpc/react";
import type { ViewConfig } from "~/server/api/routers/view";
import { useBase } from "../base/base-context";
import { useToast } from "~/app/_components/ui/toast";

export function useViewMutations(
  activeTableId: number,
  activeViewId: number | null,
  setActiveViewId: (id: number | null) => void,
) {
  const utils = api.useUtils();
  const toast = useToast();
  const { refetchRows } = useBase();

  // Tracks whether the in-flight updateView mutation needs a row refetch.
  // Filter/sort changes need it; hidden-column and row-height changes do not.
  const needsRowRefetchRef = useRef(false);

  // Keep a stable ref to activeTableId to avoid stale closures in mutations
  const activeTableIdRef = useRef(activeTableId);
  useEffect(() => {
    activeTableIdRef.current = activeTableId;
  }, [activeTableId]);

  const invalidate = useCallback(() => {
    void utils.table.getById.invalidate({ id: activeTableIdRef.current });
    void utils.view.getAllByTable.invalidate({
      tableId: activeTableIdRef.current,
    });
  }, [utils]);

  const createView = api.view.create.useMutation({
    onSuccess: (newView) => {
      invalidate();
      setActiveViewId(newView.id);
    },
    onError: () => toast.error("Couldn't create the view. Please try again."),
  });

  const renameView = api.view.rename.useMutation({
    onMutate: async ({ id, name }) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await utils.table.getById.cancel({ id: activeTableIdRef.current });

      // Snapshot the previous value
      const previousTable = utils.table.getById.getData({
        id: activeTableIdRef.current,
      });

      // Optimistically update the cache to the new view name
      if (previousTable) {
        utils.table.getById.setData(
          { id: activeTableIdRef.current },
          {
            ...previousTable,
            views: previousTable.views.map((v) =>
              v.id === id ? { ...v, name } : v,
            ),
          },
        );
      }

      return { previousTable };
    },
    onError: (_err, _vars, context) => {
      // Rollback to the previous value if the mutation fails
      if (context?.previousTable) {
        utils.table.getById.setData(
          { id: activeTableIdRef.current },
          context.previousTable,
        );
      }
      toast.error("Couldn't rename the view. Please try again.");
    },
    onSettled: () => {
      invalidate();
    },
  });

  const updateView = api.view.update.useMutation({
    onMutate: async (variables) => {
      // 1. Cancel any outgoing refetches so they don't overwrite our optimistic update
      await utils.table.getById.cancel({ id: activeTableIdRef.current });
      await utils.view.getById.cancel({ id: variables.id });

      // 2. Snapshot the previous values
      const previousTable = utils.table.getById.getData({
        id: activeTableIdRef.current,
      });
      const previousView = utils.view.getById.getData({
        id: variables.id,
      });

      // 3. Optimistically update the table cache (for the sidebar/menus)
      if (previousTable) {
        utils.table.getById.setData(
          { id: activeTableIdRef.current },
          {
            ...previousTable,
            views: previousTable.views.map((v) =>
              v.id === variables.id
                ? { ...v, config: variables.config as ViewConfig }
                : v,
            ),
          },
        );
      }

      // 4. Optimistically update the view cache (THIS drives the Grid UI in BaseContent)
      if (previousView) {
        utils.view.getById.setData(
          { id: variables.id },
          {
            ...previousView,
            config: variables.config as ViewConfig,
          },
        );
      }

      return { previousTable, previousView };
    },
    onError: (_err, variables, context) => {
      // Rollback to the previous values if the mutation fails
      if (context?.previousTable) {
        utils.table.getById.setData(
          { id: activeTableIdRef.current },
          context.previousTable,
        );
      }
      if (context?.previousView) {
        utils.view.getById.setData({ id: variables.id }, context.previousView);
      }
      toast.error("Couldn't save view settings. Please try again.");
    },
    onSuccess: (_data, variables) => {
      // avoiding any stale activeViewId closure issues from the initial load.
      void utils.view.getById.invalidate({ id: variables.id });

      if (needsRowRefetchRef.current) {
        refetchRows();
      }
    },
    onSettled: () => {
      invalidate();
    },
  });

  const deleteView = api.view.delete.useMutation({
    onSuccess: () => {
      invalidate();
      toast.success("View deleted");
    },
    onError: () => toast.error("Couldn't delete the view. Please try again."),
  });

  const duplicateView = api.view.duplicate.useMutation({
    onSuccess: (newView) => {
      invalidate();
      setActiveViewId(newView.id);
      toast.success("View duplicated");
    },
    onError: () => toast.error("Couldn't duplicate the view. Please try again."),
  });

  const reorderViews = api.view.reorder.useMutation({
    onSuccess: () => {
      invalidate();
    },
  });

  const handleAddView = useCallback(
    (name?: string) => {
      createView.mutate({ tableId: activeTableId, name });
    },
    [activeTableId, createView],
  );

  const handleRenameView = useCallback(
    (viewId: number, name: string) => {
      renameView.mutate({ id: viewId, name });
    },
    [renameView],
  );

  // opts.refetchRows = true for filter/sort changes; omit for hidden-column/row-height changes
  const handleUpdateView = useCallback(
    (viewId: number, config: ViewConfig, opts?: { refetchRows?: boolean }) => {
      needsRowRefetchRef.current = opts?.refetchRows ?? false;
      updateView.mutate({ id: viewId, config });
    },
    [updateView],
  );

  const handleDeleteView = useCallback(
    (viewId: number) => {
      deleteView.mutate(
        { id: viewId },
        {
          onSuccess: () => {
            if (viewId === activeViewId) {
              setActiveViewId(null);
            }
          },
        },
      );
    },
    [activeViewId, deleteView, setActiveViewId],
  );

  const handleDuplicateView = useCallback(
    (viewId: number) => {
      duplicateView.mutate({ id: viewId });
    },
    [duplicateView],
  );

  const handleReorderViews = useCallback(
    (viewIds: number[]) => {
      reorderViews.mutate({ tableId: activeTableId, viewIds });
    },
    [activeTableId, reorderViews],
  );

  return {
    handleAddView,
    handleRenameView,
    handleUpdateView,
    handleDeleteView,
    handleDuplicateView,
    handleReorderViews,
    isUpdatingView: updateView.isPending,
  };
}
