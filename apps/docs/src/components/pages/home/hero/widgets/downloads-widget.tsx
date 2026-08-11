import { getRndInteger } from "@site/src/tools/math";
import { useEffect, useState } from "react";
import { CommonWidgetProps, WidgetCard } from "./card";
import clsx from "clsx";
import { generateSlug } from "random-word-slugs";
import styles from "../../../../../pages/index.module.css";

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
          progress: Math.min(100, download.progress + getRndInteger(0, index < 2 ? 16 : 8)),
        }));

        if (progressedDownloads.length < 3 && progressedDownloads.length === prev.length) {
          progressedDownloads.push(generateRandomDownload());
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
            <th className="border-none px-2 py-1 text-start inline-block w-1/2">File</th>
            <th className="border-none px-2 py-1 text-start inline-block w-1/2">Progress</th>
          </tr>
        </thead>
        <tbody>
          {downloads.map((file: Download) => {
            return (
              <tr key={file.filename}>
                <td className="border-none text-nowrap p-2">{file.filename}</td>
                <td className="border-none p-2 w-full" aria-label={`${file.progress}% complete`}>
                  <progress
                    className={styles.downloadProgress}
                    value={file.progress}
                    max={100}
                    aria-label={`${file.filename} download progress`}
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

const formats = ["mkv", "mp4"];

const generateRandomDownload = (): Download => {
  const randomMovie = generateSlug(2);
  const randomFormat = formats[getRndInteger(0, formats.length - 1)];

  return {
    filename: `${randomMovie}.${randomFormat}`,
    progress: 0,
  };
};
