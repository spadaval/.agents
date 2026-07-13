import { getContext, setContext } from "svelte";
import type { ReviewFile } from "./types";

type ReviewRuntime = {
  files: () => ReviewFile[];
  fileHref: (path: string) => string;
  openFile: (path: string) => void;
};

const reviewKey = Symbol("pr-review-runtime");

export const provideReviewRuntime = (runtime: ReviewRuntime) =>
  setContext(reviewKey, runtime);

export const useReviewRuntime = () => {
  const runtime = getContext<ReviewRuntime | undefined>(reviewKey);
  if (!runtime)
    throw new Error("Review primitives must render inside the PR review shell");
  return runtime;
};
