import { useCallback } from "react";
import { api } from "~/trpc/react";

export function useBaseMutations() {
  const utils = api.useUtils();

  const toggleStarredMutation = api.base.toggleStarred.useMutation({
    onMutate: async ({ id }) => {
      // Cancel outgoing fetches
      await utils.base.getAll.cancel();

      // Snapshot previous value
      const previousBases = utils.base.getAll.getData();

      // Optimistically update
      utils.base.getAll.setData(undefined, (old) =>
        old?.map((b) => (b.id === id ? { ...b, starred: !b.starred } : b)),
      );

      return { previousBases };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousBases) {
        utils.base.getAll.setData(undefined, context.previousBases);
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      void utils.base.getAll.invalidate();
      void utils.base.getStarred.invalidate();
    },
  });

  const handleToggleStarred = useCallback(
    (id: string) => {
      toggleStarredMutation.mutate({ id });
    },
    [toggleStarredMutation],
  );

  const renameBaseMutation = api.base.rename.useMutation({
    onSuccess: () => {
      void utils.base.getAll.invalidate();
    },
  });

  const handleRename = useCallback(
    (id: string, name: string) => {
      renameBaseMutation.mutate({ id, name });
    },
    [renameBaseMutation],
  );

  const deleteBaseMutation = api.base.delete.useMutation({
    onSuccess: () => {
      void utils.base.getAll.invalidate();
    },
  });

  const handleDeleteConfirm = useCallback(
    (id: string) => {
      deleteBaseMutation.mutate({ id });
    },
    [deleteBaseMutation],
  );

  const createBaseMutation = api.base.create.useMutation({
    onSuccess: async () => {
      await utils.base.getAll.invalidate();
    },
  });
  const handleCreateBase = useCallback(async () => {
    const newBase = await createBaseMutation.mutateAsync({});
    return newBase;
  }, [createBaseMutation]);

  return {
    handleToggleStarred,
    handleRename,
    handleDeleteConfirm,
    deleteBaseMutation,
    handleCreateBase,
    createBaseMutation
  };
}
