/** Same artwork as favicon / PWA manifest (`public/icons/icon.svg`) */
export const APP_ICON_SRC = `${import.meta.env.BASE_URL}icons/icon.svg`.replace(/\/{2,}/g, "/");

export const DEFAULT_VAULT_FILE_ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.gif,.webp,.bmp,.heic,.heif,.m4a,.aac,.mp3,.wav,.webm,.ogg,.opus,.flac,application/pdf,image/*,audio/*";

/** @type {Record<string, string>} */
export const VAULT_FILE_ACCEPT_BY_KIND = {
  pdf: ".pdf,application/pdf",
  image: ".png,.jpg,.jpeg,.gif,.webp,.bmp,.heic,.heif,image/*",
  audio: ".m4a,.aac,.mp3,.wav,.webm,.ogg,.opus,.flac,audio/*",
  any: DEFAULT_VAULT_FILE_ACCEPT,
};
