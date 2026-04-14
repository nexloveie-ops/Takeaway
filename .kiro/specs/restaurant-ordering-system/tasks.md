# 实现计划：餐馆点餐系统

## 概述

将餐馆点餐系统的设计拆分为增量式编码任务。系统采用 React + TypeScript 前端、Node.js + Express + TypeScript 后端、MongoDB Atlas + Mongoose 数据库、Socket.IO 实时通信的技术栈。每个任务逐步构建，最终将所有组件集成为完整系统。

## 任务

- [x] 1. 项目结构初始化与基础配置
  - [x] 1.1 创建项目目录结构与初始化前后端工程
    - 创建 `frontend/` 和 `backend/` 目录
    - 初始化前端 React + TypeScript 项目（Vite）
    - 初始化后端 Node.js + Express + TypeScript 项目
    - 配置 TypeScript 编译选项（tsconfig.json）
    - 安装核心依赖：mongoose、socket.io、i18next、fast-check、jest 等
    - _需求: 全局_

  - [x] 1.2 创建 Dockerfile 多阶段构建配置
    - 按设计文档创建根目录 `/Dockerfile`，包含前端构建、后端构建、生产镜像三个阶段
    - 配置 `express.static('public')` 托管前端构建产物
    - 配置 `PORT` 环境变量（默认 8080）
    - _需求: 全局_

  - [x] 1.3 创建后端 Express 服务入口与数据库连接
    - 创建 `backend/src/server.ts` 入口文件，配置 Express 中间件（JSON解析、CORS、静态文件）
    - 实现 `connectDB()` 函数，通过 `process.env.DBCON` 连接 MongoDB Atlas
    - 配置 Socket.IO 服务端，绑定到 HTTP Server
    - 实现统一错误响应格式（`{ error: { code, message, details } }`）
    - _需求: 全局_

  - [x] 1.4 创建前端路由结构与布局框架
    - 配置 React Router，定义顾客端、收银端、管理员后台三套路由
    - 创建基础布局组件（顾客端布局、收银端布局、管理员布局）
    - 配置 i18next 国际化框架，加载至少中文和英文两种语言资源
    - 创建 `LanguageSwitcher` 语言切换组件
    - _需求: 14.1, 14.2_

- [x] 2. 数据模型与权限系统
  - [x] 2.1 创建 Mongoose 数据模型
    - 实现 `AdminSchema`（admins 集合）：username、passwordHash、role、timestamps
    - 实现 `MenuCategorySchema`（menu_categories 集合）：sortOrder、translations 嵌入子文档
    - 实现 `MenuItemSchema`（menu_items 集合）：categoryId、price、calories、avgWaitMinutes、photoUrl、arFileUrl、isSoldOut、translations 嵌入子文档
    - 实现 `OrderSchema`（orders 集合）：type、tableNumber、seatNumber、dailyOrderNumber、status、items 嵌入子文档（含 unitPrice 和 itemName 快照）
    - 实现 `CheckoutSchema`（checkouts 集合）：type、tableNumber、totalAmount、paymentMethod、cashAmount、cardAmount、orderIds、checkedOutAt
    - 实现 `SystemConfigSchema`（system_configs 集合）：key、value
    - 实现 `DailyOrderCounterSchema`（daily_order_counters 集合）：date、currentNumber
    - _需求: 1.2, 4.1, 4.2, 4.3, 4.4, 6.2, 6.3, 7.1, 8.1, 11.2, 11.3, 14.3, 16.1_

  - [x] 2.2 属性测试：菜单数据持久化往返
    - **Property 12: 菜单数据持久化往返**
    - 对任意有效的菜品分类或菜品数据，创建后再读取应返回等价数据
    - **验证: 需求 7.1, 8.1**

  - [x] 2.3 实现管理员认证与权限中间件
    - 实现 `POST /api/auth/login` 登录接口（JWT token）
    - 实现 `authMiddleware` 认证中间件（验证 JWT）
    - 实现 `requirePermission(permission)` 权限中间件
    - 定义角色权限映射：owner 拥有全部权限，cashier 仅拥有收银相关权限
    - _需求: 16.1, 16.2, 16.3, 16.4, 16.5_

  - [x] 2.4 属性测试：权限控制正确性
    - **Property 22: 权限控制正确性**
    - 对任意管理员角色和受保护API端点，系统应当且仅当该角色拥有对应权限时允许访问
    - **验证: 需求 16.2, 16.3, 16.4**

- [x] 3. 菜单管理模块
  - [x] 3.1 实现菜品分类 CRUD API
    - 实现 `GET /api/menu/categories`（支持 `?lang` 参数按语言筛选）
    - 实现 `POST /api/menu/categories` 创建分类
    - 实现 `PUT /api/menu/categories/:id` 更新分类
    - 实现 `DELETE /api/menu/categories/:id` 删除分类（检查关联菜品，有关联则返回 409 `CATEGORY_HAS_ITEMS`）
    - _需求: 7.1, 7.2, 7.3_

  - [x] 3.2 属性测试：分类删除保护
    - **Property 11: 分类删除保护**
    - 当分类下存在关联菜品时删除应被拒绝，无关联菜品时删除应成功
    - **验证: 需求 7.3**

  - [x] 3.3 实现菜品信息 CRUD API
    - 实现 `GET /api/menu/items`（支持 `?lang` 和 `?category` 参数）
    - 实现 `POST /api/menu/items` 创建菜品
    - 实现 `PUT /api/menu/items/:id` 更新菜品信息
    - 实现 `DELETE /api/menu/items/:id` 删除菜品
    - 实现 `PUT /api/menu/items/:id/sold-out` 更新售罄状态
    - _需求: 8.1, 8.3, 10.1, 10.3_

  - [x] 3.4 实现文件上传 API（照片与AR文件）
    - 实现 `POST /api/menu/items/:id/photo` 上传菜品照片
    - 实现 `POST /api/menu/items/:id/ar` 上传AR文件，验证仅接受 USDZ 格式（否则返回 400 `INVALID_FILE_FORMAT`）
    - 配置文件存储（Cloud Storage 或本地文件系统）
    - _需求: 8.2, 9.1_

  - [x] 3.5 属性测试：AR文件格式验证
    - **Property 13: AR文件格式验证**
    - 系统应仅接受 USDZ 格式的 AR 文件，拒绝其他格式
    - **验证: 需求 9.1**

  - [x] 3.6 属性测试：AR可用状态标记
    - **Property 14: AR可用状态标记**
    - 当菜品关联了 AR 文件时 API 应标记 AR 可用，未关联时标记不可用
    - **验证: 需求 9.2**

  - [x] 3.7 属性测试：多语言查询正确性
    - **Property 19: 多语言查询正确性**
    - 按不同 locale 参数查询时，返回的菜品名称和描述应为对应语言版本
    - **验证: 需求 14.2**

  - [x] 3.8 实现管理员后台菜单管理前端页面
    - 实现 `CategoryManager` 组件：分类 CRUD、排序
    - 实现 `MenuItemManager` 组件：菜品 CRUD、照片上传、AR 文件上传
    - 实现 `InventoryManager` 组件：售罄状态管理
    - 实现 `I18nEditor` 组件：多语言内容编辑
    - _需求: 7.1, 7.2, 7.3, 8.1, 8.2, 9.1, 10.1, 10.3, 14.3_

- [x] 4. 检查点 - 确保菜单管理模块测试通过
  - 确保所有测试通过，如有问题请向用户确认。

- [x] 5. 顾客端点餐模块
  - [x] 5.1 实现 QR 码解析与着陆页
    - 实现 `ScanLanding` 组件，解析 QR 码 URL 参数（桌号/座位号或外卖标识）
    - 实现 QR 码参数编码/解码工具函数
    - 根据参数类型路由到堂食点餐或外卖点餐流程
    - _需求: 1.1, 11.1_

  - [x] 5.2 属性测试：QR码参数解析正确性
    - **Property 1: QR码参数解析正确性**
    - `parse(encode(tableNumber, seatNumber)) === { tableNumber, seatNumber }` 往返一致性
    - **验证: 需求 1.1**

  - [x] 5.3 实现顾客端菜单展示
    - 实现 `MenuView` 组件：按分类显示菜品列表，支持语言切换
    - 实现 `MenuItemCard` 组件：显示照片、名称、价格、热量、等待时间、AR 图标、售罄状态
    - 售罄菜品显示为售罄状态，禁止加入购物车
    - _需求: 1.1, 8.4, 9.2, 10.2_

  - [x] 5.4 实现 AR 展示组件
    - 实现 `ARViewer` 组件，长按触发 USDZ 文件加载
    - iOS 使用 `<a rel="ar">` 标签，Android 使用 model-viewer 组件
    - _需求: 9.2, 9.3_

  - [x] 5.5 实现购物车与订单提交
    - 实现 `Cart` 组件：管理已选菜品和数量，增减操作
    - 实现 `OrderSubmit` 组件：显示订单摘要并确认下单
    - _需求: 1.2_

  - [x] 5.6 实现堂食订单创建 API
    - 实现 `POST /api/orders` 创建订单接口
    - 验证菜品是否售罄（售罄则返回 409 `ITEM_SOLD_OUT`）
    - 堂食订单记录桌号、座位号；保存下单时价格和名称快照
    - 创建成功后通过 Socket.IO 发送 `order:new` 事件通知收银端
    - _需求: 1.2, 1.3, 10.2_

  - [x] 5.7 属性测试：堂食订单创建数据完整性
    - **Property 2: 堂食订单创建数据完整性**
    - 创建的堂食订单应包含所有选择的菜品、正确的数量、正确关联的桌号和座位号
    - **验证: 需求 1.2**

  - [x] 5.8 属性测试：售罄菜品不可加入订单
    - **Property 15: 售罄菜品不可加入订单**
    - 订单创建请求中包含售罄菜品时，系统应拒绝
    - **验证: 需求 10.2**

  - [x] 5.9 实现堂食订单修改 API 与前端
    - 实现 `PUT /api/orders/:id/items` 修改订单菜品接口
    - 仅 `pending` 状态订单可修改，`checked_out`/`completed` 状态拒绝修改（返回 409 `ORDER_NOT_MODIFIABLE`）
    - 修改成功后通过 Socket.IO 发送 `order:updated` 事件
    - 实现 `OrderStatus` 组件：显示订单信息和结账提示，支持修改操作
    - _需求: 2.1, 2.2, 2.3_

  - [x] 5.10 属性测试：订单可修改性由状态决定
    - **Property 3: 订单可修改性由状态决定**
    - `pending` 状态修改应成功，`checked_out`/`completed` 状态修改应被拒绝
    - **验证: 需求 2.1, 2.3**

  - [x] 5.11 属性测试：订单金额计算不变量
    - **Property 9: 订单金额计算不变量**
    - 订单总金额始终等于所有订单项（单价 × 数量）之和
    - **验证: 需求 5.2**

- [x] 6. 检查点 - 确保顾客端点餐模块测试通过
  - 确保所有测试通过，如有问题请向用户确认。

- [x] 7. 外卖订单模块
  - [x] 7.1 实现外卖订单创建 API
    - 扩展 `POST /api/orders` 支持外卖订单类型
    - 使用 `DailyOrderCounter` 的 `findOneAndUpdate` 原子操作分配每日递增单号
    - 创建成功后通过 Socket.IO 发送 `order:new` 事件
    - 返回每日单号和前往前台结账提示
    - _需求: 11.2, 11.3, 11.4_

  - [x] 7.2 属性测试：外卖每日单号递增与重置
    - **Property 16: 外卖每日单号递增与重置**
    - 同一天内单号严格递增无重复，跨天后重置为1
    - **验证: 需求 11.2, 11.3**

  - [x] 7.3 实现外卖订单查询 API
    - 实现 `GET /api/orders/takeout` 获取未结账外卖订单（按每日单号升序排列）
    - 实现 `GET /api/orders/takeout/pending` 获取已结账未取餐外卖订单
    - 实现 `PUT /api/orders/takeout/:id/complete` 标记外卖订单已完成，记录完成时间
    - _需求: 12.1, 13.1, 13.2, 13.3_

  - [x] 7.4 属性测试：外卖订单按单号排序
    - **Property 17: 外卖订单按单号排序**
    - 未结账外卖订单查询结果应按每日单号升序排列
    - **验证: 需求 12.1**

  - [x] 7.5 属性测试：外卖未取餐列表正确性
    - **Property 18: 外卖未取餐列表正确性**
    - 未取餐列表应恰好包含 `checked_out` 状态的外卖订单，标记完成后应消失
    - **验证: 需求 13.1, 13.2**

- [x] 8. 收银端模块
  - [x] 8.1 实现收银端堂食订单看板
    - 实现堂食订单按桌号分组查询 API：`GET /api/orders/dine-in`（仅返回 `pending` 状态订单）
    - 实现 `DineInOrderBoard` 组件：按桌号分组显示未结账堂食订单
    - 实现 `OrderDetail` 组件：显示座位级菜品明细
    - 配置 Socket.IO 客户端，监听 `order:new`、`order:updated`、`order:checked-out` 事件实时更新
    - _需求: 3.1, 3.2, 3.3_

  - [x] 8.2 属性测试：堂食订单按桌号分组查询正确性
    - **Property 4: 堂食订单按桌号分组查询正确性**
    - 返回结果只包含 `pending` 状态订单，每个桌号下包含该桌所有座位的完整订单明细
    - **验证: 需求 3.1, 3.3**

  - [x] 8.3 实现收银端外卖订单列表与交付管理
    - 实现 `TakeoutOrderList` 组件：按每日单号排序显示未结账外卖订单
    - 实现 `TakeoutDelivery` 组件：显示已结账未取餐外卖订单，支持标记完成
    - _需求: 12.1, 13.1, 13.2_

  - [x] 8.4 实现结账流程 API
    - 实现 `POST /api/checkout/table/:tableNumber` 整桌结账
    - 实现 `POST /api/checkout/seat/:orderId` 按座位结账
    - 支持现金、刷卡、混合三种支付方式
    - 混合支付验证 `cashAmount + cardAmount === totalAmount`（不匹配返回 400 `PAYMENT_AMOUNT_MISMATCH`）
    - 结账后更新关联订单状态为 `checked_out`
    - 结账后通过 Socket.IO 发送 `order:checked-out` 事件
    - _需求: 4.1, 4.2, 4.3, 4.4, 4.5, 12.2_

  - [x] 8.5 属性测试：整桌结账金额汇总正确性
    - **Property 5: 整桌结账金额汇总正确性**
    - 整桌结账总金额等于该桌所有座位订单中各菜品（单价 × 数量）之和
    - **验证: 需求 4.1**

  - [x] 8.6 属性测试：按座位结账独立性
    - **Property 6: 按座位结账独立性**
    - 每个座位生成独立结账记录，金额等于该座位订单中各菜品（单价 × 数量）之和
    - **验证: 需求 4.2**

  - [x] 8.7 属性测试：混合支付金额约束
    - **Property 7: 混合支付金额约束**
    - 仅当 `cashAmount + cardAmount === totalAmount` 时接受，否则拒绝
    - **验证: 需求 4.4**

  - [x] 8.8 属性测试：结账后订单状态流转
    - **Property 8: 结账后订单状态流转**
    - 结账后所有关联订单状态应变为 `checked_out`
    - **验证: 需求 4.5**

  - [x] 8.9 实现结账流程前端页面
    - 实现 `CheckoutFlow` 组件：支持整桌/按座位结账选择
    - 实现 `PaymentForm` 组件：支持现金/刷卡/混合支付输入
    - 实现 `OrderEditor` 组件：结账中增减菜品并实时重算金额
    - 结账中修改订单后同步更新顾客端（通过 Socket.IO）
    - _需求: 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3_

- [x] 9. 小票打印模块
  - [x] 9.1 实现小票数据 API 与打印组件
    - 实现 `GET /api/checkout/receipt/:checkoutId` 获取小票数据
    - 实现 `GET /api/admin/config` 获取系统配置（含打印份数）
    - 实现 `ReceiptPrint` 组件：生成打印专用 HTML 模板，使用 CSS `@media print` 控制样式
    - 堂食小票包含：订单编号、桌号、菜品明细、各项金额、支付方式、结账时间
    - 外卖小票包含：每日单号、菜品明细、各项金额、支付方式、结账时间
    - 结账完成后自动调用 `window.print()` 打印，份数由系统配置决定
    - _需求: 6.1, 6.2, 6.3, 6.4, 12.3, 12.4_

  - [x] 9.2 属性测试：小票内容完整性
    - **Property 10: 小票内容完整性**
    - 堂食小票包含订单编号、桌号、菜品明细、各项金额、支付方式、结账时间；外卖小票包含每日单号等
    - **验证: 需求 6.2, 12.4**

- [x] 10. 检查点 - 确保收银端与小票模块测试通过
  - 确保所有测试通过，如有问题请向用户确认。

- [x] 11. 管理员后台模块
  - [x] 11.1 实现管理员账号管理 API 与页面
    - 实现 `GET /api/admin/users` 获取管理员列表
    - 实现 `POST /api/admin/users` 创建管理员
    - 实现 `PUT /api/admin/users/:id` 更新管理员信息
    - 实现 `DELETE /api/admin/users/:id` 删除管理员
    - 实现 `UserManager` 组件：管理员账号与权限管理界面
    - _需求: 16.1, 16.2, 16.3, 16.4_

  - [x] 11.2 实现系统配置管理 API 与页面
    - 实现 `PUT /api/admin/config` 更新系统配置
    - 实现 `SystemConfig` 组件：系统配置界面（小票打印份数等）
    - _需求: 6.3_

  - [x] 11.3 实现订单历史查询 API 与页面
    - 实现 `GET /api/reports/orders` 订单历史查询（支持日期范围、订单类型筛选）
    - 实现 `OrderHistory` 组件：订单历史查询界面，显示完整订单信息
    - _需求: 15.1, 15.3_

  - [x] 11.4 属性测试：订单历史筛选正确性
    - **Property 20: 订单历史筛选正确性**
    - 查询返回的每笔订单都应满足所有筛选条件，且不遗漏满足条件的订单
    - **验证: 需求 15.1**

  - [x] 11.5 实现营业报表 API 与页面
    - 实现 `GET /api/reports/summary` 营业报表统计（总营业额、订单数量、各支付方式金额）
    - 实现 `ReportDashboard` 组件：营业报表展示界面
    - _需求: 15.2_

  - [x] 11.6 属性测试：营业报表统计正确性
    - **Property 21: 营业报表统计正确性**
    - 总营业额等于所有订单金额之和，订单数量正确，各支付方式金额统计正确
    - **验证: 需求 15.2**

- [x] 12. 集成与端到端连接
  - [x] 12.1 WebSocket 实时通知集成
    - 确保订单创建、修改、结账时 Socket.IO 事件正确发送和接收
    - 收银端实时更新堂食订单看板和外卖订单列表
    - 结账中修改订单时同步更新顾客端
    - _需求: 2.2, 3.2, 5.3_

  - [x] 12.2 前后端路由与静态文件集成
    - 配置 Express 静态文件中间件托管前端 SPA
    - 配置 SPA fallback 路由（所有非 API 路由返回 index.html）
    - 验证顾客端、收银端、管理员后台三套路由正常工作
    - _需求: 全局_

- [x] 13. 最终检查点 - 确保所有测试通过
  - 确保所有测试通过，如有问题请向用户确认。

## 备注

- 标记 `*` 的任务为可选任务，可跳过以加速 MVP 开发
- 每个任务引用了具体的需求编号，确保需求可追溯
- 检查点任务用于增量验证，确保每个模块完成后功能正确
- 属性测试验证通用正确性属性，单元测试验证具体场景和边界条件
- 属性测试使用 Jest + fast-check 框架
