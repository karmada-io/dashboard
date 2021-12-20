<template>
  <div class="sidebar-logo-container" :class="{'collapse':collapse}">
    <transition name="sidebarLogoFade">
      <router-link v-if="collapse" key="collapse" class="sidebar-logo-link" to="/">
      </router-link>
      <router-link v-else key="expand" class="sidebar-logo-link" to="/">
        <img src="@/assets/clusterManage/karmada-logo.png" class="sidebar-logo">
      </router-link>
    </transition>
  </div>
</template>

<script>
export default {
  name: 'SidebarLogo',
  props: {
    collapse: {
      type: Boolean,
      required: true
    }
  },
  data() {
    return {
      title: 'KARMADA'
    }
  }
}
</script>

<style lang="scss" scoped>
.sidebarLogoFade-enter-active {
  transition: opacity 1.5s;
}

.sidebarLogoFade-enter,
.sidebarLogoFade-leave-to {
  opacity: 0;
}

.sidebar-logo-container {
  position: relative;
  width: 100%;
  height: 100px;
  line-height: 100px;
  // background: #2b2f3a;
  text-align: center;
  overflow: hidden;
  // box-shadow: 0 1px 4px rgba(0,21,41,.08);
  z-index: 9;

  & .sidebar-logo-link {
    height: 100%;
    width: 100%;

    & .sidebar-logo {
      // width: 32px;
      // height: 100%;
      // padding: 5px 0;
      height: 60px;
      // margin-top: 10px;
      vertical-align: middle;
      // margin-right: 12px;
    }

    & .sidebar-title {
      display: inline-block;
      margin: 0;
      // color: #fff;
      color: #999999;
      // font-weight: 600;
      line-height: 50px;
      font-size: 14px;
      font-family: Avenir, Helvetica Neue, Arial, Helvetica, sans-serif;
      vertical-align: middle;
    }
  }

  &.collapse {
    .sidebar-logo {
      margin-right: 0px;
    }
  }
}

</style>
