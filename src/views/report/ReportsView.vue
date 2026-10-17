<script setup lang="ts">
import type { UploadRequestOptions } from 'element-plus'
import { ElMessage } from 'element-plus'
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import { listMembers } from '@/api/family'
import { preview, upload } from '@/api/file'
import { createReport, listReports, searchReports } from '@/api/health'
import type { FamilyMember, HealthReport, PageVO } from '@/types/api'

const router = useRouter()

const members = ref<FamilyMember[]>([])
const page = ref<PageVO<HealthReport> | null>(null)
const loading = ref(false)
const query = reactive({ familyMemberId: undefined as number | undefined, year: undefined as number | undefined, page: 1, size: 10 })
const keyword = ref('')
const searching = ref(false)

// 上传报告
const uploadDialog = ref(false)
const uploading = ref(false)
const uploadForm = reactive({
  familyMemberId: undefined as number | undefined,
  reportYear: new Date().getFullYear(),
  checkupDate: null as string | null,
  hospital: '',
  title: '',
  summary: '',
  remark: '',
  fileId: undefined as number | undefined,
  fileName: '',
})

const years = Array.from({ length: 16 }, (_, i) => new Date().getFullYear() - i)

onMounted(load)

async function load() {
  loading.value = true
  try {
    members.value = await listMembers()
    await fetchPage()
  } finally {
    loading.value = false
  }
}

async function fetchPage() {
  page.value = await listReports({ ...query })
}

async function handleSearch() {
  query.page = 1
  if (!keyword.value.trim()) {
    await fetchPage()
    return
  }
  searching.value = true
  try {
    const list = await searchReports(keyword.value.trim(), query.familyMemberId)
    page.value = { records: list, total: list.length, page: 1, size: list.length }
  } finally {
    searching.value = false
  }
}

async function resetFilters() {
  query.familyMemberId = undefined
  query.year = undefined
  query.page = 1
  keyword.value = ''
  await fetchPage()
}

function openUpload() {
  if (members.value.length === 0) {
    ElMessage.warning('请先到「家庭成员」添加成员')
    return
  }
  uploadDialog.value = true
}

/** el-upload 自定义上传：先传文件拿 fileId */
async function handleFileUpload(options: UploadRequestOptions) {
  uploading.value = true
  try {
    const res = await upload(options.file, 'report')
    uploadForm.fileId = res.fileId
    uploadForm.fileName = res.name
    if (!uploadForm.title) uploadForm.title = res.name.replace(/\.[^.]+$/, '')
    ElMessage.success('文件已上传')
  } finally {
    uploading.value = false
  }
}

async function handleCreate() {
  if (!uploadForm.familyMemberId) {
    ElMessage.warning('请选择家庭成员')
    return
  }
  await createReport({
    familyMemberId: uploadForm.familyMemberId,
    reportYear: uploadForm.reportYear,
    checkupDate: uploadForm.checkupDate,
    hospital: uploadForm.hospital || undefined,
    title: uploadForm.title || undefined,
    summary: uploadForm.summary || undefined,
    fileId: uploadForm.fileId ?? null,
    remark: uploadForm.remark || undefined,
  })
  ElMessage.success('报告已登记')
  uploadDialog.value = false
  Object.assign(uploadForm, {
    familyMemberId: undefined, reportYear: new Date().getFullYear(), checkupDate: null,
    hospital: '', title: '', summary: '', remark: '', fileId: undefined, fileName: '',
  })
  await fetchPage()
}

function memberName(id: number) {
  return members.value.find((m) => m.id === id)?.name ?? `成员#${id}`
}

async function handlePageChange(p: number) {
  query.page = p
  await fetchPage()
}
</script>

<template>
  <div v-loading="loading">
    <PageHeader title="体检报告" description="管理家庭成员的体检报告与健康指标">
      <template #actions>
        <el-button type="primary" @click="openUpload">上传体检报告</el-button>
      </template>
    </PageHeader>

    <el-card shadow="never" class="panel">
      <div class="filter-bar">
        <el-select v-model="query.familyMemberId" placeholder="全部成员" clearable style="width: 140px" @change="fetchPage">
          <el-option v-for="m in members" :key="m.id" :label="m.name" :value="m.id" />
        </el-select>
        <el-select v-model="query.year" placeholder="全部年份" clearable style="width: 120px" @change="fetchPage">
          <el-option v-for="y in years" :key="y" :label="y + ' 年'" :value="y" />
        </el-select>
        <el-input
          v-model="keyword" placeholder="指标 / 医院 / 标题" clearable style="width: 220px"
          @keyup.enter="handleSearch" @clear="handleSearch"
        />
        <el-button :loading="searching" @click="handleSearch">搜索</el-button>
        <el-button @click="resetFilters">重置</el-button>
      </div>

      <el-table :data="page?.records ?? []" @row-click="(row: HealthReport) => router.push(`/reports/${row.id}`)">
        <el-table-column label="成员" width="100">
          <template #default="{ row }">{{ memberName(row.familyMemberId) }}</template>
        </el-table-column>
        <el-table-column prop="reportYear" label="年份" width="80" />
        <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip />
        <el-table-column prop="hospital" label="医院" min-width="140" show-overflow-tooltip />
        <el-table-column prop="checkupDate" label="体检日期" width="110" />
        <el-table-column label="报告文件" width="90">
          <template #default="{ row }">
            <el-button v-if="row.fileId" link type="primary" @click.stop="preview(row.fileId)">查看</el-button>
            <span v-else class="cell-muted">—</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="90">
          <template #default="{ row }">
            <el-button link type="primary" @click.stop="router.push(`/reports/${row.id}`)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="page && page.total > page.size"
        class="pager" layout="total, prev, pager, next" :total="page.total"
        :page-size="page.size" :current-page="page.page" @current-change="handlePageChange"
      />
    </el-card>

    <!-- 上传报告 -->
    <el-dialog v-model="uploadDialog" title="上传体检报告" width="520px">
      <el-form :model="uploadForm" label-width="90px">
        <el-form-item label="家庭成员" required>
          <el-select v-model="uploadForm.familyMemberId" placeholder="选择成员">
            <el-option v-for="m in members" :key="m.id" :label="m.name" :value="m.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="报告年份" required>
          <el-select v-model="uploadForm.reportYear">
            <el-option v-for="y in years" :key="y" :label="y + ' 年'" :value="y" />
          </el-select>
        </el-form-item>
        <el-form-item label="体检日期">
          <el-date-picker v-model="uploadForm.checkupDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="医院">
          <el-input v-model="uploadForm.hospital" maxlength="128" />
        </el-form-item>
        <el-form-item label="标题">
          <el-input v-model="uploadForm.title" maxlength="128" placeholder="不填默认用文件名" />
        </el-form-item>
        <el-form-item label="报告文件">
          <el-upload :show-file-list="false" :http-request="handleFileUpload" accept=".pdf,.jpg,.jpeg,.png,.webp">
            <el-button :loading="uploading">{{ uploadForm.fileName || '选择 PDF / 图片（≤20MB）' }}</el-button>
          </el-upload>
        </el-form-item>
        <el-form-item label="总结">
          <el-input v-model="uploadForm.summary" type="textarea" :rows="2" maxlength="1000" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="uploadDialog = false">取消</el-button>
        <el-button type="primary" @click="handleCreate">登记报告</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.filter-bar {
  display: flex;
  gap: 10px;
  align-items: center;
  padding-bottom: 14px;
  margin-bottom: 4px;
  border-bottom: 1px solid var(--panel-border);
}

.cell-muted {
  color: #c0c4cc;
}

.pager {
  margin-top: 14px;
  justify-content: flex-end;
}

:deep(.el-table__row) {
  cursor: pointer;
}
</style>
