import { ToolMeta } from "@/types/tool-search";
import { magicPdfConfig } from "@/app/(tools)/magic-pdf/config";
import { pixelsConfig } from "@/app/(tools)/pixels/config";
import { dataLensConfig } from "@/app/(tools)/data-lens/config";
import { redactSecretsConfig } from "@/app/(tools)/redact-secrets/config";
import { base64Config } from "@/app/(tools)/base64/config";
import { jsonToInterfaceConfig } from "@/app/(tools)/json-to-interface/config";
import { openDrawConfig } from "@/app/(tools)/open-draw/config";
import { pingTesterConfig } from "@/app/(tools)/ping-tester/config";
import { speedTestConfig } from "@/app/(tools)/speed-test/config";
import { pipelineConfig } from "@/app/(tools)/pipeline/config";
import { passwordxConfig } from "@/app/(tools)/passwordx/config";
import { formatStudioConfig } from "@/app/(tools)/format-studio/config";
import { dataBuilderConfig } from "@/app/(tools)/data-builder/config";
import { archiveKitConfig } from "@/app/(tools)/archive-kit/config";
import { noteVaultConfig } from "@/app/(tools)/note-vault/config";
import { qrForgeConfig } from "@/app/(tools)/qr-forge/config";
import { bgremoverConfig } from "@/app/(tools)/bgremover/config";

/**
 * FULL registry for TIP-compliant operations.
 * This file should ONLY be imported by modules that are loaded 
 * on the client-side (ssr: false) to keep the Worker bundle lean.
 */
export const FULL_TOOLS_REGISTRY: ToolMeta[] = [
  noteVaultConfig,
  magicPdfConfig,
  pixelsConfig,
  dataLensConfig,
  redactSecretsConfig,
  base64Config,
  jsonToInterfaceConfig,
  openDrawConfig,
  pingTesterConfig,
  speedTestConfig,
  pipelineConfig,
  passwordxConfig,
  formatStudioConfig,
  dataBuilderConfig,
  archiveKitConfig,
  qrForgeConfig,
  bgremoverConfig,
];
