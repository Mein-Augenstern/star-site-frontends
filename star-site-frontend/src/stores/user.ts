import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { MemberVO } from '@/types/api'
import { getToken, removeToken, setToken } from '@/utils/auth'

export const useUserStore = defineStore('user', () => {
  const token = ref<string | null>(getToken())
  const member = ref<MemberVO | null>(null)

  function setLogin(t: string, m: MemberVO) {
    token.value = t
    member.value = m
    setToken(t)
  }

  function setMember(m: MemberVO) {
    member.value = m
  }

  function logout() {
    token.value = null
    member.value = null
    removeToken()
  }

  return { token, member, setLogin, setMember, logout }
})
