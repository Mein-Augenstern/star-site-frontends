<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref } from 'vue'
import { listMembers } from '@/api/family'
import { trends } from '@/api/health'
import type { FamilyMember, TrendPoint } from '@/types/api'

const members = ref<FamilyMember[]>([])
const memberId = ref<number | undefined>(undefined)
const itemName = ref('')
const points = ref<TrendPoint[] | null>(null)
const loading = ref(false)

onMounted(async () => {
  members.value = await listMembers()
})

async function handleQuery() {
  if (!memberId.value) {
    ElMessage.warning('请选择家庭成员')
    return
  }
  if (!itemName.value.trim()) {
    ElMessage.warning('请输入指标名（如：空腹血糖）')
    return
  }
  loading.value = true
  try {
    points.value = await trends(memberId.value, itemName.value.trim())
    if (points.value.length === 0) {
      ElMessage.info('没有找到该指标的记录')
    }
  } finally {
    loading.value = false
  }
}

const memberName = computed(() => members.value.find((m) => m.id === memberId.value)?.name ?? '')

function flagText(flag: number) {
  return flag === 1 ? '偏高' : flag === 2 ? '偏低' : '正常'
}

function flagType(flag: number) {
  return flag === 1 ? 'danger' : flag === 2 ? 'warning' : 'success'
}
</script>

<template>
  <div v-loading="loading">
    <div class="toolbar">
      <el-select v-model="memberId" placeholder="选择家庭成员" style="width: 160px">
        <el-option v-for="m in members" :key="m.id" :label="m.name" :value="m.id" />
      </el-select>
      <el-input
        v-model="itemName" placeholder="指标名，如：空腹血糖" style="width: 220px" clearable
        @keyup.enter="handleQuery"
      />
      <el-button type="primary" @click="handleQuery">查趋势</el-button>
      <span v-if="points && points.length" class="hint">
        {{ memberName }} · {{ itemName }} · {{ points.length }} 年记录
      </span>
    </div>

    <el-empty v-if="points === null" description="选择成员并输入指标名，查看逐年变化" />

    <el-card v-else-if="points.length > 0" shadow="never">
      <template #header>历年对比</template>
      <el-table :data="points" stripe>
        <el-table-column prop="reportYear" label="年份" width="100" sortable />
        <el-table-column label="数值" width="140">
          <template #default="{ row }">
            <span class="value">{{ row.valueNum ?? row.valueText ?? '—' }}</span>
            <span v-if="row.unit" class="unit">{{ row.unit }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="flagType(row.abnormalFlag)" size="small">{{ flagText(row.abnormalFlag) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="较上年" min-width="200">
          <template #default="{ row, $index }">
            <template v-if="$index > 0 && row.valueNum != null && points![$index - 1].valueNum != null">
              <span :class="row.valueNum >= points![$index - 1].valueNum! ? 'up' : 'down'">
                {{ row.valueNum >= points![$index - 1].valueNum! ? '↑' : '↓' }}
                {{ Math.abs(row.valueNum - points![$index - 1].valueNum!).toFixed(2) }}
              </span>
            </template>
            <span v-else>—</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-empty v-else description="该指标暂无记录" />
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 14px;
}

.hint {
  color: #909399;
  font-size: 13px;
}

.value {
  font-size: 16px;
  font-weight: 600;
}

.unit {
  color: #909399;
  margin-left: 4px;
  font-size: 12px;
}

.up {
  color: #f56c6c;
}

.down {
  color: #67c23a;
}
</style>
