# Contributing to MINUTE

感谢你愿意参与。这个项目的目标是保持“轻量、浏览器优先、实时反馈”，所以提交改动前请优先考虑：

- 不引入后端依赖，除非有明确的可选方案；
- 不把录音文件上传到第三方；
- 不为动画牺牲实时交互性能；
- 不提交任何 API Key、Token、个人会议数据；
- 新增依赖前先说明体积和必要性。

## 开发环境

- Node.js >= 20
- pnpm 11+

```bash
pnpm install
pnpm dev
```

生产构建：

```bash
pnpm build
pnpm preview
```

当前没有单元测试框架。提交 PR 前至少执行 `pnpm build`，并在浏览器里手动验证受影响流程。

## 提交流程

1. Fork 仓库，从 `main` 切出分支：
   - `feat/your-feature`
   - `fix/your-bug`
   - `docs/your-change`
2. 保持提交信息清晰，推荐 Conventional Commits：
   - `feat: add speaker label grouping`
   - `fix: prevent duplicate speech results`
   - `docs: clarify Web Speech privacy caveat`
3. 提交 PR，填写模板中的验证步骤。
4. UI 变更请附带截图或短视频；实时行为变更请说明触发条件。

## 代码约定

- React + TypeScript + Tailwind CSS，组件位于 `src/components/`。
- 状态与副作用尽量下沉到 hooks，业务逻辑放在 `src/lib/`。
- 语音、SSE 切片、持久化等关键逻辑需要注释“为什么”，而不是只写“做了什么”。
- 样式使用现有 CSS 变量 / Tailwind token，不要新增背景粒子、3D 或高亮发光边框。
- 动画只用于流式新增、任务卡、麦克风状态和波形。
- 保持移动端「会话 / 原文 / 纪要」三种视图可用。

## 接入真实 LLM

当前默认使用本地 Mock SSE。真实接入请替换 [src/lib/mock-llm.ts](src/lib/mock-llm.ts) 中的 `mockSummarySSE`，不要把密钥写进前端源码。

如果使用服务端代理，请在 PR 中说明：

- 请求/响应是否为 SSE；
- 是否保留四段式 Markdown 契约；
- 是否有超时、中断和错误兜底；
- 是否记录或持久化音频/会议内容。

## 安全与隐私

- 不允许提交 `.env`、真实 Key、真实会议转写或用户数据。
- 发现安全问题请不要开公开 Issue，见 [SECURITY.md](SECURITY.md)。
- Web Speech API 可能由浏览器厂商在云端处理音频，请在描述功能时使用准确措辞。

## 行为准则

参与本项目即表示同意遵守 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)。

## License

贡献的代码默认以 [MIT License](LICENSE) 授权。
