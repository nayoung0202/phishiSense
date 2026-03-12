import { beforeEach, describe, expect, it, vi } from "vitest";

const generateTemplateAiCandidatesMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/services/templateAi", () => ({
  generateTemplateAiCandidates: generateTemplateAiCandidatesMock,
}));

import { POST } from "./route";

describe("POST /api/templates/ai-generate", () => {
  beforeEach(() => {
    generateTemplateAiCandidatesMock.mockReset();
  });

  it("validates payload and returns generated candidates", async () => {
    generateTemplateAiCandidatesMock.mockResolvedValue({
      candidates: [
        {
          id: "candidate-1",
          name: "Mail Notice Draft",
          subject: "Security Check Notice",
          body: '<a href="{{LANDING_URL}}">Open</a>',
          maliciousPageContent:
            '<form action="{{TRAINING_URL}}"><input name="email" /><button type="submit">Submit</button></form>',
          summary: "Security notice candidate",
        },
      ],
      usage: {
        promptTokenCount: 100,
        candidatesTokenCount: 200,
        totalTokenCount: 300,
        estimatedCredits: 1,
        model: "gemini-2.5-flash-lite",
      },
    });

    const response = await POST(
      new Request("http://localhost/api/templates/ai-generate", {
        method: "POST",
        body: JSON.stringify({
          topic: "shipping",
          tone: "formal",
          difficulty: "easy",
          prompt: "",
          generateCount: 1,
          preservedCandidates: [],
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.candidates).toHaveLength(1);
    expect(generateTemplateAiCandidatesMock).toHaveBeenCalledTimes(1);
  });

  it("returns 400 for invalid payload", async () => {
    const response = await POST(
      new Request("http://localhost/api/templates/ai-generate", {
        method: "POST",
        body: JSON.stringify({
          topic: "unknown",
          tone: "formal",
          difficulty: "easy",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(generateTemplateAiCandidatesMock).not.toHaveBeenCalled();
  });
});
