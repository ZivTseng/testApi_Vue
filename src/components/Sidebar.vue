<template>
  <el-aside width="220px" class="app-aside">
    <div class="logo">
      <el-icon :size="24" color="#fff"><Monitor /></el-icon>
      <span>Blog Admin</span>
    </div>
    
    <el-menu
      active-text-color="#ffd04b"
      background-color="#304156"
      text-color="#bfcbd9"
      :default-active="activeMenu"
      class="el-menu-vertical"
      router
    >
      <el-menu-item index="/articles">
        <el-icon><Document /></el-icon>
        <span>文章管理</span>
      </el-menu-item>
      
      <el-menu-item index="/tags" @click="handleNotBuilt">
        <el-icon><CollectionTag /></el-icon>
        <span>標籤管理</span>
      </el-menu-item>
      
      <el-menu-item index="/settings" @click="handleNotBuilt">
        <el-icon><Setting /></el-icon>
        <span>系統設定</span>
      </el-menu-item>
    </el-menu>
  </el-aside>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'

const route = useRoute()
// 讓側邊欄的高亮項目，永遠跟隨目前的網址
const activeMenu = ref(route.path)

watch(() => route.path, (newPath) => {
  activeMenu.value = newPath
})

const handleNotBuilt = (e) => {
  e.preventDefault() // 阻止預設的路由跳轉
  ElMessage.info('該功能正在建置中...')
}
</script>

<style scoped>
.app-aside {
  background-color: #304156;
  transition: width 0.3s;
  display: flex;
  flex-direction: column;
}
.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #2b3643;
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  letter-spacing: 1px;
  gap: 10px;
}
.el-menu-vertical {
  border-right: none;
  flex: 1;
}
</style>