// Minimal type shim for archiver 8.x.
//
// archiver 8 is pure ESM and replaced the v7 factory export with named
// classes (`ZipArchive`, `TarArchive`, `JsonArchive`, base `Archiver`).
// DefinitelyTyped only ships `@types/archiver` up to v7, and archiver 8
// bundles no types of its own — hence this local declaration.
// Remove once `@types/archiver@8` is published.
declare module 'archiver' {
  import { Readable } from 'node:stream';

  interface ArchiverOptions {
    zlib?: { level?: number };
    [key: string]: unknown;
  }

  class Archiver extends Readable {
    /** Total number of bytes written to the archive. */
    pointer(): number;
    /** Append a directory's contents; `destpath` of `false` keeps paths relative. */
    directory(dirpath: string, destpath: string | false): this;
    /** Finalize the archive — no more entries may be appended afterwards. */
    finalize(): Promise<void>;
  }

  class ZipArchive extends Archiver {
    constructor(options?: ArchiverOptions);
  }
  class TarArchive extends Archiver {
    constructor(options?: ArchiverOptions);
  }
  class JsonArchive extends Archiver {
    constructor(options?: ArchiverOptions);
  }

  export { Archiver, ZipArchive, TarArchive, JsonArchive, ArchiverOptions };
}
