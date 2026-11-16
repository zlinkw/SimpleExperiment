import { builtInOutputContracts, checkProjectOutputContract, type ProjectOutputContract } from "../Quality";

export interface QualityFactoryOptions {
  defaultContractId?: string;
}

export interface QualityFactory {
  checkContract(files: Record<string, string>, contract?: ProjectOutputContract, context?: { experimentId?: string; planId?: string }): ReturnType<typeof checkProjectOutputContract>;
}

class DefaultQualityFactory implements QualityFactory {
  constructor(private readonly opts: QualityFactoryOptions = {}) {}

  checkContract(files: Record<string, string>, contract?: ProjectOutputContract, context: { experimentId?: string; planId?: string } = {}): ReturnType<typeof checkProjectOutputContract> {
    const selected = contract ?? builtInOutputContracts.find((item) => item.id === this.opts.defaultContractId) ?? builtInOutputContracts[0];
    return checkProjectOutputContract(files, selected, context);
  }
}

export function createQualityFactory(opts?: QualityFactoryOptions): QualityFactory {
  return new DefaultQualityFactory(opts);
}
export { DefaultQualityFactory };
