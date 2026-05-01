import type { ModuleDescriptor } from "./src/contracts/common.ts";

export interface SharedKernelRepository {
  listModules(): Promise<ModuleDescriptor[]>;
}

export const createInMemorySharedKernelRepository = (
  modules: ModuleDescriptor[] = [],
): SharedKernelRepository => ({
  async listModules() {
    return modules;
  },
});
