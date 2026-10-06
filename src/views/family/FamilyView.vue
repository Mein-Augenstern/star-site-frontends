<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'
import { addMember, createFamily, deleteMember, getMyFamily, listMembers, updateMember } from '@/api/family'
import type { Family, FamilyMember } from '@/types/api'

const RELATIONS: Record<string, string> = {
  self: '本人',
  spouse: '配偶',
  father: '父亲',
  mother: '母亲',
  child: '子女',
  other: '其他',
}

const family = ref<Family | null>(null)
const members = ref<FamilyMember[]>([])
const loading = ref(false)

// 建家庭
const familyDialog = ref(false)
const familyForm = reactive({ name: '', remark: '' })

// 成员编辑
const memberDialog = ref(false)
const editing = ref<FamilyMember | null>(null)
const memberFormRef = ref<FormInstance>()
const memberForm = reactive({
  name: '',
  relation: 'self',
  gender: 0,
  birthDate: null as string | null,
  phone: '',
  remark: '',
})

const memberRules: FormRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  relation: [{ required: true, message: '请选择关系', trigger: 'change' }],
  phone: [{ pattern: /^$|^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }],
}

const dialogTitle = computed(() => (editing.value ? '编辑成员' : '添加成员'))

onMounted(load)

async function load() {
  loading.value = true
  try {
    family.value = await getMyFamily()
    if (family.value) {
      members.value = await listMembers()
    }
  } finally {
    loading.value = false
  }
}

async function handleCreateFamily() {
  if (!familyForm.name.trim()) {
    ElMessage.warning('请输入家庭名称')
    return
  }
  family.value = await createFamily(familyForm.name.trim(), familyForm.remark)
  familyDialog.value = false
  ElMessage.success('家庭创建成功')
}

function openAdd() {
  editing.value = null
  Object.assign(memberForm, { name: '', relation: 'self', gender: 0, birthDate: null, phone: '', remark: '' })
  memberDialog.value = true
}

function openEdit(m: FamilyMember) {
  editing.value = m
  Object.assign(memberForm, {
    name: m.name,
    relation: m.relation,
    gender: m.gender,
    birthDate: m.birthDate,
    phone: m.phone ?? '',
    remark: m.remark ?? '',
  })
  memberDialog.value = true
}

async function handleSaveMember() {
  await memberFormRef.value?.validate()
  const dto = {
    name: memberForm.name.trim(),
    relation: memberForm.relation,
    gender: memberForm.gender,
    birthDate: memberForm.birthDate || null,
    phone: memberForm.phone || undefined,
    remark: memberForm.remark || undefined,
  }
  if (editing.value) {
    await updateMember(editing.value.id, dto)
    ElMessage.success('已保存')
  } else {
    await addMember(dto)
    ElMessage.success('已添加')
  }
  memberDialog.value = false
  await load()
}

async function handleDelete(m: FamilyMember) {
  await ElMessageBox.confirm(`确定删除成员「${m.name}」的档案？相关体检报告会保留。`, '删除确认', { type: 'warning' })
  await deleteMember(m.id)
  ElMessage.success('已删除')
  await load()
}

function genderText(g: number) {
  return g === 1 ? '男' : g === 2 ? '女' : '未填'
}
</script>

<template>
  <div v-loading="loading">
    <!-- 未建家庭 -->
    <el-empty v-if="!family" description="还没有创建家庭">
      <el-button type="primary" @click="familyDialog = true">创建家庭</el-button>
    </el-empty>

    <template v-else>
      <div class="family-bar">
        <span class="family-name">{{ family.name }}</span>
        <span class="family-meta">共 {{ members.length }} 位成员</span>
        <el-button type="primary" plain @click="openAdd">添加成员</el-button>
      </div>

      <el-empty v-if="members.length === 0" description="还没有家庭成员档案，先添加成员" />

      <div class="member-grid">
        <el-card v-for="m in members" :key="m.id" class="member-card" shadow="hover">
          <div class="member-head">
            <el-avatar :size="48">{{ m.name.slice(0, 1) }}</el-avatar>
            <div class="member-info">
              <div class="member-name">
                {{ m.name }}
                <el-tag size="small" type="info">{{ RELATIONS[m.relation] || m.relation }}</el-tag>
              </div>
              <div class="member-sub">
                {{ genderText(m.gender) }}
                <span v-if="m.birthDate"> · {{ m.birthDate }}</span>
                <span v-if="m.phone"> · {{ m.phone }}</span>
              </div>
            </div>
          </div>
          <p v-if="m.remark" class="member-remark">{{ m.remark }}</p>
          <div class="member-actions">
            <el-button link type="primary" @click="openEdit(m)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(m)">删除</el-button>
          </div>
        </el-card>
      </div>
    </template>

    <!-- 建家庭 -->
    <el-dialog v-model="familyDialog" title="创建家庭" width="420px">
      <el-form label-width="80px">
        <el-form-item label="家庭名称" required>
          <el-input v-model="familyForm.name" maxlength="64" placeholder="如：我们的一家" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="familyForm.remark" type="textarea" maxlength="255" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="familyDialog = false">取消</el-button>
        <el-button type="primary" @click="handleCreateFamily">创建</el-button>
      </template>
    </el-dialog>

    <!-- 成员编辑 -->
    <el-dialog v-model="memberDialog" :title="dialogTitle" width="460px">
      <el-form ref="memberFormRef" :model="memberForm" :rules="memberRules" label-width="80px">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="memberForm.name" maxlength="32" />
        </el-form-item>
        <el-form-item label="关系" prop="relation">
          <el-select v-model="memberForm.relation">
            <el-option v-for="(label, value) in RELATIONS" :key="value" :label="label" :value="value" />
          </el-select>
        </el-form-item>
        <el-form-item label="性别">
          <el-radio-group v-model="memberForm.gender">
            <el-radio :value="0">未填</el-radio>
            <el-radio :value="1">男</el-radio>
            <el-radio :value="2">女</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="出生日期">
          <el-date-picker v-model="memberForm.birthDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="memberForm.phone" maxlength="11" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="memberForm.remark" type="textarea" maxlength="255" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="memberDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSaveMember">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.family-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.family-name {
  font-size: 18px;
  font-weight: 600;
}

.family-meta {
  color: #909399;
  flex: 1;
}

.member-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.member-head {
  display: flex;
  gap: 12px;
  align-items: center;
}

.member-name {
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.member-sub {
  color: #909399;
  font-size: 13px;
  margin-top: 4px;
}

.member-remark {
  color: #606266;
  font-size: 13px;
  margin: 12px 0 0;
}

.member-actions {
  margin-top: 12px;
  text-align: right;
}
</style>
