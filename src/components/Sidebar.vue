<template>
  <el-aside width="230px" class="app-aside">
    <div class="logo">
      <el-icon :size="20" color="#b8924f"><Monitor /></el-icon>
      <span>體能館後台</span>
    </div>

    <el-menu
      active-text-color="#d9bd86"
      background-color="#1c1f26"
      text-color="#9a9ca5"
      :default-active="activeMenu"
      class="el-menu-vertical"
      router
    >
      <el-menu-item index="/dashboard">
        <el-icon><Document /></el-icon>
        <span>營運總覽</span>
      </el-menu-item>

      <el-menu-item index="/students">
        <el-icon><CollectionTag /></el-icon>
        <span>學員管理</span>
      </el-menu-item>

      <el-menu-item index="/courses">
        <el-icon><CollectionTag /></el-icon>
        <span>課程管理</span>
      </el-menu-item>

      <el-menu-item index="/reservations">
        <el-icon><Tickets /></el-icon>
        <span>預約 / 候補</span>
      </el-menu-item>

      <el-menu-item index="/billing">
        <el-icon><Wallet /></el-icon>
        <span>儲值 / 繳費</span>
      </el-menu-item>

      <el-menu-item index="/reports">
        <el-icon><DataLine /></el-icon>
        <span>營運報表</span>
      </el-menu-item>

      <el-menu-item index="/settings">
        <el-icon><Setting /></el-icon>
        <span>系統設定</span>
      </el-menu-item>
    </el-menu>
  </el-aside>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
// 讓側邊欄的高亮項目，永遠跟隨目前的網址
const activeMenu = ref(route.path)

watch(() => route.path, (newPath) => {
  activeMenu.value = newPath
})
</script>

<style scoped>
.app-aside {
  background-color: #1c1f26;
  transition: width 0.3s;
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
}
.logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #1c1f26;
  color: #f1efe9;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 1.5px;
  gap: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.el-menu-vertical {
  border-right: none;
  flex: 1;
  padding-top: 12px;
}
.el-menu-vertical :deep(.el-menu-item) {
  margin: 2px 12px;
  border-radius: 8px;
  height: 44px;
}
.el-menu-vertical :deep(.el-menu-item.is-active) {
  background-color: rgba(184, 146, 79, 0.14) !important;
}
.el-menu-vertical :deep(.el-menu-item:hover) {
  background-color: rgba(255, 255, 255, 0.05) !important;
}
</style>
