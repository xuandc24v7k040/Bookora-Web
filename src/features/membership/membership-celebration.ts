import { shallowRef } from 'vue'
import { myMembership } from '@/api/generated/endpoints/membership/membership'
import { tierLabels, type MembershipTier } from './membership-ui'

interface Celebration {
  userId: string
  tier: MembershipTier
}

/** Live hints only: no REST notification hydration or persistent popup state. */
export function createMembershipCelebration(loadTier: (signal: AbortSignal) => Promise<MembershipTier>) {
  const pending = shallowRef<Celebration | null>(null)
  const seen = new Set<string>()
  let account: string | undefined
  let generation = 0
  let request: AbortController | undefined

  function reset(userId?: string) {
    ++generation
    request?.abort()
    request = undefined
    pending.value = null
    if (account !== userId) seen.clear()
    account = userId
  }

  async function receive(userId: string, notificationId: string) {
    if (account !== userId) reset(userId)
    if (seen.has(notificationId)) return
    seen.add(notificationId)
    if (seen.size > 256) seen.delete(seen.values().next().value!)
    const current = ++generation
    request?.abort()
    request = new AbortController()
    pending.value = null
    try {
      const tier = await loadTier(request.signal)
      if (current === generation && account === userId && tier in tierLabels)
        pending.value = { userId, tier }
    } catch {
      // Bell remains durable; an unverified tier must never open a popup.
    }
  }

  return { pending, reset, receive, dismiss: () => { pending.value = null } }
}

export const membershipCelebration = createMembershipCelebration(async signal =>
  (await myMembership({ branchScoped: false }, signal)).data.currentTier,
)
