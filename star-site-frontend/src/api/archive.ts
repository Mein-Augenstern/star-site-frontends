import request from './request'
import type {
  ArchiveAsset,
  ArchiveDocument,
  AssetSaveDTO,
  AssetSummary,
  DocumentSaveDTO,
  PageVO,
  ValuationPoint,
} from '@/types/api'

/* ===== 证件夹 ===== */
export function createDocument(data: DocumentSaveDTO): Promise<ArchiveDocument> {
  return request.post('/archive/documents', data)
}

export function listDocuments(params: {
  holderMemberId?: number
  docType?: string
  page?: number
  size?: number
}): Promise<PageVO<ArchiveDocument>> {
  return request.get('/archive/documents', { params })
}

export function updateDocument(id: number, data: DocumentSaveDTO): Promise<ArchiveDocument> {
  return request.put(`/archive/documents/${id}`, data)
}

export function deleteDocument(id: number): Promise<void> {
  return request.delete(`/archive/documents/${id}`)
}

/* ===== 家庭资产 ===== */
export function createAsset(data: AssetSaveDTO): Promise<ArchiveAsset> {
  return request.post('/archive/assets', data)
}

export function listAssets(params: {
  assetType?: string
  page?: number
  size?: number
}): Promise<PageVO<ArchiveAsset>> {
  return request.get('/archive/assets', { params })
}

export function updateAsset(id: number, data: AssetSaveDTO): Promise<ArchiveAsset> {
  return request.put(`/archive/assets/${id}`, data)
}

export function deleteAsset(id: number): Promise<void> {
  return request.delete(`/archive/assets/${id}`)
}

export function getValuations(assetId: number): Promise<ValuationPoint[]> {
  return request.get(`/archive/assets/${assetId}/valuations`)
}

export function getAssetSummary(): Promise<AssetSummary> {
  return request.get('/archive/assets/summary')
}
