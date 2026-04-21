import { ToolMeta } from "@/types/tool-search";
import { TIP_CONTENT_TYPES } from "@/tip/protocol";

export const systemConfig: ToolMeta = {
  id: 'system',
  name: 'System',
  description: 'Internal pipeline control nodes.',
  category: 'developer',
  route: 'pipeline',
  thumbnail: '/assets/thumbnails/pipeline.png',
  tags: ['system', 'review', 'gate', 'human', 'approval'],
  isNew: true,
  isFeatured: false,
  wasmPowered: false,
  pythonPowered: false,
  status: 'beta',
  addedAt: '2026-03-20',
  tip: [
    {
      id: 'system/human-review',
      name: 'Human Review',
      description: 'Pause the pipeline for manual data approval.',
      consumes: [...TIP_CONTENT_TYPES],
      produces: [...TIP_CONTENT_TYPES],
      configSchema: { fields: [] },
      interactable: true as const,
      getInteractionComponent: async () => {
        const { default: HumanReviewInteraction } = await import('@/components/features/pipeline/nodes/HumanReviewInteraction');
        return HumanReviewInteraction;
      },
      getExecutor: async () => {
        return async (input, config) => {
          const { ReviewSync } = await import('@/lib/review-sync');
          const nodeId = config.__nodeId as string;
          if (!nodeId) {
            // Fallback if nodeId not injected
            return input;
          }
          return ReviewSync.requestReview(nodeId, input);
        };
      }
    }
  ]
};
