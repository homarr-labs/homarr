import { useEffect, useRef, useState } from "react";

import { clientApi } from "@homarr/api/client";

import { readBlobAsDataUrl } from "./chat-utils";

interface UseVoiceRecordingOptions {
  integrationId: string | undefined;
  onError: (message: string) => void;
  onTranscribed: (text: string) => void;
  micErrorMessage: string;
  transcribeErrorMessage: string;
}

/**
 * Owns the microphone recording lifecycle: capturing audio, driving the live
 * waveform analyser, and transcribing the result to text. Cancel discards the
 * recording; confirm transcribes it. Streams/timers are torn down on unmount.
 */
export function useVoiceRecording({
  integrationId,
  onError,
  onTranscribed,
  micErrorMessage,
  transcribeErrorMessage,
}: UseVoiceRecordingOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingCancelledRef = useRef(false);

  const transcribe = clientApi.widget.openWebUi.transcribe.useMutation();

  // Stop the mic stream, audio context and timer. No state updates, so it is
  // safe to call during unmount as well as from teardownRecording.
  const releaseAudioResources = () => {
    if (recordingTimerRef.current !== null) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    audioStreamRef.current?.getTracks().forEach((track) => track.stop());
    audioStreamRef.current = null;
    void audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
  };

  const teardownRecording = () => {
    releaseAudioResources();
    setAnalyser(null);
    setIsRecording(false);
  };

  const finishRecording = async () => {
    const cancelled = recordingCancelledRef.current;
    const chunks = audioChunksRef.current;
    audioChunksRef.current = [];
    teardownRecording();
    if (cancelled || chunks.length === 0 || !integrationId) return;

    const blob = new Blob(chunks, { type: chunks[0]?.type ?? "audio/webm" });
    try {
      const dataUrl = await readBlobAsDataUrl(blob);
      const result = await transcribe.mutateAsync({
        integrationId,
        filename: "recording.webm",
        contentBase64: dataUrl.split(",")[1] ?? "",
        contentType: blob.type || "audio/webm",
      });
      const text = result.text.trim();
      if (text) onTranscribed(text);
    } catch {
      onError(transcribeErrorMessage);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      // Live audio analyser drives the waveform animation.
      const audioContext = new AudioContext();
      const sourceNode = audioContext.createMediaStreamSource(stream);
      const analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 256;
      sourceNode.connect(analyserNode);
      audioContextRef.current = audioContext;
      setAnalyser(analyserNode);

      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recordingCancelledRef.current = false;
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      });
      recorder.addEventListener("stop", () => void finishRecording());
      mediaRecorderRef.current = recorder;
      recorder.start();

      setRecordingSeconds(0);
      recordingTimerRef.current = window.setInterval(() => setRecordingSeconds((value) => value + 1), 1000);
      setIsRecording(true);
    } catch {
      onError(micErrorMessage);
    }
  };

  const cancelRecording = () => {
    recordingCancelledRef.current = true;
    mediaRecorderRef.current?.stop();
  };

  const confirmRecording = () => {
    recordingCancelledRef.current = false;
    mediaRecorderRef.current?.stop();
  };

  // Tear down the microphone stream and timer on unmount.
  useEffect(() => () => releaseAudioResources(), []);

  return {
    isRecording,
    recordingSeconds,
    analyser,
    isTranscribing: transcribe.isPending,
    startRecording,
    cancelRecording,
    confirmRecording,
  };
}
