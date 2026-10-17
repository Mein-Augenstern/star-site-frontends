import request from './request'
import type { CoverageMap, InsurancePolicy, PageVO, PolicySaveDTO } from '@/types/api'

/** 创建保单 */
export function createPolicy(data: PolicySaveDTO): Promise<InsurancePolicy> {
  return request.post('/insurance/policies', data)
}

/** 保单分页列表 */
export function listPolicies(params: {
  insuredMemberId?: number
  category?: string
  status?: number
  page?: number
  size?: number
}): Promise<PageVO<InsurancePolicy>> {
  return request.get('/insurance/policies', { params })
}

/** 保单详情 */
export function getPolicy(id: number): Promise<InsurancePolicy> {
  return request.get(`/insurance/policies/${id}`)
}

/** 更新保单 */
export function updatePolicy(id: number, data: PolicySaveDTO): Promise<InsurancePolicy> {
  return request.put(`/insurance/policies/${id}`, data)
}

/** 删除保单 */
export function deletePolicy(id: number): Promise<void> {
  return request.delete(`/insurance/policies/${id}`)
}

/** 保障地图：成员 × 险种覆盖矩阵 */
export function getCoverageMap(): Promise<CoverageMap> {
  return request.get('/insurance/coverage-map')
}
