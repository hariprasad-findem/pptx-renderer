import { RECOMMENDED_ZIP_LIMITS } from '../../src/index.ts';

export const TRUSTED_TESTDATA_ZIP_LIMITS = Object.freeze({
  ...RECOMMENDED_ZIP_LIMITS,
  maxEntryUncompressedBytes: 96 * 1024 * 1024,
  maxTotalUncompressedBytes: 512 * 1024 * 1024,
  maxMediaBytes: 384 * 1024 * 1024,
});
