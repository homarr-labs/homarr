import { translate } from "@docusaurus/Translate";
import { useEffect, useState } from "react";
import { CommonWidgetProps, WidgetCard } from "./card";
import clsx from "clsx";
import styles from "../../../../../pages/index.module.css";

const downloadQueue = ["family-photos.zip", "linux-isos.mkv", "server-backup.zip", "holiday-video.mp4"];
const downloadLabels = {
  file: translate({ id: "homepage.preview.file", message: "File" }),
  progress: translate({ id: "homepage.preview.progress", message: "Progress" }),
};

export const DownloadsWidget = ({ className }: CommonWidgetProps) => {
  const [downloads, setDownloads] = useState<Download[]>([
    { filename: "photos-backup.zip", progress: 72 },
    { filename: "media-library.mkv", progress: 38 },
  ]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setDownloads((prev: Download[]) => {
        const filteredPrev = prev.filter((download) => download.progress !== 100);

        const progressedDownloads = filteredPrev.map((download, index) => ({
          ...download,
          progress: Math.min(100, download.progress + (index < 2 ? 8 : 4)),
        }));

        if (progressedDownloads.length < 3 && progressedDownloads.length === prev.length) {
          const availableDownloads = downloadQueue.filter(
            (filename) => !progressedDownloads.some((download) => download.filename === filename),
          );
          const filename = availableDownloads[0];
          if (filename) progressedDownloads.push({ filename, progress: 0 });
        }

        return progressedDownloads;
      });
    }, 500);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return (
    <WidgetCard width={2} className={clsx("overflow-hidden !p-0", className)}>
      <table className="mb-0 w-full h-full text-xs">
        <thead className="inline-block w-full">
          <tr className="inline-block w-full">
            <th className="border-none px-2 py-1 text-start inline-block w-1/2">{downloadLabels.file}</th>
            <th className="border-none px-2 py-1 text-start inline-block w-1/2">{downloadLabels.progress}</th>
          </tr>
        </thead>
        <tbody>
          {downloads.map((file: Download) => {
            return (
              <tr key={file.filename}>
                <td className="border-none text-nowrap p-2">{file.filename}</td>
                <td
                  className="border-none p-2 w-full"
                  aria-label={translate(
                    { id: "homepage.preview.downloadComplete", message: "{progress}% complete" },
                    { progress: file.progress },
                  )}
                >
                  <progress
                    className={styles.downloadProgress}
                    value={file.progress}
                    max={100}
                    aria-label={translate(
                      { id: "homepage.preview.downloadProgress", message: "{filename} download progress" },
                      { filename: file.filename },
                    )}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </WidgetCard>
  );
};

interface Download {
  filename: string;
  progress: number;
}
