import request from './request'
import type { FileVO } from '@/types/api'

/** 上传文件（pdf/jpg/png/webp，≤20MB） */
export function upload(file: globalThis.File, bizType?: string): Promise<FileVO> {
  const form = new FormData()
  form.append('file', file)
  if (bizType) form.append('bizType', bizType)
  return request.post('/file/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

/** 取文件流（预览用，需带 JWT 所以走 axios 而非直链） */
export function fetchBlob(fileId: number): Promise<globalThis.Blob> {
  return request.get(`/file/${fileId}/view`, { responseType: 'blob' })
}

/** 在新窗口预览文件 */
export async function preview(fileId: number) {
  const blob = await fetchBlob(fileId)
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
