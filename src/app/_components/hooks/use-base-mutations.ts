import { useCallback } from "react";
import { api } from "~/trpc/react";
import { useToast } from "~/app/_components/ui/toast";

export function useBaseMutations() {
  const utils = api.useUtils();
  const toast = useToast();

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
      toast.error("Failed to update starred status");
    },
    onSettled: (_data, _err, vars) => {
      // Refetch to ensure consistency
      void utils.base.getAll.invalidate();
      void utils.base.getStarred.invalidate();
      void utils.base.getById.invalidate({ id: vars.id });
    },
  });

  const handleToggleStarred = useCallback(
    (id: string) => {
      toggleStarredMutation.mutate({ id });
    },
    [toggleStarredMutation],
  );

  const renameBaseMutation = api.base.rename.useMutation({
    onSuccess: (_data, vars) => {
      void utils.base.getAll.invalidate();
      void utils.base.getById.invalidate({ id: vars.id });
    },
    onError: (err) => toast.error(err.message),
  });

  const handleRename = useCallback(
    (id: string, name: string) => {
      renameBaseMutation.mutate({ id, name });
    },
    [renameBaseMutation],
  );

  const deleteBaseMutation = api.base.delete.useMutation({
    onMutate: async (variables) => {
      // Cancel outgoing fetches for all bases
      await utils.base.getAll.cancel();

      // Snapshot previous bases
      const previousBases = utils.base.getAll.getData();

      // Optimistically remove the base from the list
      utils.base.getAll.setData(undefined, (old) =>
        old?.filter((base) => base.id !== variables.id),
      );

      return { previousBases };
    },
    onSuccess: () => {
      toast.success("Base deleted");
    },
    onError: (err, _vars, context) => {
      // Rollback on error
      if (context?.previousBases) {
        utils.base.getAll.setData(undefined, context.previousBases);
      }
      toast.error(err.message);
    },
    onSettled: () => {
      // Refetch to ensure consistency
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
    onSuccess: async (data) => {
      // Start fetching the new base's detail page data immediately, before router.push
      void utils.base.getById.prefetch({ id: data.id });
      await utils.base.getAll.invalidate();
    },
    onError: (err) => toast.error(err.message),
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
    createBaseMutation,
  };
}
