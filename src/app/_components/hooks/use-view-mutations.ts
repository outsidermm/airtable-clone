import { useCallback, useRef } from "react";
import { api } from "~/trpc/react";
import type { ViewConfig } from "~/server/api/routers/view";
import { useBase } from "../base/base-context";

export function useViewMutations(
  activeTableId: number,
  activeViewId: number | null,
  setActiveViewId: (id: number | null) => void,
) {
  const utils = api.useUtils();
  const { refetchRows } = useBase();

  // Tracks whether the in-flight updateView mutation needs a row refetch.
  // Filter/sort changes need it; hidden-column and row-height changes do not.
  const needsRowRefetchRef = useRef(false);

  const invalidate = useCallback(() => {
    void utils.table.getById.invalidate({ id: activeTableId });
    void utils.view.getAllByTable.invalidate({ tableId: activeTableId });
  }, [utils, activeTableId]);

  const createView = api.view.create.useMutation({
    onSuccess: (newView) => {
      invalidate();
      setActiveViewId(newView.id);
    },
  });

  const renameView = api.view.rename.useMutation({ onSuccess: invalidate });

  const updateView = api.view.update.useMutation({
    onSuccess: () => {
      invalidate();
      if (activeViewId) {
        void utils.view.getById.invalidate({ id: activeViewId });
        if (needsRowRefetchRef.current) {
          refetchRows();
        }
      }
    },
  });

  const deleteView = api.view.delete.useMutation({
    onSuccess: () => {
      invalidate();
    },
  });

  const duplicateView = api.view.duplicate.useMutation({
    onSuccess: (newView) => {
      invalidate();
      setActiveViewId(newView.id);
    },
  });

  const reorderViews = api.view.reorder.useMutation({
    onSuccess: () => {
      invalidate();
    },
  });

  const handleAddView = useCallback(() => {
    createView.mutate({ tableId: activeTableId });
  }, [activeTableId, createView]);

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
  };
}
