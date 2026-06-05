import { IconPdf, IconImage, IconMic, IconNote, IconFile } from "./icons.jsx";

const MAP = {
  pdf: IconPdf,
  image: IconImage,
  audio: IconMic,
  text: IconNote,
  note: IconNote,
  file: IconFile,
};

/** @param {{ kind?: string, size?: number, className?: string }} props */
export function FileTypeIcon({ kind = "file", size = 20, className }) {
  const Icon = MAP[kind] ?? IconFile;
  return <Icon size={size} className={className} />;
}
