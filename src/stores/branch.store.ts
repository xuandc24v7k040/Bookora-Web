import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { STORAGE_KEYS } from '@/constants/storage-key.constant'

export interface Branch {
  id: 'can-tho' | 'hau-giang'
  name: string
}

const DEFAULT_BRANCH_ID: Branch['id'] = 'can-tho'

export const useBranchStore = defineStore('branch', () => {
  const branches: Branch[] = [
    { id: 'can-tho', name: 'Cần Thơ' },
    { id: 'hau-giang', name: 'Hậu Giang' },
  ]

  const storedBranchId = localStorage.getItem(STORAGE_KEYS.selectedBranchId)
  const selectedBranchId = ref<Branch['id']>(
    branches.some((branch) => branch.id === storedBranchId)
      ? (storedBranchId as Branch['id'])
      : DEFAULT_BRANCH_ID,
  )

  const selectedBranch = computed(() => {
    return branches.find((branch) => branch.id === selectedBranchId.value) ?? branches[0]
  })

  function setSelectedBranch(branchId: Branch['id']): void {
    selectedBranchId.value = branchId
    localStorage.setItem(STORAGE_KEYS.selectedBranchId, branchId)
  }

  return {
    branches,
    selectedBranchId,
    selectedBranch,
    setSelectedBranch,
  }
})
