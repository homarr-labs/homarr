export interface RepositoryIcon {
  fileNameWithExtension: string;
  sizeInBytes?: number;
  imageUrl: URL;
  local: boolean;
  checksum: string;
}
