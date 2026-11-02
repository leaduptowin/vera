# 开源发布清单

这份清单用于把当前项目正式发布到 GitHub。发布前建议按顺序完成。

## 1. 仓库命名

当前产品名保留为 **MINUTE**，`package.json` 的包名是
`minute-live-workbench`，用于降低和现有 `minutes` 项目撞名的概率。

建议 GitHub 仓库名：

- 当前仓库：`vera`
- 或你自己的独特品牌名

## 2. 本地初始化与推送

项目目录目前可以直接作为仓库根目录。示例：

```bash
cd realtime-meeting-workbench

git init -b main
git add .
git commit -m "feat: initial open-source release"

# 先在 GitHub 创建空仓库（不要勾选自动生成 README）
git remote add origin https://github.com/leaduptowin/vera.git
git push -u origin main
```

> `.gitignore` 已忽略 `node_modules`、`dist`、`.env*`、构建缓存和本地运行文件。

## 3. GitHub 仓库设置

### 基本信息

- Description：
  `Browser-only real-time meeting workbench · Web Speech transcription · incremental SSE summaries · local-first`
- Website：启用 Pages 后填写 Pages 地址。
- Topics 建议：
  `meeting-notes`, `meeting-minutes`, `web-speech-api`, `speech-recognition`,
  `realtime`, `sse`, `react`, `typescript`, `tailwindcss`, `local-first`,
  `ai-summary`, `browser-only`

### 功能开关

- Issues：开启
- Discussions：开启（可选，用于使用交流）
- Private vulnerability reporting：开启
- Dependabot alerts / security updates：开启

### GitHub Pages

1. 推送到 `main` 后，在 **Settings → Pages** 将 Source 设为 **GitHub Actions**。
2. `Deploy to GitHub Pages` workflow 会自动运行。
3. 部署地址通常为：
   `https://leaduptowin.github.io/vera/`
4. 将该地址补进仓库 Description 和 README 的 Demo 位置。

项目使用 Vite 的相对 `base`，因此不需要手动修改子路径。

### 首次 Release

```bash
git tag v0.1.0
git push origin v0.1.0
```

在 GitHub Releases 中创建 `v0.1.0`，正文可参考 [CHANGELOG.md](../CHANGELOG.md)。

## 4. 发布前检查

- [ ] LICENSE 已确认（默认 MIT）
- [ ] README 中的截图路径正确
- [x] 已确认版权人名称（LICENSE，当前为 Minute Workbench contributors）
- [ ] 没有 `.env`、API Key、个人会议数据
- [ ] CI `Build` 通过
- [ ] Pages 部署成功
- [ ] 手机宽度 390px 下三种视图可用
- [ ] README 的隐私说明与 Web Speech 限制准确
- [ ] Issue 模板与 Security 报告入口可用
- [ ] 仓库 Topics、Description、Social preview 已设置（Description 当前有一处拼写：`rowser-only` → `browser-only`）

## 5. 可选增强

- 上传 `docs/social-preview.png` 作为 GitHub Social preview（已是 1280×640）。
- 添加英文 README（项目已附带 [README.en.md](../README.en.md)）。
- 录制 20–40 秒演示 GIF：开启麦克风 → 原文逐字上屏 → 摘要逐行增长 → 勾选任务。
- 在 README 中替换真实 Demo 链接。
- 推送后可选添加 CI badge：
  `![CI](https://github.com/leaduptowin/vera/actions/workflows/ci.yml/badge.svg)`
- 设置 branch protection：要求 CI 通过后再合并到 `main`。
- 添加 `good first issue` 标签。

## 6. 法律与合规提醒

- 本项目默认 MIT。如果希望限制云厂商直接托管商用，可考虑改为 AGPL-3.0。
- Web Speech API 在 Chrome / Edge 中可能依赖厂商在线服务，不要宣传为“语音全程离线”。
- 仓库中不要提交真实会议录音、转写或截图中的个人信息。
- 第三方字体与图标许可见 [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md)。
