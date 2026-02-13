import { useCallback } from "react";
import { api } from "~/trpc/react";
import type { ViewConfig } from "~/server/api/routers/view";

export function useViewMutations(
  activeTableId: number,
  activeViewId: number | null,
  setActiveViewId: (id: number | null) => void,
) {
  const utils = api.useUtils();

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
        void utils.view.getData.invalidate();
      }
    },
  });

  const deleteView = api.view.delete.useMutation({
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

  const handleUpdateView = useCallback(
    (viewId: number, config: ViewConfig) => {
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
              // Will be set by the parent on next render
              setActiveViewId(null);
            }
          },
        },
      );
    },
    [activeViewId, deleteView, setActiveViewId],
  );

  return {
    handleAddView,
    handleRenameView,
    handleUpdateView,
    handleDeleteView,
  };
}
