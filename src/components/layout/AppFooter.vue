<template>
  <footer
    class="ml-72 border-t border-surface-container bg-surface-container-low/70 px-container-padding py-6"
  >
    <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <p class="text-label-md font-semibold text-primary">TaskSpace</p>
        <p class="text-sm text-on-surface-variant">
          Hệ thống tổ chức công việc giáo viên · Kindred Interface
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-4 text-sm text-on-surface-variant">
        <a href="#" class="transition-colors hover:text-primary">Điều khoản</a>
        <a href="#" class="transition-colors hover:text-primary">Hỗ trợ</a>
        <span>© {{ year }} Edutalk</span>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
const year = new Date().getFullYear();
</script>
