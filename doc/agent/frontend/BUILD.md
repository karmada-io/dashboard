# Karmada-Manager 前端构建和部署说明

## 1. 文档信息

### 1.1 版本历史

| 版本号 | 日期 | 作者 | 变更说明 |
|--------|------|------|----------|
| 1.0 | 2025-01-XX | 前端开发工程师 | 初稿创建，构建部署配置 |

### 1.2 文档目的

提供Karmada-Manager前端项目的完整构建、部署和维护指南，确保开发和生产环境的一致性。

## 2. 项目结构

### 2.1 目录结构
```
ui/apps/dashboard/
├── public/                 # 静态资源
│   ├── index.html         # HTML 模板
│   ├── favicon.ico        # 网站图标
│   └── assets/            # 公共资源
├── src/                   # 源代码
│   ├── components/        # 公共组件
│   ├── pages/            # 页面组件
│   ├── hooks/            # 自定义Hook
│   ├── services/         # API服务
│   ├── utils/            # 工具函数
│   ├── assets/           # 静态资源
│   ├── layout/           # 布局组件
│   ├── routes/           # 路由配置
│   ├── App.tsx           # 应用入口
│   └── main.tsx          # 主文件
├── package.json          # 依赖配置
├── vite.config.ts        # Vite配置
├── tsconfig.json         # TypeScript配置
├── tailwind.config.js    # Tailwind配置
└── README.md             # 项目说明
```

### 2.2 关键配置文件

#### vite.config.ts
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@services': path.resolve(__dirname, './src/services'),
      '@assets': path.resolve(__dirname, './src/assets')
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api/v1')
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/js/[name].[hash].js',
        entryFileNames: 'assets/js/[name].[hash].js',
        assetFileNames: 'assets/[ext]/[name].[hash].[ext]'
      }
    }
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version)
  }
})
```

#### package.json
```json
{
  "name": "karmada-manager-dashboard",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "build:prod": "NODE_ENV=production tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --ext ts,tsx --fix",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.0",
    "antd": "^5.12.8",
    "@ant-design/charts": "^1.4.2",
    "@ant-design/icons": "^5.2.6",
    "axios": "^1.6.2",
    "dayjs": "^1.11.10",
    "lodash-es": "^4.17.21",
    "react-query": "^3.39.3",
    "zustand": "^4.4.7"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@types/lodash-es": "^4.17.12",
    "@typescript-eslint/eslint-plugin": "^6.14.0",
    "@typescript-eslint/parser": "^6.14.0",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.16",
    "eslint": "^8.55.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.5",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.3.6",
    "typescript": "^5.2.2",
    "vite": "^5.0.8",
    "vitest": "^1.0.4"
  }
}
```

## 3. 环境配置

### 3.1 环境变量

#### .env.development
```bash
# 开发环境配置
VITE_APP_ENV=development
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_WS_URL=ws://localhost:8080/api/v1/ws
VITE_APP_TITLE=Karmada Manager (Dev)
VITE_ENABLE_MOCK=false
VITE_LOG_LEVEL=debug
```

#### .env.production
```bash
# 生产环境配置
VITE_APP_ENV=production
VITE_API_BASE_URL=/api/v1
VITE_WS_URL=/api/v1/ws
VITE_APP_TITLE=Karmada Manager
VITE_ENABLE_MOCK=false
VITE_LOG_LEVEL=error
```

#### .env.test
```bash
# 测试环境配置
VITE_APP_ENV=test
VITE_API_BASE_URL=http://test-api.example.com/api/v1
VITE_WS_URL=ws://test-api.example.com/api/v1/ws
VITE_APP_TITLE=Karmada Manager (Test)
VITE_ENABLE_MOCK=true
VITE_LOG_LEVEL=info
```

### 3.2 TypeScript配置

#### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@pages/*": ["src/pages/*"],
      "@utils/*": ["src/utils/*"],
      "@services/*": ["src/services/*"],
      "@assets/*": ["src/assets/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

## 4. 开发环境搭建

### 4.1 系统要求
- Node.js >= 18.0.0
- npm >= 9.0.0 或 yarn >= 1.22.0
- Git

### 4.2 安装步骤

#### 1. 克隆项目
```bash
git clone <repository-url>
cd Karmada-Manager/ui/apps/dashboard
```

#### 2. 安装依赖
```bash
# 使用 npm
npm install

# 或使用 yarn
yarn install

# 或使用 pnpm
pnpm install
```

#### 3. 启动开发服务器
```bash
npm run dev
```

访问 http://localhost:3000 查看应用

### 4.3 开发工具配置

#### VSCode 推荐插件
```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json"
  ]
}
```

#### VSCode 设置
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

## 5. 构建流程

### 5.1 开发构建
```bash
# 开发模式构建（包含 source map）
npm run build
```

### 5.2 生产构建
```bash
# 生产模式构建（优化压缩）
npm run build:prod
```

### 5.3 构建输出
```
dist/
├── index.html              # 入口HTML
├── assets/
│   ├── js/
│   │   ├── index.[hash].js # 主应用代码
│   │   └── vendor.[hash].js # 第三方库
│   ├── css/
│   │   └── index.[hash].css # 样式文件
│   └── images/             # 图片资源
└── manifest.json           # 资源清单
```

### 5.4 构建优化配置

#### Rollup配置优化
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          antd: ['antd', '@ant-design/icons', '@ant-design/charts'],
          utils: ['axios', 'dayjs', 'lodash-es']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})
```

## 6. 部署方案

### 6.1 静态文件部署

#### Nginx 配置
```nginx
server {
    listen 80;
    server_name karmada-manager.example.com;
    
    root /var/www/karmada-manager;
    index index.html;
    
    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API 代理
    location /api/ {
        proxy_pass http://backend:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket 代理
    location /api/v1/ws {
        proxy_pass http://backend:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
    
    # SPA 路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

#### Apache 配置
```apache
<VirtualHost *:80>
    ServerName karmada-manager.example.com
    DocumentRoot /var/www/karmada-manager
    
    # 静态资源缓存
    <LocationMatch "\.(js|css|png|jpg|jpeg|gif|ico|svg)$">
        ExpiresActive On
        ExpiresDefault "access plus 1 year"
        Header append Cache-Control "public, immutable"
    </LocationMatch>
    
    # API 代理
    ProxyPass /api/ http://backend:8080/api/
    ProxyPassReverse /api/ http://backend:8080/api/
    
    # SPA 路由支持
    <Directory "/var/www/karmada-manager">
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
        
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
</VirtualHost>
```

### 6.2 Docker 容器部署

#### Dockerfile
```dockerfile
# 多阶段构建
FROM node:18-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY package*.json ./
COPY yarn.lock ./

# 安装依赖
RUN yarn install --frozen-lockfile

# 复制源代码
COPY . .

# 构建应用
RUN yarn build:prod

# 生产阶段
FROM nginx:alpine

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### docker-compose.yml
```yaml
version: '3.8'

services:
  karmada-manager-frontend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - karmada-manager-backend
    restart: unless-stopped
    
  karmada-manager-backend:
    image: karmada-manager-backend:latest
    ports:
      - "8080:8080"
    environment:
      - ENV=production
    restart: unless-stopped
```

### 6.3 Kubernetes 部署

#### deployment.yaml
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: karmada-manager-frontend
  namespace: karmada-system
spec:
  replicas: 3
  selector:
    matchLabels:
      app: karmada-manager-frontend
  template:
    metadata:
      labels:
        app: karmada-manager-frontend
    spec:
      containers:
      - name: frontend
        image: karmada-manager-frontend:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: karmada-manager-frontend-service
  namespace: karmada-system
spec:
  selector:
    app: karmada-manager-frontend
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: karmada-manager-frontend-ingress
  namespace: karmada-system
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: karmada-manager.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: karmada-manager-frontend-service
            port:
              number: 80
```

## 7. CI/CD 流程

### 7.1 GitHub Actions

#### .github/workflows/frontend.yml
```yaml
name: Frontend CI/CD

on:
  push:
    branches: [ main, develop ]
    paths: [ 'ui/apps/dashboard/**' ]
  pull_request:
    branches: [ main ]
    paths: [ 'ui/apps/dashboard/**' ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: ui/apps/dashboard/package-lock.json
    
    - name: Install dependencies
      working-directory: ui/apps/dashboard
      run: npm ci
    
    - name: Run type check
      working-directory: ui/apps/dashboard
      run: npm run type-check
    
    - name: Run linter
      working-directory: ui/apps/dashboard
      run: npm run lint
    
    - name: Run tests
      working-directory: ui/apps/dashboard
      run: npm run test:coverage
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: ui/apps/dashboard/coverage/lcov.info

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: ui/apps/dashboard/package-lock.json
    
    - name: Install dependencies
      working-directory: ui/apps/dashboard
      run: npm ci
    
    - name: Build application
      working-directory: ui/apps/dashboard
      run: npm run build:prod
    
    - name: Build Docker image
      uses: docker/build-push-action@v5
      with:
        context: ui/apps/dashboard
        push: true
        tags: |
          karmada-manager-frontend:latest
          karmada-manager-frontend:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production
    
    steps:
    - name: Deploy to production
      run: |
        # 部署脚本
        kubectl set image deployment/karmada-manager-frontend \
          frontend=karmada-manager-frontend:${{ github.sha }}
```

### 7.2 构建脚本

#### scripts/build.sh
```bash
#!/bin/bash

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查环境
check_environment() {
    log_info "检查构建环境..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安装"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    REQUIRED_VERSION="18.0.0"
    
    if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
        log_error "Node.js 版本过低，需要 >= $REQUIRED_VERSION"
        exit 1
    fi
    
    log_info "环境检查通过"
}

# 安装依赖
install_dependencies() {
    log_info "安装依赖..."
    npm ci --silent
    log_info "依赖安装完成"
}

# 代码检查
code_check() {
    log_info "运行代码检查..."
    
    # TypeScript 类型检查
    npm run type-check
    
    # ESLint 检查
    npm run lint
    
    log_info "代码检查通过"
}

# 运行测试
run_tests() {
    log_info "运行测试..."
    npm run test:coverage
    log_info "测试完成"
}

# 构建应用
build_app() {
    local ENV=${1:-production}
    log_info "构建应用 (环境: $ENV)..."
    
    if [ "$ENV" = "production" ]; then
        npm run build:prod
    else
        npm run build
    fi
    
    log_info "构建完成"
}

# 构建 Docker 镜像
build_docker() {
    local TAG=${1:-latest}
    log_info "构建 Docker 镜像 (标签: $TAG)..."
    
    docker build -t karmada-manager-frontend:$TAG .
    
    log_info "Docker 镜像构建完成"
}

# 主函数
main() {
    local ACTION=${1:-build}
    local ENV=${2:-production}
    local TAG=${3:-latest}
    
    case $ACTION in
        "check")
            check_environment
            ;;
        "install")
            check_environment
            install_dependencies
            ;;
        "lint")
            code_check
            ;;
        "test")
            run_tests
            ;;
        "build")
            check_environment
            install_dependencies
            code_check
            run_tests
            build_app $ENV
            ;;
        "docker")
            build_docker $TAG
            ;;
        "all")
            check_environment
            install_dependencies
            code_check
            run_tests
            build_app $ENV
            build_docker $TAG
            ;;
        *)
            log_error "未知操作: $ACTION"
            echo "用法: $0 {check|install|lint|test|build|docker|all} [env] [tag]"
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
```

## 8. 性能优化

### 8.1 构建优化

#### 代码分割
```typescript
// 路由级别的代码分割
const Overview = lazy(() => import('@pages/overview'));
const ClusterManage = lazy(() => import('@pages/cluster-manage'));
const MulticloudResource = lazy(() => import('@pages/multicloud-resource-manage'));
```

#### Tree Shaking 配置
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      treeshake: {
        moduleSideEffects: false
      }
    }
  }
})
```

### 8.2 运行时优化

#### 资源预加载
```typescript
// 路由预加载
const prefetchRoute = (routeName: string) => {
  import(`@pages/${routeName}`);
};

// 关键资源预加载
const preloadCriticalResources = () => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = '/api/v1/overview';
  link.as = 'fetch';
  document.head.appendChild(link);
};
```

#### 缓存策略
```typescript
// API 响应缓存
const cacheConfig = {
  staleTime: 5 * 60 * 1000, // 5分钟
  cacheTime: 10 * 60 * 1000, // 10分钟
};

// 静态资源缓存
const staticCacheHeaders = {
  'Cache-Control': 'public, max-age=31536000, immutable'
};
```

## 9. 监控和日志

### 9.1 性能监控

#### Web Vitals 监控
```typescript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

const sendToAnalytics = (metric: any) => {
  // 发送到监控服务
  console.log(metric);
};

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

#### 错误监控
```typescript
// 全局错误处理
window.addEventListener('error', (event) => {
  console.error('JavaScript Error:', event.error);
  // 发送错误报告
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise Rejection:', event.reason);
  // 发送错误报告
});
```

### 9.2 日志配置

#### 日志级别
```typescript
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

class Logger {
  private level: LogLevel;
  
  constructor(level: LogLevel) {
    this.level = level;
  }
  
  debug(message: string, ...args: any[]) {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }
  
  info(message: string, ...args: any[]) {
    if (this.level <= LogLevel.INFO) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }
  
  warn(message: string, ...args: any[]) {
    if (this.level <= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }
  
  error(message: string, ...args: any[]) {
    if (this.level <= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }
}
```

## 10. 维护和更新

### 10.1 依赖更新

#### 定期更新脚本
```bash
#!/bin/bash

# 检查过期依赖
npm outdated

# 更新次要版本
npm update

# 更新主要版本（谨慎）
npx npm-check-updates -u
npm install

# 安全审计
npm audit
npm audit fix
```

### 10.2 版本发布

#### 版本发布流程
1. 更新版本号
2. 生成变更日志
3. 创建发布标签
4. 构建和部署
5. 发布通知

#### 发布脚本
```bash
#!/bin/bash

VERSION=$1

if [ -z "$VERSION" ]; then
    echo "请提供版本号"
    exit 1
fi

# 更新版本号
npm version $VERSION

# 生成变更日志
git log --oneline --since="2 weeks ago" > CHANGELOG.md

# 推送标签
git push origin --tags

# 触发 CI/CD
git push origin main
```

## 11. 故障排查

### 11.1 常见问题

#### 构建失败
- 检查 Node.js 版本
- 清理缓存：`rm -rf node_modules package-lock.json && npm install`
- 检查环境变量配置

#### 运行时错误
- 检查浏览器控制台错误
- 验证 API 接口连通性
- 检查网络代理配置

#### 性能问题
- 分析 bundle 大小
- 检查网络请求
- 优化图片和资源加载

### 11.2 调试工具

#### 开发者工具配置
```typescript
// 开发环境调试配置
if (import.meta.env.DEV) {
  // 启用 React DevTools
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = window.__REACT_DEVTOOLS_GLOBAL_HOOK__ || {};
  
  // 性能调试
  if ('performance' in window) {
    window.performance.mark('app-start');
  }
}
```

---

*此构建部署文档将随着项目发展持续更新和完善* 