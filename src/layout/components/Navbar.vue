<template>
  <div class="navbar">
    <div class="right-menu">
      <el-dropdown class="avatar-container right-menu-item hover-effect" trigger="click">
        <div class="avatar-wrapper">
          {{ $t("user.lang") }}
          <i class="el-icon-arrow-down" />
        </div>
        <el-dropdown-menu slot="dropdown">
          <el-dropdown-item @click.native="langToggle('zh')">
            {{ $t("user.chinese") }}
          </el-dropdown-item>
          <el-dropdown-item @click.native="langToggle('en')">
            {{ $t("user.english") }}
          </el-dropdown-item>
        </el-dropdown-menu>
      </el-dropdown>
      <el-dropdown class="avatar-container right-menu-item hover-effect" trigger="click">
        <div class="avatar-wrapper">
          {{ $t("user.userName") }}
          <i class="el-icon-arrow-down" />
        </div>
        <el-dropdown-menu slot="dropdown">
          <router-link to="/">
            <el-dropdown-item>{{ $t("user.clusterManagement") }}</el-dropdown-item>
          </router-link>
          <el-dropdown-item divided @click.native="logout">
            <span style="display:block;">{{ $t("user.logout") }}</span>
          </el-dropdown-item>
        </el-dropdown-menu>
      </el-dropdown>
    </div>
  </div>
</template>

<script>

export default {
  methods: {
    async logout() {
      await this.$store.dispatch('user/logout')
      this.$router.push(`/login?redirect=${this.$route.fullPath}`)
    },
    langToggle(lang) {
      this.$i18n.locale = lang
      localStorage.setItem('lang', lang)
      this.$router.go(0)
    }
  }
}
</script>

<style lang="scss" scoped>
.navbar {
  height: 60px;
  overflow: hidden;
  position: relative;

  .right-menu {
    float: right;
    height: 100%;
    line-height: 50px;
    &:focus {
      outline: none;
    }

    .right-menu-item {
      display: inline-block;
      padding: 0 8px;
      height: 100%;
      font-size: 18px;
      color: #5a5e66;
      vertical-align: text-bottom;

      &.hover-effect {
        cursor: pointer;
        transition: background .3s;

        &:hover {
          background: rgba(0, 0, 0, .025)
        }
      }
    }

    .avatar-container {
      margin-right: 30px;
      .avatar-wrapper {
        margin-top: 5px;
        position: relative;
        line-height: 55px;
      }
    }
  }
}
</style>
