import { z } from "zod";

export const getStatisticsSchema = z.object({
  pieStats: z.object({
    totalFiles: z.number(),
    totalTranscodeCount: z.number(),
    sizeDiff: z.number(),
    totalHealthCheckCount: z.number(),
    status: z.object({
      transcode: z.array(
        z.object({
          name: z.string(),
          value: z.number(),
        }),
      ),
      healthcheck: z.array(
        z.object({
          name: z.string(),
          value: z.number(),
        }),
      ),
    }),
    video: z.object({
      codecs: z.array(
        z.object({
          name: z.string(),
          value: z.number(),
        }),
      ),
      containers: z.array(
        z.object({
          name: z.string(),
          value: z.number(),
        }),
      ),
      resolutions: z.array(
        z.object({
          name: z.string(),
          value: z.number(),
        }),
      ),
    }),
    audio: z.object({
      codecs: z.array(
        z.object({
          name: z.string(),
          value: z.number(),
        }),
      ),
      containers: z.array(
        z.object({
          name: z.string(),
          value: z.number(),
        }),
      ),
    }),
  }),
});

export const getNodesResponseSchema = z.record(
  z.string(),
  z.object({
    _id: z.string(),
    nodeName: z.string(),
    nodePaused: z.boolean(),
    workers: z.record(
      z.string(),
      z.object({
        _id: z.string(),
        file: z.string(),
        fps: z.number(),
        percentage: z.number(),
        ETA: z.string(),
        job: z.object({
          type: z.string(),
        }),
        status: z.string(),
        lastPluginDetails: z
          .object({
            number: z.string().optional(),
          })
          .optional(),
        originalfileSizeInGbytes: z.number(),
        estSize: z.number().optional(),
        outputFileSizeInGbytes: z.number().optional(),
        workerType: z.string(),
      }),
    ),
  }),
);

export const getStatusTableSchema = z.object({
  array: z.array(
    z.object({
      _id: z.string(),
      HealthCheck: z.string(),
      TranscodeDecisionMaker: z.string(),
      file: z.string(),
      file_size: z.number(),
      container: z.string(),
      video_codec_name: z.string(),
      video_resolution: z.string(),
    }),
  ),
  totalCount: z.number(),
});
