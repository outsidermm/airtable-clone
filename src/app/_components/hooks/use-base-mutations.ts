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
    onError: () => toast.error("Couldn't rename the base. Please try again."),
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
    onError: () => toast.error("Couldn't delete the base. Please try again."),
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
    onError: () => toast.error("Couldn't create the base. Please try again."),
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
