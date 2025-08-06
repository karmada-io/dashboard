# 🚀 Karmada Dashboard Enhanced

A modern, enterprise-grade web interface for managing multi-cloud Kubernetes clusters with Karmada. Built with React, TypeScript, and Tailwind CSS, this enhanced dashboard provides comprehensive cluster management, policy configuration, and monitoring capabilities.

![Dashboard Preview](https://img.shields.io/badge/Status-Production%20Ready-success)
![React](https://img.shields.io/badge/React-18.3-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4-blue)

## ✨ Features

### 🎯 Core Functionality
- **Multi-Cluster Management**: Centralized control of member clusters across multiple cloud providers
- **Workload Orchestration**: Deploy and manage applications across clusters seamlessly
- **Policy Management**: Configure propagation and override policies for intelligent resource distribution
- **Real-time Monitoring**: Live cluster health, metrics, and resource utilization
- **Terminal Integration**: Built-in Karmada CLI access with WebSocket support

### 🔐 Enterprise Security
- **Token-based Authentication**: Secure JWT authentication with role-based access
- **Protected Routes**: Route-level security with automatic redirects
- **Session Management**: Persistent authentication with secure token storage
- **RBAC Support**: Role-based access control integration (ready for backend implementation)

### 🎨 Modern UI/UX
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Dark/Light Theme**: System preference detection with manual toggle
- **Glass Morphism**: Modern UI design with backdrop blur effects
- **Smooth Animations**: Framer Motion powered transitions and micro-interactions
- **Accessible**: WCAG compliant with keyboard navigation support

### 🛠 Developer Experience
- **TypeScript**: Full type safety with comprehensive API type definitions
- **Component Library**: Reusable UI components with consistent design system
- **State Management**: Zustand for efficient global state management
- **API Layer**: Axios-based API client with interceptors and error handling
- **Hot Reload**: Vite-powered development with instant updates

## 🏗 Architecture

### 📁 Project Structure
```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (Button, Card, etc.)
│   ├── navigation/     # Navigation components (Sidebar, Header)
│   ├── forms/          # Form components and inputs
│   ├── tables/         # Data table components
│   ├── charts/         # Chart and visualization components
│   └── modals/         # Modal and dialog components
├── pages/              # Page components
│   ├── auth/           # Authentication pages
│   ├── dashboard/      # Dashboard overview
│   ├── clusters/       # Cluster management
│   ├── workloads/      # Workload management
│   ├── policies/       # Policy management
│   ├── monitoring/     # Monitoring and observability
│   └── settings/       # Settings and configuration
├── services/           # API and external services
│   ├── api/           # API client and endpoints
│   ├── auth/          # Authentication services
│   └── websocket/     # WebSocket connections
├── stores/            # State management
│   ├── authStore.ts   # Authentication state
│   └── globalStore.ts # Global UI state
├── hooks/             # Custom React hooks
├── utils/             # Utility functions
├── types/             # TypeScript type definitions
├── layouts/           # Layout components
└── assets/            # Static assets
```

### 🔄 State Management
- **Zustand**: Lightweight state management with persistence
- **React Query**: Server state management with caching and synchronization
- **Local Storage**: Persistent settings and authentication tokens

### 🌐 API Integration
- **RESTful APIs**: Complete integration with Karmada API endpoints
- **Type Safety**: Full TypeScript definitions for all API responses
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Caching**: Intelligent caching strategies for optimal performance

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or pnpm
- Karmada cluster (for backend API)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd karmada-dashboard-enhanced
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

4. **Open in browser**
   ```
   http://localhost:5173
   ```

### 🔧 Configuration

#### Environment Variables
Create a `.env.local` file for environment-specific configuration:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_BASE_URL=ws://localhost:8000

# Development Settings
VITE_DEV_MODE=true
VITE_ENABLE_MOCK_DATA=true
```

#### Tailwind Customization
Modify `tailwind.config.js` to customize the design system:

```javascript
theme: {
  extend: {
    colors: {
      primary: { /* your brand colors */ },
      secondary: { /* your secondary colors */ }
    }
  }
}
```

## 🔌 API Integration

### Authentication
The dashboard supports token-based authentication compatible with Karmada's security model:

```typescript
// Login with service account token
await authAPI.login({ token: 'your-karmada-token' });

// Check authentication status
const isAuthenticated = await authAPI.me();
```

### Cluster Management
```typescript
// Get all clusters
const clusters = await clustersAPI.getClusters({
  filterBy: ['name', 'production'],
  sortBy: ['creationTime'],
  page: 1,
  itemsPerPage: 10
});

// Create new cluster
await clustersAPI.createCluster({
  clusterName: 'new-cluster',
  kubeconfig: 'base64-encoded-kubeconfig',
  mode: 'Push'
});
```

### Policy Management
```typescript
// Create propagation policy
await policiesAPI.createPropagationPolicy({
  namespace: 'default',
  name: 'web-policy',
  propagationData: yamlConfig,
  isClusterScope: false
});
```

## 🎨 UI Components

### Button Component
```tsx
<Button 
  variant="primary" 
  size="md" 
  leftIcon={<Plus />}
  isLoading={loading}
  onClick={handleClick}
>
  Create Resource
</Button>
```

### Card Component
```tsx
<Card variant="elevated" padding="lg">
  <CardHeader>
    <h3>Cluster Overview</h3>
  </CardHeader>
  <CardBody>
    <p>Cluster details...</p>
  </CardBody>
</Card>
```

## 📊 Monitoring & Observability

### Real-time Updates
- WebSocket connections for live data
- Automatic refresh intervals
- Push notifications for critical events

### Metrics Dashboard
- Cluster health indicators
- Resource utilization charts
- Performance metrics visualization
- Alert and notification system

## 🔒 Security Features

### Authentication & Authorization
- JWT token validation
- Role-based access control
- Session timeout handling
- Secure token storage

### Security Best Practices
- CSP headers support
- XSS protection
- CSRF token handling
- Audit logging ready

## 🚢 Deployment

### Production Build
```bash
npm run build
```

### Docker Deployment
```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: karmada-dashboard-enhanced
spec:
  replicas: 3
  selector:
    matchLabels:
      app: karmada-dashboard-enhanced
  template:
    metadata:
      labels:
        app: karmada-dashboard-enhanced
    spec:
      containers:
      - name: dashboard
        image: karmada-dashboard-enhanced:latest
        ports:
        - containerPort: 80
```

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

### E2E Tests
```bash
npm run test:e2e
```

### Linting
```bash
npm run lint
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Use conventional commit messages
- Add tests for new features
- Update documentation as needed
- Ensure responsive design principles

## 📈 Roadmap

### Phase 1: Core Features ✅
- [x] Authentication system
- [x] Cluster management
- [x] Basic workload management
- [x] Policy configuration
- [x] Dashboard overview

### Phase 2: Enhanced Features 🚧
- [ ] Advanced monitoring & alerting
- [ ] Cost management & optimization
- [ ] Multi-tenant support
- [ ] Advanced RBAC
- [ ] Audit logging
- [ ] Backup & disaster recovery

### Phase 3: Enterprise Features 📋
- [ ] SSO integration (OIDC, SAML)
- [ ] Advanced analytics
- [ ] Compliance reporting
- [ ] Custom dashboards
- [ ] API rate limiting
- [ ] Advanced security features

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Karmada](https://karmada.io/) - Multi-cloud Kubernetes orchestration
- [React](https://reactjs.org/) - User interface library
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Lucide Icons](https://lucide.dev/) - Beautiful icon library
- [Vite](https://vitejs.dev/) - Next generation frontend tooling

## 💬 Support

- 📖 [Documentation](https://karmada.io/docs/)
- 🐛 [Issue Tracker](https://github.com/karmada-io/karmada/issues)
- 💬 [Community Chat](https://karmada.io/community/)
- 📧 [Mailing List](https://groups.google.com/forum/#!forum/karmada)

---

**Built with ❤️ for the Karmada community**
