<template>
  <div class="dashboard-container">
    <HeadNav :mini="true" />
    <Console />
    <Footer />
  </div>
</template>

<script>
import HeadNav from '../components/headNav.vue'
import Console from '../components/console.vue'
import Footer from '../components/footer.vue'

export default {
  name: 'Index',
  components: { HeadNav, Console, Footer },
  data() {
    return {
    }
  },
  computed: {
  },
  created() {
    // if (!this.roles.includes('admin')) {
    //   this.currentRole = 'editorDashboard'
    // }
  }
}
</script>
