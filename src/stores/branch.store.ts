import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { STORAGE_KEYS } from '@/constants/storage-key.constant'
import type { AdminRole, BranchId, ManagementScope } from '@/types/auth.type'

export interface Branch {
  id: BranchId
  name: string
}

const DEFAULT_BRANCH_ID: BranchId = 'can-tho'
const DEFAULT_SCOPE: ManagementScope = 'all'

function isBranchId(value: unknown): value is BranchId {
  return value === 'can-tho' || value === 'hau-giang'
}

function isManagementScope(value: unknown): value is ManagementScope {
  return value === 'all' || isBranchId(value)
}

export const useBranchStore = defineStore('branch', () => {
  const branches: Branch[] = [
    { id: 'can-tho', name: 'Chi nhánh Cần Thơ' },
    { id: 'hau-giang', name: 'Chi nhánh Hậu Giang' },
  ]

  const storedBranchId = localStorage.getItem(STORAGE_KEYS.selectedBranchId)
  const storedScope = localStorage.getItem(STORAGE_KEYS.managementScope)
  const selectedBranchId = ref<BranchId>(isBranchId(storedBranchId) ? storedBranchId : DEFAULT_BRANCH_ID)
  const managementScope = ref<ManagementScope>(isManagementScope(storedScope) ? storedScope : DEFAULT_SCOPE)

  const selectedBranch = computed(() => {
    return branches.find((branch) => branch.id === selectedBranchId.value) ?? branches[0]
  })

  const scopeLabel = computed(() => {
    if (managementScope.value === 'all') {
      return 'Toàn hệ thống'
    }

    return branches.find((branch) => branch.id === managementScope.value)?.name ?? selectedBranch.value.name
  })

  function setManagementScope(scope: ManagementScope): void {
    managementScope.value = scope
    localStorage.setItem(STORAGE_KEYS.managementScope, scope)

    if (scope !== 'all') {
      selectedBranchId.value = scope
      localStorage.setItem(STORAGE_KEYS.selectedBranchId, scope)
    }
  }

  function setSelectedBranch(branchId: BranchId): void {
    selectedBranchId.value = branchId
    managementScope.value = branchId
    localStorage.setItem(STORAGE_KEYS.selectedBranchId, branchId)
    localStorage.setItem(STORAGE_KEYS.managementScope, branchId)
  }

  function applyAuthContext(role: AdminRole | null, assignedBranchId: BranchId | null): void {
    if (role === 'BRANCH_ADMIN' && assignedBranchId) {
      selectedBranchId.value = assignedBranchId
      managementScope.value = assignedBranchId
      localStorage.setItem(STORAGE_KEYS.selectedBranchId, assignedBranchId)
      localStorage.setItem(STORAGE_KEYS.managementScope, assignedBranchId)
      return
    }

    if (role === 'SUPER_ADMIN' && !isManagementScope(localStorage.getItem(STORAGE_KEYS.managementScope))) {
      managementScope.value = DEFAULT_SCOPE
      localStorage.setItem(STORAGE_KEYS.managementScope, DEFAULT_SCOPE)
    }
  }

  return {
    branches,
    selectedBranchId,
    selectedBranch,
    managementScope,
    scopeLabel,
    setManagementScope,
    setSelectedBranch,
    applyAuthContext,
  }
})
