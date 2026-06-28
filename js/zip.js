/**
 * ZIP Handling Module using JSZip
 * Inspects, validates, extracts, and converts ZIP file entries to Base64.
 */

class ZipHandler {
  constructor() {
    this.extractedFiles = [];
    this.rawFile = null;
  }

  /**
   * Validate if selected file is a valid ZIP file
   */
  validateZipFile(file) {
    if (!file) {
      throw new Error("Silakan pilih file terlebih dahulu.");
    }

    const validTypes = ['application/zip', 'application/x-zip-compressed', 'multipart/x-zip'];
    const isZipExt = file.name.toLowerCase().endsWith('.zip');

    if (!isZipExt && !validTypes.includes(file.type)) {
      throw new Error("Format file tidak valid. Harap pilih file berformat .zip");
    }

    // Check file size (limit to reasonable browser processing size, e.g., 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error("Ukuran file terlalu besar (Maksimal 50MB untuk pemrosesan lancar di HP).");
    }

    return true;
  }

  /**
   * Parse ZIP file and build a structured list of files
   */
  async parseZip(file) {
    this.validateZipFile(file);
    this.rawFile = file;
    this.extractedFiles = [];

    if (typeof JSZip === 'undefined') {
      throw new Error("Library JSZip belum gagal dimuat dari CDN. Periksa koneksi internet Anda.");
    }

    const zip = new JSZip();
    const contents = await zip.loadAsync(file);

    const entries = Object.keys(contents.files);
    
    for (const relativePath of entries) {
      const zipEntry = contents.files[relativePath];
      
      // Skip folders or macOS hidden system folders like __MACOSX or .DS_Store
      if (zipEntry.dir || relativePath.startsWith('__MACOSX/') || relativePath.endsWith('.DS_Store')) {
        continue;
      }

      // Determine size if available, otherwise estimate or get uncompressed size
      const uncompressedSize = zipEntry._data ? (zipEntry._data.uncompressedSize || 0) : 0;

      this.extractedFiles.push({
        path: relativePath,
        entry: zipEntry,
        size: uncompressedSize
      });
    }

    if (this.extractedFiles.length === 0) {
      throw new Error("File ZIP kosong atau hanya berisi folder kosong.");
    }

    return this.extractedFiles;
  }

  /**
   * Get Base64 string of a specific file entry
   */
  async getFileBase64(entry) {
    // JSZip async('base64') returns pure base64 string without data URI scheme
    return await entry.async("base64");
  }

  /**
   * Format bytes to human readable string
   */
  formatBytes(bytes, decimals = 2) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Get total size of extracted files
   */
  getTotalSize() {
    return this.extractedFiles.reduce((acc, curr) => acc + curr.size, 0);
  }
}

window.zipHandler = new ZipHandler();
