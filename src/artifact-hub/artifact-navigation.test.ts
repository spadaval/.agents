import { describe, expect, it } from "vitest";
import { mountArtifactHubNavigation } from "./artifact-navigation";

describe("artifact navigation", () => {
  it("mounts one isolated link to the Hub root", () => {
    const navigation = mountArtifactHubNavigation();
    const link = navigation.shadowRoot?.querySelector("a");

    expect(link?.getAttribute("href")).toBe("/");
    expect(link?.getAttribute("aria-label")).toBe("Go to Artifact Hub");
    expect(mountArtifactHubNavigation()).toBe(navigation);
  });
});
