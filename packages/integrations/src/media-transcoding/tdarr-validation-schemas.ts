import { z } from "zod";

export const getStatisticsSchema = z.object({
  totalFileCount: z.number(),
  totalTranscodeCount: z.number(),
  totalHealthCheckCount: z.number(),
  table3Count: z.number(),
  table6Count: z.number(),
  table1Count: z.number(),
  table4Count: z.number(),
  pies: z.array(
    z.tuple([
      z.string(), // Library Name
      z.string(), // Library ID
      z.number(), // File count
      z.number(), // Number of transcodes
      z.number(), // Space saved (in GB)
      z.number(), // Number of health checks
      z.array(
        z.object({
          // Transcode Status (Pie segments)
          name: z.string(),
          value: z.number(),
        }),
      ),
      z.array(
        z.object({
          // Health Status (Pie segments)
          name: z.string(),
          value: z.number(),
        }),
      ),
      z.array(
        z.object({
          // Video files - Codecs (Pie segments)
          name: z.string(),
          value: z.number(),
        }),
      ),
      z.array(
        z.object({
          // Video files - Containers (Pie segments)
          name: z.string(),
          value: z.number(),
        }),
      ),
      z.array(
        z.object({
          // Video files - Resolutions (Pie segments)
          name: z.string(),
          value: z.number(),
        }),
      ),
      z.array(
        z.object({
          // Audio files - Codecs (Pie segments)
          name: z.string(),
          value: z.number(),
        }),
      ),
      z.array(
        z.object({
          // Audio files - Containers (Pie segments)
          name: z.string(),
          value: z.number(),
        }),
      ),
    ]),
  ),
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
