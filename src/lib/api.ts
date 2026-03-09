// === SECTION: BARREL_AND_COMPATIBILITY_SURFACE ===

export { ApiRequestError } from "./api-core"
export type * from "./api-types"
export * from "./api-types"

import { adminApi } from "./api-admin"
import { authApi } from "./api-auth"
import { curatedApi } from "./api-curated"
import { publicApi } from "./api-public"
import { translationApi } from "./api-translation"

export const api = {
  ...authApi,
  ...publicApi,
  ...curatedApi,
  ...translationApi,
  ...adminApi,
}
