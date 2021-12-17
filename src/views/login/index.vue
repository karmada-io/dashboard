<template>
  <div class="login-container">
    <div class="manufacturer">
      <el-row :gutter="50" class="login-part">
        <el-col :span="12">
          <p class="title">{{ $t('login.karmada_title') }}</p>
          <p>{{ $t('login.welcome') }}</p>
          <img src="@/assets/left_img.png">
        </el-col>
        <el-col :span="12">
          <el-card shadow="always">
            <el-form
              ref="loginForm"
              :model="loginForm"
              :rules="loginRules"
              class="login-form"
              autocomplete="on"
              label-position="left"
            >
              <div class="title-container">
                <p>{{ $t('login.tokenLogin') }}</p>
              </div>

              <el-form-item prop="token" label="">
                <el-input
                  v-model="loginForm.token"
                  type="textarea"
                  :rows="6"
                  :placeholder="$t('login.enterToken')"
                />
              </el-form-item>

              <!-- <el-form-item prop="username" label="">
                <el-input
                  ref="username"
                  v-model="loginForm.username"
                  placeholder="用户名/手机号码"
                  name="username"
                  type="text"
                  tabindex="1"
                  autocomplete="on"
                />
              </el-form-item>
              <el-form-item prop="password" label="">
                <el-input
                  :key="passwordType"
                  ref="password"
                  v-model="loginForm.password"
                  placeholder="密码"
                  name="password"
                  tabindex="2"
                  autocomplete="on"
                  show-password
                  @keyup.native="checkCapslock"
                  @blur="capsTooltip = false"
                  @keyup.enter.native="handleLogin"
                />
              </el-form-item>
              <el-form-item prop="password" label="">
                <el-input placeholder="获取手机验证码">
                  <template slot="append">获取手机验证码</template>
                </el-input>
              </el-form-item>
              <div class="forget-div">
                <el-checkbox class="margin-20">记住我</el-checkbox>
                <span>忘记密码?</span>
              </div> -->
              <el-button
                :loading="loading"
                type="primary"
                style="width: 100%; margin-bottom: 30px"
                @click.native.prevent="handleLogin"
              >{{ $t('login.login') }}</el-button>
            </el-form>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script>
// import { isString } from '@/utils/validate'
import { loginApi } from '@/api/user'

export default {
  name: 'Login',
  data() {
    // const validateUsername = (rule, value, callback) => {
    //   if (!isString(value)) {
    //     callback(new Error('Please enter the correct user name'))
    //   } else {
    //     callback()
    //   }
    // }
    // const validatePassword = (rule, value, callback) => {
    //   if (value.length < 6) {
    //     callback(new Error('The password can not be less than 6 digits'))
    //   } else {
    //     callback()
    //   }
    // }
    return {
      loginForm: {},
      loginRules: {
        token: [
          { required: true, trigger: 'blur', message: this.$t('login.enterToken') }
        ]
        // username: [
        //   { required: true, trigger: 'blur', validator: validateUsername }
        // ],
        // password: [
        //   { required: true, trigger: 'blur', validator: validatePassword }
        // ]
      },
      passwordType: 'password',
      capsTooltip: false,
      loading: false,
      showDialog: false,
      redirect: undefined,
      otherQuery: {}
    }
  },
  watch: {
    $route: {
      handler: function(route) {
        const query = route.query
        if (query) {
          this.redirect = query.redirect
          this.otherQuery = this.getOtherQuery(query)
        }
      },
      immediate: true
    }
  },
  methods: {
    checkCapslock(e) {
      const { key } = e
      this.capsTooltip = key && key.length === 1 && key >= 'A' && key <= 'Z'
    },
    handleLogin() {
      this.$refs.loginForm.validate((valid) => {
        if (valid) {
          this.loading = true
          loginApi(this.loginForm.token).then(res => {
            const { items } = res
            if (items) {
              this.$store.dispatch('user/login', this.loginForm.token)
              this.$router.push({
                path: this.redirect || '/',
                query: this.otherQuery
              })
            }
          }).catch(error => {
            console.log(error)
          })
          this.loading = false
        } else {
          console.log('error submit!!')
          return false
        }
      })
    },
    getOtherQuery(query) {
      return Object.keys(query).reduce((acc, cur) => {
        if (cur !== 'redirect') {
          acc[cur] = query[cur]
        }
        return acc
      }, {})
    }
  }
}
</script>

<style lang="scss">
.manufacturer {
  max-width: 1200px;
  margin: 0 auto;
  box-sizing: border-box;
  padding: 130px 20px;
  text-align: left;
}
@media screen and (max-width: 1200px) {
  .manufacturer {
    width: 86%;
    padding: 80px 20px;
    .indexTitle {
      font-size: 1rem;
    }
  }
}

.login-part {
  img {
    width: 75%;
    margin-top: -50px;
  }
  p {
    font-size: 25px;
    padding: 0 20px;
    text-align: left;
  }
  .title {
    font-size: 40px;
    font-weight: 600;
    margin: 0;
  }
  .el-card {
    margin: 0 20px;
  }
  .login-form {
    margin: 40px;
    color: #666666;
    .title-container p {
      padding: 0;
    }
  }
}
.forget-div {
  display: flex;
  font-size: 14px;
  align-items: center;
  justify-content: space-between;
  margin: 20px 0;
}
.el-input--small .el-input__inner {
  height: 40px;
  line-height: 40px;
}
</style>
