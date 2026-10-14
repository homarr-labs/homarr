import type { ProductionOnboardingRpcInputSource } from "@homarr/auth/nitro/production-sessions";

import { assertOwnedOnboardingWritesProducer, createOwnedOnboardingWritesProducer } from "./onboarding-writes";
import type { OwnedOnboardingRpcRequestBinding, OwnedOnboardingRpcRequestController } from "./onboarding-writes";

export type {
  OwnedOnboardingRpcRequestBinding,
  OwnedOnboardingRpcRequestController,
  OnboardingRpcRequestResult,
} from "./onboarding-writes";

const producers = new WeakMap<
  ProductionOnboardingRpcInputSource,
  ReturnType<typeof createOwnedOnboardingWritesProducer>
>();

function producerFor(source: ProductionOnboardingRpcInputSource) {
  const bundle = producers.get(source);
  if (!bundle || bundle.source !== source) throw new Error("Unknown onboarding RPC input producer");
  assertOwnedOnboardingWritesProducer(bundle);
  return bundle;
}

export function createOnboardingRpcInputProducer(): ProductionOnboardingRpcInputSource {
  const bundle = createOwnedOnboardingWritesProducer();
  assertOwnedOnboardingWritesProducer(bundle);
  producers.set(bundle.source, bundle);
  return bundle.source;
}

export function assertOnboardingRpcInputProducer(source: ProductionOnboardingRpcInputSource): void {
  producerFor(source);
}

export function createOnboardingRpcRequestController(
  source: ProductionOnboardingRpcInputSource,
  binding: OwnedOnboardingRpcRequestBinding,
): OwnedOnboardingRpcRequestController {
  return producerFor(source).createController(binding);
}
