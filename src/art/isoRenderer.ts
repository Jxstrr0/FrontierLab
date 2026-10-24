// The engraved city renderer (ART_DIRECTION §2). Placeholder: uses the flat
// renderer until the engraved chunked renderer lands.
import { createFlatRenderer } from './flatRenderer';
import type { CreateMapRenderer } from './mapRenderer';

export const createMapRenderer: CreateMapRenderer = createFlatRenderer;
